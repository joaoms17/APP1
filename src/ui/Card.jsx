// Cartão só para destaque (hoje, A tratar, calendário, KPI, gráficos, blocos do detalhe).
export default function Card({ pad = false, as: Tag = 'div', className = '', children, ...rest }) {
  return <Tag className={['card', pad && 'pad', className].filter(Boolean).join(' ')} {...rest}>{children}</Tag>
}
