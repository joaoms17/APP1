import { useId, useRef, useState } from 'react'
import { Attachments, Button, Card, Dot, EmptyState, Icon, Sheet, Skeleton, StatusBadge, Switch } from '../../ui'
import { useStore } from '../../store.jsx'
import { openSheet, replaceSheet } from '../../router.js'
import { FEATURES } from '../../features.js'
import { fmtDay, fmtTime, relDay } from '../../format.js'
import PaymentBlock, { money } from './PaymentBlock.jsx'

const EPS = 0.005

// Detalhe do evento (spec §10.6): ver e agir, sem campos editáveis. Recebe só o id e lê
// o evento vivo em cada render (nunca um snapshot); cada ação grava logo, com Anular (§14.1).
export default function EventDetail({ id, onClose }) {
  const {
    eventById, projectById, missing, receiveRemaining, setReceipt, deleteEvent,
    attachmentsFor, paymentsByEvent, loadingPhases, quotes, today,
  } = useStore()
  const titleId = useId()
  const payId = useId()
  const recId = useId()
  const attId = useId()
  const notesId = useId()
  const [adding, setAdding] = useState(false)

  // ao apagar, a folha fecha com o último estado visto (o evento sai logo da lista)
  const closing = useRef(false)
  const last = useRef(null)
  const live = eventById(id)
  if (live) last.current = live
  const ev = live || (closing.current ? last.current : null)

  if (!ev) {
    return (
      <Sheet variant="detail" title="Evento" onClose={onClose} className="ev-sheet">
        <EmptyState icon="calendar" title="Este evento já não existe" text="Pode ter sido apagado noutro dispositivo."
          action={<Button onClick={onClose}>Fechar</Button>} />
      </Sheet>
    )
  }

  const p = projectById(ev.project_id)
  const miss = missing(ev)
  const paidAll = miss <= EPS
  const hasPayments = (paymentsByEvent.get(ev.id) || []).length > 0
  const legacy = !!ev.paid && !hasPayments && Number(ev.value) > 0
  const atts = attachmentsFor('event', ev.id)
  const rel = relDay(ev.event_date, today)
  const day = fmtDay(ev.event_date, { weekday: 'day', month: 'long', year: ev.event_date.slice(0, 4) !== today.slice(0, 4) })
  const time = fmtTime(ev.start_time)

  const edit = () => replaceSheet('evento-editar', ev.id)
  const remove = () => {
    closing.current = true
    onClose()
    deleteEvent(ev)
  }
  // cópia sem id nem pagamentos (a data fica, para mudar no formulário)
  const duplicate = () => openSheet('novo', {
    kind: 'evento',
    preset: {
      project_id: ev.project_id, title: ev.title, data: ev.event_date, start_time: ev.start_time,
      location: ev.location, gross_value: ev.gross_value, value: ev.value, notes: ev.notes,
    },
  })
  // Documentos (escondidos com FEATURES.docs = false): cronograma do dia e orçamento ligado
  const openQuote = () => {
    const q = quotes.find((x) => x.event_id === ev.id)
    if (q) openSheet('orcamento', q.id)
    else openSheet('orcamento', { preset: { project_id: ev.project_id, event_date: ev.event_date, location: ev.location, event_id: ev.id } })
  }

  const menu = [
    { label: 'Duplicar evento', icon: 'copy', onSelect: duplicate },
    { label: 'Registar pagamento extra', icon: 'plus', hidden: !paidAll || legacy || adding, onSelect: () => setAdding(true) },
    { label: 'Cronograma do dia', icon: 'clockList', hidden: !FEATURES.docs, onSelect: () => openSheet('cronograma', ev.id) },
    { label: 'Orçamento', icon: 'file', hidden: !FEATURES.docs, onSelect: openQuote },
    { label: 'Apagar evento', icon: 'trash', danger: true, onSelect: remove },
  ]

  const footer = paidAll ? (
    <Button size="lg" block icon="pencil" onClick={edit}>Editar</Button>
  ) : (
    <>
      <Button size="lg" icon="pencil" onClick={edit}>Editar</Button>
      <Button variant="primary" size="lg" icon="check" onClick={() => receiveRemaining(ev)}>Recebi {money(miss)}</Button>
    </>
  )

  return (
    <Sheet variant="detail" title={ev.title} labelledBy={titleId} menu={menu} footer={footer} onClose={onClose} className="ev-sheet">
      <div className="ev-ident">
        {p && <span className="ev-pchip"><Dot project={p} size="lg" />{p.name}</span>}
        <h2 className="ev-title" id={titleId} tabIndex={-1}>{ev.title}</h2>
        <div className="ev-facts">
          <span><Icon name="calendar" />{rel && <b>{rel}</b>}{rel ? `· ${day}` : day}</span>
          {time && <span><Icon name="clock" />{time}</span>}
          {ev.location && <span><Icon name="pin" />{ev.location}</span>}
        </div>
      </div>

      <section className="ev-sec" aria-labelledby={payId}>
        <div className="ev-sec-head"><h3 id={payId}>Pagamento</h3><StatusBadge ev={ev} always /></div>
        <PaymentBlock ev={ev} adding={adding} onAdding={setAdding} />
      </section>

      <section className="ev-sec" aria-labelledby={recId}>
        <div className="ev-sec-head"><h3 id={recId}>Recibo</h3></div>
        <Card className="ev-card-s">
          <Switch checked={!!ev.receipt_issued} onChange={(on) => setReceipt(ev, on)}
            label="Recibo emitido" help="Marca quando passares o recibo. Grava logo, com Anular." />
        </Card>
      </section>

      <section className="ev-sec" aria-labelledby={attId}>
        <div className="ev-sec-head">
          <h3 id={attId}>Anexos</h3>
          <span className="n">{loadingPhases.phase2 ? 'a carregar…' : atts.length || 'nenhum'}</span>
        </div>
        {loadingPhases.phase2 ? <Skeleton lines={1} label="A carregar os anexos" /> : <Attachments kind="event" id={ev.id} />}
      </section>

      <section className="ev-sec" aria-labelledby={notesId}>
        <div className="ev-sec-head"><h3 id={notesId}>Notas</h3></div>
        {ev.notes ? <p className="ev-notes">{ev.notes}</p> : (
          <div className="ev-note-empty">
            Sem notas.
            <Button variant="ghost" size="sm" icon="pencil" onClick={() => replaceSheet('evento-editar', { id: ev.id, foco: 'notas' })}>
              Adicionar nota
            </Button>
          </div>
        )}
      </section>
    </Sheet>
  )
}
