import { useRef } from 'react'
import Icon from './Icon.jsx'
import { useFieldGroup } from './Field.jsx'

// Controlo segmentado. role="radiogroup" (escolha) ou "tablist" (vista).
// options: [{ value, label, icon, count, countTone: 'alert', disabled }] · onChange(value)
// Setas ←/→ (e Home/End) mudam a opção, como num grupo de rádio.
export default function Segmented({ label, role = 'radiogroup', value, onChange, options = [], className = '' }) {
  const field = useFieldGroup()
  const ref = useRef(null)
  const isTab = role === 'tablist'
  const enabled = options.filter((o) => !o.disabled)
  const hasValue = options.some((o) => o.value === value)

  const onKeyDown = (e) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    let next = null
    const i = enabled.findIndex((o) => o.value === value)
    if (e.key in keys) next = enabled[(Math.max(0, i) + keys[e.key] + enabled.length) % enabled.length]
    else if (e.key === 'Home') next = enabled[0]
    else if (e.key === 'End') next = enabled[enabled.length - 1]
    if (!next) return
    e.preventDefault()
    onChange?.(next.value)
    const btn = ref.current?.querySelector(`[data-v="${CSS.escape(String(next.value))}"]`)
    btn?.focus()
  }

  return (
    <div ref={ref} className={`seg ${className}`.trim()} role={role}
      aria-label={label || undefined} aria-labelledby={!label ? field?.labelId : undefined} onKeyDown={onKeyDown}>
      {options.map((o, n) => {
        const on = o.value === value
        return (
          <button key={String(o.value)} type="button" data-v={String(o.value)}
            role={isTab ? 'tab' : 'radio'}
            aria-checked={isTab ? undefined : on} aria-selected={isTab ? on : undefined}
            tabIndex={on || (!hasValue && n === 0) ? 0 : -1} disabled={o.disabled}
            onClick={() => { if (!on) onChange?.(o.value) }}>
            {o.icon && <Icon name={o.icon} size="sm" />}
            {o.label}
            {o.count != null && <span className={`n${o.countTone === 'alert' ? ' alert' : ''}`}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
