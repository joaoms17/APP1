import { useId } from 'react'
import { Card, Delta, HeroNumber } from '../../ui'
import { useStore } from '../../store.jsx'
import { projectVars } from '../../color.js'
import { MONTHS_ABBR, MONTHS_LONG, cap, fmtDM, fmtMoney } from '../../format.js'

const eur = (n) => fmtMoney(n, { cents: 'never' })
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const AVG_NOTE = 'média do projeto nos últimos 12 meses'

// parcelas arredondadas ao euro que somam o total arredondado (maiores restos primeiro)
function roundParts(parts, total) {
  const target = Math.round(total)
  const floors = parts.map((v) => Math.floor(v + 1e-9))
  let left = target - floors.reduce((s, v) => s + v, 0)
  const order = parts.map((v, i) => [v - floors[i], i]).sort((a, b) => b[0] - a[0])
  for (const [, i] of order) { if (left <= 0) break; floors[i]++; left-- }
  return floors
}

// Previsão do ano: o que já está feito + o que está marcado com valor + os eventos sem valor
// estimados pela média do projeto (últimos 12 meses). Por baixo, os meses já passados num só total
// e depois mês a mês até ao fim do ano: as linhas somam o total.
export function ForecastCard({ f, thisYear, curMonth }) {
  const titleId = useId()
  const [done, booked, estimated] = roundParts([f.done, f.booked, f.estimated], f.total)
  const first = f.year === thisYear ? curMonth : 0
  const past = f.byMonth.slice(0, first).reduce((a, m) => ({
    done: a.done + m.done, booked: a.booked + m.booked, estimated: a.estimated + m.estimated, total: a.total + m.total,
  }), { done: 0, booked: 0, estimated: 0, total: 0 })
  const rows = [
    ...(past.total > 0.005 ? [{ ...past, key: 'past', name: first === 1 ? cap(MONTHS_LONG[0]) : `${cap(MONTHS_ABBR[0])}–${MONTHS_ABBR[first - 1]}` }] : []),
    ...f.byMonth.map((m, i) => ({ ...m, key: i, i, name: cap(MONTHS_LONG[i]) + (i === curMonth && f.year === thisYear ? ' (este mês)' : '') }))
      .slice(first).filter((m) => m.total > 0.005 || m.i === first),
  ]
  const max = Math.max(1, ...rows.map((m) => m.total))
  const detail = (m) => {
    const bits = [m.done > 0.005 && `${eur(m.done)} feito`, m.booked > 0.005 && `${eur(m.booked)} marcado`, m.estimated > 0.005 && `${eur(m.estimated)} estimado`]
      .filter(Boolean)
    return bits.length > 1 || m.estimated > 0.005 ? bits.join(' · ') : null
  }
  const projs = f.unknownProjects || 0
  return (
    <Card as="section" className="db-fc" aria-labelledby={titleId}>
      <h2 className="db-sec-title" id={titleId}>Previsão {f.year}</h2>
      <HeroNumber value={f.total} cents="never" />
      <dl className="db-fc-parts">
        <div><dt><i className="db-sw done" />Já feito</dt><dd>{eur(done)}</dd></div>
        <div><dt><i className="db-sw booked" />Marcado com valor</dt><dd>{eur(booked)}</dd></div>
        <div>
          <dt><i className="db-sw est" />Estimado</dt>
          <dd>{eur(estimated)}</dd>
          <p className="db-fc-sub">{plural(f.estimatedCount, 'evento sem valor', 'eventos sem valor')} × {AVG_NOTE}</p>
        </div>
      </dl>
      {f.unknownCount > 0 && (
        <p className="db-fc-note">
          {plural(f.unknownCount, 'evento sem valor fica', 'eventos sem valor ficam')} fora da previsão:{' '}
          {projs > 1 ? `${projs} projetos ainda não têm` : 'o projeto ainda não tem'} nenhum evento com valor para fazer a média.
        </p>
      )}
      <ul className="db-fc-months" aria-label="Previsão por mês">
        {rows.map((m) => (
          <li key={m.key}>
            <span className="m">{m.name}</span>
            <span className="v">{eur(m.total)}</span>
            <span className="bar" aria-hidden="true">
              {m.done > 0.005 && <i className="done" style={{ width: `${(m.done / max) * 100}%` }} />}
              {m.booked > 0.005 && <i className="booked" style={{ width: `${(m.booked / max) * 100}%` }} />}
              {m.estimated > 0.005 && <i className="est" style={{ width: `${(m.estimated / max) * 100}%` }} />}
            </span>
            {detail(m) && <small className="d">{detail(m)}</small>}
          </li>
        ))}
      </ul>
    </Card>
  )
}

// Por projeto: eventos, total e média do ano (só eventos com valor), os sem valor (com a estimativa que
// a Previsão usa, no ano corrente e seguintes) e a variação face ao ano anterior.
export function ProjectsCard({ stats, year, thisYear, today }) {
  const { projectById, projectAvgs } = useStore()
  const titleId = useId()
  const cur = year === thisYear
  const prevNote = cur ? `vs ${year - 1} até ${fmtDM(today)}` : `vs ${year - 1}`
  const estimates = year >= thisYear
  return (
    <Card as="section" className="db-proj" aria-labelledby={titleId}>
      <h2 className="db-sec-title" id={titleId}>Por projeto · {year}</h2>
      <p className="db-proj-note">
        Média por evento com valor{estimates && ' · sem valor ≈ média dos últimos 12 meses'} · variação {prevNote}
      </p>
      <ul>
        {stats.map((s) => {
          const p = projectById(s.project_id)
          const a = projectAvgs.get(s.project_id)
          let pending = null
          if (s.pending > 0) {
            pending = !estimates ? `${s.pending} sem valor`
              : a ? `${s.pending} sem valor ≈ ${eur(s.pending * a.avg)}`
              : `${s.pending} sem valor (sem média para estimar)`
          }
          return (
            <li key={s.project_id}>
              <span className="dot" data-p="" style={projectVars(p?.color || '#929292')} aria-hidden="true" />
              <span className="txt">
                <b>{p?.name || 'Projeto apagado'}</b>
                <small>
                  {plural(s.count, 'evento', 'eventos')}
                  {s.avg != null && <> · média {eur(s.avg)}</>}
                </small>
                {pending && <small className="pend">{pending}</small>}
              </span>
              <span className="v">
                {eur(s.total)}
                {s.delta != null
                  ? <Delta value={s.delta} srLabel={`Em relação a ${year - 1}${cur ? ` até ${fmtDM(today)}` : ''}:`} />
                  : s.prevCount === 0 && s.valued > 0 ? <small>novo em {year}</small> : null}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
