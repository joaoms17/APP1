import Icon from './Icon.jsx'
import { useStore } from '../store.jsx'
import { fmtMoney } from '../format.js'

const money = (n) => fmtMoney(n, { cents: 'auto' })

// Badge genérico: tone = paid | partial | due | overdue | neutral | info
export function Badge({ tone = 'neutral', icon, className = '', children }) {
  return <span className={`badge ${tone} ${className}`.trim()}>{icon && <Icon name={icon} />}{children}</span>
}

// Estado de pagamento — glossário único (spec §9.1). Nas listas só aparece quando há sinal
// (always=false): "Recebido" só em eventos futuros, "Por receber" nunca.
export default function StatusBadge({ ev, always = false }) {
  const { eventState, missing, today } = useStore()
  const st = eventState(ev)
  const mis = missing(ev)
  if (st === 'novalue') return <Badge tone="neutral">Valor pendente</Badge>
  if (st === 'paid') return always || ev.event_date >= today ? <Badge tone="paid" icon="check">Recebido</Badge> : null
  if (st === 'partial') return <Badge tone="partial">Sinal · falta {money(mis)}</Badge>
  if (st === 'partial-overdue') return <Badge tone="overdue">Em atraso · falta {money(mis)}</Badge>
  if (st === 'overdue') return <Badge tone="overdue">Em atraso</Badge>
  return always ? <Badge tone="due">Por receber</Badge> : null
}

// Recibo não é estado: por omissão os eventos não levam recibo, por isso só se assinala o que foi
// emitido (também em eventos futuros). Nunca "Sem recibo".
export function ReceiptMark({ ev }) {
  if (!ev.receipt_issued) return null
  return <span className="mark ok" title="Recibo emitido"><Icon name="receipt" /><span className="sr-only">Recibo emitido</span></span>
}
