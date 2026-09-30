import { projectVars } from '../color.js'

// Inicial do projeto sobre a cor (26 %) com anel interior de 2 px.
export default function ProjectAvatar({ project, className = '' }) {
  const initial = (project?.name || '?').trim().charAt(0).toUpperCase()
  return (
    <span className={`p-avatar ${className}`.trim()} data-p="" style={projectVars(project?.color)} aria-hidden="true">
      {initial}
    </span>
  )
}
