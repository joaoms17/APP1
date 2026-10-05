import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Button, Card, EmptyState, EventRow, GoogleRow, GroupHeader, Icon, Kpi, Progress, SyncLine, eventsSummary,
} from '../../ui'
import { useStore } from '../../store.jsx'
import { navigate, openSheet, routeHref } from '../../router.js'
import { addDays, cap, fmtDay, fmtMoney, MONTHS_LONG, weekdayOf } from '../../format.js'
import TodayCard, { useClock } from './TodayCard.jsx'
import TasksBlock from './TasksBlock.jsx'

// ---------- ajudas partilhadas pelas vistas da Agenda (Lista, Procurar, Mês) ----------

const money = (n, cents = 'auto') => fmtMoney(n, { cents })
const timeKey = (t) => (t ? String(t).slice(0, 5) : '99:99') // sem hora → fim do dia
const pad = (n) => String(n).padStart(2, '0')
export const lastDayOf = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return `${ym}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`
}
export const monthName = (ym) => cap(MONTHS_LONG[Number(ym.slice(5, 7)) - 1])

// classe estável de uma linha de evento (para levar a lista até ela depois de criar/editar)
export const rowClass = (id) => `ag-ev-${String(id).replace(/[^\w-]/g, '_')}`

// eventos da app + pendentes do Google, intercalados por data + hora (IA-07, IA-09)
export function mergeItems(evs, gs = [], desc = false) {
  const items = [
    ...evs.map((ev) => ({ date: ev.event_date, time: timeKey(ev.start_time), ev })),
    ...gs.map((g) => ({ date: g.date, time: timeKey(g.time), g })),
  ]
  items.sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : a.date + a.time > b.date + b.time ? 1 : 0))
  return desc ? items.reverse() : items
}

// linhas de uma lista; cada linha mostra sempre a sua data (também quando o dia se repete)
export function ItemRows({ items, lead = 'date', flashId = null, hideProject = false }) {
  return items.map((it) => {
    if (it.ev) {
      return (
        <EventRow key={it.ev.id} ev={it.ev} lead={lead} hideProject={hideProject}
          flash={it.ev.id === flashId} className={rowClass(it.ev.id)} />
      )
    }
    return <GoogleRow key={it.g.key} g={it.g} lead={lead} />
  })
}

// carregamento por partes: mostra `step` grupos e mais `step` quando o fim se aproxima
export function useProgressive(total, step, resetKey) {
  const [n, setN] = useState(step)
  const ref = useRef(null)
  const noIO = typeof IntersectionObserver === 'undefined'
  useEffect(() => { setN(step) }, [resetKey, step])
  useEffect(() => {
    const el = ref.current
    if (!el || noIO || n >= total) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setN((x) => x + step) }, { rootMargin: '900px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [n, total, step, noIO])
  const ensure = (k) => setN((x) => Math.max(x, k))
  return [noIO ? total : Math.min(n, total), ref, ensure]
}

const WORDS = ['Nenhum', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove', 'Dez']
const nEvents = (n) => `${WORDS[n] || n} ${n === 1 ? 'evento' : 'eventos'}`

// "↑ Anteriores · 6 em atraso em setembro" → Procurar com "Anteriores"
export function PrevLink() {
  const { today, receivables } = useStore()
  const ym = today.slice(0, 7)
  const late = receivables.overdue.filter((e) => e.event_date.startsWith(ym)).length
  const to = '#/agenda/lista?q=&quando=anteriores'
  return (
    <a className="ag-prev" href={routeHref(to)} onClick={(e) => { e.preventDefault(); navigate(to) }}>
      <Icon name="up" />
      {/* um só item de texto (parte como texto corrido com texto grande, sem "·" sozinho numa linha) */}
      <span className="ag-prev-t">
        {late > 0
          ? <><span className="nw">Anteriores ·</span> <span className="late">{late} em atraso em {MONTHS_LONG[Number(ym.slice(5, 7)) - 1]}</span></>
          : 'Anteriores'}
      </span>
    </a>
  )
}

// cartão do mês (coluna lateral no computador): Faturado · Recebido · Falta + progresso
function MonthCard() {
  const { today, events, summary } = useStore()
  const ym = today.slice(0, 7)
  const evs = useMemo(() => events.filter((e) => e.event_date.startsWith(ym)), [events, ym])
  const s = summary(evs)
  if (!s.count) return null
  return (
    <Card pad className="ag-month-card">
      <div className="section-title">{monthName(ym)} · {s.count} {s.count === 1 ? 'evento' : 'eventos'}</div>
      <div className="ag-mc-grid">
        <Kpi label="Faturado" value={money(s.total, 'never')} />
        <Kpi label="Recebido" value={money(s.got, 'never')} />
        <Kpi label="Falta" value={<span className={s.missing > 0.005 ? 'overdue-t' : undefined}>{money(s.missing, 'never')}</span>} />
      </div>
      <Progress value={s.got} max={s.total} label={`Recebido ${money(s.got)} de ${money(s.total)}`} />
    </Card>
  )
}

// ---------- Agenda › Lista (ecrã de arranque, spec §10.3) ----------
// Hoje (cartões + lede) · A tratar · Amanhã · Esta semana (até domingo) · meses, carregados por partes.
// flash = { id, date }: evento acabado de criar/editar — a lista vai até ele e a linha pisca.
export default function AgendaList({ flash = null, news = null }) {
  const { today, eventsAsc, googleMatch, missing, eventState } = useStore()
  const now = useClock()
  const pending = googleMatch.pending

  const todayEvs = useMemo(() => eventsAsc.filter((e) => e.event_date === today), [eventsAsc, today])
  const todayGoogle = useMemo(() => pending.filter((g) => g.date === today), [pending, today])
  const todayMissing = todayEvs.reduce((a, e) => a + missing(e), 0)
  const todayNoValue = todayEvs.filter((e) => eventState(e) === 'novalue').length // valor pendente: não é "recebido"

  const plan = useMemo(() => {
    const between = (from, to) => mergeItems(
      eventsAsc.filter((e) => e.event_date >= from && e.event_date <= to),
      pending.filter((g) => g.date >= from && g.date <= to),
    )
    const tomorrow = addDays(today, 1)
    const weekFrom = addDays(today, 2)
    const sunday = addDays(today, (7 - weekdayOf(today)) % 7) // domingo desta semana (hoje, se for domingo)
    const head = [{ key: 'amanha', title: 'Amanhã', small: fmtDay(tomorrow), from: tomorrow, to: tomorrow }]
    if (sunday >= weekFrom) head.push({ key: 'semana', title: 'Esta semana', small: `até ${fmtDay(sunday)}`, from: weekFrom, to: sunday })

    const lastEv = eventsAsc.length ? eventsAsc[eventsAsc.length - 1].event_date : null
    const lastG = pending.length ? pending[pending.length - 1].date : null
    const last = [lastEv, lastG].filter(Boolean).sort().pop()
    const months = []
    let from = sunday >= weekFrom ? addDays(sunday, 1) : weekFrom
    while (last && from <= last) {
      const ym = from.slice(0, 7)
      const to = lastDayOf(ym)
      months.push({ key: ym, title: monthName(ym), small: ym.slice(0, 4) !== today.slice(0, 4) ? ym.slice(0, 4) : null, from, to })
      from = addDays(to, 1)
    }
    const fill = (g) => ({ ...g, items: between(g.from, g.to) })
    return { head: head.map(fill).filter((g) => g.items.length), months: months.map(fill).filter((g) => g.items.length) }
  }, [eventsAsc, pending, today])

  const [shown, sentinel, ensure] = useProgressive(plan.months.length, 3, today)

  // evento acabado de criar/editar: carregar o mês dele e levá-lo ao centro do ecrã
  const scrolled = useRef(null)
  useEffect(() => {
    if (!flash) return
    const i = plan.months.findIndex((g) => flash.date >= g.from && flash.date <= g.to)
    if (i >= 0) ensure(i + 1)
  }, [flash, plan])
  useLayoutEffect(() => {
    if (!flash || scrolled.current === flash.id) return
    const el = document.querySelector(`.ag-home .${rowClass(flash.id)}`)
    if (!el) return
    scrolled.current = flash.id
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  })

  const flashId = flash?.id || null
  const group = (g, first = false) => (
    <div key={g.key} className="ag-group">
      <GroupHeader title={g.title} small={g.small} first={first}
        summary={eventsSummary(g.items.filter((i) => i.ev).map((i) => i.ev), missing, g.items.filter((i) => i.g).length, eventState)} />
      <div className="list"><ItemRows items={g.items} flashId={flashId} /></div>
    </div>
  )
  const allShown = shown >= plan.months.length
  const lastShown = plan.months[plan.months.length - 1] || plan.head[plan.head.length - 1]

  return (
    <div className="ag-home">
      <section className="ag-today" aria-labelledby="ag-h-hoje">
        {news}
        <GroupHeader first id="ag-h-hoje" title="Hoje" small={fmtDay(today)} />
        {todayEvs.length > 0 ? (
          <>
            <p className="ag-lede">
              {nEvents(todayEvs.length)} · {todayMissing > 0.005
                ? <><b>{money(todayMissing)}</b> ainda por receber{todayNoValue ? ` · ${todayNoValue} sem valor` : ''}.</>
                : todayNoValue ? `${todayNoValue} sem valor.` : 'tudo recebido.'}
            </p>
            <div className="ag-today-list">
              {todayEvs.map((ev) => (
                <TodayCard key={ev.id} ev={ev} now={now} compact={todayEvs.length >= 3} flash={ev.id === flash?.id}
                  className={rowClass(ev.id)} />
              ))}
            </div>
          </>
        ) : todayGoogle.length > 0 ? (
          // nada registado, mas o Google tem algo para hoje: não dizer "Nada marcado" por cima dele
          <p className="ag-lede">
            {nEvents(todayGoogle.length)} do Google por registar.
          </p>
        ) : (
          <EmptyState compact icon="calendar" title="Nada marcado para hoje" className="ag-today-empty"
            action={<Button variant="secondary" size="sm" icon="plus" iconTone="add"
              onClick={() => openSheet('novo', { kind: 'evento', data: today })}>Novo evento hoje</Button>} />
        )}
        {todayGoogle.length > 0 && <div className="list ag-today-g"><ItemRows items={mergeItems([], todayGoogle)} lead="time" /></div>}
      </section>

      <aside className="ag-side" aria-labelledby="ag-h-tratar">
        <GroupHeader id="ag-h-tratar" title="A tratar" className="ag-side-first" />
        <TasksBlock />
        <MonthCard />
        <SyncLine className="ag-sync" />
      </aside>

      <section className="ag-rest" aria-label="Próximos dias">
        {plan.head.map((g) => group(g))}
        {plan.months.slice(0, shown).map((g) => group(g))}
        {!allShown && <div ref={sentinel} className="ag-more" aria-hidden="true" />}
        {allShown && (
          <p className="ag-end-note">
            <Icon name="check" />
            {lastShown ? `Mais nada marcado depois de ${fmtDay(lastShown.items[lastShown.items.length - 1].date, { weekday: null, month: 'long' })}.` : 'Mais nada marcado.'}
          </p>
        )}
      </section>
    </div>
  )
}
