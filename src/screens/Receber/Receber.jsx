import { useEffect, useRef, useState } from 'react'
import {
  Button, Callout, Card, EmptyState, EventRow, GoogleRow, GroupHeader, HeroNumber, Icon, Kpi, Segmented,
  Skeleton, SyncBanner, TopBar, syncTime, useLocalPref, useReducedMotion,
} from '../../ui'
import { useStore } from '../../store.jsx'
import { navigate, openSheet, routeHref, useRoute } from '../../router.js'
import { ago, cap, fmtMoney, fmtMonth } from '../../format.js'
import './Receber.css'

// Receber (spec §10.11): capa com o que está em atraso, a receber e sinais; separadores
// Em atraso · Por registar ligados à rota (#/receber/atraso|google). O antigo #/receber/recibos cai
// em Em atraso: por omissão os eventos não levam recibo, por isso não há recibos "em falta".

const SUBS = ['atraso', 'google']
const SUB_NAMES = { atraso: 'Em atraso', google: 'Por registar do Google' }
// "A receber ›" abre a Agenda em Procurar com Próximos + Por receber
const UPCOMING = '#/agenda/lista?q=&quando=proximos&estado=porreceber'

const money = (n) => fmtMoney(n, { cents: 'auto' })
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`
const joinMeta = (xs) => xs.filter(Boolean).reduce((acc, x, i) => (i ? [...acc, ' · ', x] : [x]), [])

// linha que sai ("Recebi"): colapsa em 200 ms e só depois grava; se voltar (Anular), pisca
function useRowExit(ids) {
  const { notifyError } = useStore()
  const reduce = useReducedMotion()
  const nodes = useRef(new Map())
  const binders = useRef(new Map())
  const busy = useRef(new Set())
  const gone = useRef(new Set())
  const [flash, setFlash] = useState(() => new Set())

  const bind = (id) => {
    if (!binders.current.has(id)) {
      binders.current.set(id, (el) => { if (el) nodes.current.set(id, el); else nodes.current.delete(id) })
    }
    return binders.current.get(id)
  }

  const exit = async (id, action) => {
    if (busy.current.has(id)) return
    busy.current.add(id)
    const el = nodes.current.get(id)
    // o foco estava nesta linha: passa para a linha seguinte (ou a anterior) quando ela sair — para a linha,
    // não para o botão dela (um segundo Enter não regista outro evento)
    const heir = el?.contains(document.activeElement)
      ? (el.nextElementSibling || el.previousElementSibling)?.querySelector('.row-open')
      : null
    let anim = null
    if (el?.animate && !reduce) {
      el.classList.add('leaving')
      anim = el.animate([{ height: `${el.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }],
        { duration: 200, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'forwards' })
      try { await anim.finished } catch { /* animação cancelada */ }
    }
    try {
      const done = await action()
      if (done) {
        gone.current.add(id)
        setTimeout(() => gone.current.delete(id), 15000) // o Anular dura 10 s
      }
    } catch (ex) {
      notifyError(ex)
    } finally {
      busy.current.delete(id)
      anim?.cancel()
      el?.classList.remove('leaving')
      if (heir?.isConnected && (!el?.isConnected || document.activeElement === document.body)) heir.focus()
    }
  }

  // voltou à lista (Anular ou erro ao gravar): pisca 1,2 s
  const key = ids.join(',')
  useEffect(() => {
    const back = ids.filter((id) => gone.current.has(id))
    if (!back.length) return
    back.forEach((id) => gone.current.delete(id))
    setFlash((s) => new Set([...s, ...back]))
    setTimeout(() => setFlash((s) => {
      const n = new Set(s)
      back.forEach((id) => n.delete(id))
      return n
    }), 1300)
  }, [key])

  return { bind, exit, flash }
}

// ---------- capa ------------------------------------------------------------------------------
function Hero() {
  const { receivables: r } = useStore()
  const n = r.overdue.length
  const oldest = r.oldestDate ? fmtMonth(r.oldestDate, { year: true }) : ''
  const sub = !n ? 'Tudo recebido até hoje.'
    : n === 1 ? `1 evento · de ${oldest}` : `${n} eventos · o mais antigo é de ${oldest}`
  const up = r.upcoming.length
  return (
    <Card as="section" className="hero rc-hero" aria-label="Resumo das cobranças">
      <div>
        <div className="label"><Icon name="alert" size="sm" />Em atraso · eventos já realizados</div>
        <HeroNumber value={r.overdueTotal} tone={n ? 'overdue' : 'default'} />
        <div className="sub">{sub}</div>
      </div>
      <div className="split">
        <Kpi label="A receber" value={money(r.upcomingTotal)}
          sub={up ? count(up, 'evento futuro', 'eventos futuros') : 'nada marcado por receber'}
          to={routeHref(UPCOMING)} onClick={(e) => { e.preventDefault(); navigate(UPCOMING) }} />
        <Kpi label="Sinais recebidos" value={money(r.depositsTotal)}
          sub={r.depositsCount ? `em ${count(r.depositsCount, 'evento', 'eventos')} por fechar` : 'nenhum sinal por fechar'} />
      </div>
    </Card>
  )
}

// ---------- Em atraso ---------------------------------------------------------------------------
function Overdue() {
  const { agingGroups, today, projectById, paidAmount, receiveRemaining } = useStore()
  const [order, setOrder] = useLocalPref('receberOrdem', 'antigos')
  const recent = order === 'recentes'
  const groups = recent
    ? agingGroups.slice().reverse().map((g) => ({ ...g, events: g.events.slice().reverse() }))
    : agingGroups
  const { bind, exit, flash } = useRowExit(groups.flatMap((g) => g.events.map((e) => e.id)))

  if (!groups.length) {
    return <EmptyState icon="check" title="Nada em atraso" text="Todos os eventos já realizados estão pagos." />
  }

  const meta = (ev) => {
    const got = paidAmount(ev)
    return joinMeta([
      projectById(ev.project_id)?.name,
      <span key="a" className="age">{ago(ev.event_date, today)}</span>,
      got > 0.005 ? `sinal ${money(got)}` : null,
    ])
  }

  return (
    <>
      <div className="rc-sort">
        <span>Por antiguidade</span>
        <Button variant="ghost" size="sm" onClick={() => setOrder(recent ? 'antigos' : 'recentes')}>
          {recent ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}<Icon name="chevD" size="sm" />
        </Button>
      </div>
      {groups.map((g, i) => (
        <section key={g.key} className="rc-group" aria-labelledby={`rc-${g.key}`}>
          <GroupHeader id={`rc-${g.key}`} first={i === 0} title={g.label} small={count(g.events.length, 'evento', 'eventos')}
            summary={<span className="late">{money(g.total)}</span>} />
          <div className="rc-list">
            {g.events.map((ev) => (
              <div key={ev.id} ref={bind(ev.id)} className="rc-item">
                <EventRow ev={ev} lead="month" end="recebi" meta={meta(ev)} className={flash.has(ev.id) ? 'flash' : ''}
                  onAction={(e) => exit(e.id, () => receiveRemaining(e))} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

// ---------- Por registar (Google) ---------------------------------------------------------------------
// lista de pendentes; quando atravessa vários meses, o nome do mês aparece antes de cada um
function GoogleList({ items, today }) {
  const months = new Set(items.map((g) => g.date.slice(0, 7)))
  let prev = null
  return (
    <div className="rc-list">
      {items.map((g) => {
        const k = g.date.slice(0, 7)
        const label = months.size > 1 && k !== prev
          ? fmtMonth(g.date, { year: k.slice(0, 4) !== today.slice(0, 4) }) : null
        prev = k
        return (
          <div key={g.key} className="rc-item">
            {label && <p className="rc-month">{cap(label)}</p>}
            <GoogleRow g={g} />
          </div>
        )
      })}
    </div>
  )
}

function GoogleSync() {
  const { gcalStatus, refreshGcal } = useStore()
  const warn = gcalStatus.failures.length > 0
  const text = gcalStatus.refreshing ? 'A atualizar o Google…'
    : warn ? 'O Google não atualizou'
    : gcalStatus.lastOkAt ? `Google atualizado ${syncTime(gcalStatus.lastOkAt)}` : 'Google por atualizar'
  return (
    <button type="button" className={`rc-sync${warn ? ' warn' : ''}`} onClick={() => refreshGcal()}
      disabled={gcalStatus.refreshing} aria-label={`${text}. Atualizar agora`}>
      <Icon name="refresh" size="sm" />{text}
    </button>
  )
}

// O Google ainda não respondeu desde o arranque (2.ª fase ou 1.ª leitura sem resposta nem falha):
// a lista mostra o esqueleto e o separador fica sem número, em vez de um "0" que ainda não é verdade.
const googleWaiting = (loadingPhases, gcalStatus) =>
  loadingPhases.phase2 || (gcalStatus.refreshing && !gcalStatus.lastOkAt && !gcalStatus.failures.length)

function Pending() {
  const { googlePending, gcalCalendars, gcalStatus, loadingPhases, today } = useStore()
  const { past, upcoming } = googlePending
  const waiting = googleWaiting(loadingPhases, gcalStatus)

  if (!past.length && !upcoming.length) {
    if (waiting) return <Skeleton lines={3} label="A ver o Google Calendar" />
    if (!gcalCalendars.length) {
      return (
        <EmptyState icon="gcal" title="Nada por registar"
          text="Liga um calendário Google para ver aqui os eventos que ainda não estão na agenda."
          action={<Button variant="secondary" icon="plus" onClick={() => openSheet('calendario-novo')}>Ligar calendário</Button>} />
      )
    }
    return (
      <>
        <EmptyState icon="gcal" title="Nada por registar" text="Tudo o que está no Google já está na agenda." />
        <GoogleSync />
      </>
    )
  }

  return (
    <>
      {past.length > 0 && (
        <>
          <Callout tone="warning" title={past.length === 1 ? 'Já aconteceu e não está registado.' : 'Já aconteceram e não estão registados.'}>
            Regista para poder cobrar.
          </Callout>
          <section className="rc-group" aria-labelledby="rc-g-past">
            <GroupHeader id="rc-g-past" first title="Já aconteceram" small={String(past.length)} />
            <GoogleList items={past} today={today} />
          </section>
        </>
      )}
      {upcoming.length > 0 && (
        <section className="rc-group" aria-labelledby="rc-g-next">
          <GroupHeader id="rc-g-next" first={!past.length} title="Próximos" small={`${upcoming.length} no Google`} />
          <GoogleList items={upcoming} today={today} />
        </section>
      )}
      <GoogleSync />
    </>
  )
}

// ---------- ecrã -----------------------------------------------------------------------------------------
export default function Receber() {
  const route = useRoute()
  const { receivables, googlePending, loadingPhases, gcalStatus } = useStore()
  // separador escondido: mantém o último sub-separador visto
  const subRef = useRef('atraso')
  if (route.tab === 'receber') subRef.current = SUBS.includes(route.path[1]) ? route.path[1] : 'atraso'
  const sub = subRef.current

  const gCount = googlePending.past.length + googlePending.upcoming.length
  const tabs = [
    { value: 'atraso', label: 'Em atraso', count: receivables.overdue.length, countTone: 'alert' },
    { value: 'google', label: 'Por registar', count: googleWaiting(loadingPhases, gcalStatus) && !gCount ? undefined : gCount },
  ]

  return (
    <div className="rc-screen">
      <TopBar kicker="Cobranças" title="Receber" />
      <SyncBanner className="rc-banner" />
      <Hero />
      <Segmented role="tablist" label="O que tratar" className="rc-tabs" value={sub} options={tabs}
        onChange={(v) => navigate(`#/receber/${v}`, { replace: true })} />
      <div className="rc-panel" role="tabpanel" aria-label={SUB_NAMES[sub]}>
        {sub === 'atraso' && <Overdue />}
        {sub === 'google' && <Pending />}
      </div>
    </div>
  )
}
