import { useMemo, useState } from 'react'
import { useStore } from '../store'
import EventForm from '../EventForm'
import { MONTHS, fmtDate, fmtMoney, ymdParts } from '../util'

export default function Events() {
  const { events, projects, projectById } = useStore()
  const [projFilter, setProjFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [form, setForm] = useState(null)

  const filtered = useMemo(() => events.filter((ev) => {
    if (projFilter !== 'all' && ev.project_id !== projFilter) return false
    if (stateFilter === 'unpaid' && ev.paid) return false
    if (stateFilter === 'paid' && !ev.paid) return false
    if (stateFilter === 'noreceipt' && ev.receipt_issued) return false
    return true
  }), [events, projFilter, stateFilter])

  // agrupar por mês (já vêm ordenados por data desc)
  const groups = useMemo(() => {
    const out = []
    let cur = null
    for (const ev of filtered) {
      const { year, month } = ymdParts(ev.event_date)
      const key = `${year}-${month}`
      if (!cur || cur.key !== key) {
        cur = { key, year, month, items: [], total: 0 }
        out.push(cur)
      }
      cur.items.push(ev)
      cur.total += Number(ev.value)
    }
    return out
  }, [filtered])

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Eventos</h1>
          <div className="sub">{filtered.length} evento{filtered.length === 1 ? '' : 's'}</div>
        </div>
      </div>

      <div className="filters">
        <select value={projFilter} onChange={(e) => setProjFilter(e.target.value)}>
          <option value="all">Todos os projetos</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="all">Todos os estados</option>
          <option value="unpaid">Por receber</option>
          <option value="paid">Pagos</option>
          <option value="noreceipt">Recibo em falta</option>
        </select>
      </div>

      {groups.length === 0 && <div className="empty">Sem eventos. Toca em + para criar o primeiro.</div>}

      {groups.map((g) => (
        <div key={g.key}>
          <div className="month-head">
            {MONTHS[g.month]} {g.year} <small>· {fmtMoney(g.total)}</small>
          </div>
          <div className="card">
            {g.items.map((ev) => {
              const p = projectById(ev.project_id)
              return (
                <div key={ev.id} className="list-item" onClick={() => setForm(ev)}>
                  <span className="chip"><span className="dot" style={{ background: p?.color }} /></span>
                  <div className="main">
                    <div className="title">{ev.title}</div>
                    <div className="meta">{fmtDate(ev.event_date)} · {p?.name}{ev.location ? ` · ${ev.location}` : ''}</div>
                  </div>
                  <div>
                    <div className="amount">{fmtMoney(ev.value)}</div>
                    <div className="badges">
                      <span className={`badge ${ev.paid ? 'ok' : 'pend'}`}>{ev.paid ? 'Pago' : 'Por pagar'}</span>
                      <span className={`badge ${ev.receipt_issued ? 'ok' : 'pend'}`}>{ev.receipt_issued ? 'Recibo ✓' : 'S/ recibo'}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <button className="fab" onClick={() => setForm({})} aria-label="Novo evento">+</button>
      {form && <EventForm initial={form.id ? form : null} onClose={() => setForm(null)} />}
    </>
  )
}
