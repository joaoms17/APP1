import { fmtMoneyParts } from '../format.js'

// Número de capa (um por ecrã): Fraunces, cêntimos a 60 %, sinal "−" em sans.
// negative: despesas (o valor chega positivo e mostra-se com "−").
export default function HeroNumber({ value, cents = 'auto', negative = false, tone = 'default', className = '' }) {
  const { sign, int, dec } = fmtMoneyParts(value, { cents })
  const neg = sign || (negative && Math.abs(Number(value) || 0) >= (cents === 'never' ? 0.5 : 0.005))
  return (
    <span className={['hero-num', tone === 'overdue' && 'overdue-t', className].filter(Boolean).join(' ')}>
      {neg && <span className="sg">−</span>}{int}{dec && <span className="c">{dec}</span>}
    </span>
  )
}
