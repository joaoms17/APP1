import { EmptyState, NewKindSwitch, Sheet } from '../../ui'

// Folha da despesa (pacote E3): mode 'new' | 'edit'. preset: { files, … } na despesa nova.
// Esqueleto da Fundação: o E3 substitui este ficheiro.
export default function ExpenseSheet({ mode = 'edit', id, preset, onClose }) {
  return (
    <Sheet variant="form" title={mode === 'new' ? 'Nova despesa' : 'Editar despesa'} onClose={onClose}>
      {mode === 'new' && <NewKindSwitch value="despesa" />}
      <EmptyState icon="wallet" title="Em construção" text="O formulário da despesa está a ser preparado." />
    </Sheet>
  )
}
