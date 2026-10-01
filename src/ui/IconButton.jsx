import { forwardRef } from 'react'
import Icon from './Icon.jsx'

// Botão só com ícone (44×44). label é obrigatório: é o nome acessível
// ("Apagar pagamento de 150 € (12 ago 2026)", "Mês seguinte").
const IconButton = forwardRef(function IconButton({
  icon, label, variant = 'default', size = 'md', type = 'button', className = '', ...rest
}, ref) {
  if (import.meta.env?.DEV && !label) console.warn(`IconButton "${icon}" sem label (nome acessível obrigatório)`)
  const cls = ['icon-btn', variant !== 'default' && variant, className].filter(Boolean).join(' ')
  return (
    <button ref={ref} type={type} className={cls} aria-label={label} {...rest}>
      <Icon name={icon} size={size} />
    </button>
  )
})

export default IconButton
