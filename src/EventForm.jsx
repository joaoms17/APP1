import { useState } from 'react'
import { useStore } from './store'
import { todayYMD } from './util'

export default function EventForm({ initial, onClose }) {
  const { projects, saveEvent, deleteEvent } = useStore()
  const [f, setF] = useState(() => ({
    project_id: initial?.project_id || projects[0]?.id || '',
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

  const remove = async () => {
    if (!confirm('Apagar este evento?')) return
    setBusy(true)
    try { await deleteEvent(initial.id); onClose() }
    catch (ex) { setErr(ex.message || String(ex)); setBusy(false) }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{initial?.id ? 'Editar evento' : 'Novo evento'}</h2>
        <div className="field">
          <label>Projeto</label>
          <select value={f.project_id} onChange={(e) => set('project_id', e.target.value)} required>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
            <label>Hora</label>
            <input type="time" value={f.start_time || ''} onChange={(e) => set('start_time', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Local</label>
          <input value={f.location} onChange={(e) => set('location', e.target.value)} />
        </div>
        <div className="row2">
          <div className="field">
            <label>Valor bruto (€)</label>
            <input inputMode="decimal" value={f.gross_value} onChange={(e) => set('gross_value', e.target.value)} placeholder="0,00" />
          </div>
          <div className="field">
            <label>Valor final (€)</label>
            <input inputMode="decimal" value={f.value} onChange={(e) => set('value', e.target.value)} placeholder="= bruto" />
          </div>
        </div>
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
      </form>
    </div>
  )
}
