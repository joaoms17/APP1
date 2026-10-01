import { Fragment, useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, ReferenceLine, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { Card, Delta, useMediaQuery, useReducedMotion } from '../../ui'
import { MONTHS_LONG, MONTH_INITIALS, cap, fmtDM, fmtMoney, fmtMoneyCompact, fmtPct } from '../../format.js'
import { FEATURES } from '../../features.js'
import { projectVars } from '../../color.js'

// Gráficos do Painel (spec §9.18) — carregados a pedido: o Recharts só desce quando se abre o Painel.
// Semântica da v1 (D11): recebido cheio, tracejado "com por receber" só à volta dos meses com
// valor em falta, ano anterior a azul, média com rótulo. Legenda em HTML e faixa de leitura
// (um toque/clique, ou as setas do teclado, fixam o mês) em vez do tooltip flutuante.

const EPS = 0.005
const MONEY = { cents: 'never' }
const eur = (n) => fmtMoney(n, MONEY)
const MONTHS = MONTHS_LONG.map(cap)
const IDX = MONTH_INITIALS.map((_, i) => i)
const ANIM = { animationDuration: 400, animationEasing: 'ease-out' } // curto, como o resto do movimento (spec §12)

// cores lidas dos tokens em runtime (nunca hex duplicados em JS); relidas quando o modo muda
function useChartColors() {
  const dark = useMediaQuery('(prefers-color-scheme: dark)')
  return useMemo(() => {
    const cs = getComputedStyle(document.documentElement)
    const v = (name) => cs.getPropertyValue(name).trim()
    return {
      dark, c1: v('--chart-1'), c2: v('--chart-2'), grid: v('--chart-grid'), avg: v('--chart-avg'),
      ink2: v('--ink-2'), surface: v('--surface'),
    }
  }, [dark])
}

// cor do projeto no modo atual (darkMark no escuro, como os pontos)
const projectColor = (p, dark) => projectVars(p.color)[dark ? '--p-d' : '--p-l']

// eixo Y com valores redondos: 0 · 1 mil € · 2 mil € … (no máximo 4 intervalos). Passos 1 · 2 · 2,5 · 5 × 10ⁿ
// a partir de 50 €, sem teto: um mês de 150 mil € dá 0 · 50 mil € … 200 mil €, nunca 12 marcas (R1-63)
function niceStep(m) {
  for (let p = 10; p < 1e15; p *= 10) {
    for (const k of [1, 2, 2.5, 5]) if (k * p >= 50 && Math.ceil(m / (k * p)) <= 4) return k * p
  }
  return Math.ceil(m / 4)
}
function niceTicks(max) {
  const m = Math.max(0, Number(max) || 0)
  const step = niceStep(m)
  const top = Math.max(step, Math.ceil(m / step) * step)
  const ticks = []
  for (let v = 0; v <= top; v += step) ticks.push(v)
  return { top, ticks }
}

// largura do eixo Y à medida do rótulo mais comprido (11 px, 700): os 46 px de sempre chegam para
// "4 mil €"; "2,5 mil €", "150 mil €" ou "1,5 M €" alargam o eixo em vez de saírem do cartão (R1-63).
// Mede-se com a fonte da página já carregada (a de recurso é mais larga e mexia no caso normal).
let ctx2d
function textWidth(s, font) {
  if (ctx2d === undefined) ctx2d = document.createElement('canvas').getContext('2d')
  if (!ctx2d) return s.length * 6.5
  ctx2d.font = font
  return ctx2d.measureText(s).width
}
function useAxisWidth() {
  const [fontsReady, setFontsReady] = useState(() => document.fonts?.status !== 'loading')
  useEffect(() => {
    if (fontsReady) return undefined
    let on = true
    document.fonts.ready.then(() => { if (on) setFontsReady(true) })
    return () => { on = false }
  }, [fontsReady])
  return useCallback((ticks) => {
    const font = `700 11px ${getComputedStyle(document.body).fontFamily}`
    const w = Math.max(...ticks.ticks.map((v) => textWidth(fmtMoneyCompact(v), font)))
    return Math.max(46, Math.ceil(w) + 9)
  }, [fontsReady]) // eslint-disable-line react-hooks/exhaustive-deps
}

// iniciais dos meses; o mês fixado a negrito
function MonthTick({ x, y, payload, sel }) {
  return (
    <text x={x} y={y + 11} textAnchor="middle" className={payload.value === sel ? 'db-tick cur' : 'db-tick'}>
      {MONTH_INITIALS[payload.value]}
    </text>
  )
}

// rótulo da média, com halo da cor do cartão
function AvgLabel({ viewBox, text }) {
  if (!viewBox) return null
  return <text x={viewBox.x + 4} y={viewBox.y - 5} className="db-avg">{text}</text>
}

// eixos e grelha comuns aos 3 gráficos. Nas linhas o eixo X é numérico (−0,5…11,5) para os
// pontos ficarem ao centro de cada mês, alinhados com as barras dos outros gráficos.
function axes(month, ticks, colors, yWidth, line = false) {
  const x = line
    ? { type: 'number', domain: [-0.5, 11.5], ticks: IDX, allowDecimals: false }
    : { type: 'category' }
  return [
    <CartesianGrid key="g" vertical={false} stroke={colors.grid} strokeWidth={1} />,
    <XAxis key="x" dataKey="i" {...x} interval={0} tickLine={false} axisLine={false} height={20}
      tick={<MonthTick sel={month} />} />,
    <YAxis key="y" width={yWidth} domain={[0, ticks.top]} ticks={ticks.ticks} tickFormatter={fmtMoneyCompact}
      tickLine={false} axisLine={false} interval={0} allowDecimals={false} />,
  ]
}

// faixa de leitura: cada valor fica inteiro numa linha (só se parte entre valores); só um valor mais
// largo do que a faixa (nome de projeto muito comprido) se parte por dentro — R1-62, ver .db-ro no CSS
function Readout({ month, items }) {
  return (
    <div className="readout" aria-live="polite">
      <b>{MONTHS[month]}</b>
      <span>
        {items.map((s, i) => (
          <Fragment key={i}><span className="db-ro">{s}{i < items.length - 1 && ' ·'}</span>{' '}</Fragment>
        ))}
      </span>
    </div>
  )
}

// um toque (ou clique) em qualquer ponto da coluna fixa o mês
const pickFrom = (onPick) => (state) => {
  const i = state?.activeTooltipIndex
  if (Number.isInteger(i) && i >= 0 && i < 12) onPick(i)
}

// teclado e leitores de ecrã (R1-36): antes de cada gráfico, um seletor de mês nativo (range 0–11)
// só para tecnologias de apoio. ←/→ (↑/↓, Home/End, PgUp/PgDn) mudam o mês fixado nos 3 gráficos,
// como o toque; o anel de foco aparece à volta do gráfico (.db-month:focus-visible + .db-plot).
function MonthRange({ month, onPick, title }) {
  return (
    <input type="range" className="sr-only db-month" min={0} max={11} step={1} value={month}
      aria-label={`Mês fixado · ${title}`} aria-valuetext={MONTHS[month]}
      onChange={(e) => onPick(Number(e.target.value))} />
  )
}

// ---------- Receita líquida por mês ----------------------------------------
function RevenueCard({ t, month, onPick, thisYear, curMonth, colors, height, animate, axisWidth, pickHint }) {
  const titleId = useId()
  const M = t.byMonth
  const { year } = t
  const prevYear = year - 1
  const hasPrev = t.netPrev > EPS
  const avg = t.avgClosed

  const data = useMemo(() => {
    const pend = (i) => i >= 0 && i < 12 && M.unpaid[i] > EPS
    // "recebido" só até ao mês atual (sem zeros no futuro)
    const paidUntil = year < thisYear ? 11 : year === thisYear ? curMonth : -1
    return IDX.map((i) => ({
      i,
      paid: i <= paidUntil ? M.paid[i] : null,
      // tracejado só à volta dos meses com valor em falta: os vizinhos ligam-no à linha cheia
      total: pend(i - 1) || pend(i) || pend(i + 1) ? M.net[i] : null,
      prev: hasPrev ? M.netPrev[i] : null,
    }))
  }, [M, year, thisYear, curMonth, hasPrev])
  const anyPaid = data.some((d) => d.paid != null)
  const anyPend = data.some((d) => d.total != null)
  const ticks = niceTicks(Math.max(...M.net, ...(hasPrev ? M.netPrev : [0])))

  const dot = (p) => {
    if (p.value == null || p.cx == null) return <g key={p.index} />
    return <circle key={p.index} cx={p.cx} cy={p.cy} r={p.index === month ? 4.5 : 3} fill={colors.c1} stroke={colors.surface} strokeWidth={2} />
  }

  const ro = [`recebido ${eur(M.paid[month])}`]
  if (M.unpaid[month] > EPS) ro.push(`falta ${eur(M.unpaid[month])}`)
  if (hasPrev) ro.push(`${prevYear} ${eur(M.netPrev[month])}`)

  // no ano corrente compara até ao mesmo dia (como a capa)
  const delta = t.ytd ? t.ytd.deltaNet : t.deltaNet
  const aria = `Receita líquida ${year}: ${eur(t.net)}`
    + (delta != null ? `, ${delta >= 0 ? 'mais' : 'menos'} ${fmtPct(Math.abs(delta), { sign: false })} do que em ${prevYear}${t.ytd ? ' no mesmo período' : ''}` : '')
    + '.' + (avg != null ? ` Média de ${eur(avg)} por mês fechado.` : '')

  const note = [pickHint]
  if (avg != null) note.push(`Média ${year}: ${eur(avg)}${t.closedMonths < 12 ? ` (${t.closedMonths} ${t.closedMonths === 1 ? 'mês fechado' : 'meses fechados'})` : ''}`)
  if (t.avgPrev != null) note.push(`${avg != null ? '' : 'Média '}${prevYear}: ${eur(t.avgPrev)}`)

  return (
    <Card as="section" className="db-chart wide" aria-labelledby={titleId}>
      <h2 id={titleId}>Receita líquida por mês</h2>
      <div className="legend">
        {anyPaid && <span><i className="db-c1" />{year} recebido</span>}
        {anyPend && <span><i className="dash db-c1" />{year} com por receber</span>}
        {hasPrev && <span><i className="db-c2" />{prevYear}</span>}
        {avg != null && <span><i className="dash db-cavg" />média {year}</span>}
      </div>
      <Readout month={month} items={ro} />
      <MonthRange month={month} onPick={onPick} title="Receita líquida por mês" />
      <div className="db-plot" role="img" aria-label={aria}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }} onClick={pickFrom(onPick)}>
            {axes(month, ticks, colors, axisWidth(ticks), true)}
            <ReferenceLine x={month} stroke={colors.ink2} strokeWidth={1} strokeDasharray="2 3" strokeOpacity={0.6} />
            {avg != null && (
              <ReferenceLine y={avg} stroke={colors.avg} strokeWidth={1.25} strokeDasharray="5 4"
                label={<AvgLabel text={`média ${eur(avg)}`} />} />
            )}
            {hasPrev && (
              <Line dataKey="prev" type="linear" stroke={colors.c2} strokeWidth={1.75} strokeOpacity={0.9} strokeLinejoin="round"
                dot={false} activeDot={false} isAnimationActive={animate} {...ANIM} />
            )}
            {anyPend && (
              <Line dataKey="total" type="linear" stroke={colors.c1} strokeWidth={2} strokeDasharray="2.5 3" strokeLinecap="round"
                connectNulls={false} dot={false} activeDot={false} isAnimationActive={animate} {...ANIM} />
            )}
            <Line dataKey="paid" type="linear" stroke={colors.c1} strokeWidth={2.25} strokeLinejoin="round"
              connectNulls={false} dot={dot} activeDot={false} isAnimationActive={animate} {...ANIM} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="note">{note[0]} {note.slice(1).join(' · ')}{note.length > 1 ? '.' : ''}</p>
    </Card>
  )
}

// ---------- Receita por projeto (barras empilhadas) -------------------------
function ProjectsCard({ t, projects, month, onPick, colors, height, animate, axisWidth }) {
  const titleId = useId()
  const { year } = t
  // projetos presentes no ano, pela ordem dos projetos; ids sem projeto conhecido no fim
  const order = useMemo(() => {
    const has = (id) => (t.byProject[id] || []).some((v) => v > EPS)
    const known = projects.filter((p) => has(p.id))
    const rest = Object.keys(t.byProject).filter((id) => has(id) && !projects.some((p) => p.id === id))
      .map((id) => ({ id, name: 'Sem projeto', color: '#929292' }))
    return [...known, ...rest]
  }, [t, projects])
  const data = useMemo(() => IDX.map((i) => {
    const row = { i }
    for (const p of order) { const v = t.byProject[p.id][i]; row[p.id] = v > EPS ? v : null }
    return row
  }), [t, order])
  const ticks = niceTicks(Math.max(...IDX.map((i) => order.reduce((a, p) => a + t.byProject[p.id][i], 0))))

  const totals = order.map((p) => ({ p, total: t.byProject[p.id].reduce((a, v) => a + v, 0) }))
    .sort((a, b) => b.total - a.total)
  const aria = `Receita líquida por projeto em ${year}, empilhada por mês: `
    + totals.map(({ p, total }) => `${p.name} ${eur(total)}`).join(', ') + '.'
  const ro = order.filter((p) => t.byProject[p.id][month] > EPS).map((p) => `${p.name} ${eur(t.byProject[p.id][month])}`)

  return (
    <Card as="section" className="db-chart half" aria-labelledby={titleId}>
      <h2 id={titleId}>Receita por projeto</h2>
      <div className="legend">
        {order.map((p) => <span key={p.id} data-p style={projectVars(p.color)}><i className="sq db-cp" />{p.name}</span>)}
      </div>
      <Readout month={month} items={ro.length ? ro : ['sem receita']} />
      <MonthRange month={month} onPick={onPick} title="Receita por projeto" />
      <div className="db-plot" role="img" aria-label={aria}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }} barCategoryGap={4} onClick={pickFrom(onPick)}>
            {axes(month, ticks, colors, axisWidth(ticks))}
            {order.map((p) => (
              <Bar key={p.id} dataKey={p.id} name={p.name} stackId="p" barSize={14} radius={2}
                fill={projectColor(p, colors.dark)} stroke={colors.surface} strokeWidth={1.5} isAnimationActive={animate} {...ANIM} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// ---------- Receita vs despesa (lado a lado) --------------------------------
function BalanceCard({ t, month, onPick, colors, height, animate, axisWidth }) {
  const titleId = useId()
  const M = t.byMonth
  const data = useMemo(() => IDX.map((i) => ({ i, net: M.net[i], exp: M.exp[i] })), [M])
  const ticks = niceTicks(Math.max(...M.net, ...M.exp))
  const aria = `Receita e despesa por mês em ${t.year}: receita líquida ${eur(t.net)}, despesas ${eur(t.exp)}, saldo ${eur(t.saldo)}.`
  return (
    <Card as="section" className="db-chart half" aria-labelledby={titleId}>
      <h2 id={titleId}>Receita vs despesa</h2>
      <div className="legend">
        <span><i className="sq db-c1" />Receita líquida</span>
        <span><i className="sq db-c2" />Despesa</span>
      </div>
      <Readout month={month}
        items={[`receita ${eur(M.net[month])}`, `despesa ${eur(-M.exp[month])}`, `saldo ${eur(M.saldo[month])}`]} />
      <MonthRange month={month} onPick={onPick} title="Receita vs despesa" />
      <div className="db-plot" role="img" aria-label={aria}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }} barGap={1} onClick={pickFrom(onPick)}>
            {axes(month, ticks, colors, axisWidth(ticks))}
            <Bar dataKey="net" name="Receita líquida" fill={colors.c1} barSize={8} radius={[2, 2, 0, 0]} isAnimationActive={animate} {...ANIM} />
            <Bar dataKey="exp" name="Despesa" fill={colors.c2} barSize={8} radius={[2, 2, 0, 0]} isAnimationActive={animate} {...ANIM} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// ---------- Penteados vs música (lado a lado) --------------------------------
// Cabelos (tipo 'hair') contra os projetos de música: barra de partilha do ano, um resumo por tipo
// (total, parte, eventos, média por evento, variação) e as barras mês a mês. Rosa = penteados,
// azul = música (o par --chart-1/--chart-2, validado para daltonismo nos dois modos).
const shareOf = (x) => `${Math.round(x * 100)} %`
function KindCard({ t, split, month, onPick, colors, height, animate, axisWidth }) {
  const titleId = useId()
  const [hair, music] = split
  const kinds = [[hair, 'db-c1'], [music, 'db-c2']]
  const prevYear = t.year - 1
  const vs = t.ytd ? `vs ${prevYear} até ${fmtDM(t.ytd.until)}` : `vs ${prevYear}`
  const data = useMemo(() => IDX.map((i) => ({ i, hair: hair.byMonth[i], music: music.byMonth[i] })), [hair, music])
  const ticks = niceTicks(Math.max(...hair.byMonth, ...music.byMonth))
  const any = hair.net + music.net > EPS
  const aria = `Penteados e música por mês em ${t.year}: penteados ${eur(hair.net)}`
    + (any ? ` (${shareOf(hair.share)})` : '') + `, música ${eur(music.net)}` + (any ? ` (${shareOf(music.share)})` : '') + '.'
  return (
    <Card as="section" className="db-chart half db-kind" aria-labelledby={titleId}>
      <h2 id={titleId}>Penteados vs música</h2>
      {any && (
        <div className="db-split" aria-hidden="true">
          {kinds.map(([k, c]) => k.share > 0 && <span key={k.key} className={c} style={{ '--pct': `${k.share * 100}%` }} />)}
        </div>
      )}
      <dl className="db-kinds">
        {kinds.map(([k, c]) => (
          <div key={k.key} className="db-kindstat">
            <dt className="legend"><span><i className={`sq ${c}`} />{k.label}</span></dt>
            <dd className="v">{eur(k.net)}{any && <small> · {shareOf(k.share)}</small>}</dd>
            <dd className="s">
              {k.count} {k.count === 1 ? 'evento' : 'eventos'}{k.avg != null && <> · média {eur(k.avg)}</>}
            </dd>
            {k.delta != null && <dd><Delta value={k.delta} suffix={vs} /></dd>}
          </div>
        ))}
      </dl>
      <Readout month={month} items={[`penteados ${eur(hair.byMonth[month])}`, `música ${eur(music.byMonth[month])}`]} />
      <MonthRange month={month} onPick={onPick} title="Penteados vs música" />
      <div className="db-plot" role="img" aria-label={aria}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }} barGap={2} onClick={pickFrom(onPick)}>
            {axes(month, ticks, colors, axisWidth(ticks))}
            <Bar dataKey="hair" name="Penteados" fill={colors.c1} barSize={8} radius={[2, 2, 0, 0]} isAnimationActive={animate} {...ANIM} />
            <Bar dataKey="music" name="Música" fill={colors.c2} barSize={8} radius={[2, 2, 0, 0]} isAnimationActive={animate} {...ANIM} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// Os cartões de gráficos (itens diretos da grelha do Painel). Receita vs despesa só com despesas.
export default function DashCharts({ t, split, projects, month, onPick, thisYear, curMonth }) {
  const colors = useChartColors()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const mouse = useMediaQuery('(hover: hover) and (pointer: fine)')
  const animate = !useReducedMotion()
  const axisWidth = useAxisWidth()
  const common = { t, month, onPick, colors, animate, axisWidth }
  // com rato também há teclado: a nota diz como (R1-36); no telemóvel fica o "Toca" da spec
  const pickHint = mouse ? 'Clica num mês (ou usa as setas) para fixar os valores.' : 'Toca num mês para fixar os valores.'
  return (
    <>
      <RevenueCard {...common} thisYear={thisYear} curMonth={curMonth} pickHint={pickHint} height={desktop ? 240 : 172} />
      <ProjectsCard {...common} projects={projects} height={desktop ? 220 : 172} />
      {split && <KindCard {...common} split={split} height={desktop ? 220 : 172} />}
      {FEATURES.expenses && <BalanceCard {...common} height={desktop ? 220 : 172} />}
    </>
  )
}
