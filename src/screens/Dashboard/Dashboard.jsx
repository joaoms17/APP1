import { lazy, Suspense, useId, useMemo, useRef, useState } from 'react'
import { Button, Card, Delta, EmptyState, HeroNumber, Icon, IconButton, Kpi, Skeleton, TopBar, useMediaQuery } from '../../ui'
import { useStore } from '../../store.jsx'
import { navigate, routeHref, useRoute } from '../../router.js'
import { MONTHS_LONG, fmtMoney } from '../../format.js'
import { Boundary } from '../../shell/lazy.jsx'
import SummaryTable from './SummaryTable.jsx'
import './Dashboard.css'

// Painel (pacote E4, spec §10.13) — "Como está o ano?".
//   #/painel/<ano> → capa (Saldo líquido) · Receita líquida · Despesas · Em atraso do ano (→ Receber)
//   · gráficos (carregados a pedido) · Resumo mensal.
// Todos os números vêm de yearTotals(ano) do store: Em atraso e futuros respeitam o ano escolhido (D19).

const DashCharts = lazy(() => import('./charts.jsx'))

const EPS = 0.005
const eur = (n) => fmtMoney(n, { cents: 'never' })
const YEAR = /^\d{4}$/

// seletor ‹ 2026 › da TopBar (o ano é anunciado ao mudar)
function YearSelect({ year, onChange }) {
  return (
    <div className="db-yearsel" role="group" aria-label="Ano">
      <IconButton icon="chevL" label="Ano anterior" onClick={() => onChange(year - 1)} />
      <b aria-live="polite">{year}</b>
      <IconButton icon="chevR" label="Ano seguinte" onClick={() => onChange(year + 1)} />
    </div>
  )
}

// capa: Saldo líquido do ano (um número de capa por ecrã); no computador, mais 3 factos
function Hero({ t, thisYear, desktop }) {
  const titleId = useId()
  const best = t.bestMonth
  const months = t.closedMonths
  return (
    <Card as="section" className="hero db-hero" aria-labelledby={titleId}>
      <h2 className="label" id={titleId}>Saldo líquido {t.year}</h2>
      <div className="rule" />
      <div className="row1">
        <HeroNumber value={t.saldo} cents="never" />
        <Delta value={t.deltaSaldo} suffix={`vs ${t.year - 1}`} />
      </div>
      <p className="sub">
        Receita líquida − despesas.
        {best && ` Melhor mês: ${MONTHS_LONG[best.month]}, ${eur(best.saldo)}.`}
      </p>
      {desktop && (
        <div className="db-facts">
          <Kpi label="Média mensal" value={t.avgClosed == null ? '—' : eur(t.avgClosed)}
            sub={t.avgClosed == null ? 'ainda sem meses fechados'
              : months === 12 ? 'por mês' : `${months} ${months === 1 ? 'mês fechado' : 'meses fechados'}`} />
          <Kpi label="Eventos" value={t.eventsCount} sub={`em ${t.year}`} />
          {t.year >= thisYear && <Kpi label="Ainda marcados" value={eur(t.upcomingYear)} sub="até dezembro" />}
        </div>
      )}
    </Card>
  )
}

function Kpis({ t }) {
  const prev = t.year - 1
  return (
    <div className="db-kpis">
      <Card className="db-kpi">
        <Kpi label="Receita líquida" value={eur(t.net)} sub={`bruto ${eur(t.gross)} · retido ${eur(t.retained)}`} />
        {t.deltaNet != null && <span className="db-delta"><span className="sr-only">Em relação a {prev}: </span><Delta value={t.deltaNet} /></span>}
      </Card>
      <Card className="db-kpi">
        <Kpi label="Despesas" value={eur(-t.exp)} sub={t.expPrev > EPS ? `${prev}: ${eur(-t.expPrev)}` : `sem despesas em ${prev}`} />
        {t.deltaExp != null && <span className="db-delta"><span className="sr-only">Em relação a {prev}: </span><Delta value={t.deltaExp} goodWhen="down" /></span>}
      </Card>
    </div>
  )
}

// "Em atraso · eventos de <ano>" → Receber › Em atraso
function OverdueTile({ t, lateCount }) {
  const late = t.overdueYear > EPS
  const sub = t.upcomingYear > EPS ? `+ ${eur(t.upcomingYear)} de eventos futuros`
    : late ? `${lateCount} ${lateCount === 1 ? 'evento' : 'eventos'} com valor em falta`
    : 'Nada em atraso'
  const go = (e) => {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate('#/receber/atraso')
  }
  return (
    <a className="card db-link" href={routeHref('#/receber/atraso')} onClick={go}>
      <span className="txt">
        <span className="k">Em atraso · eventos de {t.year}</span>
        <span className={late ? 'v late' : 'v'}>{eur(t.overdueYear)}</span>
        <span className="s">{sub}</span>
      </span>
      <span className="go">Receber</span>
      <Icon name="chevR" className="chev" />
    </a>
  )
}

// lugar dos gráficos enquanto o Recharts desce (mesma grelha, sem saltos)
function ChartsFallback() {
  return ['wide', 'half', 'half'].map((k, i) => (
    <Card key={i} className={`db-chart ${k} db-wait`}><Skeleton lines={3} label="A carregar os gráficos" /></Card>
  ))
}

function ChartsError({ retry }) {
  return (
    <Card className="db-chart wide db-wait">
      <EmptyState icon="chart" compact title="Não foi possível mostrar os gráficos."
        text="Verifica a ligação e tenta de novo." action={<Button icon="refresh" onClick={retry}>Tentar de novo</Button>} />
    </Card>
  )
}

export default function Dashboard() {
  const route = useRoute()
  const { today, projects, yearTotals, receivables, loadingPhases } = useStore()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const thisYear = Number(today.slice(0, 4))
  const curMonth = Number(today.slice(5, 7)) - 1

  // escondido (noutro separador), o Painel continua no ano que tinha
  const last = useRef(route.path)
  if (route.tab === 'painel') last.current = route.path
  const year = YEAR.test(last.current[1] || '') ? Number(last.current[1]) : thisYear
  const goYear = (y) => navigate(`#/painel/${y}`, { replace: true })

  // mês fixado na faixa de leitura: por omissão o mês atual (ou dezembro/janeiro noutros anos)
  const [pick, setPick] = useState(null)
  const month = pick?.year === year ? pick.month : year === thisYear ? curMonth : year < thisYear ? 11 : 0
  const onPick = (m) => setPick({ year, month: m })

  // despesas ainda a chegar: os totais ainda não estão certos. O memo evita que os gráficos
  // voltem a animar a cada render do store (só mudam quando mudam os dados ou o ano).
  const waiting = !!loadingPhases?.phase2
  const t = useMemo(() => (waiting ? null : yearTotals(year)), [waiting, yearTotals, year])

  let body
  if (!t) {
    body = <Card className="db-wait"><Skeleton lines={4} label="A carregar o painel" /></Card>
  } else if (!t.hasData) {
    body = (
      <EmptyState icon="chart" title={`Sem movimentos em ${year}`} text="Não há eventos nem despesas registados neste ano."
        action={year !== thisYear && <Button variant="secondary" onClick={() => goYear(thisYear)}>Ver {thisYear}</Button>} />
    )
  } else {
    body = (
      <div className="db-grid">
        <Hero t={t} thisYear={thisYear} desktop={desktop} />
        <Kpis t={t} />
        <OverdueTile t={t} lateCount={receivables.overdue.filter((e) => e.event_date.startsWith(`${year}-`)).length} />
        <Boundary resetKey={year} fallback={(error, retry) => <ChartsError retry={retry} />}>
          <Suspense fallback={<ChartsFallback />}>
            <DashCharts t={t} projects={projects} month={month} onPick={onPick} thisYear={thisYear} curMonth={curMonth} />
          </Suspense>
        </Boundary>
        <SummaryTable t={t} full={desktop} />
      </div>
    )
  }

  return (
    <div className="db-screen">
      <TopBar kicker="Finanças" title="Painel" actions={<YearSelect year={year} onChange={goYear} />} />
      {body}
    </div>
  )
}
