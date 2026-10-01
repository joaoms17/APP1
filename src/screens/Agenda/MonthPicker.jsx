import { useRef, useState } from 'react'
import { Button, IconButton, Sheet } from '../../ui'
import { useStore } from '../../store.jsx'
import { navigate } from '../../router.js'
import { cap, MONTHS_LONG } from '../../format.js'
import './Agenda.css'

const pad = (n) => String(n).padStart(2, '0')

// "Ir para mês" (spec §10.5): ‹ ano › + grelha 3×4 de meses + Hoje.
// Folha no telemóvel, diálogo centrado no computador. year/month (1–12) = o mês aberto no calendário;
// onPick(ano, mês) vem de quem abriu (Agenda › Mês); sem ele, abre o Mês nesse mês.
export default function MonthPicker({ year, month, onPick, onClose }) {
  const { today } = useStore()
  const ty = Number(today.slice(0, 4))
  const tm = Number(today.slice(5, 7))
  const selY = Number.isFinite(year) ? year : ty
  const selM = Number.isFinite(month) && month >= 1 && month <= 12 ? month : tm
  const [y, setY] = useState(selY)
  const focusRef = useRef(null)

  const pick = (py, pm) => {
    onClose?.()
    if (onPick) onPick(py, pm)
    else navigate(`#/agenda/mes/${py === ty && pm === tm ? today : `${py}-${pad(pm)}-01`}`, { replace: true })
  }

  return (
    <Sheet variant="form" title="Ir para mês" onClose={onClose} className="ag-mp" initialFocusRef={focusRef}
      footer={<Button block onClick={() => pick(ty, tm)} aria-label="Ir para hoje">Hoje</Button>}>
      <div className="ag-mp-year">
        <IconButton icon="chevL" label="Ano anterior" onClick={() => setY(y - 1)} />
        <b aria-live="polite">{y}</b>
        <IconButton icon="chevR" label="Ano seguinte" onClick={() => setY(y + 1)} />
      </div>
      <div className="ag-mp-grid">
        {MONTHS_LONG.map((name, i) => {
          const m = i + 1
          const cur = y === ty && m === tm
          const sel = y === selY && m === selM
          return (
            <button key={name} type="button" ref={sel ? focusRef : undefined}
              className={[cur && 'cur', sel && 'sel'].filter(Boolean).join(' ') || undefined}
              aria-label={`${name} de ${y}${cur ? ', mês atual' : ''}${sel ? ', aberto no calendário' : ''}`}
              onClick={() => pick(y, m)}>
              {cap(name)}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
