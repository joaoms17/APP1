import { createContext, useContext, useState } from 'react'
import Icon from './Icon.jsx'
import { useFieldGroup } from './Field.jsx'
import { projectVars } from '../color.js'
import { useStore } from '../store.jsx'

// Chips. Selecionado = --accent-soft + --accent-text + ícone check (a mesma linguagem em todo o lado).
// Dentro de ChipGroup são rádios (aria-checked); soltos ou em ChipRow são alternadores (aria-pressed).
const GroupCtx = createContext(null)

export default function Chip({ selected, onClick, icon, count, project, className = '', children, ...rest }) {
  const mode = useContext(GroupCtx)
  const plain = 'aria-expanded' in rest || selected === undefined
  const state = plain ? {} : mode === 'radio' ? { role: 'radio', 'aria-checked': !!selected } : { 'aria-pressed': !!selected }
  const lead = selected ? <Icon name="check" />
    : project ? <span className="dot" aria-hidden="true" />
    : icon ? <Icon name={icon} /> : null
  const pv = project ? { 'data-p': '', style: projectVars(project.color) } : {}
  return (
    <button type="button" className={`chip ${className}`.trim()} {...pv} {...state} onClick={onClick} {...rest}>
      {lead}{children}{count != null && <span className="n">{count}</span>}
    </button>
  )
}

// setas ←/→ movem o foco entre os botões do grupo
function arrowFocus(e) {
  const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
  if (!d) return
  const btns = [...e.currentTarget.querySelectorAll('button:not([disabled])')]
  const i = btns.indexOf(document.activeElement)
  if (i < 0) return
  e.preventDefault()
  const next = btns[(i + d + btns.length) % btns.length]
  next.focus()
  next.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
}

// filtros: uma linha com scroll horizontal (role="toolbar")
export function ChipRow({ label, className = '', children }) {
  return (
    <div className={`chips ${className}`.trim()} role="toolbar" aria-label={label} onKeyDown={arrowFocus}>
      <GroupCtx.Provider value="toolbar">{children}</GroupCtx.Provider>
    </div>
  )
}

// formulários: escolha única com quebra de linha (nunca esconde opções)
export function ChipGroup({ label, wrap = true, className = '', children }) {
  const field = useFieldGroup()
  return (
    <div className={`chips${wrap ? ' wrap' : ''} ${className}`.trim()} role="radiogroup"
      aria-label={label || (field ? undefined : 'Opções')} aria-labelledby={!label ? field?.labelId : undefined}
      onKeyDown={arrowFocus}>
      <GroupCtx.Provider value="radio">{children}</GroupCtx.Provider>
    </div>
  )
}

// Projeto num formulário (Evento, Despesa, Calendário). value = id do projeto (null = Geral).
// projects: a lista a mostrar (ex.: projectsByUsage do store); includeInactiveToggle mostra
// "Anteriores" com os restantes projetos (o atual inativo aparece sempre).
export function ProjectChips({ value, onChange, projects = [], includeGeneral = false, includeInactiveToggle = false, label }) {
  const store = useStore()
  const shownIds = new Set(projects.map((p) => p.id))
  const others = includeInactiveToggle ? (store?.projects || []).filter((p) => !shownIds.has(p.id)) : []
  const [open, setOpen] = useState(() => value != null && others.some((p) => p.id === value))
  const current = !shownIds.has(value) ? (store?.projects || []).find((p) => p.id === value) : null
  const extra = open ? others : current ? [current] : []
  return (
    <ChipGroup label={label}>
      {includeGeneral && <Chip selected={value == null} onClick={() => onChange?.(null)}>Geral</Chip>}
      {[...projects, ...extra].map((p) => (
        <Chip key={p.id} project={p} selected={p.id === value} onClick={() => onChange?.(p.id)}>{p.name}</Chip>
      ))}
      {others.length > 0 && (
        <Chip aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? 'Menos' : 'Anteriores'} <Icon name={open ? 'up' : 'chevD'} />
        </Chip>
      )}
    </ChipGroup>
  )
}
