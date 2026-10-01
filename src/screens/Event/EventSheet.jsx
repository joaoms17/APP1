import EventDetail from './EventDetail.jsx'
import EventForm from './EventForm.jsx'
import './Event.css'

// Folha do evento (plano E2). mode:
//   'detail' → Detalhe (ver e agir; grava logo, com Anular)
//   'edit' | 'new' | 'google' → formulário (só grava com Guardar)
// preset: novo → { data, files, … } ou a cópia de "Duplicar evento"; google → { key }.
export default function EventSheet({ mode = 'detail', id, preset, onClose }) {
  if (mode === 'detail') return <EventDetail id={id} onClose={onClose} />
  return <EventForm key={`${mode}:${id || ''}`} mode={mode} id={id} preset={preset} onClose={onClose} />
}
