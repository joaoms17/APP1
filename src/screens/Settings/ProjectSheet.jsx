import { EmptyState, Sheet } from '../../ui'

// Folha Editar/Novo projeto (pacote E5): id null = novo.
// Esqueleto da Fundação: o E5 substitui este ficheiro.
export default function ProjectSheet({ id, onClose }) {
  return (
    <Sheet variant="form" title={id ? 'Editar projeto' : 'Novo projeto'} onClose={onClose}>
      <EmptyState icon="settings" title="Em construção" text="O formulário do projeto está a ser preparado." />
    </Sheet>
  )
}
