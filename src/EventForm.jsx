import { useState } from 'react'
import { useStore } from './store'
import Attachments from './Attachments'
import ScheduleModal from './Schedule'
import { fmtDate, fmtMoney, todayYMD } from './util'

function PaymentsSection({ ev }) {
  const { paymentsByEvent, paidAmount, paymentState, addPayment, deletePayment, saveEvent } = useStore()
  const ps = paymentsByEvent.get(ev.id) || []
  const got = paidAmount(ev)
  const total = Number(ev.value)
  const remaining = Math.max(0, total - got)
  const state = paymentState(ev)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayYMD())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const run = async (fn) => {
    setBusy(true); setErr(null)
    try { await fn() }
    catch (ex) {
      setErr(ex.code === '42P01'
        ? 'Falta criar a tabela payments — corre o supabase/payments.sql no SQL Editor.'
        : (ex.message || String(ex)))
    } finally { setBusy(false) }
  }

  const add = () => {
    const a = Number(String(amount).replace(',', '.'))
    if (!a || a <= 0) return
    run(async () => { await addPayment(ev, a, date); setAmount('') })
  }

  return (
    <div className="field" style={{ marginTop: 4 }}>
      <label>Pagamentos</label>
      <div className="pay-summary">
        <span className="badge ok">Já pago: {fmtMoney(got)}</span>
        {state === 'paid'
          ? <span className="badge ok">Tudo pago ✓</span>
          : <span className="badge pend">Falta: {fmtMoney(remaining)}</span>}
      </div>

      {ps.map((p) => (
        <div key={p.id} className="list-item" style={{ cursor: 'default', padding: '7px 2px' }}>
          <div className="main"><div className="meta">{fmtDate(p.paid_at)}</div></div>
          <div className="amount" style={{ fontSize: 14 }}>{fmtMoney(p.amount)}</div>
          <button type="button" className="btn danger" style={{ width: 'auto', padding: '4px 9px', fontSize: 12 }}
            disabled={busy} onClick={() => run(() => deletePayment(p, ev))}>×</button>
        </div>
      ))}

      {ps.length === 0 && ev.paid && (
        <div className="chart-note">
          Marcado como pago{ev.paid_at ? ` em ${fmtDate(ev.paid_at)}` : ''}.{' '}
          <button type="button" className="linkish" disabled={busy}
            onClick={() => run(() => saveEvent({ id: ev.id, paid: false, paid_at: null }))}>
            Marcar como não pago
          </button>
        </div>
      )}

      {state !== 'paid' && (
        <>
          {remaining > 0 && (
            <button type="button" className="btn secondary" style={{ marginTop: 8 }} disabled={busy}
              onClick={() => run(async () => { await addPayment(ev, remaining, todayYMD()) })}>
              ✓ Recebi tudo ({fmtMoney(remaining)})
            </button>
          )}
          <div className="chart-note" style={{ marginTop: 10 }}>…ou registar um sinal / pagamento parcial:</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input style={{ flex: 1, minWidth: 0 }} inputMode="decimal" value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="Valor (€)" />
            <input type="date" style={{ flex: 1.2, minWidth: 0 }} value={date} onChange={(e) => setDate(e.target.value)} />
            <button type="button" className="btn secondary" style={{ width: 'auto', padding: '8px 12px' }}
              onClick={add} disabled={busy || !amount}>+</button>
          </div>
        </>
      )}
      {err && <div className="err">{err}</div>}
    </div>
  )
}

export default function EventForm({ initial, onClose }) {
  const { projects, activeProjects, saveEvent, deleteEvent } = useStore()
  // ao editar, o projeto atual do evento aparece mesmo que já esteja inativo
  const options = (() => {
    const act = activeProjects()
    const cur = initial?.project_id && projects.find((p) => p.id === initial.project_id)
    return cur && !act.some((p) => p.id === cur.id) ? [cur, ...act] : act
  })()
  const [f, setF] = useState(() => ({
    project_id: initial?.project_id || options[0]?.id || '',
    title: initial?.title || '',
    event_date: initial?.event_date || todayYMD(),
    start_time: initial?.start_time || '',
    location: initial?.location || '',
    gross_value: initial?.gross_value ?? initial?.value ?? '',
    value: initial?.value ?? '',
    paid: initial?.paid || false,
    paid_at: initial?.paid_at || '',
    receipt_issued: initial?.receipt_issued || false,
    notes: initial?.notes || '',
  }))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [schedule, setSchedule] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    const gross = Number(String(f.gross_value).replace(',', '.')) || 0
    // sem valor final indicado, o que a Joana recebe é o próprio bruto
    const final = Number(String(f.value).replace(',', '.')) || gross
    try {
      await saveEvent({
        ...(initial?.id ? { id: initial.id } : {}),
        project_id: f.project_id,
        title: f.title.trim(),
        event_date: f.event_date,
        start_time: f.start_time || null,
        location: f.location.trim() || null,
        gross_value: gross || final,
        value: final,
        paid: f.paid,
        paid_at: f.paid ? (f.paid_at || todayYMD()) : null,
        receipt_issued: f.receipt_issued,
        notes: f.notes.trim() || null,
      })
      onClose()
    } catch (ex) {
      setErr(ex.message || String(ex))
      setBusy(false)
    }
  }

  const remove = () => {
    deleteEvent(initial) // com Anular durante uns segundos
    onClose()
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head"><h2>{initial?.id ? 'Editar evento' : 'Novo evento'}</h2><button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button></div>
        <div className="field">
          <label>Projeto</label>
          <select value={f.project_id} onChange={(e) => set('project_id', e.target.value)} required>
            {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Título</label>
          <input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex.: Casamento em Faro / Concerto em Loulé" required />
        </div>
        <div className="row2">
          <div className="field">
            <label>Data</label>
            <input type="date" value={f.event_date} onChange={(e) => set('event_date', e.target.value)} required />
          </div>
          <div className="field">
            <label>Local</label>
            <input value={f.location} onChange={(e) => set('location', e.target.value)} />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label>Valor bruto (€)</label>
            <input inputMode="decimal" value={f.gross_value} onChange={(e) => set('gross_value', e.target.value)} placeholder="0,00" />
          </div>
          <div className="field">
            <label>Valor líquido (€)</label>
            <input inputMode="decimal" value={f.value} onChange={(e) => set('value', e.target.value)} placeholder="= bruto" />
          </div>
        </div>
        {initial?.id ? (
          <>
            <PaymentsSection ev={initial} />
            <Attachments kind="event" id={initial.id} />
            <button type="button" className="btn secondary" style={{ marginBottom: 12 }} onClick={() => setSchedule(true)}>
              🗓 Cronograma do dia
            </button>
          </>
        ) : (
          <>
            <label className="check">
              <input type="checkbox" checked={f.paid} onChange={(e) => set('paid', e.target.checked)} />
              Pago
            </label>
            {f.paid && (
              <div className="field">
                <label>Data de pagamento</label>
                <input type="date" value={f.paid_at || ''} onChange={(e) => set('paid_at', e.target.value)} />
              </div>
            )}
          </>
        )}
        <label className="check">
          <input type="checkbox" checked={f.receipt_issued} onChange={(e) => set('receipt_issued', e.target.checked)} />
          Recibo emitido
        </label>
        <div className="field">
          <label>Notas</label>
          <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? 'A guardar…' : 'Guardar'}</button>
        {initial?.id && (
          <button type="button" className="btn danger" style={{ marginTop: 8 }} onClick={remove} disabled={busy}>
            Apagar
          </button>
        )}
        {schedule && <ScheduleModal ev={initial} onClose={() => setSchedule(false)} />}
      </form>
    </div>
  )
}
