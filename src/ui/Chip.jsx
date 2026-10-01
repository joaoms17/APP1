import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react'
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
  // com contagem, o nome acessível leva uma vírgula: "Em atraso, 21" (e não "Em atraso21")
  const name = count != null && typeof children === 'string' ? { 'aria-label': `${children}, ${count}` } : {}
  return (
    <button type="button" className={`chip ${className}`.trim()} {...pv} {...state} {...name} onClick={onClick} {...rest}>
      {lead}{children}{count != null && <span className="n">{count}</span>}
    </button>
  )
}

// setas ←/→ (e Home/End) movem o foco entre os botões do grupo; num grupo de rádio também escolhem.
// Numa toolbar, o ponto de Tab acompanha o foco (roving tabindex).
function arrowFocus(e, select = false) {
  const d = { ArrowRight: 1, ArrowLeft: -1, ...(select && { ArrowDown: 1, ArrowUp: -1 }) }[e.key]
  if (!d && e.key !== 'Home' && e.key !== 'End') return
  const btns = [...e.currentTarget.querySelectorAll('button:not([disabled])')]
  const i = btns.indexOf(document.activeElement)
  if (i < 0) return
  e.preventDefault() // Home/End nunca fazem scroll da página
  const next = d ? btns[(i + d + btns.length) % btns.length] : e.key === 'Home' ? btns[0] : btns[btns.length - 1]
  if (!select) for (const b of btns) b.tabIndex = b === next ? 0 : -1
  next.focus()
  next.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  if (select && next.getAttribute('role') === 'radio' && next.getAttribute('aria-checked') !== 'true') next.click()
}

// filtros: uma linha com scroll horizontal (role="toolbar"). Um só ponto de Tab (o chip ativo, ou o
// primeiro); as setas, Home e End andam entre os chips (padrão ARIA toolbar).
export function ChipRow({ label, className = '', children }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const btns = [...(ref.current?.querySelectorAll('button:not([disabled])') || [])]
    const focused = btns.find((b) => b === document.activeElement)
    const on = focused || btns.find((b) => b.getAttribute('aria-pressed') === 'true') || btns[0]
    for (const b of btns) b.tabIndex = b === on ? 0 : -1
  })
  return (
    <div ref={ref} className={`chips ${className}`.trim()} role="toolbar" aria-label={label} onKeyDown={arrowFocus}>
      <GroupCtx.Provider value="toolbar">{children}</GroupCtx.Provider>
    </div>
  )
}

// formulários: escolha única com quebra de linha (nunca esconde opções).
// Um só ponto de Tab no grupo (o escolhido, ou o primeiro): as setas andam entre as opções.
export function ChipGroup({ label, wrap = true, className = '', children }) {
  const field = useFieldGroup()
  const ref = useRef(null)
  useLayoutEffect(() => {
    const radios = [...(ref.current?.querySelectorAll('[role="radio"]') || [])]
    const on = radios.find((b) => b.getAttribute('aria-checked') === 'true') || radios[0]
    for (const b of radios) b.tabIndex = b === on ? 0 : -1
  })
  return (
    <div ref={ref} className={`chips${wrap ? ' wrap' : ''} ${className}`.trim()} role="radiogroup"
      aria-label={label || (field ? undefined : 'Opções')} aria-labelledby={!label ? field?.labelId : undefined}
      aria-invalid={field?.invalid || undefined} aria-describedby={field?.describedBy}
      onKeyDown={(e) => arrowFocus(e, true)}>
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
