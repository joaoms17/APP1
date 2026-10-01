import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Button, Field, ProjectChips, Sheet, TextInput, useFormSave, useToast } from '../../ui'
import { useStore } from '../../store.jsx'
import { humanError } from '../../errors.js'
import { ErrorPanel } from '../../shell/lazy.jsx'
import './Settings.css'

// Folha Ligar calendário (spec §10.14): endereço secreto iCal + projeto (chips) → [Ligar calendário].
// Erros em linguagem humana, junto ao campo ("Esse calendário já está ligado.").
// Pode chegar com um projeto escolhido: openSheet('calendario-novo', { projeto: id }).

const DUP = 'Esse calendário já está ligado.'

// webcal:// é o mesmo endereço por https (o proxy só fala http)
const normUrl = (s) => String(s || '').trim().replace(/^webcal:\/\//i, 'https://')
const sameUrl = (a, b) => normUrl(a).toLowerCase() === normUrl(b).toLowerCase()

export default function GcalSheet({ preset, onClose }) {
  const { projects, projectOptions, gcalCalendars, addGcalCalendar, notify } = useStore()
  const { dismiss } = useToast()
  const { alive } = useFormSave() // depois de gravar, só fecha se a folha ainda estiver aberta
  const formId = useId()
  const urlRef = useRef(null)
  const errRef = useRef(null)
  const options = useMemo(() => projectOptions(null), [projectOptions])
  // projeto por omissão: o pedido; senão o primeiro ativo ainda sem calendário
  const [projectId, setProjectId] = useState(() => {
    const asked = preset?.projeto
    if (asked && projects.some((p) => p.id === asked)) return asked
    const free = options.find((p) => !gcalCalendars.some((c) => c.project_id === p.id))
    return (free || options[0] || projects[0])?.id || null
  })
  const [url, setUrl] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState(null)

  useEffect(() => {
    if (fail) errRef.current?.scrollIntoView({ block: 'nearest' })
  }, [fail])

  const setField = (k, fn) => (v) => {
    fn(v)
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }))
  }

  const submit = async (e) => {
    e?.preventDefault()
    if (busy) return
    const clean = normUrl(url)
    const errs = {}
    if (!clean) errs.url = 'Cola o endereço secreto do calendário.'
    else if (!/^https?:\/\/\S+$/i.test(clean)) errs.url = 'Isto não parece um endereço. Deve começar por https://'
    else if (gcalCalendars.some((c) => sameUrl(c.url, clean))) errs.url = DUP
    if (!projectId) errs.project = 'Escolhe o projeto do calendário.'
    if (errs.url || errs.project) {
      setErrors(errs)
      if (errs.url) urlRef.current?.focus()
      return
    }
    setBusy(true)
    setFail(null)
    try {
      // o mesmo endereço removido há instantes (ainda com Anular) sai primeiro: pode voltar a ligar-se
      await dismiss()
      await addGcalCalendar(clean, projectId)
    } catch (ex) {
      setBusy(false)
      const h = humanError(ex)
      if (ex?.code === '23505') {
        setErrors({ url: DUP })
        urlRef.current?.focus()
      } else setFail(h)
      return
    }
    const p = projects.find((x) => x.id === projectId)
    notify({ text: <>Calendário ligado{p ? <> a <b>{p.name}</b></> : null}</>, icon: 'checkCircle' })
    if (alive.current) onClose()
  }

  const dirty = !busy && url.trim() ? 'Colaste o endereço de um calendário.' : false

  return (
    <Sheet variant="form" title="Ligar calendário" dirty={dirty} onClose={onClose} className="st-sheet"
      initialFocusRef={urlRef}
      footer={(
        <Button type="submit" form={formId} variant="primary" size="lg" block loading={busy} loadingLabel="A ligar…">
          Ligar calendário
        </Button>
      )}>
      <form id={formId} className="stack" onSubmit={submit} noValidate>
        <Field label="Endereço secreto iCal" error={errors.url}
          help="No Google Calendar (computador), na conta dona do calendário: Definições → o calendário → Integrar calendário → Endereço secreto em formato iCal.">
          <TextInput ref={urlRef} value={url} onChange={setField('url', setUrl)} inputMode="url" type="url"
            placeholder="https://calendar.google.com/…/basic.ics" autoComplete="off" autoCapitalize="none"
            autoCorrect="off" spellCheck={false} enterKeyHint="done" />
        </Field>
        <Field label="Projeto" error={errors.project} help="Os eventos deste calendário aparecem na agenda com a cor do projeto.">
          <ProjectChips value={projectId} onChange={setField('project', setProjectId)} projects={options} includeInactiveToggle />
        </Field>
        {fail && (
          <div ref={errRef}>
            <ErrorPanel title={fail.text} detail={fail.detail} />
          </div>
        )}
      </form>
    </Sheet>
  )
}
