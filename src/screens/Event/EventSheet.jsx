import { EmptyState, NewKindSwitch, Sheet } from '../../ui'
import { useStore } from '../../store.jsx'

const TITLE = { detail: 'Evento', edit: 'Editar evento', new: 'Novo evento', google: 'Registar do Google' }

// Folha do evento (pacote E2): mode 'detail' | 'edit' | 'new' | 'google'.
// preset: dados iniciais (novo: { data, files, … }; google: { key }).
// Esqueleto da Fundação: o E2 substitui este ficheiro.
export default function EventSheet({ mode = 'detail', id, preset, onClose }) {
  const { eventById } = useStore()
  const ev = id ? eventById(id) : null
  return (
    <Sheet variant={mode === 'detail' ? 'detail' : 'form'} title={(mode === 'detail' && ev?.title) || TITLE[mode] || 'Evento'}
      onClose={onClose}>
      {mode === 'new' && <NewKindSwitch value="evento" />}
      <EmptyState icon="calendar" title="Em construção" text="O detalhe e o formulário do evento estão a ser preparados." />
    </Sheet>
  )
}
