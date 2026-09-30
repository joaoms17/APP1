import { useEffect, useMemo, useRef } from 'react'
import { Icon, IconButton } from '../../ui'
import { useStore } from '../../store.jsx'
import { projectVars } from '../../color.js'
import { addDays, cap, MONTHS_LONG, WEEKDAYS_FULL, weekdayOf } from '../../format.js'

const pad = (n) => String(n).padStart(2, '0')
const hm = (t) => (t ? String(t).slice(0, 5) : '')
const cx = (...xs) => xs.filter(Boolean).join(' ')
const WD = [['Seg', 'segunda-feira'], ['Ter', 'terça-feira'], ['Qua', 'quarta-feira'], ['Qui', 'quinta-feira'],
  ['Sex', 'sexta-feira'], ['Sáb', 'sábado'], ['Dom', 'domingo']]

// dias da grelha (semana começa à segunda), só as semanas necessárias; month = 1–12
export function monthCells(year, month) {
  const first = `${year}-${pad(month)}-01`
  const start = addDays(first, -((weekdayOf(first) + 6) % 7))
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const lead = (weekdayOf(first) + 6) % 7
  const total = Math.ceil((lead + days) / 7) * 7
  return Array.from({ length: total }, (_, i) => addDays(start, i))
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

function DayCell({ ymd, inMonth, isToday, isSel, evs, gs, projectById, onSelect }) {
  const all = [...evs.map((ev) => ({ ev })), ...gs.map((g) => ({ g }))]
  const pv = (pid) => ({ 'data-p': '', style: projectVars(projectById(pid)?.color || '#929292') })
  const d = Number(ymd.slice(8, 10))
  const what = [evs.length ? plural(evs.length, 'evento', 'eventos') : null,
    gs.length ? `${gs.length} do Google por registar` : null].filter(Boolean).join(', ') || 'sem eventos'
  const label = `${WEEKDAYS_FULL[weekdayOf(ymd)]}, ${d} de ${MONTHS_LONG[Number(ymd.slice(5, 7)) - 1]}${isToday ? ', hoje' : ''}, ${what}`
  return (
    <button type="button" role="gridcell" className={cx('day', !inMonth && 'out', isToday && 'today', isSel && 'sel')}
      aria-label={label} aria-selected={isSel} aria-current={isToday ? 'date' : undefined} tabIndex={isSel ? 0 : -1}
      onClick={() => onSelect(ymd)}>
      <span className="num" aria-hidden="true">{d}</span>
      <span className="dots" aria-hidden="true">
        {all.slice(0, 3).map((x) => x.ev
          ? <span key={x.ev.id} className="dot" {...pv(x.ev.project_id)} />
          : <span key={x.g.key} className="dot g" {...pv(x.g.project_id)} />)}
        {all.length > 3 && <span className="more">+{all.length - 3}</span>}
      </span>
      <span className="pills" aria-hidden="true">
        {all.slice(0, 2).map((x) => x.ev ? (
          <span key={x.ev.id} className="pill-ev" {...pv(x.ev.project_id)}>
            {hm(x.ev.start_time) && <b>{hm(x.ev.start_time)}</b>}{x.ev.title}
          </span>
        ) : (
          <span key={x.g.key} className="pill-ev g" {...pv(x.g.project_id)}>
            {x.g.time && <b>{x.g.time}</b>}{x.g.title}
          </span>
        ))}
        {all.length > 2 && <span className="pill-more">+{all.length - 2} mais</span>}
      </span>
    </button>
  )
}

// Calendário do Mês (spec §9.17): role="grid" com roving tabindex (setas, Home/End, PageUp/PageDown),
// deslizar na horizontal ou roda só com deltaX/Shift muda de mês; hoje sublinhado, selecionado em --accent.
// A seleção segue o foco: mover com as setas escolhe logo o dia (a lista por baixo acompanha).
export default function CalendarGrid({ year, month, selected, today, evByDay, googleByDay, onSelect, onMonth, onPicker, onToday }) {
  const { projectById } = useStore()
  const card = useRef(null)
  const grid = useRef(null)
  const focusNext = useRef(false)
  const onMonthRef = useRef(onMonth)
  onMonthRef.current = onMonth

  const cells = useMemo(() => monthCells(year, month), [year, month])
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const ym = `${year}-${pad(month)}`
  const title = `${cap(MONTHS_LONG[month - 1])} ${year}`
  const away = selected !== today

  // depois de mudar o dia pelo teclado, o foco acompanha a célula escolhida
  useEffect(() => {
    if (!focusNext.current) return
    focusNext.current = false
    grid.current?.querySelector('[tabindex="0"]')?.focus()
  }, [selected])

  const onKeyDown = (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const wd = (weekdayOf(selected) + 6) % 7 // 0 = segunda
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -wd, End: 6 - wd }[e.key]
    if (step != null) {
      e.preventDefault()
      if (!step) return
      focusNext.current = true
      onSelect(addDays(selected, step))
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault()
      focusNext.current = true
      onMonth(e.key === 'PageDown' ? 1 : -1)
    }
  }

  // deslizar na horizontal (> 48 px e > 1,5× o vertical) muda de mês
  const touch = useRef(null)
  const onTouchStart = (e) => {
    const t = e.touches[0]
    touch.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null
  }
  const onTouchEnd = (e) => {
    const s = touch.current
    touch.current = null
    if (!s) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > 1.5 * Math.abs(dy)) onMonth(dx < 0 ? 1 : -1)
  }

  // roda do rato: só deltaX (trackpad) ou Shift+roda; a roda vertical continua a fazer scroll à página.
  // Um gesto (com a inércia) muda no máximo um mês.
  useEffect(() => {
    const el = card.current
    if (!el) return
    let last = 0
    const onWheel = (e) => {
      const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0)
      if (Math.abs(dx) < 8 || (!e.shiftKey && Math.abs(e.deltaX) <= Math.abs(e.deltaY))) return
      e.preventDefault()
      const t = Date.now()
      const idle = t - last > 400
      last = t
      if (idle) onMonthRef.current(dx > 0 ? 1 : -1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <div ref={card} className="card cal ag-cal" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="cal-head">
        <IconButton icon="chevL" label="Mês anterior" onClick={() => onMonth(-1)} />
        <button type="button" className="cal-title" aria-haspopup="dialog" aria-label={`${title} — ir para mês`} onClick={onPicker}>
          {title}<Icon name="chevD" />
        </button>
        <button type="button" className={cx('ag-cal-today', away && 'on')} onClick={onToday}
          tabIndex={away ? 0 : -1} aria-hidden={away ? undefined : true}>
          Hoje
        </button>
        <IconButton icon="chevR" label="Mês seguinte" onClick={() => onMonth(1)} />
      </div>
      <span className="sr-only" aria-live="polite">{title}</span>
      <div ref={grid} className="cal-grid" role="grid" aria-label={`${cap(MONTHS_LONG[month - 1])} de ${year}`} onKeyDown={onKeyDown}>
        <div role="row" className="ag-cal-row">
          {WD.map(([a, full]) => <abbr key={a} role="columnheader" className="wd" title={full}>{a}</abbr>)}
        </div>
        {weeks.map((week) => (
          <div key={week[0]} role="row" className="ag-cal-row">
            {week.map((ymd) => (
              <DayCell key={ymd} ymd={ymd} inMonth={ymd.startsWith(ym)} isToday={ymd === today} isSel={ymd === selected}
                evs={evByDay.get(ymd) || []} gs={googleByDay.get(ymd) || []} projectById={projectById} onSelect={onSelect} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
