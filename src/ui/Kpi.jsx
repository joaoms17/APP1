import Icon from './Icon.jsx'
import { fmtPct } from '../format.js'

// Indicador: rótulo · valor · nota. to (href da rota) ou onClick tornam-no tocável (com ›).
export default function Kpi({ label, value, sub, to, onClick, className = '' }) {
  const body = (
    <>
      <span className="k">{label}{(to || onClick) && <Icon name="chevR" size="sm" />}</span>
      <span className="v">{value}</span>
      {sub != null && sub !== '' && <span className="s">{sub}</span>}
    </>
  )
  const cls = `kpi ${className}`.trim()
  if (to) return <a className={cls} href={to} onClick={onClick}>{body}</a>
  if (onClick) return <button type="button" className={cls} onClick={onClick}>{body}</button>
  return <div className={cls}>{body}</div>
}

// Variação: verde = bom, vermelho = mau (despesas a descer são verdes: goodWhen="down").
// value em pontos percentuais; null (sem ano anterior) não mostra nada.
export function Delta({ value, goodWhen = 'up', suffix, className = '' }) {
  if (value == null || !Number.isFinite(value)) return null
  const good = goodWhen === 'down' ? value <= 0 : value >= 0
  return (
    <span className={['delta', good ? 'up' : 'down', className].filter(Boolean).join(' ')}>
      {value !== 0 && <Icon name={value > 0 ? 'arrowUp' : 'arrowDown'} />}
      {fmtPct(value)}{suffix ? ` ${suffix}` : ''}
    </span>
  )
}
