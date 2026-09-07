import { useMemo, useState } from 'react'
import { useStore } from '../store'
import EventForm from '../EventForm'
import { MONTHS, fmtDate, fmtMoney, todayYMD, ymdParts } from '../util'

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function Events() {
  const { events, projects, projectById, paymentState, paidAmount, googleEvents } = useStore()
  const [projFilter, setProjFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(null)

  // pendentes de registo: eventos Google de hoje em diante ainda sem evento
  // na app (mesma regra da agenda: projeto + dia já registados = o mesmo compromisso)
  const pending = useMemo(() => {
    const taken = new Set(events.map((ev) => `${ev.project_id}|${ev.event_date}`))
    const today = todayYMD()
    return googleEvents
      .filter((g) => g.date >= today && !taken.has(`${g.project_id}|${g.date}`))
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
  }, [googleEvents, events])

  const filtered = useMemo(() => {
    const q = norm(query.trim())
    return events.filter((ev) => {
      if (projFilter !== 'all' && ev.project_id !== projFilter) return false
      const st = paymentState(ev)
      if (stateFilter === 'unpaid' && st === 'paid') return false
      if (stateFilter === 'paid' && st !== 'paid') return false
      if (q && !norm(`${ev.title} ${ev.location || ''} ${ev.notes || ''}`).includes(q)) return false
      return true
    })
  }, [events, projFilter, stateFilter, query, paymentState])

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

      {pending.length > 0 && (
        <>
          <div className="month-head">
            Pendentes de registo <small>· {pending.length} do calendário</small>
          </div>
          <div className="card">
            {pending.map((g, i) => {
              const p = projectById(g.project_id)
              return (
                <div key={`${g.calendar_id}|${g.date}|${i}`} className="list-item gcal"
                  onClick={() => setForm({
                    event_date: g.date, project_id: g.project_id, title: g.title,
                    start_time: g.time, location: g.location,
                  })}>
                  <span className="chip"><span className="dot gdot" style={{ borderColor: p?.color }} /></span>
                  <div className="main">
                    <div className="title">{g.title}</div>
                    <div className="meta">
                      {fmtDate(g.date)}{g.time ? ` · ${g.time}` : ''} · {p?.name}{g.location ? ` · ${g.location}` : ''}
                    </div>
                  </div>
                  <span className="badge pend">Registar +</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="field" style={{ marginBottom: 10 }}>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Pesquisar título, local ou notas…" />
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
                      {(() => {
                        const st = paymentState(ev)
                        if (st === 'paid') return <span className="badge ok">Pago</span>
                        if (st === 'partial') return <span className="badge mid">Falta {fmtMoney(Number(ev.value) - paidAmount(ev))}</span>
                        return <span className="badge pend">Por pagar</span>
                      })()}
                      {ev.receipt_issued && <span className="badge ok">Recibo ✓</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <button className="fab" onClick={() => setForm({})} aria-label="Novo evento">+</button>
      {form && <EventForm initial={form} onClose={() => setForm(null)} />}
    </>
  )
}
