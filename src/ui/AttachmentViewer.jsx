import { useEffect, useRef, useState } from 'react'
import Sheet from './Sheet.jsx'
import Button from './Button.jsx'
import Icon from './Icon.jsx'
import Skeleton from './Skeleton.jsx'
import EmptyState from './EmptyState.jsx'
import { isImageName, useAttachmentUrl } from './Attachments.jsx'
import { useStore } from '../store.jsx'
import { closeSheet } from '../router.js'
import { dayOfTimestamp, fmtDMY } from '../format.js'
import './components.css'

// Zoom da imagem com dois dedos, arrastar quando ampliada e duplo toque (1× ↔ 2,5×).
// É o único sítio da app com zoom (spec §10.10): o resto bloqueia o pinch (main.jsx).
function usePinchZoom(active) {
  const stage = useRef(null)
  useEffect(() => {
    const el = stage.current
    if (!active || !el) return
    const pts = new Map()
    let z = { s: 1, x: 0, y: 0 }
    let start = null
    let lastTap = 0
    const apply = () => {
      const img = el.querySelector('img')
      if (img) img.style.transform = z.s === 1 ? '' : `translate(${z.x}px, ${z.y}px) scale(${z.s})`
    }
    const dist = ([a, b]) => Math.hypot(a.x - b.x, a.y - b.y)
    const mid = ([a, b]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
    const begin = () => {
      const list = [...pts.values()]
      start = { z: { ...z }, d: list.length > 1 ? dist(list) : 0, m: list.length > 1 ? mid(list) : list[0] }
    }
    const down = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      try { el.setPointerCapture(e.pointerId) } catch { /* ponteiro já libertado */ }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      begin()
      if (pts.size === 1) {
        if (e.timeStamp - lastTap < 300) {
          z = z.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }
          apply()
          lastTap = 0
        } else lastTap = e.timeStamp
      }
    }
    const move = (e) => {
      if (!pts.has(e.pointerId) || !start) return
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const list = [...pts.values()]
      if (list.length > 1 && start.d) {
        const m = mid(list)
        const s = Math.min(5, Math.max(1, (start.z.s * dist(list)) / start.d))
        z = { s, x: start.z.x + m.x - start.m.x, y: start.z.y + m.y - start.m.y }
        apply()
      } else if (list.length === 1 && z.s > 1) {
        z = { ...z, x: start.z.x + list[0].x - start.m.x, y: start.z.y + list[0].y - start.m.y }
        apply()
      }
    }
    const up = (e) => {
      if (!pts.delete(e.pointerId)) return
      if (z.s < 1.05) { z = { s: 1, x: 0, y: 0 }; apply() }
      if (pts.size) begin()
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [active])
  return stage
}

// Visualizador de anexo (folha 'anexo', spec §10.10): ecrã inteiro, [Partilhar] [Abrir] [Remover].
// Remover → "Anexo removido · Anular" (só sai da base de dados quando o toast expira).
export default function AttachmentViewer({ id, onClose }) {
  const { attachmentById, removeAttachmentDeferred } = useStore()
  const att = attachmentById(id)
  const image = !!att && (isImageName(att.path) || isImageName(att.name))
  const url = useAttachmentUrl(att || null)
  const [sharing, setSharing] = useState(false)
  const close = onClose || closeSheet
  const canShare = typeof navigator !== 'undefined' && !!navigator.share
  const stage = usePinchZoom(image)

  if (!att) {
    return (
      <Sheet variant="full" title="Anexo" onClose={close}>
        <EmptyState icon="paperclip" title="Este anexo já não existe" text="Pode ter sido removido noutro dispositivo." />
      </Sheet>
    )
  }

  const share = async () => {
    setSharing(true)
    try {
      const blob = await (await fetch(url)).blob()
      const file = new File([blob], att.name || 'anexo', { type: blob.type })
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: att.name })
      else await navigator.share({ title: att.name, url })
    } catch { /* partilha cancelada */ }
    setSharing(false)
  }
  const remove = () => {
    removeAttachmentDeferred(att)
    close()
  }

  return (
    <Sheet variant="full" title={att.name || 'Anexo'} onClose={close} className="viewer"
      footer={(
        <>
          {canShare && <Button icon="share" disabled={!url} loading={sharing} loadingLabel={true} onClick={share}>Partilhar</Button>}
          <Button icon="eye" disabled={!url} onClick={() => window.open(url, '_blank', 'noopener')}>Abrir</Button>
          <Button variant="danger" icon="trash" onClick={remove}>Remover</Button>
        </>
      )}>
      {image ? (
        <div ref={stage} className="viewer-stage img">
          {url ? <img src={url} alt={att.name || 'Anexo'} /> : url === false
            ? <EmptyState icon="image" title="Não foi possível abrir a imagem" compact />
            : <Skeleton lines={2} label="A abrir o anexo…" />}
        </div>
      ) : (
        <div className="viewer-stage">
          <div className="viewer-file">
            <Icon name="file" size="lg" />
            <b>{att.name || 'Documento'}</b>
            {dayOfTimestamp(att.created_at) && <small>Anexado a {fmtDMY(dayOfTimestamp(att.created_at))}</small>}
          </div>
        </div>
      )}
    </Sheet>
  )
}
