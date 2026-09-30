import { ProjectAvatar, SettingsRow, Skeleton } from '../../ui'
import { useStore } from '../../store.jsx'
import { openSheet } from '../../router.js'
import { fmtDay, fmtMoney } from '../../format.js'
import { QuoteBadge, useHiddenQuotes } from './QuoteSheet.jsx'
import { PriceList } from './PricesSheet.jsx'
import './Documents.css'

// Documentos e Tabela de preços (spec §10.15) — só com FEATURES.docs (escondidos até chegarem os templates).
// Nunca são um separador: vivem em Definições (estas secções) e no "…" do Detalhe do evento (folhas).
export { default as QuoteSheet } from './QuoteSheet.jsx'
export { default as ScheduleSheet } from './ScheduleSheet.jsx'
export { default as PricesSheet } from './PricesSheet.jsx'

const money = (n) => fmtMoney(n, { cents: 'auto' })
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// "sáb, 14 nov" (este ano) · "sáb, 22 mai 2027"
function dayText(ymd, today) {
  if (!ymd) return 'sem data'
  return fmtDay(ymd, { weekday: 'abbr', year: ymd.slice(0, 4) !== today.slice(0, 4) })
}

// Definições › Documentos: Orçamentos + Cronogramas do dia
export function DocumentsSection() {
  const { quotes, quoteTotal, projectById, events, scheduleItems, today, loadingPhases } = useStore()
  const hidden = useHiddenQuotes()
  const list = quotes.filter((q) => !hidden.has(q.id))
  const counts = new Map()
  for (const s of scheduleItems) counts.set(s.event_id, (counts.get(s.event_id) || 0) + 1)
  // cronogramas: os próximos primeiro (por data), depois os passados (do mais recente)
  const withSchedule = events.filter((e) => counts.has(e.id)).sort((a, b) => {
    const fa = a.event_date >= today
    const fb = b.event_date >= today
    if (fa !== fb) return fa ? -1 : 1
    return fa ? a.event_date.localeCompare(b.event_date) : b.event_date.localeCompare(a.event_date)
  })

  return (
    <section className="st-sec" aria-labelledby="doc-sec">
      <header><h2 id="doc-sec">Documentos</h2><small>orçamentos e cronogramas</small></header>
      <div className="card doc-card">
        <h3 className="doc-card-title">Orçamentos</h3>
        {loadingPhases.phase2 ? <Skeleton lines={2} label="A carregar os orçamentos" /> : list.map((q) => {
          const p = q.project_id ? projectById(q.project_id) : null
          return (
            <SettingsRow key={q.id} avatar={<ProjectAvatar project={p} />} title={q.client_name || 'Sem nome'}
              sub={<>{dayText(q.event_date, today)}{q.location ? ` · ${q.location}` : ''} <QuoteBadge status={q.status} /></>}
              value={money(quoteTotal(q))} onClick={() => openSheet('orcamento', q.id)} />
          )
        })}
        <SettingsRow className="st-add" icon="plus" title="Novo orçamento" chevron={false} onClick={() => openSheet('orcamento')} />
      </div>
      <div className="card doc-card">
        <h3 className="doc-card-title">Cronogramas do dia</h3>
        {withSchedule.map((ev) => (
          <SettingsRow key={ev.id} avatar={<ProjectAvatar project={projectById(ev.project_id)} />} title={ev.title}
            sub={`${dayText(ev.event_date, today)}${ev.location ? ` · ${ev.location}` : ''} · ${plural(counts.get(ev.id), 'linha', 'linhas')}`}
            onClick={() => openSheet('cronograma', ev.id)} />
        ))}
        <SettingsRow className="st-add" icon="plus" title="Novo cronograma" sub="Escolhe o evento" chevron={false}
          onClick={() => openSheet('cronograma')} />
      </div>
    </section>
  )
}

// Definições › Tabela de preços
export function PricesSection() {
  return (
    <section className="st-sec" aria-labelledby="doc-prices">
      <header><h2 id="doc-prices">Tabela de preços</h2><small>entra nos orçamentos</small></header>
      <div className="card doc-card">
        <PriceList />
      </div>
    </section>
  )
}
