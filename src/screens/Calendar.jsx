import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import EventForm from '../EventForm'
import { MONTHS, MONTHS_SHORT, WEEKDAYS, todayYMD } from '../util'

const pad = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

function GcalConfig({ onClose }) {
  const { projects, projectById, gcalCalendars, gcalError, addGcalCalendar, removeGcalCalendar } = useStore()
  const [url, setUrl] = useState('')
  const [projId, setProjId] = useState(projects[0]?.id || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try { await addGcalCalendar(url, projId); setUrl('') }
    catch (ex) {
      setErr(ex.code === '42P01'
        ? 'Falta criar a tabela gcal_calendars no Supabase — corre o supabase/gcal_calendars.sql.'
        : ex.code === '23505' ? 'Esse calendário já está adicionado.'
        : (ex.message || String(ex)))
    } finally { setBusy(false) }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>Calendários Google</h2><button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button></div>
        <div className="note">
          Cada calendário fica ligado a um projeto. No Google Calendar (computador), na <b>conta dona</b> do
          calendário: Definições → o calendário → <b>Integrar calendário</b> → copia o
          <b> Endereço secreto em formato iCal</b>. Os eventos aparecem na agenda como só-leitura;
          toca num deles para o registar na app com o valor.
        </div>

        {gcalCalendars.map((cal) => {
          const p = projectById(cal.project_id)
          return (
            <div key={cal.id} className="list-item" style={{ cursor: 'default' }}>
              <span className="chip"><span className="dot" style={{ background: p?.color }} /></span>
              <div className="main">
                <div className="title">{p?.name || 'Projeto?'}</div>
                <div className="meta">…{cal.url.slice(-28)}</div>
              </div>
              <button className="btn danger" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
                onClick={async () => { try { await removeGcalCalendar(cal.id) } catch (ex) { setErr(String(ex.message || ex)) } }}>
                Remover
              </button>
            </div>
          )
        })}
        {gcalCalendars.length === 0 && <div className="empty">Ainda sem calendários ligados.</div>}

        <form onSubmit={submit} style={{ marginTop: 12 }}>
          <div className="field">
            <label>Endereço secreto iCal</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} required inputMode="url"
              placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" />
          </div>
          <div className="field">
            <label>Projeto a que se refere</label>
            <select value={projId} onChange={(e) => setProjId(e.target.value)} required>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {gcalError && <div className="err">Última sincronização falhou: {gcalError}</div>}
          {err && <div className="err">{err}</div>}
          <button className="btn" disabled={busy || !url.trim()}>{busy ? 'A adicionar…' : 'Adicionar calendário'}</button>
        </form>
      </div>
    </div>
  )
}

// escolher mês e ano num toque (em vez de andar seta a seta)
function MonthPicker({ year, month, onPick, onToday, onClose }) {
  const [y, setY] = useState(year)
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>Ir para mês</h2><button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button></div>
        <div className="yearsel">
          <button onClick={() => setY(y - 1)} aria-label="Ano anterior">‹</button>
          <b>{y}</b>
          <button onClick={() => setY(y + 1)} aria-label="Ano seguinte">›</button>
        </div>
        <div className="month-grid">
          {MONTHS_SHORT.map((m, i) => (
            <button key={m} type="button" className={y === year && i === month ? 'sel' : ''}
              onClick={() => onPick(y, i)}>{m}</button>
          ))}
        </div>
        <button type="button" className="btn secondary" style={{ marginTop: 14 }} onClick={onToday}>Ir para hoje</button>
      </div>
    </div>
  )
}

export default function Calendar() {
  const { events, projectById, googleEvents, paymentState } = useStore()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(todayYMD())
  const [form, setForm] = useState(null) // null | {} | evento
  const [showGcal, setShowGcal] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const touchRef = useRef(null)
  const wheelAt = useRef(0)

  const byDay = useMemo(() => {
    const m = new Map()
    for (const ev of events) {
      if (!m.has(ev.event_date)) m.set(ev.event_date, [])
      m.get(ev.event_date).push(ev)
    }
    return m
  }, [events])

  const gByDay = useMemo(() => {
    // dedup: se já existe um evento da app do mesmo projeto no mesmo dia,
    // o evento do Google é o mesmo compromisso — não o mostramos outra vez
    const taken = new Set(events.map((ev) => `${ev.project_id}|${ev.event_date}`))
    const m = new Map()
    for (const g of googleEvents) {
      if (taken.has(`${g.project_id}|${g.date}`)) continue
      if (!m.has(g.date)) m.set(g.date, [])
      m.get(g.date).push(g)
    }
    return m
  }, [googleEvents, events])

  const cells = useMemo(() => {
    const first = new Date(year, month, 1)
    const start = (first.getDay() + 6) % 7 // segunda = 0
    const daysIn = new Date(year, month + 1, 0).getDate()
    const daysPrev = new Date(year, month, 0).getDate()
    const out = []
    for (let i = start - 1; i >= 0; i--) {
      const d = daysPrev - i
      out.push({ date: ymd(month === 0 ? year - 1 : year, (month + 11) % 12, d), day: d, out: true })
    }
    for (let d = 1; d <= daysIn; d++) out.push({ date: ymd(year, month, d), day: d, out: false })
    while (out.length % 7 !== 0) {
      const d = out.length - start - daysIn + 1
      out.push({ date: ymd(month === 11 ? year + 1 : year, (month + 1) % 12, d), day: d, out: true })
    }
    return out
  }, [year, month])

  const prev = () => { if (month === 0) { setMonth(11); setYear(year - 1) } else setMonth(month - 1) }
  const next = () => { if (month === 11) { setMonth(0); setYear(year + 1) } else setMonth(month + 1) }
  const goToday = () => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth()); setSelected(todayYMD()) }

  // deslizar o dedo para o lado (ou a roda do rato) muda de mês
  const onTouchStart = (e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onTouchEnd = (e) => {
    const t = touchRef.current
    touchRef.current = null
    if (!t) return
    const dx = e.changedTouches[0].clientX - t.x
    const dy = e.changedTouches[0].clientY - t.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > 1.5 * Math.abs(dy)) { if (dx < 0) next(); else prev() }
  }
  const onWheel = (e) => {
    const nowMs = Date.now()
    if (nowMs - wheelAt.current < 400) return
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (Math.abs(d) < 8) return
    wheelAt.current = nowMs
    if (d > 0) next(); else prev()
  }

  const today = todayYMD()
  const dayEvents = byDay.get(selected) || []

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Agenda</h1>
          <div className="sub">Concertos e serviços de cabelo</div>
        </div>
        <button className="btn secondary" style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }} onClick={() => setShowGcal(true)}>
          Google ⚙
        </button>
      </div>

      <div className="card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onWheel={onWheel}>
        <div className="cal-nav">
          <button onClick={prev} aria-label="Mês anterior">‹</button>
          <button type="button" className="cal-title" onClick={() => setShowPicker(true)} aria-label="Escolher mês e ano">
            {MONTHS[month]} {year} <span className="v">▾</span>
          </button>
          <button onClick={next} aria-label="Mês seguinte">›</button>
        </div>
        <div className="cal-grid">
          {WEEKDAYS.map((w, i) => <div key={i} className="wd">{w}</div>)}
          {cells.map((c) => {
            const evs = byDay.get(c.date) || []
            return (
              <button
                key={c.date}
                className={`cal-day${c.out ? ' out' : ''}${c.date === today ? ' today' : ''}${c.date === selected ? ' sel' : ''}`}
                onClick={() => setSelected(c.date)}
              >
                {c.day}
                <span className="dots">
                  {evs.slice(0, 3).map((ev) => (
                    <i key={ev.id} style={{ background: c.date === selected ? 'var(--on-accent)' : (projectById(ev.project_id)?.color || 'var(--muted)') }} />
                  ))}
                  {(gByDay.get(c.date) || []).slice(0, 3 - Math.min(evs.length, 3)).map((g, i) => (
                    <i key={`g${i}`} className="gdot"
                      style={{ borderColor: c.date === selected ? 'var(--on-accent)' : (projectById(g.project_id)?.color || 'var(--muted)') }} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="card">
        <h2>{selected.split('-').reverse().join('/')}</h2>
        {dayEvents.length === 0 && (gByDay.get(selected) || []).length === 0 && (
          <div className="empty">Sem eventos neste dia.</div>
        )}
        {dayEvents.map((ev) => {
          const p = projectById(ev.project_id)
          return (
            <div key={ev.id} className="list-item" onClick={() => setForm(ev)}>
              <span className="chip"><span className="dot" style={{ background: p?.color }} /></span>
              <div className="main">
                <div className="title">{ev.title}</div>
                <div className="meta">
                  {p?.name}{ev.location ? ` · ${ev.location}` : ''}
                </div>
              </div>
              <div>
                <div className="badges">
                  {(() => {
                    const st = paymentState(ev)
                    if (st === 'paid') return <span className="badge ok">Recebido</span>
                    if (st === 'partial') return <span className="badge mid">Parcial</span>
                    return <span className="badge pend">Por receber</span>
                  })()}
                </div>
              </div>
            </div>
          )
        })}
        {(gByDay.get(selected) || []).map((g, i) => {
          const p = projectById(g.project_id)
          return (
            <div key={`g${i}`} className="list-item gcal"
              onClick={() => setForm({
                event_date: g.date, project_id: g.project_id, title: g.title,
                start_time: g.time, location: g.location,
              })}>
              <span className="chip"><span className="dot gdot" style={{ borderColor: p?.color }} /></span>
              <div className="main">
                <div className="title">{g.title}</div>
                <div className="meta">
                  Google · {p?.name}{g.location ? ` · ${g.location}` : ''}
                </div>
              </div>
              <span className="badge pend">Registar +</span>
            </div>
          )
        })}
      </div>

      <button className="fab" onClick={() => setForm({ event_date: selected })} aria-label="Novo evento">+</button>
      {form && <EventForm initial={form} onClose={() => setForm(null)} />}
      {showGcal && <GcalConfig onClose={() => setShowGcal(false)} />}
      {showPicker && (
        <MonthPicker year={year} month={month}
          onPick={(y, m) => { setYear(y); setMonth(m); setShowPicker(false) }}
          onToday={() => { goToday(); setShowPicker(false) }}
          onClose={() => setShowPicker(false)} />
      )}
    </>
  )
}
