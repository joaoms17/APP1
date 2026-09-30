import { useEffect, useRef, useState } from 'react'
import { Button, DateInput, Field, HeroNumber, Icon, IconButton, MoneyInput, Progress, confirmDialog, parseMoney } from '../../ui'
import { useStore } from '../../store.jsx'
import { fmtDM, fmtDMY, fmtDayShort, fmtMoney } from '../../format.js'

const EPS = 0.005
export const money = (n) => fmtMoney(n, { cents: 'auto' })

// valor mostrado nos campos de data de pagamento: "hoje, 30 set" · "sáb, 14 nov 2026"
export const payDayFormat = (today) => (v) => (v === today ? `hoje, ${fmtDM(v)}` : fmtDayShort(v, { year: true }))

// pagamentos por ordem de data (os que estão a gravar vão para o fim)
const byDate = (a, b) => (a.pending ? 1 : 0) - (b.pending ? 1 : 0)
  || String(a.paid_at).localeCompare(String(b.paid_at))
  || String(a.created_at || '').localeCompare(String(b.created_at || ''))

// "Registar outro valor": Valor + Data + [Registar]. Acima do que falta pede confirmação (IA-02).
function AddPayment({ ev, miss, onDone, onDraft }) {
  const { recordPayment, today } = useStore()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const amountRef = useRef(null)
  useEffect(() => { amountRef.current?.focus({ preventScroll: false }) }, [])

  const submit = async (e) => {
    e?.preventDefault()
    if (busy) return
    const n = parseMoney(amount)
    if (n == null || !Number.isFinite(n) || n <= 0) {
      setErr('Escreve um valor maior do que 0 €, por exemplo 150.')
      amountRef.current?.focus()
      return
    }
    if (!date) return
    if (n > miss + EPS) {
      const ok = await confirmDialog({
        title: miss > EPS
          ? `Registar ${money(n)} num evento onde faltam ${money(miss)}?`
          : `Registar ${money(n)} num evento já todo recebido?`,
        text: `Ficam registados ${money(n - miss)} a mais do que o valor do evento.`,
        confirmLabel: 'Registar mesmo assim',
        cancelLabel: 'Corrigir',
        primary: 'cancel',
      })
      if (!ok) { setTimeout(() => amountRef.current?.focus(), 0); return }
    }
    setBusy(true)
    const row = await recordPayment(ev, n, date)
    setBusy(false)
    if (row) onDone() // falhou: o toast de erro já avisou e o formulário fica como estava
  }

  return (
    <form className="ev-pay-form" onSubmit={submit} noValidate>
      <div className="row2">
        <Field label="Valor" error={err}>
          <MoneyInput ref={amountRef} value={amount} enterKeyHint="done"
            onChange={(v) => { setAmount(v); setErr(null); onDraft?.(v) }} />
        </Field>
        <Field label="Data">
          <DateInput value={date} format={payDayFormat(today)} onChange={(v) => setDate(v || today)} />
        </Field>
      </div>
      <div className="acts">
        <Button variant="quiet" onClick={onDone}>Cancelar</Button>
        <Button type="submit" icon="check" loading={busy}>Registar</Button>
      </div>
    </form>
  )
}

// Bloco "Pagamento" do Detalhe (spec §10.6): lê sempre o evento vivo; cada ação grava logo, com Anular.
// adding/onAdding: formulário "Registar outro valor" aberto (o "…" › "Registar pagamento extra" também o abre);
// onDraft(texto): o valor escrito e ainda não registado (a folha pergunta antes de o perder).
export default function PaymentBlock({ ev, adding, onAdding, onDraft }) {
  const { paymentsByEvent, paidAmount, missing, removePaymentDeferred, markUnpaid } = useStore()
  const cardRef = useRef(null)
  const addRef = useRef(null)
  // ao fechar "Registar outro valor", o foco volta ao botão (ou ao bloco, se já está tudo recebido)
  const wasAdding = useRef(adding)
  useEffect(() => {
    if (wasAdding.current && !adding) (addRef.current || cardRef.current)?.focus({ preventScroll: true })
    wasAdding.current = adding
  }, [adding])
  // apagar um pagamento ou "Marcar como não recebido" tiram do ecrã o botão com o foco:
  // quando isso acontece (nos 3 s seguintes), o foco volta ao bloco em vez de cair no <body>
  const rescueUntil = useRef(0)
  const keepFocus = () => { rescueUntil.current = Date.now() + 3000 }
  useEffect(() => {
    if (!rescueUntil.current) return
    if (Date.now() > rescueUntil.current) { rescueUntil.current = 0; return }
    const a = document.activeElement
    if (a && a !== document.body && a.isConnected) return
    rescueUntil.current = 0
    ;(addRef.current || cardRef.current)?.focus({ preventScroll: true })
  })
  const ps = (paymentsByEvent.get(ev.id) || []).slice().sort(byDate)
  const total = Number(ev.value) || 0
  const gross = ev.gross_value ?? ev.value
  const got = paidAmount(ev)
  const miss = missing(ev)
  const paidAll = miss <= EPS
  const legacy = !!ev.paid && ps.length === 0 && total > 0
  const pct = total > 0 ? Math.min(100, Math.round((got / total) * 100)) : 100

  // 1.º de vários (ou parcial) = sinal; o resto são pagamentos
  const labelOf = (i) => (i === 0 && (ps.length > 1 || !paidAll) ? 'Sinal' : 'Pagamento')

  return (
    <div ref={cardRef} className="card ev-pay" tabIndex={-1}>
      <div className="ev-pay-top">
        <div>
          <div className="k">{paidAll ? 'Recebido' : 'Falta receber'}</div>
          <HeroNumber value={paidAll ? got : miss} />
        </div>
        <div className="of">de <b>{money(total)}</b><br />líquido · bruto {money(gross)}</div>
      </div>
      <div className="ev-pay-bar">
        <Progress value={total > 0 ? got : 1} max={total > 0 ? total : 1} label={`Recebido ${money(got)} de ${money(total)}`} />
        <div className="lbl"><span>Recebido <b className={got > EPS ? '' : 'zero'}>{money(got)}</b></span><span>{pct}{' '}%</span></div>
      </div>

      {ps.map((p, i) => (
        <div key={p.id} className={`ev-pay-row${p.pending ? ' pending' : ''}`}>
          <Icon name="checkCircle" />
          <span><b>{labelOf(i)}</b><small>{p.pending ? 'A gravar…' : fmtDMY(p.paid_at)}</small></span>
          <span className="money">{money(p.amount)}</span>
          {p.pending ? <span /> : (
            <IconButton icon="trash" label={`Apagar pagamento de ${money(p.amount)} (${fmtDMY(p.paid_at)})`}
              onClick={() => { keepFocus(); removePaymentDeferred(p, ev) }} />
          )}
        </div>
      ))}

      {legacy && (
        <div className="ev-pay-legacy">
          <p>Marcado como recebido{ev.paid_at ? ` a ${fmtDMY(ev.paid_at)}` : ''}, sem pagamentos registados.</p>
          <Button variant="danger" onClick={() => { keepFocus(); markUnpaid(ev) }}>Marcar como não recebido</Button>
        </div>
      )}

      {adding ? (
        <AddPayment ev={ev} miss={miss} onDone={() => onAdding(false)} onDraft={onDraft} />
      ) : !paidAll && (
        <div className="ev-pay-add">
          <Button ref={addRef} variant="ghost" icon="plus" onClick={() => onAdding(true)}>Registar outro valor</Button>
        </div>
      )}
    </div>
  )
}
