import { useState } from 'react'
import { useStore } from './store'
import PrintSheet from './PrintSheet'
import { fmtDate } from './util'

// Cronograma do dia de um evento de Cabelos: linhas hora → pessoa → serviço.
export default function ScheduleModal({ ev, onClose }) {
  const { scheduleFor, saveSchedule } = useStore()
  const [rows, setRows] = useState(() => {
    const existing = scheduleFor(ev.id).map((s) => ({ time_at: s.time_at.slice(0, 5), person: s.person, service: s.service || '' }))
    return existing.length ? existing : [{ time_at: '', person: '', service: '' }]
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [printing, setPrinting] = useState(false)

  const set = (n, k, v) => setRows((rs) => rs.map((r, i) => (i === n ? { ...r, [k]: v } : r)))
  const sorted = [...rows].filter((r) => r.time_at && r.person.trim()).sort((a, b) => a.time_at.localeCompare(b.time_at))

  const save = async (thenPrint) => {
    setBusy(true); setErr(null)
    try {
      await saveSchedule(ev.id, rows)
      if (thenPrint) setPrinting(true)
      else onClose()
    } catch (ex) {
      setErr(ex.code === '42P01' ? 'Corre o supabase/orcamentos.sql no SQL Editor.' : (ex.message || String(ex)))
    } finally { setBusy(false) }
  }

  if (printing) {
    return (
      <PrintSheet onClose={onClose}>
        <div className="doc-head">
          <div className="doc-brand">Joana</div>
          <div className="doc-hairline" />
          <div className="doc-sub">Hairstyling</div>
        </div>
        <h1 className="doc-title">Cronograma do dia</h1>
        <div className="doc-meta">
          <div><b>{ev.title}</b></div>
          <div>{fmtDate(ev.event_date)}{ev.location ? ` · ${ev.location}` : ''}</div>
        </div>
        <table className="doc-table">
          <thead><tr><th>Hora</th><th>Quem</th><th>Serviço</th></tr></thead>
          <tbody>
            {sorted.map((r, n) => (
              <tr key={n}><td>{r.time_at}</td><td>{r.person}</td><td>{r.service}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="doc-foot">Até já! 🌹</p>
      </PrintSheet>
    )
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>Cronograma do dia</h2><button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button></div>
        <div className="note">Quem se penteia a que horas — ordena-se sozinho por hora. Partilha com a noiva em PDF.</div>
        {rows.map((r, n) => (
          <div key={n} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input type="time" style={{ flex: 1, minWidth: 0 }} className="bare-input" value={r.time_at} onChange={(e) => set(n, 'time_at', e.target.value)} />
            <input style={{ flex: 1.4, minWidth: 0 }} className="bare-input" placeholder="Quem" value={r.person} onChange={(e) => set(n, 'person', e.target.value)} />
            <input style={{ flex: 1.4, minWidth: 0 }} className="bare-input" placeholder="Serviço" value={r.service} onChange={(e) => set(n, 'service', e.target.value)} />
            <button type="button" className="btn danger" style={{ width: 'auto', padding: '4px 9px', fontSize: 12 }}
              onClick={() => setRows((rs) => rs.filter((_, i) => i !== n))}>×</button>
          </div>
        ))}
        <button type="button" className="btn secondary" onClick={() => setRows((rs) => [...rs, { time_at: '', person: '', service: '' }])}>
          + Adicionar linha
        </button>
        {err && <div className="err">{err}</div>}
        <button className="btn" style={{ marginTop: 12 }} disabled={busy} onClick={() => save(false)}>Guardar</button>
        <button className="btn secondary" style={{ marginTop: 8 }} disabled={busy || sorted.length === 0} onClick={() => save(true)}>
          👁 Ver / Partilhar PDF
        </button>
      </div>
    </div>
  )
}
