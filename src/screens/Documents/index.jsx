import { EmptyState, Sheet } from '../../ui'

// Documentos e Tabela de preços (pacote E5), só com FEATURES.docs.
// Esqueleto da Fundação: o E5 substitui este ficheiro.

// secções das Definições
export function DocumentsSection() {
  return <EmptyState compact icon="file" title="Em construção" text="Orçamentos e cronogramas do dia." />
}

export function PricesSection() {
  return <EmptyState compact icon="euro" title="Em construção" text="Tabela de preços." />
}

// folhas (registadas no SheetHost: orcamento · cronograma · precos)
export function QuoteSheet({ id, preset, onClose }) {
  return (
    <Sheet variant="form" title="Orçamento" onClose={onClose}>
      <EmptyState icon="file" title="Em construção" text="O orçamento está a ser preparado." />
    </Sheet>
  )
}

export function ScheduleSheet({ id, preset, onClose }) {
  return (
    <Sheet variant="form" title="Cronograma do dia" onClose={onClose}>
      <EmptyState icon="clockList" title="Em construção" text="O cronograma do dia está a ser preparado." />
    </Sheet>
  )
}

export function PricesSheet({ onClose }) {
  return (
    <Sheet variant="form" title="Tabela de preços" onClose={onClose}>
      <EmptyState icon="euro" title="Em construção" text="A tabela de preços está a ser preparada." />
    </Sheet>
  )
}
