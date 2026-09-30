import { useId, useMemo, useRef, useState } from 'react'
import {
  Button, EmptyState, EventRow, GroupHeader, IconButton, Sheet, TextInput, TimeInput,
} from '../../ui'
import { useStore } from '../../store.jsx'
import { replaceSheet } from '../../router.js'
import { fmtDate, fmtDayLong } from '../../format.js'
import { humanError } from '../../errors.js'
import { ErrorPanel } from '../../shell/lazy.jsx'
import PrintSheet, { DocHead, Ornament } from './PrintSheet.jsx'
import './Documents.css'

// Folha Cronograma do dia (spec §10.15): linhas Hora · Quem · Serviço · lixo; "+ Adicionar linha";
// barra [Ver PDF] [Guardar]. Sem evento (Definições › Novo cronograma): "Cronograma para que evento?".
//   openSheet('cronograma', eventId) · openSheet('cronograma')

const blankLine = () => ({ time_at: '', person: '', service: '' })
const cleanLines = (rows) => rows
  .map((r) => ({ time_at: r.time_at || '', person: r.person.trim(), service: r.service.trim() }))
  .filter((r) => r.time_at && r.person)
const sorted = (rows) => [...rows].sort((a, b) => a.time_at.localeCompare(b.time_at))

// escolher o evento: próximos primeiro, depois os 10 mais recentes
function EventPicker({ onClose }) {
  const { eventsAsc, today } = useStore()
  const titleId = useId()
  const upcoming = eventsAsc.filter((e) => e.event_date >= today)
  const recent = eventsAsc.filter((e) => e.event_date < today).slice(-10).reverse()
  const pick = (ev) => replaceSheet('cronograma', ev.id)
  return (
    <Sheet variant="detail" labelledBy={titleId} onClose={onClose} className="doc-sheet">
      <h2 className="doc-sheet-title" id={titleId} tabIndex={-1}>Cronograma para que evento?</h2>
      {!upcoming.length && !recent.length && (
        <EmptyState icon="calendar" title="Ainda não há eventos" text="Cria primeiro o evento na Agenda." />
      )}
      {upcoming.length > 0 && (
        <section>
          <GroupHeader title="Próximos" first />
          <div className="list">{upcoming.map((ev) => <EventRow key={ev.id} ev={ev} marks={false} onOpen={pick} />)}</div>
        </section>
      )}
      {recent.length > 0 && (
        <section>
          <GroupHeader title="Recentes" first={!upcoming.length} />
          <div className="list">{recent.map((ev) => <EventRow key={ev.id} ev={ev} marks={false} onOpen={pick} />)}</div>
        </section>
      )}
    </Sheet>
  )
}

function SchedulePrint({ ev, rows, project, onClose }) {
  return (
    <PrintSheet title="Cronograma do dia" onClose={onClose}>
      <DocHead project={project} sub="Hairstyling" />
      <h1 className="doc-title">Cronograma do dia</h1>
      <div className="doc-meta">
        <div><b>{ev.title}</b></div>
        <div>{fmtDate(ev.event_date)}{ev.location ? ` · ${ev.location}` : ''}</div>
      </div>
      <table className="doc-table">
        <thead><tr><th scope="col">Hora</th><th scope="col">Quem</th><th scope="col">Serviço</th></tr></thead>
        <tbody>
          {sorted(rows).map((r, n) => (
            <tr key={n}><td className="doc-time">{r.time_at}</td><td>{r.person}</td><td>{r.service}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="doc-foot">Até já!</p>
      <Ornament />
    </PrintSheet>
  )
}

function ScheduleForm({ ev, onClose }) {
  const { scheduleFor, saveSchedule, projectById, notify } = useStore()
  const formId = useId()
  const errRef = useRef(null)
  const [base, setBase] = useState(() => {
    const rows = scheduleFor(ev.id).map((s) => ({ time_at: String(s.time_at || '').slice(0, 5), person: s.person || '', service: s.service || '' }))
    return rows.length ? rows : [blankLine()]
  })
  const [rows, setRows] = useState(base)
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState(null)
  const [printing, setPrinting] = useState(null)
  const lastRef = useRef(null)
  const project = projectById(ev.project_id)

  const set = (n, k) => (v) => setRows((rs) => rs.map((r, i) => (i === n ? { ...r, [k]: v } : r)))
  const valid = useMemo(() => cleanLines(rows), [rows])
  const changed = JSON.stringify(valid) !== JSON.stringify(cleanLines(base))
  const dirty = !busy && changed && 'Mudaste o cronograma.'

  const save = async () => {
    setBusy(true)
    setFail(null)
    try {
      await saveSchedule(ev.id, rows)
      setBase(rows)
      setBusy(false)
      return true
    } catch (ex) {
      setBusy(false)
      setFail(humanError(ex))
      setTimeout(() => errRef.current?.scrollIntoView({ block: 'nearest' }), 0)
      return false
    }
  }

  const submit = async (e) => {
    e?.preventDefault()
    if (busy) return
    if (await save()) {
      notify({ text: <>Cronograma de <b>{ev.title}</b> guardado</>, icon: 'checkCircle' })
      onClose()
    }
  }

  const viewPdf = async () => {
    if (busy || !valid.length) return
    if (changed && !(await save())) return
    setPrinting(valid)
  }

  const addLine = () => {
    setRows((rs) => [...rs, blankLine()])
    setTimeout(() => lastRef.current?.focus(), 0)
  }

  if (printing) return <SchedulePrint ev={ev} rows={printing} project={project} onClose={() => setPrinting(null)} />

  return (
    <Sheet variant="form" title="Cronograma do dia" dirty={dirty} onClose={onClose} className="doc-sheet"
      footer={(
        <>
          <Button icon="eye" onClick={viewPdf} disabled={busy || !valid.length}>Ver PDF</Button>
          <Button type="submit" form={formId} variant="primary" size="lg" loading={busy}>Guardar</Button>
        </>
      )}>
      <form id={formId} className="stack" onSubmit={submit} noValidate>
        <div className="doc-ev">
          <b>{ev.title}</b>
          <small>{fmtDayLong(ev.event_date, { year: true })}{ev.location ? ` · ${ev.location}` : ''}{project ? ` · ${project.name}` : ''}</small>
        </div>
        <p className="doc-hint">Quem se penteia a que horas: no PDF fica ordenado por hora. Partilha-o com a noiva.</p>
        <div className="doc-lines">
          {rows.map((r, n) => (
            <div key={n} className="doc-line" role="group" aria-label={`Linha ${n + 1}`}>
              <TimeInput ref={n === rows.length - 1 ? lastRef : undefined} value={r.time_at} onChange={set(n, 'time_at')}
                placeholder="Hora" aria-label={`Hora da linha ${n + 1}`} clearable={false} />
              <TextInput value={r.person} onChange={set(n, 'person')} placeholder="Quem" aria-label={`Quem, linha ${n + 1}`}
                autoCapitalize="words" autoComplete="off" />
              <TextInput value={r.service} onChange={set(n, 'service')} placeholder="Serviço" aria-label={`Serviço, linha ${n + 1}`}
                autoComplete="off" className="doc-line-svc" />
              <IconButton icon="trash" label={`Tirar a linha ${n + 1}`}
                onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, i) => i !== n) : [blankLine()]))} />
            </div>
          ))}
        </div>
        <Button variant="ghost" icon="plus" className="doc-add-line" onClick={addLine}>Adicionar linha</Button>
        {fail && <div ref={errRef}><ErrorPanel title={fail.text} detail={fail.detail} /></div>}
      </form>
    </Sheet>
  )
}

export default function ScheduleSheet({ id, onClose }) {
  const { eventById } = useStore()
  if (!id) return <EventPicker onClose={onClose} />
  const ev = eventById(id)
  if (!ev) {
    return (
      <Sheet variant="form" title="Cronograma do dia" onClose={onClose}>
        <EmptyState icon="calendar" title="Este evento já não existe" text="Pode ter sido apagado noutro aparelho." />
      </Sheet>
    )
  }
  return <ScheduleForm key={id} ev={ev} onClose={onClose} />
}
