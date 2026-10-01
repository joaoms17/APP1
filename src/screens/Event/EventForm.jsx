import { useId, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  Button, Callout, DateInput, EmptyState, Field, MoneyInput, NewKindSwitch, PendingAttachments, ProjectChips,
  Segmented, Sheet, Skeleton, Switch, TextArea, TextInput, TimeInput, confirmDialog, moneyInputValue, parseMoney,
  useFormSave,
} from '../../ui'
import { useStore } from '../../store.jsx'
import { getRoute, navigate, openSheet, setParams, tabHref } from '../../router.js'
import { fmtDM, fmtDMY, fmtTime } from '../../format.js'
import { money, payDayFormat } from './PaymentBlock.jsx'

const EPS = 0.005
const TITLE = { edit: 'Editar evento', new: 'Novo', google: 'Registar do Google' }
const PAY_OPTIONS = [
  { value: 'none', label: 'Nada ainda' },
  { value: 'deposit', label: 'Sinal' },
  { value: 'full', label: 'Tudo recebido' },
]
// Agenda em modo Procurar: texto ou um filtro na rota (como em Agenda.jsx)
const SEARCH_KEYS = ['q', 'quando', 'estado', 'p']
const BAD_MONEY = 'Escreve um valor válido, por exemplo 269,50.'
const NEG_MONEY = 'O valor não pode ser negativo.'

// valores do formulário: dinheiro em texto ('269,50'); líquido vazio = igual ao bruto
const numOf = (v) => (v == null || v === '' ? null : Number(v))
function moneyFields(gross, value) {
  const g = numOf(gross) ?? numOf(value)
  const v = numOf(value)
  return {
    gross: g == null ? '' : moneyInputValue(g),
    net: v != null && g != null && Math.abs(v - g) > EPS ? moneyInputValue(v) : '',
  }
}

// estado inicial por modo: edit ← evento; google ← evento do Google; new ← preset (dia, cópia, ficheiros)
function initialOf({ mode, ev, g, preset, today, defaultProject }) {
  const base = { receipt: false, pay: 'none', payAmount: '', payDate: today, files: [] }
  if (mode === 'edit') {
    return {
      ...base, project_id: ev.project_id, title: ev.title || '', event_date: ev.event_date,
      start_time: fmtTime(ev.start_time), location: ev.location || '', notes: ev.notes || '',
      ...moneyFields(ev.gross_value, ev.value),
    }
  }
  if (mode === 'google') {
    return {
      ...base, project_id: g.project_id || defaultProject, title: g.title || '', event_date: g.date,
      start_time: g.time || '', location: g.location || '', notes: '', gross: '', net: '',
    }
  }
  const p = preset || {}
  return {
    ...base, project_id: p.project_id || defaultProject, title: p.title || '', event_date: p.data || p.event_date || today,
    start_time: fmtTime(p.start_time), location: p.location || '', notes: p.notes || '',
    files: Array.isArray(p.files) ? p.files : [],
    ...moneyFields(p.gross_value, p.value),
  }
}

// ---------- frase do "Descartar alterações?" (spec §10.9) ---------------------------------
const joinPt = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`)
const quoted = (s) => `“${s}”`

// uma alteração: "Mudaste o valor bruto de 520 € para 450 €." · "Preencheste o título (“X”)." · "Apagaste o local (Faro)."
function change(label, from, to, fmt = (x) => x) {
  if (!from) return `Preencheste ${label} (${fmt(to)}).`
  if (!to) return `Apagaste ${label} (${fmt(from)}).`
  return `Mudaste ${label} de ${fmt(from)} para ${fmt(to)}.`
}

function changesOf(f, init, { projectName, today }) {
  const out = [] // [nome curto, frase]
  const day = (v) => (v.slice(0, 4) === today.slice(0, 4) ? fmtDM(v) : fmtDMY(v))
  const eur = (v) => money(parseMoney(v))
  const sameMoney = (a, b) => {
    const x = parseMoney(a)
    const y = parseMoney(b)
    return x === y || (Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < EPS) || (Number.isNaN(x) && Number.isNaN(y) && a === b)
  }
  if (f.project_id !== init.project_id) out.push(['projeto', change('o projeto', projectName(init.project_id), projectName(f.project_id))])
  if (f.title.trim() !== init.title.trim()) out.push(['título', change('o título', init.title.trim(), f.title.trim(), quoted)])
  if (f.event_date !== init.event_date) out.push(['data', change('a data', init.event_date, f.event_date, day)])
  if (f.start_time !== init.start_time) out.push(['hora', change('a hora', init.start_time, f.start_time)])
  if (f.location.trim() !== init.location.trim()) out.push(['local', change('o local', init.location.trim(), f.location.trim())])
  if (!sameMoney(f.gross, init.gross)) out.push(['valor', change('o valor bruto', init.gross, f.gross, eur)])
  if (!sameMoney(f.net, init.net)) out.push(['valor líquido', change('o valor líquido', init.net, f.net, eur)])
  if (f.pay !== init.pay) {
    out.push(['pagamento', f.pay === 'deposit' ? 'Escolheste registar um sinal.' : f.pay === 'full' ? 'Escolheste Tudo recebido.' : 'Mudaste o pagamento.'])
  } else if (f.pay === 'deposit' && !sameMoney(f.payAmount, init.payAmount)) {
    out.push(['pagamento', change('o valor do sinal', init.payAmount, f.payAmount, eur)])
  }
  if (f.files.length !== init.files.length) {
    const n = f.files.length - init.files.length
    out.push(['anexos', n > 0 ? (n === 1 ? 'Juntaste um anexo.' : `Juntaste ${n} anexos.`) : 'Tiraste um anexo.'])
  }
  if (f.receipt !== init.receipt) out.push(['recibo', f.receipt ? 'Marcaste o recibo como emitido.' : 'Desmarcaste o recibo.'])
  if (f.notes.trim() !== init.notes.trim()) out.push(['notas', init.notes.trim() ? 'Mudaste as notas.' : 'Escreveste uma nota.'])
  return out
}

function dirtyText(changes, mode) {
  if (!changes.length) return false
  if (changes.length === 1) return changes[0][1]
  const verb = mode === 'edit' ? 'Mudaste' : 'Preencheste'
  return `${verb} ${changes.length} campos (${joinPt(changes.map((c) => c[0]))}).`
}

// ---------- formulário ------------------------------------------------------------------
// Editar · Novo · Registar do Google (spec §10.7–10.8). Só grava em Guardar; nunca envia
// paid/paid_at (os pagamentos vivem no Detalhe; no Novo viram linhas de payments).
function EventFormBody({ mode, id, ev, g, preset, focus, onClose, onDelete }) {
  const {
    today, projectById, projectOptions, lastProjectId, paymentsByEvent, paidAmount,
    createEvent, updateEventFields, setLastProjectId, notify,
  } = useStore()
  // depois de gravar só fecha/navega se o formulário ainda estiver aberto; o erro sai com ele
  const { alive, fail } = useFormSave()
  const formId = useId()
  const netHelpId = useId()

  // projeto pré-selecionado: o último usado (se ainda estiver na lista), senão o primeiro
  const [lastUsed] = useState(() => {
    const opts = projectOptions(null)
    return opts.some((p) => p.id === lastProjectId) ? lastProjectId : null
  })
  const [init] = useState(() => initialOf({
    mode, ev, g, preset, today, defaultProject: lastUsed || projectOptions(null)[0]?.id || null,
  }))
  const [f, setF] = useState(init)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const options = useMemo(() => projectOptions(init.project_id), [projectOptions, init.project_id])

  const refs = {
    project_id: useRef(null), title: useRef(null), event_date: useRef(null), gross: useRef(null),
    net: useRef(null), payAmount: useRef(null), payDate: useRef(null), notes: useRef(null),
  }
  const set = (k) => (v) => {
    setF((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }))
  }

  // valores escritos → números (líquido vazio = bruto)
  const gross = parseMoney(f.gross)
  const net = parseMoney(f.net)
  const value = Number.isFinite(net) ? net : Number.isFinite(gross) ? gross : 0
  const deposit = parseMoney(f.payAmount)

  // pagamento já recebido (Editar): o aviso acompanha o valor enquanto se escreve
  const payRows = ev ? paymentsByEvent.get(ev.id) || [] : []
  const got = ev ? paidAmount(ev) : 0
  const legacy = !!ev?.paid && payRows.length === 0

  const projectName = (pid) => projectById(pid)?.name || ''
  const changes = changesOf(f, init, { projectName, today })
  const dirty = dirtyText(changes, mode)

  function validate() {
    const e = {}
    if (!f.project_id) e.project_id = 'Escolhe o projeto.'
    if (!f.title.trim()) e.title = 'Escreve o título.'
    if (!f.event_date) e.event_date = 'Escolhe a data.'
    if (Number.isNaN(gross)) e.gross = BAD_MONEY
    else if (gross < 0) e.gross = NEG_MONEY
    if (Number.isNaN(net)) e.net = BAD_MONEY
    else if (net < 0) e.net = NEG_MONEY
    if (mode !== 'edit' && f.pay === 'deposit') {
      if (deposit == null || !(deposit > 0)) {
        e.payAmount = Number.isNaN(deposit) ? BAD_MONEY : deposit < 0 ? NEG_MONEY : 'Escreve o valor do sinal.'
      }
      else if (value > 0 && deposit > value + EPS) e.payAmount = `O sinal é maior do que o valor do evento (${money(value)}).`
    }
    if (mode !== 'edit' && f.pay !== 'none' && !(value > 0) && !e.gross && !e.net) {
      e.gross = f.pay === 'full' ? 'Escreve o valor para o registar como recebido.' : 'Escreve o valor do evento para registar o sinal.'
    }
    if (mode !== 'edit' && f.pay !== 'none' && !f.payDate) e.payDate = 'Escolhe a data em que recebeste.'
    return e
  }

  // depois de guardar: fecha e leva a Agenda ao dia, com a linha a piscar (flash=<id>).
  //   já na Agenda → fica na vista em que estava, sem entrada nova no histórico (o 1.º voltar sai da
  //     Agenda): o Procurar mantém o texto e os chips (spec §10.4); a Lista só mostra de hoje em diante,
  //     por isso um evento de um dia passado leva ao Mês desse dia (R1-32)
  //   Novo noutro separador → vai à Agenda (com entrada: voltar regressa ao separador de onde se veio)
  //   Editar ou registar a partir de outro separador (ex.: Receber) fica onde estava.
  const finish = (evId, date) => {
    // fechado entretanto (Cancelar a meio da gravação): não fecha nem leva a Agenda — outra folha
    // aberta depois fica onde está (o toast "Evento guardado · Ver" diz que ficou gravado)
    if (!alive.current) return
    const r = getRoute()
    const inAgenda = r.tab === 'agenda'
    onClose()
    if (!inAgenda && mode !== 'new') return
    const searching = inAgenda && SEARCH_KEYS.some((k) => k in r.params)
    const month = date < today || (inAgenda ? r.path[1] === 'mes' : /^#\/agenda\/mes/.test(tabHref('agenda')))
    if (searching) setParams({ flash: evId })
    else navigate(month ? `#/agenda/mes/${date}?flash=${evId}` : `#/agenda/lista?flash=${evId}`, { replace: inAgenda })
  }

  const submitRef = useRef(null)
  const submit = async (e) => {
    e?.preventDefault()
    if (busy) return
    const errs = validate()
    const first = ['project_id', 'title', 'event_date', 'gross', 'net', 'payAmount', 'payDate'].find((k) => errs[k])
    if (first) {
      setErrors(errs)
      const el = refs[first].current
      const target = el?.matches?.('input, textarea') ? el : el?.querySelector?.('input, button')
      target?.focus()
      return
    }
    const fields = {
      project_id: f.project_id,
      title: f.title.trim(),
      event_date: f.event_date,
      start_time: f.start_time || null,
      location: f.location.trim() || null,
      gross_value: gross ?? value,
      value,
      notes: f.notes.trim() || null,
    }

    if (mode === 'edit') {
      // baixar o valor para menos do que já foi recebido pede confirmação (IA-02)
      if (!legacy && got > EPS && value < got - EPS) {
        const ok = await confirmDialog({
          title: `Baixar o valor para ${money(value)}?`,
          text: `Já recebeste ${money(got)} deste evento.`,
          confirmLabel: 'Guardar mesmo assim',
          cancelLabel: 'Corrigir',
          primary: 'cancel',
        })
        if (!ok) { refs.gross.current?.focus(); return }
        if (!alive.current) return // a folha fechou enquanto a pergunta estava aberta (ex.: voltar + Descartar)
      }
      setBusy(true)
      try {
        await updateEventFields(id, fields)
      } catch (ex) {
        setBusy(false)
        fail(ex, () => submitRef.current?.())
        return
      }
      notify({ text: 'Evento guardado', action: { label: 'Ver', run: () => openSheet('evento', id) } })
      finish(id, fields.event_date)
      return
    }

    const payment = f.pay === 'deposit' ? { kind: 'deposit', amount: deposit, date: f.payDate }
      : f.pay === 'full' ? { kind: 'full', amount: value, date: f.payDate }
      : { kind: 'none' }
    setBusy(true)
    let newId
    try {
      newId = await createEvent({ ...fields, receipt_issued: f.receipt }, { payment, files: f.files })
    } catch (ex) {
      setBusy(false)
      fail(ex, () => submitRef.current?.())
      return
    }
    setLastProjectId(fields.project_id)
    finish(newId, fields.event_date)
  }
  submitRef.current = submit

  // Enter ("seguinte") passa ao campo seguinte em vez de gravar a meio — também na Data e na Hora,
  // onde o browser submeteria o formulário; só grava no botão Guardar
  const onKeyDown = (e) => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.target.getAttribute('enterkeyhint') === 'done') return
    e.preventDefault()
    const els = [...e.currentTarget.querySelectorAll('input:not([type=file]):not([disabled]), textarea')]
    els[els.indexOf(e.target) + 1]?.focus()
  }

  // Pagamento: o sub-bloco que aparece (Sinal → Valor do sinal + Recebido a; Tudo recebido → Recebido a)
  // fica à vista acima da barra; no Sinal o foco vai logo para o valor (teclado numérico aberto) — "Noiva
  // com sinal" em 3–4 toques (spec §3.5), sem rolar à procura do campo (R1-33). O foco é dado aqui, ainda
  // dentro do toque (o iOS só abre o teclado assim); com as setas, o Segmented devolve-o à opção a seguir.
  const paySub = useRef(null)
  const choosePay = (v) => {
    flushSync(() => set('pay')(v))
    const sub = paySub.current
    if (!sub) return
    if (v === 'deposit') refs.payAmount.current?.focus({ preventScroll: true })
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    sub.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }

  const saveLabel = mode === 'edit' ? 'Guardar alterações'
    : f.pay === 'deposit' && deposit > 0 ? `Guardar · sinal ${money(deposit)}`
    : f.pay === 'full' && value > 0 ? `Guardar · recebido ${money(value)}`
    : 'Guardar evento'

  const focusRef = mode === 'google' ? refs.gross : mode === 'new' ? refs.title : focus === 'notas' ? refs.notes : undefined

  return (
    <Sheet variant="form" title={TITLE[mode]} dirty={busy ? false : dirty} onClose={onClose} className="ev-sheet"
      initialFocusRef={focusRef}
      footer={<Button type="submit" form={formId} variant="primary" size="lg" block loading={busy}>{saveLabel}</Button>}>
      <form id={formId} className="ev-form" onSubmit={submit} onKeyDown={onKeyDown} noValidate>
        {mode === 'new' && <NewKindSwitch value="evento" />}
        {mode === 'google' && (
          <Callout tone="info" title="A registar do Google Calendar.">Confirma o valor e guarda.</Callout>
        )}

        <Field label="Projeto" error={errors.project_id}
          help={mode === 'new' && lastUsed && f.project_id === lastUsed && !preset?.project_id ? 'Pré-selecionado: o último que usaste.' : null}>
          <div ref={refs.project_id}>
            <ProjectChips value={f.project_id} projects={options} onChange={set('project_id')} />
          </div>
        </Field>

        <Field label="Título" error={errors.title}>
          <TextInput ref={refs.title} value={f.title} onChange={set('title')} placeholder="Ex.: Noiva Madalena Reis"
            autoCapitalize="sentences" autoComplete="off" />
        </Field>

        <div className="row-dt">
          <Field label="Data" error={errors.event_date}>
            <DateInput ref={refs.event_date} value={f.event_date} onChange={set('event_date')} />
          </Field>
          <Field label="Hora">
            <TimeInput value={f.start_time} onChange={set('start_time')} />
          </Field>
        </div>

        <Field label="Local">
          <TextInput icon="pin" value={f.location} onChange={set('location')} placeholder="Ex.: Almancil" autoComplete="off" />
        </Field>

        <div className="row2">
          <Field label="Valor bruto" error={errors.gross}>
            <MoneyInput ref={refs.gross} value={f.gross} onChange={set('gross')}
              aria-describedby={errors.gross ? undefined : netHelpId} />
          </Field>
          <Field label="Valor líquido" error={errors.net}>
            <MoneyInput ref={refs.net} value={f.net} onChange={set('net')} placeholder="igual ao bruto"
              aria-describedby={errors.net ? undefined : netHelpId} />
          </Field>
        </div>
        <p className="ev-form-help" id={netHelpId}>O líquido é o que recebes depois de retenções. Vazio = igual ao bruto.</p>

        {mode === 'edit' ? (
          <>
            <PaymentNote ev={ev} got={got} value={value} legacy={legacy} payments={payRows.length} />
            <Field label="Notas">
              <TextArea ref={refs.notes} value={f.notes} onChange={set('notes')} placeholder="Ex.: confirmar hora com a noiva" enterKeyHint="done" />
            </Field>
            <Button variant="danger" icon="trash" className="ev-start" onClick={onDelete}>
              Apagar evento
            </Button>
          </>
        ) : (
          <>
            <Field label="Pagamento">
              <Segmented value={f.pay} options={PAY_OPTIONS} onChange={choosePay} />
              {f.pay === 'deposit' && (
                <div ref={paySub} className="ev-sub">
                  <div className="row2">
                    <Field label="Valor do sinal" error={errors.payAmount}>
                      <MoneyInput ref={refs.payAmount} value={f.payAmount} onChange={set('payAmount')} />
                    </Field>
                    <Field label="Recebido a" error={errors.payDate}>
                      <DateInput ref={refs.payDate} value={f.payDate} format={payDayFormat(today)} onChange={set('payDate')} />
                    </Field>
                  </div>
                  <p className="ev-sub-help">
                    Fica registado como pagamento.
                    {deposit > 0 && value > 0 && <> Depois de guardar: <b>{value - deposit > EPS ? `falta ${money(value - deposit)}` : 'tudo recebido'}</b>.</>}
                  </p>
                </div>
              )}
              {f.pay === 'full' && (
                <div ref={paySub} className="ev-sub">
                  <Field label="Recebido a" error={errors.payDate}>
                    <DateInput ref={refs.payDate} value={f.payDate} format={payDayFormat(today)} onChange={set('payDate')} />
                  </Field>
                  <p className="ev-sub-help">
                    {value > 0 ? <>Fica registado um pagamento de <b>{money(value)}</b>.</> : 'Escreve o valor do evento para o registar como recebido.'}
                  </p>
                </div>
              )}
            </Field>

            <div className="field">
              <span className="label">Anexos</span>
              <PendingAttachments files={f.files} onChange={set('files')} />
            </div>

            <Switch checked={f.receipt} onChange={set('receipt')} label="Recibo emitido" help="Podes marcar depois, no detalhe." />

            <Field label="Notas">
              <TextArea ref={refs.notes} value={f.notes} onChange={set('notes')} placeholder="Ex.: inclui prova" enterKeyHint="done" />
            </Field>
          </>
        )}
      </form>
    </Sheet>
  )
}

// Editar: estado do pagamento só de leitura (os pagamentos gravam-se no Detalhe, com Anular)
function PaymentNote({ ev, got, value, legacy, payments }) {
  const miss = Math.max(0, value - got)
  let head
  if (legacy) head = 'Pagamento: marcado como recebido, sem pagamentos registados.'
  else if (got <= EPS) head = `Pagamento: nada recebido · falta ${money(miss)}.`
  else if (value < got - EPS) head = `Pagamento: já recebeste ${money(got)}, mais do que o valor novo (${money(value)}).`
  else if (miss <= EPS) head = `Pagamento: tudo recebido (${money(got)}).`
  else head = `Pagamento: ${payments === 1 ? `sinal de ${money(got)} recebido` : `${money(got)} recebidos`} · falta ${money(miss)}.`
  const lower = !legacy && got > EPS ? ` Se baixares o valor para menos de ${money(got)}, pedimos confirmação.` : ''
  return (
    <Callout tone="neutral">
      <b>{head}</b><br />
      Pagamentos, recibo e anexos tratam-se no detalhe e gravam logo.{lower}
    </Callout>
  )
}

// Escolhe o que mostrar enquanto os dados chegam (evento apagado, Google ainda a carregar…)
export default function EventForm({ mode, id, preset, onClose }) {
  const { eventById, findGoogle, deleteEvent, loadingPhases, gcalStatus } = useStore()
  const focus = mode === 'edit' ? preset?.foco : undefined

  // ao apagar, a folha fecha com o último estado visto (o evento sai logo da lista)
  const closing = useRef(false)
  const last = useRef(null)
  const live = mode === 'edit' ? eventById(id) : null
  if (live) last.current = live
  const ev = live || (closing.current ? last.current : null)
  const g = mode === 'google' ? findGoogle(preset?.key) : null
  const onDelete = () => {
    closing.current = true
    onClose()
    deleteEvent(ev)
  }

  const shell = (body) => (
    <Sheet variant="form" title={TITLE[mode] || 'Evento'} onClose={onClose} className="ev-sheet">{body}</Sheet>
  )
  if (mode === 'edit' && !ev) {
    return shell(<EmptyState icon="calendar" title="Este evento já não existe" text="Pode ter sido apagado noutro dispositivo."
      action={<Button onClick={onClose}>Fechar</Button>} />)
  }
  if (mode === 'google' && !g) {
    if (loadingPhases.phase2 || gcalStatus.refreshing) return shell(<Skeleton lines={4} label="A carregar o Google Calendar" />)
    return shell(<EmptyState icon="gcal" title="Este evento do Google já não está disponível"
      text="Pode ter mudado ou saído do calendário." action={<Button onClick={onClose}>Fechar</Button>} />)
  }
  return <EventFormBody mode={mode} id={id} ev={ev} g={g} preset={preset} focus={focus} onClose={onClose} onDelete={onDelete} />
}
