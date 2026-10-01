import './components.css'

// Esqueleto enquanto carrega (pulsação desligada com reduced motion).
export default function Skeleton({ lines = 3, label = 'A carregar…', className = '' }) {
  return (
    <div className={`skeleton ${className}`.trim()} aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => <span key={i} className="sk" aria-hidden="true" />)}
    </div>
  )
}
