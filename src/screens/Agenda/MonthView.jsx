import { useEffect, useMemo, useRef } from 'react'
import { Button, EmptyState, GroupHeader, Icon, eventsSummary } from '../../ui'
import { useStore } from '../../store.jsx'
import { navigate, openSheet } from '../../router.js'
import { addDays, cap, fmtDay, relDay, WEEKDAYS_DAY, weekdayOf } from '../../format.js'
import CalendarGrid from './CalendarGrid.jsx'
import { ItemRows, mergeItems } from './AgendaList.jsx'

const pad = (n) => String(n).padStart(2, '0')
const isEditable = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

// Agenda › Mês (spec §10.5): calendário + o dia selecionado (hora à esquerda) + "A seguir · próximos 7 dias".
// O dia vive na rota (#/agenda/mes/<ymd>); mudar de mês seleciona o dia 1 (ou hoje, no mês atual).
export default function MonthView({ day, active = false, flashId = null }) {
  const { today, eventsAsc, googleByDay, missing } = useStore()
  const year = Number(day.slice(0, 4))
  const month = Number(day.slice(5, 7))

  const go = (ymd) => navigate(`#/agenda/mes/${ymd}`, { replace: true })
  const goMonth = (y, m) => {
    const cur = y === Number(today.slice(0, 4)) && m === Number(today.slice(5, 7))
    go(cur ? today : `${y}-${pad(m)}-01`)
  }
  const shift = (delta) => {
    const i = year * 12 + (month - 1) + delta
    goMonth(Math.floor(i / 12), (i % 12) + 1)
  }
  const openPicker = () => openSheet('mes', { year, month, onPick: goMonth })

  // PageUp/PageDown mudam de mês em qualquer ponto do Mês (computador), não só dentro da grelha
  const shiftRef = useRef(shift)
  shiftRef.current = shift
  useEffect(() => {
    if (!active) return
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key !== 'PageUp' && e.key !== 'PageDown') return
      if (isEditable(e.target) || document.querySelector('dialog[open]')) return
      e.preventDefault()
      shiftRef.current(e.key === 'PageDown' ? 1 : -1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  const evByDay = useMemo(() => {
    const m = new Map()
    for (const ev of eventsAsc) {
      if (!m.has(ev.event_date)) m.set(ev.event_date, [])
      m.get(ev.event_date).push(ev)
    }
    return m
  }, [eventsAsc])

  const dayItems = mergeItems(evByDay.get(day) || [], googleByDay.get(day) || [])
  const nextItems = useMemo(() => {
    const evs = []
    const gs = []
    for (let i = 1; i <= 7; i++) {
      const d = addDays(day, i)
      evs.push(...(evByDay.get(d) || []))
      gs.push(...(googleByDay.get(d) || []))
    }
    return mergeItems(evs, gs)
  }, [day, evByDay, googleByDay])

  const rel = relDay(day, today)
  const near = rel === 'Hoje' || rel === 'Amanhã' || rel === 'Ontem'
  const otherYear = day.slice(0, 4) !== today.slice(0, 4)
  const title = rel || cap(WEEKDAYS_DAY[weekdayOf(day)])
  const small = near ? fmtDay(day, { month: 'long' }) : fmtDay(day, { weekday: null, month: 'long', year: otherYear })
  const dayLong = fmtDay(day, { month: 'long', year: otherYear }) // "sábado, 10 de outubro"
  const newHere = () => openSheet('novo', { kind: 'evento', data: day })
  const until = fmtDay(addDays(day, 7)) // "quarta, 7 out"
  const nextEvs = nextItems.filter((i) => i.ev).map((i) => i.ev)

  return (
    <div className="ag-month-layout">
      <div className="ag-cal-col">
        <CalendarGrid year={year} month={month} selected={day} today={today} evByDay={evByDay} googleByDay={googleByDay}
          onSelect={go} onMonth={shift} onPicker={openPicker} onToday={() => go(today)} />
        <Button variant="ghost" size="sm" icon="pin" className="ag-map-btn" onClick={() => openSheet('mapa', { year, month })}>
          Ver o mês no mapa
        </Button>
      </div>

      <section className="ag-day-col" aria-labelledby="ag-h-dia">
        <GroupHeader first id="ag-h-dia" title={title} small={small}
          action={<Button variant="ghost" size="sm" icon="plus" onClick={newHere}
            aria-label={`Novo evento a ${fmtDay(day, { weekday: null, month: 'long', year: otherYear })}`}>Evento</Button>} />
        {dayItems.length > 0 ? (
          <div className="list"><ItemRows items={dayItems} lead="time" flashId={flashId} /></div>
        ) : (
          <EmptyState compact icon="calendar" title={rel === 'Hoje' ? 'Nada marcado para hoje' : `Nada marcado para ${dayLong}`}
            action={<Button variant="secondary" size="sm" icon="plus" iconTone="add" onClick={newHere}>Novo evento neste dia</Button>} />
        )}

        <GroupHeader title="A seguir" small="próximos 7 dias"
          summary={eventsSummary(nextEvs, missing, nextItems.length - nextEvs.length)} />
        {nextItems.length > 0 && <div className="list"><ItemRows items={nextItems} flashId={flashId} /></div>}
        <p className="ag-end-note">
          <Icon name="check" />
          {nextItems.length ? `Mais nada marcado até ${until}.` : `Nada marcado até ${until}.`}
        </p>
      </section>
    </div>
  )
}
