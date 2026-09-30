import { EmptyState, Sheet } from '../../ui'

// "Ir para mês" (pacote E1): folha no telemóvel, diálogo centrado no computador.
// Esqueleto da Fundação: o E1 substitui este ficheiro.
export default function MonthPicker({ year, month, onPick, onClose }) {
  return (
    <Sheet variant="form" title="Ir para mês" onClose={onClose}>
      <EmptyState icon="calendar" title="Em construção" text="Escolher o mês e o ano." />
    </Sheet>
  )
}
