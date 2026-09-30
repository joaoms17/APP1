import Icon from './Icon.jsx'
import './components.css'

// Vazio com ação: círculo com ícone, título, texto e botão.
export default function EmptyState({ icon = 'calendar', title, text, action, compact = false, className = '' }) {
  return (
    <div className={['empty', compact && 'compact', className].filter(Boolean).join(' ')}>
      <span className="ic"><Icon name={icon} /></span>
      {title && <b>{title}</b>}
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}
