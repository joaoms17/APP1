import { fmtMoney } from '../format.js'

const money = (n) => fmtMoney(n, { cents: 'auto' })

// Cabeçalho de grupo: Fraunces itálico sobre filete, sticky; resumo à direita
// (passa para a linha de baixo quando falta espaço, nunca parte o título).
export default function GroupHeader({ title, small, summary, first = false, action, id, className = '' }) {
  return (
    <div className={['group-head', first && 'first', className].filter(Boolean).join(' ')}>
      <h2 id={id}>{title}{small && <small>{small}</small>}</h2>
      {summary && <span className="sum">{summary}</span>}
      {action}
    </div>
  )
}

// Resumo de um grupo de eventos pela regra única (spec §9.9):
// tudo recebido → "1 242 € · recebido" · nada → "969,50 € por receber" · misto → "920 € · falta 770 €"
// só Google → "1 por registar". missingFn = missing do store.
export function eventsSummary(evs, missingFn, googleCount = 0) {
  if (!evs?.length) return googleCount ? `${googleCount} por registar` : null
  const tot = evs.reduce((a, e) => a + (Number(e.value) || 0), 0)
  const miss = evs.reduce((a, e) => a + missingFn(e), 0)
  if (miss < 0.005) return <><b>{money(tot)}</b> · recebido</>
  if (Math.abs(miss - tot) < 0.005) return <><b>{money(tot)}</b> por receber</>
  return <><b>{money(tot)}</b> · falta {money(miss)}</>
}
