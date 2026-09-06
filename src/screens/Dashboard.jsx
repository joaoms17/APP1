import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useStore } from '../store'
import { db } from '../supabase'
import { MONTHS_SHORT, fmtMoney, ymdParts } from '../util'

// paleta validada (dataviz): variantes escuras dos mesmos tons para dark mode
const DARK_VARIANT = {
  '#2a78d6': '#3987e5', '#eb6834': '#d95926', '#1baf7a': '#199e70',
  '#eda100': '#c98500', '#e87ba4': '#d55181', '#008300': '#008300',
  '#4a3aa7': '#9085e9', '#e34948': '#e66767', '#795548': '#a1887f',
}

const useDark = () => {
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const m = window.matchMedia('(prefers-color-scheme: dark)')
    const f = (e) => setDark(e.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return dark
}

const sum = (arr) => arr.reduce((a, b) => a + b, 0)

export default function Dashboard() {
  const { events, expenses, projects } = useStore()
  const dark = useDark()
  const [year, setYear] = useState(new Date().getFullYear())

  const ink = {
    muted: '#898781',
    grid: dark ? '#2c2c2a' : '#e1e0d9',
    surface: dark ? '#1a1a19' : '#fcfcfb',
    text: dark ? '#ffffff' : '#0b0b0b',
    s1: dark ? '#3987e5' : '#2a78d6', // ano atual / receita
    s2: dark ? '#d95926' : '#eb6834', // ano anterior / despesa
  }
  const projColor = (p) => (dark ? (DARK_VARIANT[p.color] || p.color) : p.color)

  const revByMonth = useMemo(() => {
    const mk = () => Array(12).fill(0)
    const rev = { [year]: mk(), [year - 1]: mk() }
    const gross = mk()
    const exp = { [year]: mk() }
    const byProj = Array.from({ length: 12 }, () => ({}))
    for (const ev of events) {
      const { year: y, month: m } = ymdParts(ev.event_date)
      if (rev[y]) rev[y][m] += Number(ev.value)
      if (y === year) {
        gross[m] += Number(ev.gross_value ?? ev.value)
        const p = projects.find((pr) => pr.id === ev.project_id)
        if (p) byProj[m][p.name] = (byProj[m][p.name] || 0) + Number(ev.value)
      }
    }
    for (const ex of expenses) {
      const { year: y, month: m } = ymdParts(ex.expense_date)
      if (exp[y]) exp[y][m] += Number(ex.amount)
    }
    return { rev, gross, exp, byProj }
  }, [events, expenses, projects, year])

  const totalRev = sum(revByMonth.rev[year])
  const totalGross = sum(revByMonth.gross)
  const totalRevPrev = sum(revByMonth.rev[year - 1])
  const totalExp = sum(revByMonth.exp[year])
  const unpaid = sum(events.filter((e) => !e.paid).map((e) => Number(e.value)))
  const noReceipt = events.filter((e) => e.paid && !e.receipt_issued).length

  const yoyData = MONTHS_SHORT.map((name, i) => ({
    name, [year]: revByMonth.rev[year][i], [year - 1]: revByMonth.rev[year - 1][i],
  }))
  const projData = MONTHS_SHORT.map((name, i) => ({ name, ...revByMonth.byProj[i] }))
  const balData = MONTHS_SHORT.map((name, i) => ({
    name, Receita: revByMonth.rev[year][i], Despesa: revByMonth.exp[year][i],
  }))

  const axis = { tick: { fill: ink.muted, fontSize: 11 }, stroke: ink.grid, tickLine: false }
  const tipStyle = {
    contentStyle: { background: ink.surface, border: `1px solid ${ink.grid}`, borderRadius: 10, fontSize: 12 },
    labelStyle: { color: ink.text, fontWeight: 600 },
    formatter: (v) => fmtMoney(v),
  }
  const legendStyle = { wrapperStyle: { fontSize: 12, color: ink.text } }
  const deltaPct = totalRevPrev > 0 ? Math.round(((totalRev - totalRevPrev) / totalRevPrev) * 100) : null

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Painel</h1>
          <div className="sub">Receitas, despesas e comparações</div>
        </div>
        <button className="btn secondary" style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }} onClick={() => db.auth.signOut()}>
          Sair
        </button>
      </div>

      <div className="yearsel">
        <button onClick={() => setYear(year - 1)} aria-label="Ano anterior">‹</button>
        <b>{year}</b>
        <button onClick={() => setYear(year + 1)} aria-label="Ano seguinte">›</button>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="label">Receita {year}</div>
          <div className="value">{fmtMoney(totalRev)}</div>
          {deltaPct !== null && (
            <div className="delta">{deltaPct >= 0 ? '▲' : '▼'} {Math.abs(deltaPct)}% vs {year - 1}</div>
          )}
        </div>
        <div className="tile">
          <div className="label">Despesas {year}</div>
          <div className="value">{fmtMoney(totalExp)}</div>
          {totalGross - totalRev > 0.005 && (
            <div className="delta">Bruto − Final: {fmtMoney(totalGross - totalRev)}</div>
          )}
        </div>
        <div className="tile">
          <div className="label">Saldo {year}</div>
          <div className={`value ${totalRev - totalExp >= 0 ? 'good' : 'bad'}`}>{fmtMoney(totalRev - totalExp)}</div>
        </div>
        <div className="tile">
          <div className="label">Por receber (total)</div>
          <div className="value bad">{fmtMoney(unpaid)}</div>
          {noReceipt > 0 && <div className="delta">⚠ {noReceipt} pago(s) sem recibo</div>}
        </div>
      </div>

      <div className="card">
        <h2>Receita mensal — {year} vs {year - 1}</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={yoyData} barGap={2}>
            <CartesianGrid stroke={ink.grid} vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis {...axis} width={44} />
            <Tooltip {...tipStyle} cursor={{ fill: ink.grid, opacity: 0.4 }} />
            <Legend {...legendStyle} />
            <Bar dataKey={year} fill={ink.s1} radius={[4, 4, 0, 0]} />
            <Bar dataKey={year - 1} fill={ink.s2} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="chart-note">Compara cada mês com o mês homólogo do ano anterior.</div>
      </div>

      <div className="card">
        <h2>Receita por projeto — {year}</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={projData}>
            <CartesianGrid stroke={ink.grid} vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis {...axis} width={44} />
            <Tooltip {...tipStyle} cursor={{ fill: ink.grid, opacity: 0.4 }} />
            <Legend {...legendStyle} />
            {projects.map((p) => (
              <Bar key={p.id} dataKey={p.name} stackId="a" fill={projColor(p)} stroke={ink.surface} strokeWidth={1} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>Receita vs despesa — {year}</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={balData} barGap={2}>
            <CartesianGrid stroke={ink.grid} vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis {...axis} width={44} />
            <Tooltip {...tipStyle} cursor={{ fill: ink.grid, opacity: 0.4 }} />
            <Legend {...legendStyle} />
            <Bar dataKey="Receita" fill={ink.s1} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Despesa" fill={ink.s2} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>Resumo mensal — {year}</h2>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr><th>Mês</th><th className="num">Bruto</th><th className="num">Final</th><th className="num">Bruto−Final</th><th className="num">{year - 1}</th><th className="num">Despesa</th><th className="num">Saldo</th></tr>
            </thead>
            <tbody>
              {MONTHS_SHORT.map((m, i) => (
                <tr key={m}>
                  <td>{m}</td>
                  <td className="num">{fmtMoney(revByMonth.gross[i])}</td>
                  <td className="num">{fmtMoney(revByMonth.rev[year][i])}</td>
                  <td className="num">{fmtMoney(revByMonth.gross[i] - revByMonth.rev[year][i])}</td>
                  <td className="num">{fmtMoney(revByMonth.rev[year - 1][i])}</td>
                  <td className="num">{fmtMoney(revByMonth.exp[year][i])}</td>
                  <td className="num">{fmtMoney(revByMonth.rev[year][i] - revByMonth.exp[year][i])}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700 }}>
                <td>Total</td>
                <td className="num">{fmtMoney(totalGross)}</td>
                <td className="num">{fmtMoney(totalRev)}</td>
                <td className="num">{fmtMoney(totalGross - totalRev)}</td>
                <td className="num">{fmtMoney(totalRevPrev)}</td>
                <td className="num">{fmtMoney(totalExp)}</td>
                <td className="num">{fmtMoney(totalRev - totalExp)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
