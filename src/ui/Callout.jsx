import Icon from './Icon.jsx'

const ICON = { info: 'info', warning: 'alert', error: 'alert', neutral: 'info' }

// Aviso em bloco: ícone + título a negrito + texto. error anuncia-se (role="alert").
export default function Callout({ tone = 'info', title, icon, className = '', children }) {
  return (
    <div className={`callout ${tone} ${className}`.trim()} role={tone === 'error' ? 'alert' : undefined}>
      <Icon name={icon || ICON[tone] || 'info'} />
      <span>{title && <b>{title}</b>}{title && children ? ' ' : null}{children}</span>
    </div>
  )
}
