import { useId, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import Button from './Button.jsx'
import './components.css'

const HAS_DIALOG = typeof HTMLDialogElement === 'function' && typeof HTMLDialogElement.prototype.showModal === 'function'

// Diálogo de confirmação centrado (substitui o confirm() nativo). Só para: descartar alterações,
// registar mais do que falta, baixar o valor abaixo do recebido, apagar projeto, terminar sessão.
// primary: qual dos botões é o principal (fica em cima e recebe o foco).
export default function ConfirmDialog({
  open = true, title, text, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  danger = false, primary = 'confirm', onConfirm, onCancel,
}) {
  const ref = useRef(null)
  const first = useRef(null)
  const cancelRef = useRef(onCancel)
  cancelRef.current = onCancel
  const tid = useId()
  const did = useId()

  useLayoutEffect(() => {
    if (!open) return
    const dlg = ref.current
    const prev = document.activeElement
    const onCancelEv = (e) => { e.preventDefault(); cancelRef.current?.() }
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); cancelRef.current?.() } }
    dlg.addEventListener('cancel', onCancelEv)
    if (HAS_DIALOG) { if (!dlg.open) dlg.showModal() } else { dlg.setAttribute('open', ''); document.addEventListener('keydown', onKey) }
    first.current?.focus()
    return () => {
      dlg.removeEventListener('cancel', onCancelEv)
      document.removeEventListener('keydown', onKey)
      if (HAS_DIALOG && dlg.open) dlg.close()
      if (prev?.isConnected) prev.focus({ preventScroll: true })
    }
  }, [open])

  // o fundo só cancela se o toque começou e acabou fora da caixa
  const down = useRef(false)
  const outside = (e) => {
    const dlg = ref.current
    if (e.target !== dlg) return false
    const r = dlg.getBoundingClientRect()
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
  }

  if (!open) return null
  const confirmBtn = (
    <Button key="c" ref={primary === 'confirm' ? first : undefined} size="lg" block onClick={() => onConfirm?.()}
      variant={danger ? (primary === 'confirm' ? 'danger-solid' : 'danger') : primary === 'confirm' ? 'primary' : 'quiet'}>
      {confirmLabel}
    </Button>
  )
  const cancelBtn = (
    <Button key="x" ref={primary === 'cancel' ? first : undefined} size="lg" block onClick={() => onCancel?.()}
      variant={primary === 'cancel' ? 'primary' : 'quiet'}>
      {cancelLabel}
    </Button>
  )
  return createPortal(
    <>
      {!HAS_DIALOG && <div className="confirm-scrim" onClick={() => onCancel?.()} />}
      <dialog ref={ref} className="confirm" aria-labelledby={tid} aria-describedby={text ? did : undefined}
        aria-modal={HAS_DIALOG ? undefined : 'true'} role={HAS_DIALOG ? undefined : 'alertdialog'}
        onPointerDown={(e) => { down.current = outside(e) }}
        onClick={(e) => { if (down.current && outside(e)) onCancel?.(); down.current = false }}>
        <h2 id={tid}>{title}</h2>
        {text && <p id={did}>{text}</p>}
        <div className="acts">{primary === 'cancel' ? [cancelBtn, confirmBtn] : [confirmBtn, cancelBtn]}</div>
      </dialog>
    </>,
    document.body,
  )
}

// await confirmDialog({ title, text, confirmLabel, cancelLabel, danger, primary }) → true | false
// Funciona sem provider (monta a sua própria raiz); fica por cima de qualquer folha aberta.
export function confirmDialog(opts = {}) {
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    let done = false
    const finish = (v) => {
      if (done) return
      done = true
      resolve(v)
      setTimeout(() => { root.unmount(); host.remove() }, 0)
    }
    root.render(<ConfirmDialog {...opts} open onConfirm={() => finish(true)} onCancel={() => finish(false)} />)
  })
}

export const useConfirm = () => confirmDialog
