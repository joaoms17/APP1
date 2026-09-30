import { useEffect, useRef, useState } from 'react'
import { Button, Callout, IconButton, Segmented, SyncBanner, TopBar, useLocalPref, useMediaQuery } from '../../ui'
import { useStore } from '../../store.jsx'
import { navigate, setParams, useRoute } from '../../router.js'
import { fmtKicker } from '../../format.js'
import AgendaList, { PrevLink } from './AgendaList.jsx'
import SearchMode from './SearchMode.jsx'
import MonthView from './MonthView.jsx'
import './Agenda.css'

// Agenda (pacote E1) — Lista (arranque, com Hoje e A tratar) · Procurar (modo da Lista) · Mês.
//   #/agenda[/lista]                                  → Lista (ou a última vista usada)
//   #/agenda/lista?q=…&quando=…&estado=…&p=…         → Procurar
//   #/agenda/mes/<ymd>                                → Mês com o dia selecionado

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/
// só datas que existem ("2026-02-31" ou "2026-13-45" na rota caem para hoje)
const isDay = (s) => {
  const m = YMD.exec(s || '')
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return +m[1] >= 1900 && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]
}
const FILTERS = ['quando', 'estado', 'p'] // um filtro na rota (mesmo sem q=) também é o Procurar
const VIEWS = [
  { value: 'lista', label: 'Lista', icon: 'list' },
  { value: 'mes', label: 'Mês', icon: 'grid' },
]

// campos que o Editar/Novo mudam (pagamentos e recibo não contam: não levam a lista a lado nenhum)
const signature = (e) => [e.title, e.event_date, e.start_time, e.location, e.value, e.gross_value, e.project_id, e.notes].join('|')

// Evento criado ou editado (ou reposto pelo Anular): quando a folha fecha, a Agenda vai até ao dia
// dele e a linha pisca 1,2 s (spec §3.3, IA-17).
// Só conta o que muda com a Agenda à vista (editar a partir de Receber não mexe na Agenda).
function useFlash(events, { visible, sheetOpen, view }) {
  const prev = useRef(null)
  const shown = useRef(visible)
  shown.current = visible
  const [pending, setPending] = useState(null)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    const now = new Map(events.map((e) => [e.id, signature(e)]))
    const old = prev.current
    prev.current = now
    if (!old || !shown.current) return
    const changed = events.filter((e) => old.get(e.id) !== now.get(e.id))
    if (changed.length === 1) setPending({ id: changed[0].id, date: changed[0].event_date })
  }, [events])

  useEffect(() => {
    if (!pending || !visible || sheetOpen) return
    setPending(null)
    if (view === 'mes') navigate(`#/agenda/mes/${pending.date}`, { replace: true })
    setFlash(pending)
  }, [pending, visible, sheetOpen, view])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 1300)
    return () => clearTimeout(t)
  }, [flash])

  return flash
}

export default function Agenda() {
  const route = useRoute()
  const { today, events } = useStore()
  const [pref, setPref] = useLocalPref('agenda.vista', 'lista')
  const [seenNews, setSeenNews] = useLocalPref('novidades', false)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const visible = route.tab === 'agenda'

  // escondida (noutro separador), a Agenda continua a mostrar a sua última rota
  const last = useRef(route)
  if (visible) last.current = route
  const r = last.current
  const searching = 'q' in r.params || FILTERS.some((k) => k in r.params)
  const view = r.path[1] === 'mes' || r.path[1] === 'lista' ? r.path[1] : pref === 'mes' ? 'mes' : 'lista'
  const day = isDay(r.path[2]) ? r.path[2] : today

  // de onde se veio para o Procurar: o "Cancelar" volta lá
  const lastView = useRef('#/agenda/lista')
  if (visible && !searching) lastView.current = view === 'mes' ? `#/agenda/mes/${day}` : '#/agenda/lista'

  // #/agenda sem vista (ou com uma vista/dia que não existe) → a última vista usada;
  // a vista escolhida fica memorizada
  useEffect(() => {
    if (visible && searching && !('q' in route.params)) { setParams({ q: '' }); return }
    if (!visible || route.sheet || searching) return
    const v = route.path[1]
    if (v !== 'mes' && v !== 'lista') navigate(pref === 'mes' ? `#/agenda/mes/${today}` : '#/agenda/lista', { replace: true })
    else if (v === 'mes' && !isDay(route.path[2])) navigate(`#/agenda/mes/${today}`, { replace: true })
    else if (v !== pref) setPref(v)
  }, [visible, route, searching, pref, today])

  const flash = useFlash(events, { visible, sheetOpen: !!route.sheet, view: searching ? 'procurar' : view })

  // voltar ao Mês reabre o último dia escolhido
  const monthDay = useRef(null)
  if (visible && view === 'mes') monthDay.current = day
  const setView = (v) => navigate(v === 'mes' ? `#/agenda/mes/${monthDay.current || today}` : '#/agenda/lista', { replace: true })
  const openSearch = () => navigate('#/agenda/lista?q=')
  const exitSearch = () => navigate(lastView.current, { replace: true })

  if (searching) {
    return (
      <div className="ag-screen">
        <SearchMode params={r.params} onExit={exitSearch} />
      </div>
    )
  }

  const news = !seenNews && view === 'lista' && (
    <Callout tone="info" title="Novidades da v2." className="ag-news">
      Os Eventos estão aqui, na Lista. Dívidas e recibos têm o separador Receber.
      {desktop ? ' As definições estão no fundo da barra lateral.' : ' As definições abrem no J.'}
      <span className="ag-news-act">
        <Button variant="ghost" size="sm" onClick={() => setSeenNews(new Date().toISOString())}>Percebi</Button>
      </span>
    </Callout>
  )

  return (
    <div className="ag-screen">
      <TopBar kicker={fmtKicker(today)} title="Agenda"
        actions={<IconButton icon="search" label="Procurar e filtrar eventos" onClick={openSearch} />} />
      {/* telemóvel: Lista|Mês · aviso do Google · "↑ Anteriores" (spec §10.3);
          computador: Lista|Mês e "↑ Anteriores" na mesma linha, aviso por baixo */}
      <div className="ag-top">
        <Segmented label="Vista da agenda" className="ag-view-switch" value={view} onChange={setView} options={VIEWS} />
        <SyncBanner className="ag-banner" />
        {view === 'lista' && <PrevLink />}
      </div>
      {view === 'mes'
        ? <MonthView day={day} active={visible && !route.sheet} flashId={flash?.id} />
        : <AgendaList flash={flash} news={news} />}
    </div>
  )
}
