import './components.css'

// Barra de progresso (8 px). tone paid (verde) | partial (sinal, âmbar). label = nome acessível.
export default function Progress({ value = 0, max = 100, tone = 'paid', label, thin = false, className = '' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (Number(value) / Number(max)) * 100)) : 0
  const fill = { '--pct': `${Math.round(pct * 10) / 10}%` }
  return (
    <div className={['progress', tone === 'partial' && 'partial', thin && 'thin', className].filter(Boolean).join(' ')}
      role="img" aria-label={label || `${Math.round(pct)} %`}>
      <i style={fill} />
    </div>
  )
}
