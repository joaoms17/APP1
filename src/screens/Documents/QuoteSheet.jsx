import { useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  Badge, Button, DateInput, EmptyState, Field, IconButton, MoneyInput, ProjectChips, Sheet, Skeleton,
  TextArea, TextInput, moneyInputValue, parseMoney, useField,
} from '../../ui'
import { useStore } from '../../store.jsx'
import { openSheet } from '../../router.js'
import { fmtDate, fmtDay, fmtMoney } from '../../format.js'
import { humanError } from '../../errors.js'
import { ErrorPanel } from '../../shell/lazy.jsx'
import PrintSheet, { DocHead, Ornament } from './PrintSheet.jsx'
import './Documents.css'

// Folha Orçamento (spec §10.15): Cliente · Projeto (chips) · Data · Local · Serviços (stepper 44 px) ·
// Outro serviço · Desconto · total · Notas · barra [Ver PDF] [Guardar] · "…": Marcar como enviado ·
// Aceite — criar evento · Apagar (Anular). Só com FEATURES.docs.
//   openSheet('orcamento', id) · openSheet('orcamento', { preset: { project_id, event_date, location, event_id } })

export const QUOTE_STATUS = {
  draft: { label: 'Rascunho', tone: 'neutral' },
  sent: { label: 'Enviado', tone: 'info' },
  accepted: { label: 'Aceite', tone: 'paid', icon: 'check' },
  rejected: { label: 'Recusado', tone: 'overdue' },
}
export function QuoteBadge({ status }) {
  const st = QUOTE_STATUS[status] || QUOTE_STATUS.draft
  return <Badge tone={st.tone} icon={st.icon}>{st.label}</Badge>
}

// orçamentos à espera do Anular (apagados na base de dados só quando o toast acaba)
let hiddenQuotes = new Set()
const subs = new Set()
const hideQuote = (id, on) => {
  const next = new Set(hiddenQuotes)
  if (on) next.add(id); else next.delete(id)
  hiddenQuotes = next
  subs.forEach((fn) => fn())
}
const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn) }
export const useHiddenQuotes = () => useSyncExternalStore(subscribe, () => hiddenQuotes)

const money = (n) => fmtMoney(n, { cents: 'auto' })
const docMoney = (n) => fmtMoney(n, { cents: 'always' })
const num = (s) => { const n = parseMoney(s); return Number.isFinite(n) ? n : 0 }
const HAIR_SUB = 'Hairstyling · Penteados de noiva e eventos'

function initialOf(q, preset, projects) {
  const p = preset || {}
  return {
    project_id: q?.project_id || p.project_id || projects.find((x) => x.kind === 'hair')?.id || projects[0]?.id || null,
    client_name: q?.client_name || p.client_name || '',
    event_date: q?.event_date || p.event_date || '',
    location: q?.location || p.location || '',
    discount: q?.discount ? moneyInputValue(Number(q.discount)) : '',
    notes: q?.notes || '',
    status: q?.status || 'draft',
  }
}
const itemsKey = (items) => JSON.stringify(items.map((i) => [i.service_name, Number(i.unit_price), i.qty]))

// serviços da tabela com stepper − n + (44 px); os livres com lixo
function Services({ services, items, setItems }) {
  const f = useField()
  const qtyOf = (name) => items.find((i) => i.service_name === name)?.qty || 0
  const bump = (svc, d) => setItems((its) => {
    const cur = its.find((i) => i.service_name === svc.name)
    if (!cur && d > 0) return [...its, { service_name: svc.name, unit_price: Number(svc.price), qty: 1 }]
    if (!cur) return its
    const qty = cur.qty + d
    return qty <= 0 ? its.filter((i) => i !== cur) : its.map((i) => (i === cur ? { ...i, qty } : i))
  })
  const custom = items.filter((i) => !services.some((s) => s.name === i.service_name))
  return (
    <div className="doc-svcs" role="group" aria-labelledby={f?.labelId}>
      {services.map((s) => {
        const n = qtyOf(s.name)
        return (
          <div key={s.id} className="doc-svc">
            <span><b>{s.name}</b><small>{money(Number(s.price))}</small></span>
            <span className="doc-stepper">
              <IconButton icon="minus" variant="outlined" label={`Tirar um: ${s.name}`} disabled={!n} onClick={() => bump(s, -1)} />
              <output aria-live="polite" aria-label={`${s.name}: ${n}`}>{n}</output>
              <IconButton icon="plus" variant="outlined" label={`Juntar um: ${s.name}`} onClick={() => bump(s, 1)} />
            </span>
          </div>
        )
      })}
      {custom.map((i) => (
        <div key={i.service_name} className="doc-svc">
          <span><b>{i.service_name}</b><small>{money(Number(i.unit_price))} × {i.qty}</small></span>
          <IconButton icon="trash" label={`Tirar ${i.service_name}`} onClick={() => setItems((its) => its.filter((x) => x !== i))} />
        </div>
      ))}
    </div>
  )
}

// "Outro serviço · € · [Adicionar]"
function OtherService({ onAdd }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const add = () => {
    if (!name.trim()) return
    onAdd({ service_name: name.trim(), unit_price: num(price), qty: 1 })
    setName('')
    setPrice('')
  }
  return (
    <div className="doc-inline" role="group" aria-label="Outro serviço">
      <TextInput value={name} onChange={setName} placeholder="Outro serviço" aria-label="Nome do outro serviço" autoComplete="off" />
      <MoneyInput value={price} onChange={setPrice} placeholder="0" aria-label="Preço do outro serviço" className="doc-price-in" />
      <Button size="sm" icon="plus" disabled={!name.trim()} onClick={add}>Adicionar</Button>
    </div>
  )
}

function QuotePrint({ quote, items, project, today, onClose }) {
  const subtotal = items.reduce((a, i) => a + Number(i.unit_price) * i.qty, 0)
  const discount = Number(quote.discount) || 0
  return (
    <PrintSheet title="Orçamento" onClose={onClose}>
      <DocHead project={project} sub={project?.kind === 'music' ? project.name : HAIR_SUB} />
      <h1 className="doc-title">Orçamento</h1>
      <div className="doc-meta">
        <div><b>{quote.client_name}</b></div>
        {quote.event_date && <div>Data do evento: {fmtDate(quote.event_date)}</div>}
        {quote.location && <div>Local: {quote.location}</div>}
        <div>Orçamento emitido a {fmtDate(today)}</div>
      </div>
      <table className="doc-table">
        <thead><tr><th scope="col">Serviço</th><th scope="col" className="num">Qtd</th><th scope="col" className="num">Preço</th><th scope="col" className="num">Total</th></tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.service_name}>
              <td>{i.service_name}</td>
              <td className="num">{i.qty}</td>
              <td className="num">{docMoney(Number(i.unit_price))}</td>
              <td className="num">{docMoney(Number(i.unit_price) * i.qty)}</td>
            </tr>
          ))}
          {discount > 0 && <tr><td colSpan="3">Desconto</td><td className="num">−{docMoney(discount)}</td></tr>}
          <tr className="doc-total"><td colSpan="3">Total</td><td className="num">{docMoney(subtotal - discount)}</td></tr>
        </tbody>
      </table>
      {quote.notes && <p className="doc-notes">{quote.notes}</p>}
      <p className="doc-foot">Orçamento válido por 30 dias. Obrigada pela preferência!</p>
      <Ornament />
    </PrintSheet>
  )
}

function QuoteForm({ quote, preset, onClose }) {
  const store = useStore()
  const { projects, projectById, projectOptions, services, itemsForQuote, saveQuote, notify, undoable, today } = store
  const latest = useRef(store)
  latest.current = store
  const formId = useId()
  const clientRef = useRef(null)
  const errRef = useRef(null)
  const [quoteId, setQuoteId] = useState(quote?.id || null)
  const [base, setBase] = useState(() => ({
    f: initialOf(quote, preset, projects),
    items: quote?.id ? itemsForQuote(quote.id).map((i) => ({ service_name: i.service_name, unit_price: Number(i.unit_price), qty: i.qty })) : [],
  }))
  const [f, setF] = useState(base.f)
  const [items, setItems] = useState(base.items)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState(null)
  const [printing, setPrinting] = useState(null) // { row, items }

  const set = (k) => (v) => {
    setF((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }))
  }
  const options = useMemo(() => projectOptions(base.f.project_id), [projectOptions, base.f.project_id])
  const activeServices = services.filter((s) => s.active !== false)
  const subtotal = items.reduce((a, i) => a + Number(i.unit_price) * i.qty, 0)
  const discount = num(f.discount)
  const total = subtotal - discount

  const changed = JSON.stringify(f) !== JSON.stringify(base.f) || itemsKey(items) !== itemsKey(base.items)
  const dirty = !busy && changed && (quoteId ? 'Mudaste este orçamento.' : 'Começaste um orçamento novo.')

  const buildRow = (extra = {}) => ({
    ...(quoteId ? { id: quoteId } : {}),
    project_id: f.project_id || null,
    client_name: f.client_name.trim(),
    event_date: f.event_date || null,
    location: f.location.trim() || null,
    discount: Math.round(discount * 100) / 100,
    notes: f.notes.trim() || null,
    status: f.status,
    ...(!quoteId && preset?.event_id ? { event_id: preset.event_id } : {}),
    ...extra,
  })

  // grava (sem fechar) → { id, row } ou null; os erros aparecem no fim do formulário
  const save = async (extra) => {
    if (!f.client_name.trim()) {
      setErrors({ client_name: 'Escreve o nome da cliente.' })
      clientRef.current?.focus()
      return null
    }
    if (parseMoney(f.discount) != null && Number.isNaN(parseMoney(f.discount))) {
      setErrors({ discount: 'Escreve um valor válido, por exemplo 20.' })
      return null
    }
    const row = buildRow(extra)
    setBusy(true)
    setFail(null)
    try {
      const id = await saveQuote(row, items)
      setQuoteId(id)
      const nf = { ...f, status: row.status }
      setF(nf)
      setBase({ f: nf, items })
      setBusy(false)
      return { id, row: { ...row, id } }
    } catch (ex) {
      setBusy(false)
      setFail(humanError(ex))
      setTimeout(() => errRef.current?.scrollIntoView({ block: 'nearest' }), 0)
      return null
    }
  }

  const submit = async (e) => {
    e?.preventDefault()
    if (busy) return
    if (await save()) {
      notify({ text: 'Orçamento guardado', icon: 'checkCircle' })
      onClose()
    }
  }

  const viewPdf = async () => {
    if (busy) return
    const saved = !quoteId || changed ? await save() : { id: quoteId, row: buildRow() }
    if (saved) setPrinting({ row: saved.row, items })
  }

  const markSent = async () => {
    if (await save({ status: 'sent' })) {
      notify({ text: 'Orçamento marcado como enviado', icon: 'checkCircle' })
      onClose()
    }
  }

  // Aceite: grava e cria o evento no projeto do orçamento (acceptQuote) — o total vem das linhas gravadas
  const accept = async () => {
    const saved = await save()
    if (!saved) return
    setBusy(true)
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))) // store já com as linhas novas
    try {
      const evId = await latest.current.acceptQuote(saved.row)
      notify({ text: <>Orçamento aceite · evento de <b>{saved.row.client_name}</b> criado</>, icon: 'checkCircle',
        action: { label: 'Ver', run: () => openSheet('evento', evId) } })
      onClose()
    } catch (ex) {
      setBusy(false)
      setFail(humanError(ex))
    }
  }

  const remove = () => {
    const id = quoteId
    undoable({
      text: <>Orçamento de <b>{f.client_name.trim() || 'cliente'}</b> apagado</>,
      run: async () => { hideQuote(id, true); return id },
      undo: async () => { hideQuote(id, false) },
      commit: async () => {
        try { await latest.current.deleteQuote(id) } finally { hideQuote(id, false) }
      },
    })
    onClose()
  }

  if (printing) {
    return (
      <QuotePrint quote={printing.row} items={printing.items} project={projectById(printing.row.project_id)}
        today={today} onClose={() => setPrinting(null)} />
    )
  }

  const menu = quoteId ? [
    { label: 'Marcar como enviado', icon: 'share', hidden: f.status !== 'draft', onSelect: markSent },
    { label: 'Aceite — criar evento', icon: 'check', hidden: f.status === 'accepted', onSelect: accept },
    { label: 'Apagar orçamento', icon: 'trash', danger: true, onSelect: remove },
  ] : null

  return (
    <Sheet variant="form" title={quoteId ? 'Orçamento' : 'Novo orçamento'} dirty={dirty} onClose={onClose} menu={menu}
      className="doc-sheet" initialFocusRef={quoteId ? undefined : clientRef}
      footer={(
        <>
          <Button icon="eye" onClick={viewPdf} disabled={busy}>Ver PDF</Button>
          <Button type="submit" form={formId} variant="primary" size="lg" loading={busy}>Guardar</Button>
        </>
      )}>
      <form id={formId} className="stack" onSubmit={submit} noValidate>
        {quoteId && <p className="doc-state">Estado <QuoteBadge status={f.status} /></p>}
        <Field label="Cliente" error={errors.client_name}>
          <TextInput ref={clientRef} value={f.client_name} onChange={set('client_name')} placeholder="Ex.: Maria Silva"
            autoCapitalize="words" autoComplete="off" />
        </Field>
        <Field label="Projeto">
          <ProjectChips value={f.project_id} onChange={set('project_id')} projects={options} includeInactiveToggle />
        </Field>
        <div className="row2">
          <Field label="Data do evento">
            <DateInput value={f.event_date} onChange={set('event_date')} placeholder="Sem data"
              format={(v) => fmtDay(v, { weekday: null, year: true })} />
          </Field>
          <Field label="Local">
            <TextInput value={f.location} onChange={set('location')} placeholder="Ex.: Tavira" />
          </Field>
        </div>
        <Field label="Serviços" help={activeServices.length ? null : 'A tabela de preços está vazia: junta serviços em Definições › Tabela de preços.'}>
          <Services services={activeServices} items={items} setItems={setItems} />
        </Field>
        <OtherService onAdd={(it) => setItems((its) => [...its, it])} />
        <Field label="Desconto" error={errors.discount}>
          <MoneyInput value={f.discount} onChange={set('discount')} placeholder="0" />
        </Field>
        <div className="readout doc-total" aria-live="polite">
          <span>Total{discount > 0 && <> · {money(subtotal)} − {money(discount)}</>}</span>
          <b className="money">{money(total)}</b>
        </div>
        <Field label="Notas (aparecem no orçamento)">
          <TextArea value={f.notes} onChange={set('notes')} placeholder="Ex.: inclui prova; deslocação até 30 km" />
        </Field>
        {fail && <div ref={errRef}><ErrorPanel title={fail.text} detail={fail.detail} /></div>}
      </form>
    </Sheet>
  )
}

export default function QuoteSheet({ id, preset, onClose }) {
  const { quotes, loadingPhases } = useStore()
  const hidden = useHiddenQuotes()
  const found = id && !hidden.has(id) ? quotes.find((q) => q.id === id) : null
  const known = useRef(null)
  if (found) known.current = found
  const q = found || known.current
  if (id && !q) {
    return (
      <Sheet variant="form" title="Orçamento" onClose={onClose}>
        {loadingPhases.phase2
          ? <Skeleton lines={4} label="A carregar o orçamento" />
          : <EmptyState icon="file" title="Este orçamento já não existe" text="Pode ter sido apagado noutro aparelho." />}
      </Sheet>
    )
  }
  return <QuoteForm key={id || 'novo'} quote={q} preset={preset} onClose={onClose} />
}
