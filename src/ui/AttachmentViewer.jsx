import { useState } from 'react'
import Sheet from './Sheet.jsx'
import Button from './Button.jsx'
import Icon from './Icon.jsx'
import Skeleton from './Skeleton.jsx'
import EmptyState from './EmptyState.jsx'
import { isImageName, useAttachmentUrl } from './Attachments.jsx'
import { useStore } from '../store.jsx'
import { closeSheet } from '../router.js'
import { fmtDMY } from '../format.js'
import './components.css'

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
        <div className="viewer-stage img">
          {url ? <img src={url} alt={att.name || 'Anexo'} /> : url === false
            ? <EmptyState icon="image" title="Não foi possível abrir a imagem" compact />
            : <Skeleton lines={2} label="A abrir o anexo…" />}
        </div>
      ) : (
        <div className="viewer-stage">
          <div className="viewer-file">
            <Icon name="file" size="lg" />
            <b>{att.name || 'Documento'}</b>
            {att.created_at && !Number.isNaN(Date.parse(att.created_at)) && <small>Anexado a {fmtDMY(att.created_at.slice(0, 10))}</small>}
          </div>
        </div>
      )}
    </Sheet>
  )
}
