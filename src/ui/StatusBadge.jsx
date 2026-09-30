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
  if (st === 'paid') return always || ev.event_date >= today ? <Badge tone="paid" icon="check">Recebido</Badge> : null
  if (st === 'partial') return <Badge tone="partial">Sinal · falta {money(mis)}</Badge>
  if (st === 'partial-overdue') return <Badge tone="overdue">Em atraso · falta {money(mis)}</Badge>
  if (st === 'overdue') return <Badge tone="overdue">Em atraso</Badge>
  return always ? <Badge tone="due">Por receber</Badge> : null
}

// Recibo não é estado: ícone "Recibo emitido" · "Sem recibo" (só recebidos e já realizados) · nada
export function ReceiptMark({ ev }) {
  const { needsReceipt, today } = useStore()
  if (ev.event_date > today) return null
  if (ev.receipt_issued) {
    return <span className="mark ok" title="Recibo emitido"><Icon name="receipt" /><span className="sr-only">Recibo emitido</span></span>
  }
  if (needsReceipt(ev)) return <span className="mark warn"><Icon name="receiptOff" />Sem recibo</span>
  return null
}
