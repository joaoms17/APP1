import { useEffect, useRef } from 'react'
import Segmented from './Segmented.jsx'
import { useSheet } from './Sheet.jsx'
import { useRoute, replaceSheet } from '../router.js'

// Topo da folha Novo: Evento | Despesa. Trocar pede "Descartar alterações?" se houver alterações.
// Depois de trocar, o foco fica no rádio escolhido (padrão radiogroup: as setas continuam no grupo).
export default function NewKindSwitch({ value }) {
  const { guard } = useSheet()
  const route = useRoute()
  const ref = useRef(null)
  // depois dos efeitos de layout (a folha foca o 1.º campo): com s.foco=tipo, volta ao rádio
  useEffect(() => {
    if (route.sheet?.params?.foco === 'tipo') ref.current?.querySelector('[aria-checked="true"]')?.focus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={ref}>
      <Segmented label="O que vais registar" value={value}
        options={[{ value: 'evento', label: 'Evento', icon: 'calendar' }, { value: 'despesa', label: 'Despesa', icon: 'wallet' }]}
        onChange={(kind) => {
          if (kind === value) return
          guard(() => replaceSheet('novo', { ...(route.sheet?.params || {}), kind, foco: 'tipo' }))
        }} />
    </div>
  )
}
