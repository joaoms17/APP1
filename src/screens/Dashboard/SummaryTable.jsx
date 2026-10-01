import { useId, useState } from 'react'
import { Card, Icon } from '../../ui'
import { MONTHS_ABBR, MONTHS_LONG, cap, fmtMoney } from '../../format.js'
import { FEATURES } from '../../features.js'

// Resumo mensal (spec §9.19): valores arredondados ao euro, linha Total com filete.
// Telemóvel: Mês · Líquido · Saldo · ⌄ — tocar num mês mostra Bruto, Retido, ano anterior e Despesa
// (o botão está no nome do mês e a área de toque estende-se à linha inteira, em CSS).
// Computador: as 7 colunas, com a 1.ª fixa ao deslizar.
// Sem despesas (FEATURES.expenses): saem Despesa e Saldo; no telemóvel fica Mês · Líquido · Bruto.
const EXP = FEATURES.expenses

const eur = (n) => fmtMoney(n, { cents: 'never' })
const MONTHS = MONTHS_ABBR.map(cap)

function Money({ value, neg = false }) {
  return <td className={neg ? 'neg' : undefined}>{eur(neg ? -value : value)}</td>
}

function FullTable({ t }) {
  const M = t.byMonth
  const prev = t.year - 1
  return (
    <div className="db-tscroll">
      <table className="tbl">
        <caption>{t.year} · valores arredondados ao euro</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th><th scope="col">Bruto</th><th scope="col">Líquido</th><th scope="col">Retido</th>
            <th scope="col">{prev}</th>{EXP && <><th scope="col">Despesa</th><th scope="col">Saldo</th></>}
          </tr>
        </thead>
        <tbody>
          {MONTHS.map((mo, i) => (
            <tr key={mo}>
              <th scope="row"><abbr title={MONTHS_LONG[i]}>{mo}</abbr></th>
              <Money value={M.gross[i]} />
              <Money value={M.net[i]} />
              <Money value={M.gross[i] - M.net[i]} />
              <Money value={M.netPrev[i]} />
              {EXP && <><Money value={M.exp[i]} neg /><Money value={M.saldo[i]} /></>}
            </tr>
          ))}
          <tr className="total">
            <th scope="row">Total</th>
            <Money value={t.gross} />
            <Money value={t.net} />
            <Money value={t.retained} />
            <Money value={t.netPrev} />
            {EXP && <><Money value={t.exp} neg /><Money value={t.saldo} /></>}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function CompactTable({ t }) {
  const M = t.byMonth
  const prev = t.year - 1
  const base = useId()
  const [open, setOpen] = useState(() => new Set())
  const toggle = (i) => setOpen((s) => {
    const n = new Set(s)
    if (n.has(i)) n.delete(i); else n.add(i)
    return n
  })
  return (
    <div className="db-tscroll compact">
      <table className="tbl">
        <caption>{t.year} · valores arredondados ao euro · toca num mês para ver {EXP ? `bruto, retido, ${prev} e despesa` : `retido e ${prev}`}</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th><th scope="col">Líquido</th><th scope="col">{EXP ? 'Saldo' : 'Bruto'}</th>
            <th scope="col" className="x"><span className="sr-only">Mais valores</span></th>
          </tr>
        </thead>
        <tbody>
          {MONTHS.map((mo, i) => {
            const on = open.has(i)
            const det = `${base}-${i}`
            return [
              <tr key={mo} className="db-m" data-open={on || undefined}>
                <th scope="row">
                  <button type="button" className="db-mbtn" aria-expanded={on} aria-controls={det} onClick={() => toggle(i)}>
                    <span aria-hidden="true">{mo}</span><span className="sr-only">{cap(MONTHS_LONG[i])}</span>
                  </button>
                </th>
                <Money value={M.net[i]} />
                <Money value={EXP ? M.saldo[i] : M.gross[i]} />
                <td className="x"><Icon name="chevD" size="sm" /></td>
              </tr>,
              <tr key={`${mo}-d`} id={det} className="db-det" hidden={!on}>
                <td colSpan={4}>
                  <dl>
                    {EXP && <div><dt>Bruto</dt><dd>{eur(M.gross[i])}</dd></div>}
                    <div><dt>Retido</dt><dd>{eur(M.gross[i] - M.net[i])}</dd></div>
                    <div><dt>{prev}</dt><dd>{eur(M.netPrev[i])}</dd></div>
                    {EXP && <div><dt>Despesa</dt><dd>{eur(-M.exp[i])}</dd></div>}
                  </dl>
                </td>
              </tr>,
            ]
          })}
          <tr className="total">
            <th scope="row">Total</th>
            <Money value={t.net} />
            <Money value={EXP ? t.saldo : t.gross} />
            <td className="x" />
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function SummaryTable({ t, full = false }) {
  const titleId = useId()
  return (
    <Card as="section" className="db-tbl" aria-labelledby={titleId}>
      <h2 id={titleId}>Resumo mensal</h2>
      {full ? <FullTable t={t} /> : <CompactTable t={t} />}
    </Card>
  )
}
