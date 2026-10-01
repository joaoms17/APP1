import { useId } from 'react'
import './components.css'

// Interruptor 51×31 numa linha de 56 px com título e ajuda (substitui as checkboxes).
// onChange(bool)
export default function Switch({ checked, onChange, label, help, disabled, id: idProp, className = '' }) {
  const auto = useId()
  const id = idProp || auto
  const helpId = help ? `${id}h` : undefined
  return (
    <div className={`switch-row ${className}`.trim()}>
      <span className="txt">
        <label htmlFor={id}><b>{label}</b></label>
        {help && <small id={helpId}>{help}</small>}
      </span>
      <button id={id} type="button" role="switch" className="switch" aria-checked={!!checked}
        aria-describedby={helpId} disabled={disabled} onClick={() => onChange?.(!checked)} />
    </div>
  )
}
