import { useMemo, useState } from 'react'
import { useStore } from '../store'
import EventForm from '../EventForm'
import { MONTHS, WEEKDAYS, fmtMoney, fmtTime, todayYMD } from '../util'

const pad = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

function GcalConfig({ onClose }) {
  const { gcalUrl, gcalError, saveGcalUrl } = useStore()
  const [url, setUrl] = useState(gcalUrl || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try { await saveGcalUrl(url); onClose() }
    catch (ex) {
      setErr(/settings/.test(String(ex.message)) || ex.code === '42P01'
        ? 'Falta criar a tabela settings no Supabase — vê as instruções no README.'
        : (ex.message || String(ex)))
      setBusy(false)
    }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Google Calendar</h2>
        <div className="note">
          No Google Calendar (no computador): roda dentada → <b>Definições</b> → escolhe o calendário
          à esquerda → <b>Integrar calendário</b> → copia o <b>Endereço secreto em formato iCal</b> e cola aqui.
          Os eventos do Google aparecem na agenda como só-leitura.
        </div>
        <div className="field">
          <label>Endereço secreto iCal</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            inputMode="url"
          />
        </div>
        {gcalError && <div className="err">Última sincronização falhou: {gcalError}</div>}
        {err && <div className="err">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? 'A guardar…' : 'Guardar'}</button>
        {gcalUrl && (
          <button type="button" className="btn secondary" style={{ marginTop: 8 }} disabled={busy}
            onClick={async () => { setBusy(true); try { await saveGcalUrl(''); onClose() } catch (ex) { setErr(String(ex.message || ex)); setBusy(false) } }}>
            Desligar integração
          </button>
        )}
      </form>
    </div>
  )
}

export default function Calendar() {
  const { events, projectById, googleEvents } = useStore()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(todayYMD())
  const [form, setForm] = useState(null) // null | {} | evento
  const [showGcal, setShowGcal] = useState(false)

  const byDay = useMemo(() => {
    const m = new Map()
    for (const ev of events) {
      if (!m.has(ev.event_date)) m.set(ev.event_date, [])
      m.get(ev.event_date).push(ev)
    }
    return m
  }, [events])

  const gByDay = useMemo(() => {
    const m = new Map()
    for (const g of googleEvents) {
      if (!m.has(g.date)) m.set(g.date, [])
      m.get(g.date).push(g)
    }
    return m
  }, [googleEvents])

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

      <div className="card">
        <div className="cal-nav">
          <button onClick={prev} aria-label="Mês anterior">‹</button>
          <b>{MONTHS[month]} {year}</b>
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
                  {gByDay.has(c.date) && evs.length < 3 && <i className="gdot" />}
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
                  {p?.name}{ev.start_time ? ` · ${fmtTime(ev.start_time)}` : ''}{ev.location ? ` · ${ev.location}` : ''}
                </div>
              </div>
              <div>
                <div className="amount">{fmtMoney(ev.value)}</div>
                <div className="badges">
                  <span className={`badge ${ev.paid ? 'ok' : 'pend'}`}>{ev.paid ? 'Pago' : 'Por pagar'}</span>
                </div>
              </div>
            </div>
          )
        })}
        {(gByDay.get(selected) || []).map((g, i) => (
          <div key={`g${i}`} className="list-item gcal">
            <span className="chip"><span className="dot gdot" /></span>
            <div className="main">
              <div className="title">{g.title}</div>
              <div className="meta">
                Google Calendar{g.time ? ` · ${g.time}` : ''}{g.location ? ` · ${g.location}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="fab" onClick={() => setForm({ event_date: selected })} aria-label="Novo evento">+</button>
      {form && <EventForm initial={form.id ? form : { event_date: selected }} onClose={() => setForm(null)} />}
      {showGcal && <GcalConfig onClose={() => setShowGcal(false)} />}
    </>
  )
}
