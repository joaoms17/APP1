import { useId, useMemo, useState } from 'react'
import { Card, EventRow, HeroNumber, Icon, IconButton } from '../../ui'
import { useStore } from '../../store.jsx'
import { MONTHS_LONG, cap, fmtMoney } from '../../format.js'
import { roundParts } from './Projects.jsx'

const EPS = 0.005
const eur = (n) => fmtMoney(n, { cents: 'never' })
const money = (n) => fmtMoney(n, { cents: 'auto' }) // como nas linhas dos eventos
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// Mês no Painel: quanto dá o mês e de onde vem — recebido, por receber, em atraso e estimado (eventos sem
// valor × média do projeto, como na Previsão). Cada linha abre os eventos dela, com o valor que conta nessa
// linha (um evento com sinal: o sinal no Recebido, o resto no Por receber ou Em atraso). O mês é o mesmo que
// fica fixado nos gráficos; as setas passam de ano quando o ano ao lado tem eventos.
export default function MonthCard({ year, month, onMonth, canPrev = true, canNext = true, solo = false }) {
  const { monthOverview } = useStore()
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
  // arredondadas ao euro, as linhas somam o total (como na Previsão)
  const [rRec, rDue, rLate, rEst] = roundParts([o.received, o.due, o.overdue, o.estimated], o.total)
  const estN = g.novalue.length - o.unknownCount // eventos sem valor com estimativa

  // eventos sem valor: com estimativa (este ano e seguintes, projeto com média) ou só contados
  const novalueSub = !o.estimates ? plural(g.novalue.length, 'evento sem valor', 'eventos sem valor')
    : [estN > 0 && `${plural(estN, 'evento sem valor', 'eventos sem valor')} × média do projeto`,
      o.unknownCount > 0 && `${plural(o.unknownCount, 'evento', 'eventos')} sem média para estimar`].filter(Boolean).join(' · ')
  const rows = [
    {
      key: 'received', sw: 'paid', label: 'Recebido', value: rRec, evs: g.received,
      sub: [o.paidCount > 0 && plural(o.paidCount, 'evento pago', 'eventos pagos'),
        o.depositCount > 0 && `sinal de ${plural(o.depositCount, 'evento', 'eventos')}`].filter(Boolean).join(' · '),
      // o que cada evento já deu (num evento com sinal, só o sinal)
      amount: (x) => ({
        text: money(x.got),
        label: x.got < Number(x.ev.value) - EPS ? `recebido ${money(x.got)} de ${money(x.ev.value)}` : `recebido ${money(x.got)}`,
      }),
    },
    { key: 'due', sw: 'due', label: 'Por receber', value: rDue, end: 'missing', evs: g.due, sub: plural(g.due.length, 'evento', 'eventos') },
    { key: 'overdue', sw: 'late', label: 'Em atraso', value: rLate, end: 'missing', evs: g.overdue, sub: plural(g.overdue.length, 'evento já realizado', 'eventos já realizados') },
    {
      key: 'novalue', sw: 'est', label: estN > 0 ? 'Estimado' : 'Sem valor', value: estN > 0 ? rEst : null, approx: true,
      evs: g.novalue, sub: novalueSub,
      amount: (x) => (x.est != null
        ? { text: `≈ ${eur(x.est)}`, label: `estimativa ${eur(x.est)} pela média do projeto` }
        : { text: '—', label: o.estimates ? 'sem média para estimar' : 'sem valor' }),
    },
    { key: 'zero', sw: 'zero', label: 'De 0 €', value: null, evs: g.zero, sub: `${plural(g.zero.length, 'evento', 'eventos')} · nada a receber` },
  ].filter((r) => r.evs.length > 0)
  const width = (v) => `${(v / Math.max(o.total, EPS)) * 100}%`

  return (
    <Card as="section" className={solo ? 'db-mo solo' : 'db-mo'} aria-labelledby={titleId}>
      <div className="db-mo-head">
        <h2 className="db-sec-title" id={titleId}>Mês</h2>
        <div className="db-mo-nav" role="group" aria-label="Mês">
          <IconButton icon="chevL" label="Mês anterior" onClick={() => go(-1)} disabled={!canPrev} />
          <b aria-live="polite">{name} {year}</b>
          <IconButton icon="chevR" label="Mês seguinte" onClick={() => go(1)} disabled={!canNext} />
        </div>
      </div>
      {o.count === 0 ? (
        <p className="db-fc-note">Sem eventos em {MONTHS_LONG[month]} de {year}.</p>
      ) : (
        <>
          <HeroNumber value={o.total} cents="never" />
          <p className="db-mo-sub">
            {plural(o.count, 'evento', 'eventos')}
            {o.estimated > EPS && (o.valued > EPS ? ` · ${eur(rRec + rDue + rLate)} com valor + ≈ ${eur(rEst)} estimado` : ' · tudo estimado')}
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
                    {on && r.evs.map((x) => {
                      const a = r.amount?.(x)
                      return (
                        <div key={x.ev.id} className="db-mo-item">
                          <EventRow ev={x.ev} lead="date" end={r.end || 'value'} endText={a?.text} endLabel={a?.label} />
                        </div>
                      )
                    })}
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
