import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import Button from './Button.jsx'
import Callout from './Callout.jsx'
import { confirmDialog } from './ConfirmDialog.jsx'
import { useToast } from './Toast.jsx'
import { useSheet } from './Sheet.jsx'
import { useStore } from '../store.jsx'
import { openSheet } from '../router.js'
import './components.css'

// Anexos (spec §9.16): miniaturas de 84 px + tile "Foto ou PDF". Sem × na miniatura:
// tocar abre o visualizador (folha 'anexo'), onde se remove com Anular.

const ACCEPT = 'image/*,application/pdf'
export const isImageName = (s) => /\.(jpe?g|png|gif|webp|heic|heif|avif)$/i.test(String(s || ''))

// URLs assinados (1 h) guardados por anexo durante 50 min
const urlCache = new Map()
export function useAttachmentUrl(att) {
  const { attachmentUrl } = useStore()
  const cached = att && urlCache.get(att.id)
  const fresh = cached && Date.now() - cached.at < 50 * 60 * 1000 ? cached.url : null
  const [url, setUrl] = useState(fresh)
  useEffect(() => {
    if (!att) return
    const c = urlCache.get(att.id)
    if (c && Date.now() - c.at < 50 * 60 * 1000) { setUrl(c.url); return }
    let alive = true
    attachmentUrl(att)
      .then((u) => { urlCache.set(att.id, { url: u, at: Date.now() }); if (alive) setUrl(u) })
      .catch(() => { if (alive) setUrl(false) })
    return () => { alive = false }
  }, [att?.id])
  return url
}

function Thumb({ att }) {
  const image = isImageName(att.path) || isImageName(att.name)
  const url = useAttachmentUrl(image ? att : null)
  // o visualizador substitui a folha onde está: com algo escrito e não gravado, pergunta primeiro
  const { guard } = useSheet()
  return (
    <button type="button" className="thumb" aria-label={`Abrir ${att.name || 'anexo'}`}
      onClick={() => guard(() => openSheet('anexo', att.id))}>
      <span className="img">{image && url ? <img src={url} alt="" loading="lazy" /> : <Icon name={image ? 'image' : 'file'} size="lg" />}</span>
      <small>{att.name || 'anexo'}</small>
    </button>
  )
}

function AddTile({ onFiles, label = 'Foto ou PDF' }) {
  const input = useRef(null)
  return (
    <>
      <button type="button" className="thumb-add" onClick={() => input.current?.click()}>
        <Icon name="camera" />{label}
      </button>
      <input ref={input} type="file" accept={ACCEPT} multiple hidden
        onChange={(e) => { const fs = [...(e.target.files || [])]; e.target.value = ''; if (fs.length) onFiles(fs) }} />
    </>
  )
}

// Anexos de um evento/despesa que já existe: cada ficheiro grava logo.
export default function Attachments({ kind, id }) {
  const { attachmentsFor, addAttachment, loadFailures, retryLoads } = useStore()
  const { notifyError } = useToast()
  const [sending, setSending] = useState([])
  const [retrying, setRetrying] = useState(false)
  const list = attachmentsFor(kind, id)
  // a lista de anexos não foi lida: nunca dizer "nenhum" — avisa e deixa tentar de novo
  const unread = !!loadFailures?.attachments

  const onFiles = async (files) => {
    setSending((s) => [...s, ...files])
    for (const f of files) {
      try { await addAttachment(kind, id, f) } catch (ex) { notifyError(ex) }
      setSending((s) => s.filter((x) => x !== f))
    }
  }

  const grid = (
    <div className="attach-grid">
      {list.map((a) => <Thumb key={a.id} att={a} />)}
      {sending.map((f, i) => (
        <span key={`s${i}`} className="thumb pending" aria-live="polite">
          <span className="img"><span className="spin" aria-hidden="true" /></span>
          <small>A enviar…</small>
        </span>
      ))}
      <AddTile onFiles={onFiles} />
    </div>
  )
  if (!unread) return grid
  return (
    <>
      <Callout tone="warning" title="Não foi possível carregar os anexos.">
        Os que já existem podem não aparecer.{' '}
        <Button variant="ghost" size="sm" icon="refresh" loading={retrying} loadingLabel="A carregar…"
          onClick={async () => { setRetrying(true); try { await retryLoads?.(true, false) } finally { setRetrying(false) } }}>
          Tentar de novo
        </Button>
      </Callout>
      {grid}
    </>
  )
}

// Ficheiros de um evento/despesa ainda por criar: ficam em memória e sobem depois do insert
// (createEvent/createExpense). Tocar numa miniatura pergunta se a tira.
export function PendingAttachments({ files = [], onChange, label }) {
  const urls = useMemo(() => files.map((f) => (f.type?.startsWith('image/') ? URL.createObjectURL(f) : null)), [files])
  useEffect(() => () => urls.forEach((u) => u && URL.revokeObjectURL(u)), [urls])

  const remove = async (f) => {
    const ok = await confirmDialog({ title: 'Tirar este anexo?', text: f.name, confirmLabel: 'Tirar anexo', cancelLabel: 'Manter', danger: true })
    if (ok) onChange?.(files.filter((x) => x !== f))
  }

  return (
    <div className="attach-grid">
      {files.map((f, i) => (
        <button key={`${f.name}-${i}`} type="button" className="thumb" aria-label={`Tirar ${f.name}`} onClick={() => remove(f)}>
          <span className="img">{urls[i] ? <img src={urls[i]} alt="" /> : <Icon name="file" size="lg" />}</span>
          <small>{f.name}</small>
        </button>
      ))}
      <AddTile label={label} onFiles={(fs) => onChange?.([...files, ...fs])} />
    </div>
  )
}
