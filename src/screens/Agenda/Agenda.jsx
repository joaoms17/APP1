import { EmptyState, TopBar } from '../../ui'
import { useStore } from '../../store.jsx'
import { fmtKicker } from '../../format.js'

// Agenda › Lista | Mês (pacote E1). Esqueleto da Fundação: o E1 substitui este ficheiro.
export default function Agenda() {
  const { today } = useStore()
  return (
    <>
      <TopBar kicker={fmtKicker(today)} title="Agenda" />
      <EmptyState icon="calendar" title="Em construção" text="A Agenda nova está a ser preparada." />
    </>
  )
}
