import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import {
  Button, EmptyState, Field, Icon, IconButton, Segmented, Sheet, Switch, TextInput,
  useConfirm, useFieldGroup, useFormSave, useSheet, useToast,
} from '../../ui'
import { useStore } from '../../store.jsx'
import { navigate } from '../../router.js'
import { contrastRatio, projectVars } from '../../color.js'
import { fmtMoney } from '../../format.js'
import { humanError } from '../../errors.js'
import { ErrorPanel } from '../../shell/lazy.jsx'
import { calState, shortCalUrl } from './Settings.jsx'
import './Settings.css'

// Folha Editar/Novo projeto (spec §10.14): Nome · Tipo · Cor (9 amostras + cor livre) · Ativo desde/até ·
// Ativo · Ordem · Logotipo (sempre visível) · calendários em leitura · Ver no Painel · "…" › Apagar.
// Só grava em "Guardar projeto"; o logotipo grava logo (como os anexos), com Anular ao remover.

// paleta pastel validada para daltonismo (mesma ordem do seed) — nomes para leitores de ecrã
const PRESETS = [
  ['#d46a8f', 'Rosa'], ['#cf9c3f', 'Âmbar'], ['#12a89e', 'Turquesa'], ['#cd7c5a', 'Terracota'], ['#9c7ed4', 'Lilás'],
  ['#4f9f68', 'Verde'], ['#6d8ed6', 'Azul'], ['#a49b3f', 'Oliva'], ['#c263ac', 'Magenta'],
]
const COLOR_NAME = Object.fromEntries(PRESETS)
const LIGHT_SURFACE = '#ffffff' // --surface claro: o aviso da cor livre compara com o fundo claro
const KIND = { music: 'Música', hair: 'Cabelos' }

const money = (n) => fmtMoney(n, { cents: 'never' })
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const joinPt = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`)
const normHex = (c) => {
  const h = String(c || '').trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(h)) return h
  if (/^#[0-9a-f]{3}$/.test(h)) return '#' + [...h.slice(1)].map((x) => x + x).join('')
  return '#929292'
}
const yearText = (v) => (v == null ? '' : String(v))

function initialOf(p, projects) {
  if (p) {
    return {
      name: p.name || '', kind: p.kind === 'hair' ? 'hair' : 'music', color: normHex(p.color),
      sort_order: Number(p.sort_order) || 0, active: p.active !== false,
      active_from: yearText(p.active_from), active_to: yearText(p.active_to),
    }
  }
  return {
    name: '', kind: 'music', color: PRESETS[projects.length % PRESETS.length][0],
    sort_order: Math.max(0, ...projects.map((x) => Number(x.sort_order) || 0)) + 1,
    active: true, active_from: '', active_to: '',
  }
}

// ---------- frase do "Descartar alterações?" ---------------------------------------------
const colorName = (c) => COLOR_NAME[c] || 'cor livre'
function change(label, from, to) {
  if (!from) return `Preencheste ${label} (${to}).`
  if (!to) return `Apagaste ${label} (${from}).`
  return `Mudaste ${label} de ${from} para ${to}.`
}
function changesOf(f, init) {
  const out = [] // [nome curto, frase]
  const q = (s) => (s ? `“${s}”` : '')
  if (f.name.trim() !== init.name.trim()) out.push(['nome', change('o nome', q(init.name.trim()), q(f.name.trim()))])
  if (f.kind !== init.kind) out.push(['tipo', `Mudaste o tipo de ${KIND[init.kind]} para ${KIND[f.kind]}.`])
  if (f.color !== init.color) {
    out.push(['cor', COLOR_NAME[f.color] || COLOR_NAME[init.color]
      ? `Mudaste a cor de ${colorName(init.color)} para ${colorName(f.color)}.` : 'Mudaste a cor livre.'])
  }
  if (f.active_from.trim() !== init.active_from.trim()) out.push(['ativo desde', change('o ano de início', init.active_from.trim(), f.active_from.trim())])
  if (f.active_to.trim() !== init.active_to.trim()) out.push(['ativo até', change('o ano de fim', init.active_to.trim(), f.active_to.trim())])
  if (f.active !== init.active) out.push(['ativo', f.active ? 'Ativaste o projeto.' : 'Desativaste o projeto.'])
  if (f.sort_order !== init.sort_order) out.push(['ordem', `Mudaste a ordem de ${init.sort_order} para ${f.sort_order}.`])
  return out
}
function dirtyText(changes, isNew) {
  if (!changes.length) return false
  if (changes.length === 1) return changes[0][1]
  return `${isNew ? 'Preencheste' : 'Mudaste'} ${changes.length} campos (${joinPt(changes.map((c) => c[0]))}).`
}

// ano "2024" (vazio = sem limite)
const YEAR_RE = /^\d{4}$/
function validate(f) {
  const e = {}
  if (!f.name.trim()) e.name = 'Escreve o nome do projeto.'
  const from = f.active_from.trim()
  const to = f.active_to.trim()
  if (from && !YEAR_RE.test(from)) e.active_from = 'Escreve um ano, por exemplo 2024.'
  if (to && !YEAR_RE.test(to)) e.active_to = 'Escreve um ano, por exemplo 2025.'
  if (!e.active_from && !e.active_to && from && to && Number(to) < Number(from)) e.active_to = 'Não pode ser antes do ano de início.'
  return e
}

// ---------- cor: 9 amostras de 44 px com nome + "Cor livre" (conta-gotas) ------------------------
function ColorPicker({ value, onChange }) {
  const f = useFieldGroup()
  const custom = !COLOR_NAME[value]
  return (
    <div className="st-swatches" role="group" aria-labelledby={f?.labelId} aria-describedby={f?.describedBy}>
      {PRESETS.map(([c, name]) => (
        <button key={c} type="button" className="st-swatch" data-p="" style={projectVars(c)}
          aria-label={name} aria-pressed={value === c} onClick={() => onChange(c)}>
          {value === c && <Icon name="check" />}
        </button>
      ))}
      <span className={`st-swatch free${custom ? ' on' : ''}`} {...(custom ? { 'data-p': '', style: projectVars(value) } : {})}>
        <Icon name={custom ? 'check' : 'dropper'} />
        <input type="color" value={value} onChange={(e) => onChange(normHex(e.target.value))}
          aria-label={custom ? `Cor livre, escolhida (${value})` : 'Cor livre'} />
      </span>
    </div>
  )
}

// ---------- logotipo: grava logo; remover tem Anular (o ficheiro só sai quando o toast acaba) ------------
const hiddenLogos = new Set()
const logoSubs = new Set()
const hideLogo = (id, on) => {
  if (on) hiddenLogos.add(id); else hiddenLogos.delete(id)
  logoSubs.forEach((fn) => fn())
}
const subscribeLogos = (fn) => { logoSubs.add(fn); return () => logoSubs.delete(fn) }

function LogoField({ project }) {
  const { projects, setProjectLogo, removeProjectLogo, logoUrl, notify, undoable } = useStore()
  const { dismiss } = useToast()
  const labelId = useId()
  const helpId = useId()
  const cur = project ? projects.find((p) => p.id === project.id) || project : null
  const hidden = useSyncExternalStore(subscribeLogos, () => !!cur && hiddenLogos.has(cur.id))
  const path = hidden ? null : cur?.logo_path || null
  const [url, setUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    let alive = true
    setUrl(null)
    if (path && cur) logoUrl(cur).then((u) => { if (alive) setUrl(u) }).catch(() => {})
    return () => { alive = false }
  }, [path]) // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (file) => {
    setBusy(true)
    setErr(null)
    try {
      // "Remover" ainda à espera do Anular: grava-se já, senão apagaria o logotipo novo ao expirar
      if (hidden) await dismiss()
      await setProjectLogo(cur, file)
      notify({ text: 'Logotipo guardado', icon: 'checkCircle' })
    } catch (ex) {
      setErr(humanError(ex))
    } finally {
      setBusy(false)
    }
  }

  const remove = () => undoable({
    text: 'Logotipo removido',
    run: async () => { hideLogo(cur.id, true); return cur },
    undo: async () => { hideLogo(cur.id, false) },
    commit: async (row) => {
      try { await removeProjectLogo(row) } finally { hideLogo(row.id, false) }
    },
  })

  const initial = (cur?.name || '').trim().charAt(0).toUpperCase()
  return (
    <div className="field">
      <span className="label" id={labelId}>Logotipo (aparece nos documentos)</span>
      <div className="st-logo" role="group" aria-labelledby={labelId} aria-describedby={cur ? undefined : helpId}>
        {url
          ? <span className="st-logo-box print-sheet"><img src={url} alt={`Logotipo de ${cur.name}`} /></span>
          : <span className="st-logo-box none" aria-hidden="true">{path ? initial : <Icon name="image" />}</span>}
        <Button variant="secondary" size="sm" icon="image" disabled={!cur} loading={busy} loadingLabel="A enviar…"
          onClick={() => fileRef.current?.click()}>
          {path ? 'Substituir' : 'Carregar'}
        </Button>
        {path && !busy && <Button variant="danger" size="sm" onClick={remove}>Remover</Button>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) upload(file) }} />
      {!cur && <div className="help" id={helpId}>Guarda o projeto primeiro; depois podes carregar o logotipo.</div>}
      {err && <div role="alert"><ErrorPanel title={err.text} detail={err.detail} /></div>}
    </div>
  )
}

// ---------- ligações que fecham a folha (pedem "Descartar alterações?" se houver) ---------------------
function SheetLink({ to, icon, onClose, children }) {
  const { guard } = useSheet()
  const go = (e) => {
    e.preventDefault()
    guard(async () => { onClose(); navigate(to) })
  }
  return (
    <a className="linkish" href={to} onClick={go}>
      {icon && <Icon name={icon} size="sm" />}{children}
    </a>
  )
}

// ---------- formulário -------------------------------------------------------------------------------
function ProjectForm({ project: p, onClose }) {
  const {
    projects, events, expenses, gcalCalendars, gcalStatus, saveProject, deleteProject, notify, today,
  } = useStore()
  const confirm = useConfirm()
  const { dismiss } = useToast()
  const formId = useId()
  const ordId = useId()
  const [init] = useState(() => initialOf(p, projects))
  const [f, setF] = useState(init)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const { alive } = useFormSave() // depois de gravar, só fecha se a folha ainda estiver aberta
  const refs = { name: useRef(null), active_from: useRef(null), active_to: useRef(null), err: useRef(null) }

  const set = (k) => (v) => {
    setF((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }))
  }
  const isNew = !p
  const dirty = dirtyText(changesOf(f, init), isNew)

  const nEvents = p ? events.filter((e) => e.project_id === p.id).length : 0
  const nExpenses = p ? expenses.filter((x) => x.project_id === p.id).length : 0
  const cals = p ? gcalCalendars.filter((c) => c.project_id === p.id) : []
  const allTotal = p ? events.filter((e) => e.project_id === p.id).reduce((a, e) => a + (Number(e.value) || 0), 0) : 0
  const lowContrast = contrastRatio(f.color, LIGHT_SURFACE) < 1.5

  useEffect(() => {
    if (saveErr) refs.err.current?.scrollIntoView({ block: 'nearest' })
  }, [saveErr]) // eslint-disable-line react-hooks/exhaustive-deps

  const errorOf = (ex) => {
    const h = humanError(ex)
    if (ex?.code === '42703' && !/supabase\//.test(h.detail)) return { ...h, detail: `${h.detail} — falta correr supabase/projects_admin.sql` }
    if (ex?.code === '23503') {
      return { ...h, text: 'Este projeto ainda está a ser usado (por exemplo num orçamento), por isso não pode ser apagado. Desativa-o.' }
    }
    return h
  }

  const submit = async (e, extra = {}) => {
    e?.preventDefault?.()
    if (busy) return
    const next = { ...f, ...extra }
    const errs = validate(next)
    const first = ['name', 'active_from', 'active_to'].find((k) => errs[k])
    if (first) {
      setErrors(errs)
      refs[first].current?.focus()
      return
    }
    const from = next.active_from.trim()
    const to = next.active_to.trim()
    const row = {
      ...(p ? { id: p.id } : {}),
      name: next.name.trim(),
      kind: next.kind,
      color: next.color,
      sort_order: Number(next.sort_order) || 0,
      active: next.active,
      active_from: from ? Number(from) : null,
      active_to: to ? Number(to) : null,
    }
    setBusy(true)
    setSaveErr(null)
    try {
      await saveProject(row)
    } catch (ex) {
      setBusy(false)
      // nome repetido (projects.name é unique): erro do campo Nome
      if (ex?.code === '23505') {
        setErrors({ name: 'Já existe um projeto com esse nome.' })
        refs.name.current?.focus()
        return
      }
      setSaveErr(errorOf(ex))
      return
    }
    const name = <b>{row.name}</b>
    notify({
      icon: 'checkCircle',
      text: extra.active === false ? <>Projeto {name} desativado</> : isNew ? <>Projeto {name} criado</> : <>Projeto {name} guardado</>,
    })
    if (alive.current) onClose()
  }

  // apagar: com eventos/despesas/calendários não dá (a base de dados recusa) — explica e oferece Desativar
  const remove = async () => {
    const uses = []
    if (nEvents) uses.push(plural(nEvents, 'evento', 'eventos'))
    if (nExpenses) uses.push(plural(nExpenses, 'despesa', 'despesas'))
    if (cals.length) uses.push(cals.length === 1 ? 'um calendário Google ligado' : `${cals.length} calendários Google ligados`)
    if (uses.length) {
      const off = p.active === false
      const ok = await confirm({
        title: 'Não é possível apagar',
        text: `O projeto ${p.name} tem ${joinPt(uses)} e não pode ser apagado. ${off
          ? 'Já está desativado, por isso não aparece nos eventos novos.'
          : 'Desativa-o para deixar de aparecer nos eventos novos.'}`,
        confirmLabel: off ? 'Percebi' : 'Desativar',
        cancelLabel: 'Cancelar',
      })
      if (ok && !off) submit(null, { active: false })
      return
    }
    const ok = await confirm({
      title: `Apagar o projeto ${p.name}?`,
      text: 'Não tem eventos nem despesas. Esta ação não se pode anular.',
      confirmLabel: 'Apagar projeto',
      cancelLabel: 'Cancelar',
      danger: true,
      primary: 'cancel',
    })
    if (!ok) return
    setBusy(true)
    setSaveErr(null)
    try {
      await dismiss() // um calendário deste projeto removido há pouco (Anular) sai primeiro da base de dados
      await deleteProject(p.id)
    } catch (ex) {
      setBusy(false)
      setSaveErr(errorOf(ex))
      return
    }
    notify({ text: <>Projeto <b>{p.name}</b> apagado</>, icon: 'checkCircle' })
    if (alive.current) onClose()
  }

  // "seguinte" no teclado passa ao campo seguinte em vez de gravar a meio
  const onKeyDown = (e) => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.target.getAttribute('enterkeyhint') !== 'next') return
    e.preventDefault()
    const els = [...e.currentTarget.querySelectorAll('input[type=text]:not([disabled])')]
    const next = els[els.indexOf(e.target) + 1]
    if (next) next.focus(); else e.target.blur()
  }

  const menu = p ? [{ label: 'Apagar projeto', icon: 'trash', danger: true, onSelect: remove }] : null
  const step = (d) => set('sort_order')(Math.max(0, f.sort_order + d))

  return (
    <Sheet variant="form" title={isNew ? 'Novo projeto' : 'Editar projeto'} dirty={busy ? false : dirty} onClose={onClose}
      menu={menu} className="st-sheet" initialFocusRef={isNew ? refs.name : undefined}
      footer={(
        <Button type="submit" form={formId} variant="primary" size="lg" block loading={busy}>
          Guardar projeto
        </Button>
      )}>
      <form id={formId} className="stack" onSubmit={submit} onKeyDown={onKeyDown} noValidate>
        <Field label="Nome" error={errors.name}>
          <TextInput ref={refs.name} value={f.name} onChange={set('name')} placeholder="Ex.: Banda do Algarve"
            autoCapitalize="words" autoComplete="off" />
        </Field>

        <Field label="Tipo">
          <Segmented value={f.kind} onChange={set('kind')} options={[
            { value: 'music', label: 'Música', icon: 'music' },
            { value: 'hair', label: 'Cabelos', icon: 'scissors' },
          ]} />
        </Field>

        <Field label="Cor" help={(
          <>
            As cores da lista distinguem-se bem nos gráficos, também para daltónicos.
            {lowContrast && (
              <span className="st-warn"><Icon name="alert" size="sm" />
                Esta cor quase não se vê no fundo claro. Os pontos terão um contorno para se distinguirem.
              </span>
            )}
          </>
        )}>
          <ColorPicker value={f.color} onChange={set('color')} />
        </Field>

        <div className="row2">
          <Field label="Ativo desde" error={errors.active_from}>
            <TextInput ref={refs.active_from} value={f.active_from} onChange={set('active_from')} placeholder="sempre"
              inputMode="numeric" maxLength={4} size={4} autoComplete="off" />
          </Field>
          <Field label="Ativo até" error={errors.active_to}>
            <TextInput ref={refs.active_to} value={f.active_to} onChange={set('active_to')} placeholder="ainda ativo"
              inputMode="numeric" maxLength={4} size={4} autoComplete="off" enterKeyHint="done" />
          </Field>
        </div>

        <Switch checked={f.active} onChange={set('active')} label="Ativo" help="Aparece ao criar eventos novos." />

        <div className="switch-row">
          {/* nos eventos os chips vêm pelo uso (spec §10.7) — a ordem só manda aqui, nas despesas, na pesquisa e nos gráficos */}
          <span className="txt"><b id={`${ordId}l`}>Ordem nas listas</b><small id={`${ordId}h`}>Nas Definições e nos gráficos. Nos eventos vêm primeiro os mais usados.</small></span>
          <span className="st-stepper" role="group" aria-labelledby={`${ordId}l`} aria-describedby={`${ordId}h`}>
            {/* aria-disabled (não disabled): no 0 o botão fica com o foco em vez de o atirar para o <body> */}
            <IconButton icon="minus" size="sm" variant="outlined" label="Subir na ordem" aria-disabled={f.sort_order <= 0 || undefined}
              onClick={() => { if (f.sort_order > 0) step(-1) }} />
            <output aria-live="polite">{f.sort_order}</output>
            <IconButton icon="plus" size="sm" variant="outlined" label="Descer na ordem" onClick={() => step(1)} />
          </span>
        </div>

        <LogoField project={p} />

        {p && (
          <div className="field">
            <span className="label">Calendários Google deste projeto</span>
            <div className="st-mini">
              {cals.length ? cals.map((c) => {
                const st = calState(gcalStatus.byCalendar?.[c.id], gcalStatus.refreshing)
                return (
                  <span key={c.id} className="it">
                    <Icon name={st.tone === 'fail' ? 'alert' : 'gcal'} size="sm" />
                    <span>{shortCalUrl(c.url)} · <span className={`st-${st.tone}`}>{st.tone === 'fail' ? 'não foi possível atualizar' : st.text}</span></span>
                  </span>
                )
              }) : <span className="it none">Nenhum calendário ligado.</span>}
            </div>
            <SheetLink to="#/definicoes?sec=google" onClose={onClose}>
              Gerir em Calendários Google<Icon name="chevR" size="sm" />
            </SheetLink>
          </div>
        )}

        {p && (
          <SheetLink to={`#/painel/${today.slice(0, 4)}`} icon="chart" onClose={onClose}>
            Ver no Painel · desde sempre <span className="money">{money(allTotal)}</span>
          </SheetLink>
        )}

        {saveErr && (
          <div ref={refs.err}>
            <ErrorPanel title={saveErr.text} detail={saveErr.detail} />
          </div>
        )}
      </form>
    </Sheet>
  )
}

export default function ProjectSheet({ id, onClose }) {
  const { projects } = useStore()
  const found = id ? projects.find((x) => x.id === id) : null
  // depois de apagar, a folha ainda desenha um instante com o último projeto conhecido
  const known = useRef(null)
  if (found) known.current = found
  const p = found || known.current
  if (id && !p) {
    return (
      <Sheet variant="form" title="Editar projeto" onClose={onClose}>
        <EmptyState icon="settings" title="Este projeto já não existe" text="Pode ter sido apagado noutro aparelho." />
      </Sheet>
    )
  }
  return <ProjectForm key={id || 'novo'} project={p} onClose={onClose} />
}
