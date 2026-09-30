import Segmented from './Segmented.jsx'
import { useSheet } from './Sheet.jsx'
import { useRoute, replaceSheet } from '../router.js'

// Topo da folha Novo: Evento | Despesa. Trocar pede "Descartar alterações?" se houver alterações.
export default function NewKindSwitch({ value }) {
  const { guard } = useSheet()
  const route = useRoute()
  return (
    <Segmented label="O que vais registar" value={value}
      options={[{ value: 'evento', label: 'Evento', icon: 'calendar' }, { value: 'despesa', label: 'Despesa', icon: 'wallet' }]}
      onChange={(kind) => {
        if (kind === value) return
        guard(() => replaceSheet('novo', { ...(route.sheet?.params || {}), kind }))
      }} />
  )
}
