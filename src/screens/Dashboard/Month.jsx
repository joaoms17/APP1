import { useId, useMemo, useState } from 'react'
import { Card, EventRow, HeroNumber, Icon, IconButton } from '../../ui'
import { useStore } from '../../store.jsx'
import { MONTHS_LONG, cap, fmtMoney } from '../../format.js'

const EPS = 0.005
const eur = (n) => fmtMoney(n, { cents: 'never' })
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// Mês no Painel: quanto dá o mês e de onde vem — recebido, por receber, em atraso e estimado (eventos sem
// valor × média do projeto, como na Previsão). Cada linha abre os eventos dela. O mês é o mesmo que fica
// fixado nos gráficos; as setas passam de ano.
export default function MonthCard({ year, month, onMonth }) {
  const { monthOverview, projectById } = useStore()
  const titleId = useId()
  const base = useId()
  const o = useMemo(() => monthOverview(year, month), [monthOverview, year, month])
  const [open, setOpen] = useState(() => new Set())
  const toggle = (k) => setOpen((s) => {
    const n = new Set(s)
    if (n.has(k)) n.delete(k); else n.add(k)
    return n
  })
  const go = (d) => {
    const m = month + d
    onMonth(m < 0 ? year - 1 : m > 11 ? year + 1 : year, (m + 12) % 12)
  }
  const name = cap(MONTHS_LONG[month])
  const g = o.groups

  const rows = [
    {
      key: 'received', sw: 'paid', label: 'Recebido', value: o.received, end: 'value', evs: g.received,
      sub: [o.paidCount > 0 && plural(o.paidCount, 'evento pago', 'eventos pagos'),
        o.depositCount > 0 && `sinal de ${plural(o.depositCount, 'evento', 'eventos')}`].filter(Boolean).join(' · '),
    },
    { key: 'due', sw: 'due', label: 'Por receber', value: o.due, end: 'missing', evs: g.due, sub: plural(g.due.length, 'evento', 'eventos') },
    { key: 'overdue', sw: 'late', label: 'Em atraso', value: o.overdue, end: 'missing', evs: g.overdue, sub: plural(g.overdue.length, 'evento já realizado', 'eventos já realizados') },
    {
      key: 'novalue', sw: 'est', label: 'Estimado', value: o.estimated, approx: true, end: 'value', evs: g.novalue,
      sub: [`${plural(g.novalue.length, 'evento sem valor', 'eventos sem valor')} × média do projeto`,
        o.unknownCount > 0 && `${o.unknownCount} sem média para estimar`].filter(Boolean).join(' · '),
    },
    { key: 'zero', sw: 'zero', label: 'De 0 €', value: null, end: 'value', evs: g.zero, sub: plural(g.zero.length, 'evento', 'eventos') },
  ].filter((r) => r.evs.length > 0)

  // estimativa de cada evento sem valor no lugar do local (o valor fica "—" até a Joana o pôr)
  const metaOf = (r, x) => {
    if (r.key !== 'novalue') return undefined
    const p = projectById(x.ev.project_id)
    return [p?.name, x.est != null ? `≈ ${eur(x.est)} (média)` : 'sem média'].filter(Boolean).join(' · ')
  }
  const width = (v) => `${(v / Math.max(o.total, EPS)) * 100}%`

  return (
    <Card as="section" className="db-mo" aria-labelledby={titleId}>
      <div className="db-mo-head">
        <h2 className="db-sec-title" id={titleId}>Mês</h2>
        <div className="db-mo-nav" role="group" aria-label="Mês">
          <IconButton icon="chevL" label="Mês anterior" onClick={() => go(-1)} />
          <b aria-live="polite">{name} {year}</b>
          <IconButton icon="chevR" label="Mês seguinte" onClick={() => go(1)} />
        </div>
      </div>
      {o.count === 0 ? (
        <p className="db-fc-note">Sem eventos em {MONTHS_LONG[month]} de {year}.</p>
      ) : (
        <>
          <HeroNumber value={o.total} cents="never" />
          <p className="db-mo-sub">
            {plural(o.count, 'evento', 'eventos')}
            {o.estimated > EPS && (o.valued > EPS ? ` · ${eur(o.valued)} com valor + ≈ ${eur(o.estimated)} estimado` : ' · tudo estimado')}
          </p>
          {o.total > EPS && (
            <span className="db-mo-bar" aria-hidden="true">
              {o.received > EPS && <i className="paid" style={{ width: width(o.received) }} />}
              {o.due > EPS && <i className="due" style={{ width: width(o.due) }} />}
              {o.overdue > EPS && <i className="late" style={{ width: width(o.overdue) }} />}
              {o.estimated > EPS && <i className="est" style={{ width: width(o.estimated) }} />}
            </span>
          )}
          <ul className="db-mo-parts">
            {rows.map((r) => {
              const on = open.has(r.key)
              const id = `${base}-${r.key}`
              return (
                <li key={r.key} data-open={on || undefined}>
                  <button type="button" className="db-mo-row" aria-expanded={on} aria-controls={id} onClick={() => toggle(r.key)}>
                    <span className="k"><i className={`db-sw ${r.sw}`} aria-hidden="true" />{r.label}</span>
                    <span className="v">{r.value == null ? '' : `${r.approx ? '≈ ' : ''}${eur(r.value)}`}</span>
                    <Icon name="chevD" size="sm" className="x" />
                    <small className="s">{r.sub}</small>
                  </button>
                  <div id={id} className="db-mo-list" hidden={!on}>
                    {on && r.evs.map((x) => (
                      <div key={x.ev.id} className="db-mo-item">
                        <EventRow ev={x.ev} lead="date" end={r.end} meta={metaOf(r, x)} />
                      </div>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Card>
  )
}
