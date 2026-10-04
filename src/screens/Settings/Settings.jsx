import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import {
  Avatar, Badge, Button, Callout, Card, Icon, IconButton, ProjectAvatar, SettingsRow, Skeleton, TopBar,
  syncTime, useConfirm, useLocalPref, useToast,
} from '../../ui'
import { useStore } from '../../store.jsx'
import { backRoute, navigate, openSheet, routeHref, setParams, useRoute } from '../../router.js'
import { FEATURES } from '../../features.js'
import { fmtMoney } from '../../format.js'
import { isProjectActive } from '../../selectors.js'
import { accountOf, useSession } from '../../shell/session.js'
import { db } from '../../supabase'
import TextSize, { textLabel } from './TextSize.jsx'
import './Settings.css'

// Definições (rota #/definicoes, spec §10.14): Conta · Projetos (+ Anteriores) · Calendários Google ·
// Preferências (Tamanho do texto em #/definicoes/texto) · Documentos e Tabela de preços (só com
// FEATURES.docs) · Sessão. Ecrã empilhado: "‹ Voltar" para o separador de onde se veio.

// Documentos só descem se a flag estiver ligada (código à parte, como o Painel)
const DocumentsSection = lazy(() => import('../Documents/index.jsx').then((m) => ({ default: m.DocumentsSection })))
const PricesSection = lazy(() => import('../Documents/index.jsx').then((m) => ({ default: m.PricesSection })))

const money = (n) => fmtMoney(n, { cents: 'never' })
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
// " · média 150 €" (só quando há eventos)
const avg = (total, n) => (n > 0 ? ` · média ${money(total / n)}` : '')

// ---------- ajudas partilhadas com as folhas do projeto e do calendário ----------------------
export const kindLabel = (p) => (p?.kind === 'hair' ? 'Cabelos' : 'Música')

// período de atividade: "Inativo" · "2024–2025" · "desde 2024" · "até 2025" · "sempre ativo"
export function periodLabel(p) {
  if (p.active === false) return 'Inativo'
  const from = p.active_from ?? null
  const to = p.active_to ?? null
  if (from != null && to != null) return from === to ? String(from) : `${from}–${to}`
  if (from != null) return `desde ${from}`
  if (to != null) return `até ${to}`
  return 'sempre ativo'
}

// "…/private-abc123/basic.ics" (o endereço inteiro é secreto e não cabe)
export function shortCalUrl(url) {
  const parts = String(url || '').split(/[?#]/)[0].split('/').filter(Boolean)
  const tail = parts.slice(-2).map((s) => {
    let t = s
    try { t = decodeURIComponent(s) } catch { /* fica como está */ }
    return t.length > 18 ? `${t.slice(0, 14)}…` : t
  })
  return tail.length ? `…/${tail.join('/')}` : url
}

// estado de um calendário: "atualizado às 09:12" · "Não foi possível atualizar" · "a atualizar…"
export function calState(status, refreshing) {
  if (!status) return { tone: 'wait', text: refreshing ? 'a atualizar…' : 'por atualizar' }
  if (status.ok) return { tone: 'ok', text: `atualizado ${syncTime(status.lastOkAt || status.at)}` }
  return {
    tone: 'fail',
    text: 'Não foi possível atualizar',
    last: status.lastOkAt ? `última ${syncTime(status.lastOkAt)}` : null,
    message: status.message,
  }
}

function Section({ id, title, note, children }) {
  return (
    <section className="st-sec" aria-labelledby={id} id={`${id}-sec`}>
      <header><h2 id={id}>{title}</h2>{note && <small>{note}</small>}</header>
      {children}
    </section>
  )
}

// ---------- Projetos -----------------------------------------------------------------------------
function Projects() {
  const { projects, events, gcalCalendars, today } = useStore()
  const year = today.slice(0, 4)
  const [open, setOpen] = useState(false)

  const stats = useMemo(() => {
    const m = new Map()
    for (const e of events) {
      const s = m.get(e.project_id) || { n: 0, total: 0, nAll: 0, all: 0 }
      const v = Number(e.value) || 0
      s.nAll += 1
      s.all += v
      if (e.event_date.startsWith(year)) { s.n += 1; s.total += v }
      m.set(e.project_id, s)
    }
    return m
  }, [events, year])
  const statOf = (p) => stats.get(p.id) || { n: 0, total: 0, nAll: 0, all: 0 }
  const hasGoogle = (p) => gcalCalendars.some((c) => c.project_id === p.id)

  const active = projects.filter((p) => isProjectActive(p, Number(year)))
  const old = projects.filter((p) => !isProjectActive(p, Number(year)))
  const gtag = <span className="st-gtag"><Icon name="gcal" size="sm" />Google</span>

  return (
    <Section id="st-proj" title="Projetos" note={`${plural(active.length, 'ativo', 'ativos')} · total em ${year}`}>
      <div className="card">
        {active.map((p) => {
          const s = statOf(p)
          const kind = kindLabel(p)
          return (
            <SettingsRow key={p.id} avatar={<ProjectAvatar project={p} />} title={p.name}
              sub={<>{kind !== p.name && `${kind} · `}{plural(s.n, 'evento', 'eventos')} em {year}{avg(s.total, s.n)}{hasGoogle(p) && <> · {gtag}</>}</>}
              value={money(s.total)} onClick={() => openSheet('projeto', p.id)} />
          )
        })}
        <SettingsRow className="st-add" icon="plus" title="Novo projeto" chevron={false} onClick={() => openSheet('projeto-novo')} />
        {old.length > 0 && (
          <button type="button" className="srow st-old" aria-expanded={open} aria-controls="st-old-list"
            onClick={() => setOpen((o) => !o)}>
            <span className="s-ic"><Icon name="box" /></span>
            <span><b>Anteriores</b><small>{old.map((p) => p.name).join(' · ')}</small></span>
            <span className="v">{old.length}</span>
            <Icon name="chevD" className="chev" />
          </button>
        )}
        {open && (
          <div id="st-old-list" className="st-old-list">
            {old.map((p) => {
              const s = statOf(p)
              const kind = kindLabel(p)
              return (
                <SettingsRow key={p.id} avatar={<ProjectAvatar project={p} />} title={p.name}
                  sub={<>{kind !== p.name && `${kind} · `}{plural(s.nAll, 'evento', 'eventos')}{avg(s.all, s.nAll)} <Badge tone="neutral">{periodLabel(p)}</Badge></>}
                  value={<>{money(s.all)}<small>desde sempre</small></>} onClick={() => openSheet('projeto', p.id)} />
              )
            })}
          </div>
        )}
      </div>
    </Section>
  )
}

// ---------- Calendários Google ---------------------------------------------------------------------
function Calendars() {
  const { gcalCalendars, gcalStatus, projectById, refreshGcal, removeGcalDeferred, loadingPhases } = useStore()
  const refreshing = gcalStatus.refreshing
  return (
    <Section id="st-gcal" title="Calendários Google" note="só leitura">
      {gcalStatus.listError && !loadingPhases.phase2 && (
        <div className="st-pad">
          <Callout tone="warning" title="Não foi possível ler os calendários ligados.">
            Os que já ligaste podem não aparecer aqui.{' '}
            <Button variant="ghost" size="sm" icon="refresh" loading={refreshing} loadingLabel="A carregar…" onClick={() => refreshGcal()}>
              Tentar de novo
            </Button>
          </Callout>
        </div>
      )}
      <div className="card">
        {loadingPhases.phase2 ? <div className="st-pad"><Skeleton lines={2} label="A carregar os calendários" /></div> : (
          gcalCalendars.map((cal) => {
            const p = projectById(cal.project_id)
            const name = p?.name || 'Projeto apagado'
            const st = calState(gcalStatus.byCalendar?.[cal.id], refreshing)
            return (
              <div key={cal.id} className="srow st-cal">
                <ProjectAvatar project={p} />
                <span>
                  <b>{name}</b>
                  <small className="st-url">{shortCalUrl(cal.url)}</small>
                  {st.tone !== 'fail' && <small className={`st-state st-${st.tone}`}><i aria-hidden="true" />{st.text}</small>}
                  {st.tone === 'fail' && (
                    <span className="st-fail">
                      <small><Icon name="alert" size="sm" /><b>{st.text}</b>{st.last && ` · ${st.last}`}</small>
                      {st.message && <small className="st-why">{st.message}</small>}
                      <Button variant="ghost" size="sm" icon="refresh" loading={refreshing} loadingLabel="A atualizar…"
                        onClick={() => refreshGcal()}>
                        Tentar de novo
                      </Button>
                    </span>
                  )}
                </span>
                <IconButton icon="trash" label={`Remover calendário de ${name}`} onClick={() => removeGcalDeferred(cal)} />
              </div>
            )
          })
        )}
        <SettingsRow className="st-add" icon="plus" title="Ligar calendário" sub="Endereço secreto iCal + projeto"
          chevron={false} onClick={() => openSheet('calendario-novo')} />
      </div>
      <details className="st-ical">
        <summary><Icon name="info" size="sm" />Onde encontro o endereço iCal?<Icon name="chevD" size="sm" className="chev" /></summary>
        <p>
          No Google Calendar (no computador), na <b>conta dona</b> do calendário: Definições → o calendário →
          <b> Integrar calendário</b> → copia o <b>Endereço secreto em formato iCal</b>. Os eventos aparecem na
          agenda só para leitura; toca em <b>Registar</b> para os guardar na app com o valor.
        </p>
      </details>
    </Section>
  )
}

// ---------- ecrã ----------------------------------------------------------------------------------------
let savedScroll = 0 // posição nas Definições ao ir ao Tamanho do texto (e voltar)

export default function Settings() {
  const route = useRoute()
  const sub = route.path[1] === 'texto' ? 'texto' : null
  const { notifyError } = useStore()
  const { dismiss } = useToast()
  const confirm = useConfirm()
  const { name, email } = accountOf(useSession())
  const [texto] = useLocalPref('texto', 'normal')
  const [leaving, setLeaving] = useState(false)
  const back = backRoute()

  // Tamanho do texto abre no topo; ao voltar, as Definições voltam onde estavam
  useLayoutEffect(() => {
    window.scrollTo(0, sub ? 0 : savedScroll)
  }, [sub])

  // "Gerir em Calendários Google" (folha do projeto): #/definicoes?sec=google
  const sec = route.params.sec
  useEffect(() => {
    if (!sec || sub) return
    document.getElementById(`st-${sec === 'google' ? 'gcal' : sec}-sec`)?.scrollIntoView({ block: 'start' })
    setParams({ sec: null })
  }, [sec, sub])

  if (sub === 'texto') return <TextSize />

  const openText = (e) => {
    e.preventDefault()
    savedScroll = window.scrollY
    navigate('#/definicoes/texto')
  }

  const signOut = async () => {
    if (leaving) return
    const ok = await confirm({
      title: 'Terminar sessão?',
      text: `Vais precisar do email e da password para voltar a entrar${email ? ` em ${email}` : ''}.`,
      confirmLabel: 'Terminar sessão',
      cancelLabel: 'Cancelar',
      danger: true,
    })
    if (!ok) return
    setLeaving(true)
    try {
      await dismiss() // o que estiver à espera do Anular grava-se antes de sair
      // sem rede o supabase-js não termina a sessão (nem com scope 'local', que também chama o servidor):
      // fica o aviso "Sem ligação" com Tentar de novo
      const { error } = await db.auth.signOut()
      if (error) throw error
      navigate('#/agenda', { replace: true }) // a próxima entrada começa na Agenda
    } catch (ex) {
      setLeaving(false)
      notifyError(ex, signOut)
    }
  }

  return (
    <div className="st-screen">
      <TopBar kicker="Conta e configuração" title="Definições" avatar={false} back={{ label: back.label, to: back.href }} />
      <div className="st-body">
        <Card className="st-acct">
          <Avatar size="lg" />
          <span><b>{name}</b>{email && <small>{email}</small>}</span>
        </Card>

        <Projects />
        <Calendars />

        <Section id="st-pref" title="Preferências">
          <div className="card">
            <SettingsRow icon="textsize" title="Tamanho do texto" sub="Também segue o tamanho do iPhone"
              value={textLabel(texto)} href={routeHref('#/definicoes/texto')} onClick={openText} />
          </div>
        </Section>

        {FEATURES.docs && (
          <Suspense fallback={<Skeleton lines={3} label="A carregar os documentos" />}>
            <DocumentsSection />
            <PricesSection />
          </Suspense>
        )}

        <Section id="st-sess" title="Sessão">
          <div className="card">
            <SettingsRow icon="logout" title={leaving ? 'A terminar sessão…' : 'Terminar sessão'} danger chevron={false}
              sub="Vais precisar do email e da password" onClick={signOut} aria-busy={leaving || undefined} />
          </div>
        </Section>

        <p className="st-ver"><i aria-hidden="true" />Duet · versão 2.0</p>
      </div>
    </div>
  )
}
