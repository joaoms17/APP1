import { EmptyState, Sheet } from '../../ui'

// Folha Ligar calendário Google (pacote E5). Esqueleto da Fundação: o E5 substitui este ficheiro.
export default function GcalSheet({ onClose }) {
  return (
    <Sheet variant="form" title="Ligar calendário" onClose={onClose}>
      <EmptyState icon="gcal" title="Em construção" text="Ligar um calendário Google a um projeto." />
    </Sheet>
  )
}
