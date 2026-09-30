import { projectVars } from '../color.js'
import './components.css'

// Ponto de projeto (qualquer cor; anel de 1 px garante ≥ 3:1). google = anel oco.
export default function Dot({ project, color, google = false, size = 'md', className = '' }) {
  const cls = ['dot', google && 'g', size !== 'md' && size, className].filter(Boolean).join(' ')
  return <span className={cls} data-p="" style={projectVars(color || project?.color)} aria-hidden="true" />
}
