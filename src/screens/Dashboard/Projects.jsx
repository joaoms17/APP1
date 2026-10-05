import { useId } from 'react'
import { Card, Delta, HeroNumber } from '../../ui'
import { useStore } from '../../store.jsx'
import { projectVars } from '../../color.js'
import { MONTHS_LONG, cap, fmtDM, fmtMoney } from '../../format.js'

const eur = (n) => fmtMoney(n, { cents: 'never' })
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// Previsão do ano: o que já está feito + o que está marcado com valor + os eventos sem valor
// estimados pela média do projeto (últimos 12 meses). Por baixo, mês a mês até ao fim do ano.
export function ForecastCard({ f, thisYear, curMonth }) {
  const titleId = useId()
  const first = f.year === thisYear ? curMonth : 0
  const months = f.byMonth.map((m, i) => ({ ...m, i })).slice(first).filter((m) => m.total > 0 || m.i === first)
  const max = Math.max(1, ...months.map((m) => m.total))
  return (
    <Card as="section" className="db-fc" aria-labelledby={titleId}>
      <h2 className="db-sec-title" id={titleId}>Previsão {f.year}</h2>
      <HeroNumber value={f.total} cents="never" />
      <dl className="db-fc-parts">
        <div><dt><i className="db-sw done" />Já feito</dt><dd>{eur(f.done)}</dd></div>
        <div><dt><i className="db-sw booked" />Marcado com valor</dt><dd>{eur(f.booked)}</dd></div>
        <div>
          <dt><i className="db-sw est" />Estimado</dt>
          <dd>{eur(f.estimated)}<small>{plural(f.estimatedCount, 'evento sem valor', 'eventos sem valor')} × média do projeto</small></dd>
        </div>
      </dl>
      {f.unknownCount > 0 && (
        <p className="db-fc-note">{plural(f.unknownCount, 'evento', 'eventos')} sem valor de um projeto ainda sem média, fora da previsão.</p>
      )}
      <ul className="db-fc-months" aria-label="Previsão por mês">
        {months.map((m) => (
          <li key={m.i}>
            <span className="m">{cap(MONTHS_LONG[m.i])}{m.i === curMonth && f.year === thisYear ? ' (este mês)' : ''}</span>
            <span className="bar" aria-hidden="true">
              <i className="done" style={{ width: `${(m.done / max) * 100}%` }} />
              <i className="booked" style={{ width: `${(m.booked / max) * 100}%` }} />
              <i className="est" style={{ width: `${(m.estimated / max) * 100}%` }} />
            </span>
            <span className="v">{eur(m.total)}{m.estimated > 0 && <small>{eur(m.estimated)} estimado</small>}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// Por projeto: eventos, total, média por evento e comparação com o ano anterior
// (no ano corrente, até ao mesmo dia)
export function ProjectsCard({ stats, year, thisYear, today }) {
  const { projectById, projectAvgs } = useStore()
  const titleId = useId()
  const prevNote = year === thisYear ? `vs ${year - 1} até ${fmtDM(today)}` : `vs ${year - 1}`
  return (
    <Card as="section" className="db-proj" aria-labelledby={titleId}>
      <h2 className="db-sec-title" id={titleId}>Por projeto · {year}</h2>
      <ul>
        {stats.map((s) => {
          const p = projectById(s.project_id)
          const avg = s.avg ?? projectAvgs.get(s.project_id)?.avg ?? null
          return (
            <li key={s.project_id}>
              <span className="dot" data-p="" style={projectVars(p?.color || '#929292')} aria-hidden="true" />
              <span className="txt">
                <b>{p?.name || 'Projeto apagado'}</b>
                <small>
                  {plural(s.count, 'evento', 'eventos')}
                  {avg != null && <> · média {eur(avg)}</>}
                  {s.pending > 0 && <> · {s.pending} sem valor</>}
                </small>
              </span>
              <span className="v">
                {eur(s.total)}
                {s.delta != null ? <Delta value={s.delta} suffix={prevNote} /> : s.prevTotal <= 0 && <small>novo em {year}</small>}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
