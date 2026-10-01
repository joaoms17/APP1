import { createContext, forwardRef, useContext, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import IconButton from './IconButton.jsx'
import { mergeRefs } from './refs.js'
import { fmtDayShort } from '../format.js'
import './components.css'

// <Field label help error>{controlo}</Field> — gera o id, liga o <label htmlFor>,
// aria-describedby (ajuda/erro) e aria-invalid. Os controlos leem tudo do contexto.
// Grupos (chips, segmented) pedem um rótulo por aria-labelledby em vez de <label>.
// Todos os controlos chamam onChange(valor, evento) — o valor já vem tratado (string).
const FieldCtx = createContext(null)
export const useField = () => useContext(FieldCtx)

export function useFieldGroup() {
  const f = useContext(FieldCtx)
  useLayoutEffect(() => { f?.markGroup(true) }, [f])
  return f
}

export default function Field({ label, help, error, className = '', children }) {
  const id = useId()
  const [group, setGroup] = useState(false)
  const helpId = help ? `${id}h` : undefined
  const errId = error ? `${id}e` : undefined
  const labelId = `${id}l`
  const describedBy = [errId, helpId].filter(Boolean).join(' ') || undefined
  const ctx = useMemo(() => ({ id, labelId, describedBy, invalid: !!error, markGroup: setGroup }),
    [id, labelId, describedBy, error])
  return (
    <div className={`field ${className}`.trim()}>
      {group
        ? <span className="label" id={labelId}>{label}</span>
        : <label htmlFor={id} id={labelId}>{label}</label>}
      <FieldCtx.Provider value={ctx}>{children}</FieldCtx.Provider>
      {help && <div className="help" id={helpId}>{help}</div>}
      {error && <div className="err" id={errId} role="alert"><Icon name="alert" size="sm" />{error}</div>}
    </div>
  )
}

// props de acessibilidade vindas do Field (sobrepõem-se às passadas à mão)
function useControl(props) {
  const f = useContext(FieldCtx)
  return {
    id: props.id ?? f?.id,
    'aria-describedby': props['aria-describedby'] ?? f?.describedBy,
    'aria-invalid': (props['aria-invalid'] ?? f?.invalid) || undefined,
    invalid: !!(props['aria-invalid'] ?? f?.invalid),
  }
}

const ctrlClass = (base, invalid, extra = '') => ['control', base, invalid && 'invalid', extra].filter(Boolean).join(' ')

// a caixa inteira do campo (48 px, com o ícone, o "€" e as margens) põe o foco no campo, como na v1
// — o <input> só ocupa a linha do texto; os botões dentro da caixa ("Limpar") ficam com o seu clique
function focusInner(e) {
  if (e.target.closest?.('button, a, input, select, textarea')) return
  const el = e.currentTarget.querySelector('input, textarea, select')
  if (!el || el.disabled) return
  e.preventDefault()
  el.focus()
}

export const TextInput = forwardRef(function TextInput({
  value, onChange, placeholder, enterKeyHint = 'next', autoComplete, inputMode, type = 'text',
  icon, affix, className = '', ...rest
}, ref) {
  const { invalid, ...a } = useControl(rest)
  return (
    <div className={ctrlClass('', invalid, className)} onMouseDown={focusInner}>
      {icon && <Icon name={icon} />}
      <input ref={ref} type={type} value={value ?? ''} placeholder={placeholder} enterKeyHint={enterKeyHint}
        autoComplete={autoComplete} inputMode={inputMode} {...rest} {...a}
        onChange={(e) => onChange?.(e.target.value, e)} />
      {affix && <span className="affix" aria-hidden="true">{affix}</span>}
    </div>
  )
})

// '269,50' → 269.5 · '1.234,5' → 1234.5 · '' → null · 'abc' → NaN
export function parseMoney(s) {
  if (typeof s === 'number') return Number.isFinite(s) ? s : NaN
  let t = String(s ?? '').replace(/[\s€]/g, '')
  if (!t) return null
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.')
  else t = t.replace(',', '.')
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return NaN
  return Number(t)
}

// 269.5 → '269,50' · 520 → '520' (formato do campo, sem separador de milhares)
export const moneyInputValue = (n) => {
  if (n == null || !Number.isFinite(n)) return ''
  const r = Math.round(n * 100) / 100
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace('.', ',')
}

export const MoneyInput = forwardRef(function MoneyInput({ value, onChange, onBlur, placeholder, ...rest }, ref) {
  return (
    <TextInput ref={ref} value={value} placeholder={placeholder} inputMode="decimal" affix="€" autoComplete="off" {...rest}
      onChange={onChange}
      onBlur={(e) => {
        const n = parseMoney(e.target.value)
        if (n != null && Number.isFinite(n)) {
          const v = moneyInputValue(n)
          if (v !== e.target.value) onChange?.(v, e)
        }
        onBlur?.(e)
      }} />
  )
})

// campos de data/hora: o valor legível ("sáb, 14 nov 2026") por cima do controlo nativo,
// que fica transparente e abre o seletor do sistema ao tocar
function openPicker(e) {
  try { e.currentTarget.showPicker?.() } catch { /* sem showPicker: o toque abre o nativo */ }
}

export const DateInput = forwardRef(function DateInput({
  value, onChange, placeholder = 'Escolher data', format, min, max, className = '', ...rest
}, ref) {
  const { invalid, ...a } = useControl(rest)
  const shown = value ? (format ? format(value) : fmtDayShort(value, { year: true })) : placeholder
  return (
    <div className={ctrlClass('date', invalid, className)}>
      <Icon name="calendar" />
      <span className={`val${value ? '' : ' ph'}`} aria-hidden="true">{shown}</span>
      <input ref={ref} type="date" value={value || ''} min={min} max={max} {...rest} {...a}
        onClick={openPicker} onChange={(e) => onChange?.(e.target.value, e)} />
    </div>
  )
})

export const TimeInput = forwardRef(function TimeInput({
  value, onChange, placeholder = 'Sem hora', clearable = true, className = '', ...rest
}, ref) {
  const { invalid, ...a } = useControl(rest)
  const own = useRef(null)
  const v = value ? String(value).slice(0, 5) : ''
  return (
    <div className={ctrlClass('time', invalid, className)}>
      <Icon name="clock" />
      <span className={`val${v ? '' : ' ph'}`} aria-hidden="true">{v || placeholder}</span>
      <input ref={mergeRefs(ref, own)} type="time" value={v} {...rest} {...a}
        onClick={openPicker} onChange={(e) => onChange?.(e.target.value, e)} />
      {clearable && v && (
        <IconButton icon="x" size="sm" className="clear" label="Limpar hora"
          onClick={(e) => { onChange?.('', e); own.current?.focus() }} />
      )}
    </div>
  )
})

export const TextArea = forwardRef(function TextArea({ value, onChange, placeholder, rows = 3, className = '', ...rest }, ref) {
  const { invalid, ...a } = useControl(rest)
  return (
    <div className={ctrlClass('area', invalid, className)} onMouseDown={focusInner}>
      <textarea ref={ref} value={value ?? ''} placeholder={placeholder} rows={rows} {...rest} {...a}
        onChange={(e) => onChange?.(e.target.value, e)} />
    </div>
  )
})

// pesquisa: ícone fora do placeholder, rótulo só para leitores de ecrã, botão "Apagar texto"
// (o "Limpar pesquisa" é a ação dos vazios, que também tira filtros)
export const SearchInput = forwardRef(function SearchInput({
  value, onChange, onClear, label = 'Pesquisar', placeholder, autoFocus, className = '', ...rest
}, ref) {
  const autoId = useId()
  const id = rest.id || autoId
  const own = useRef(null)
  return (
    <div className={ctrlClass('search', false, className)} onMouseDown={focusInner}>
      <Icon name="search" />
      <label htmlFor={id} className="sr-only">{label}</label>
      <input ref={mergeRefs(ref, own)} id={id} type="search" enterKeyHint="search" autoComplete="off"
        value={value ?? ''} placeholder={placeholder ?? label} autoFocus={autoFocus} {...rest}
        onChange={(e) => onChange?.(e.target.value, e)} />
      {value ? (
        <IconButton icon="x" size="sm" className="clear" label="Apagar texto"
          onClick={(e) => { if (onClear) onClear(e); else onChange?.('', e); own.current?.focus() }} />
      ) : null}
    </div>
  )
})

// só onde não há chips (poucas opções fixas)
export const Select = forwardRef(function Select({ value, onChange, options = [], placeholder, className = '', ...rest }, ref) {
  const { invalid, ...a } = useControl(rest)
  return (
    <div className={ctrlClass('select', invalid, className)}>
      <select ref={ref} value={value ?? ''} {...rest} {...a} onChange={(e) => onChange?.(e.target.value, e)}>
        {placeholder != null && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevD" />
    </div>
  )
})
