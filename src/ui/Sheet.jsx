import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import Button from './Button.jsx'
import IconButton from './IconButton.jsx'
import Menu from './Menu.jsx'
import { confirmDialog } from './ConfirmDialog.jsx'
import { pushLayer, removeLayer } from './layers.js'
import { useVisualViewport } from './hooks.js'
import { getRoute, registerSheetGuard } from '../router.js'
import './components.css'

// Folha (spec §9.11): <dialog> + showModal(); no computador é um painel lateral de 480 px.
//   variant: 'detail' (× · … sem título) · 'form' (Cancelar · título · …) · 'full' (ecrã inteiro)
//   dirty: false | true | 'Mudaste o valor bruto de 520 € para 450 €.' → pergunta "Descartar alterações?"
// Fecha com ×/Cancelar, Escape, toque no fundo (pointerdown e click fora da caixa), arrastar a pega
// e voltar do browser. Teclado do iOS: --vvh/--kb (useVisualViewport). Fundo bloqueado
// (html:has(dialog[open]) ou, sem :has, body fixo). Sem <dialog>: div modal + inert no #root.

const HAS_DIALOG = typeof HTMLDialogElement === 'function' && typeof HTMLDialogElement.prototype.showModal === 'function'
const HAS_HAS = (() => { try { return CSS.supports('selector(:has(a))') } catch { return false } })()

const SheetCtx = createContext(null)
const NOOP = { requestClose: async () => false, guard: async (fn) => { await fn(); return true }, dirty: false }
// { requestClose(), guard(fn) } — guard pede "Descartar alterações?" se houver alterações
export const useSheet = () => useContext(SheetCtx) || NOOP

// texto do "Descartar alterações?" a partir da frase do que mudou
export function discardText(dirty) {
  if (typeof dirty !== 'string' || !dirty.trim()) return 'Se saíres agora, perdes as alterações que fizeste.'
  if (/se sa[ií]res/i.test(dirty)) return dirty
  const many = /\b\d+\s+campos\b/.test(dirty)
  return `${dirty.trim()} Se saíres agora, perdes ${many ? 'estas alterações' : 'esta alteração'}.`
}

const askDiscard = (dirty) => confirmDialog({
  title: 'Descartar alterações?',
  text: discardText(dirty),
  confirmLabel: 'Descartar alterações',
  cancelLabel: 'Continuar a editar',
  danger: true,
  primary: 'cancel',
})

let localSeq = 0

export default function Sheet({
  open = true, onClose, variant = 'detail', title, labelledBy, dirty = false, menu,
  footer, initialFocusRef, className = '', children,
}) {
  const ref = useRef(null)
  const titleId = useId()
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const asking = useRef(false)
  const closing = useRef(false)

  const requestClose = useCallback(async () => {
    if (asking.current || closing.current) return false
    if (dirtyRef.current) {
      asking.current = true
      const ok = await askDiscard(dirtyRef.current)
      asking.current = false
      if (!ok) return false
    }
    closing.current = true
    onCloseRef.current?.()
    return true
  }, [])

  const guard = useCallback(async (fn) => {
    if (dirtyRef.current) {
      if (asking.current) return false
      asking.current = true
      const ok = await askDiscard(dirtyRef.current)
      asking.current = false
      if (!ok) return false
    }
    await fn()
    return true
  }, [])

  useVisualViewport(open)

  // abrir: showModal, pilha de camadas, bloqueio do fundo, foco; fechar: devolve o foco
  useLayoutEffect(() => {
    if (!open) return
    const dlg = ref.current
    const prevFocus = document.activeElement
    closing.current = false

    const onCancel = (e) => { e.preventDefault(); requestClose() }
    // fechado pelo browser (ex.: Escape repetido): se houver alterações, reabre e pergunta
    const onNativeClose = () => {
      if (closing.current) return
      if (dirtyRef.current) { try { dlg.showModal() } catch { /* já aberto */ } requestClose() } else {
        closing.current = true
        onCloseRef.current?.()
      }
    }
    const root = document.getElementById('root')
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); requestClose() }
      if (e.key === 'Tab') {
        const els = [...dlg.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')]
        if (!els.length) return
        const [a, b] = [els[0], els[els.length - 1]]
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus() }
        else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus() }
      }
    }

    dlg.addEventListener('cancel', onCancel)
    dlg.addEventListener('close', onNativeClose)
    if (HAS_DIALOG) {
      if (!dlg.open) dlg.showModal()
    } else {
      dlg.setAttribute('open', '')
      if (root) root.inert = true
      document.addEventListener('keydown', onKey)
    }
    pushLayer(dlg)

    // iOS < 16 (sem :has): fixa o body e repõe o scroll ao fechar
    let unlock = null
    if (!HAS_HAS && !document.body.dataset.sheetLock) {
      const y = window.scrollY
      const b = document.body.style
      document.body.dataset.sheetLock = '1'
      Object.assign(b, { position: 'fixed', top: `-${y}px`, left: '0', right: '0' })
      unlock = () => {
        delete document.body.dataset.sheetLock
        Object.assign(b, { position: '', top: '', left: '', right: '' })
        window.scrollTo(0, y)
      }
    }

    // foco: o pedido; senão o título (tabindex=-1, não abre o teclado); senão a própria folha
    // (nunca o × — o showModal() põe-no no 1.º botão e o anel aparecia no fecho)
    const target = initialFocusRef?.current
      || (labelledBy && document.getElementById(labelledBy))
      || dlg.querySelector('[data-sheet-title]')
      || dlg
    target.focus({ preventScroll: true })
    if (!dlg.contains(document.activeElement)) dlg.focus({ preventScroll: true })

    return () => {
      dlg.removeEventListener('cancel', onCancel)
      dlg.removeEventListener('close', onNativeClose)
      document.removeEventListener('keydown', onKey)
      removeLayer(dlg)
      if (HAS_DIALOG) { if (dlg.open) dlg.close() } else if (root) root.inert = false
      unlock?.()
      if (prevFocus?.isConnected && prevFocus !== document.body) prevFocus.focus({ preventScroll: true })
    }
  }, [open])

  // voltar do browser: com rota (openSheet) o router fecha a folha e, com alterações, pergunta;
  // sem rota, a folha põe a sua própria entrada no histórico
  useEffect(() => {
    if (!open) return
    if (getRoute().sheet) {
      return registerSheetGuard({ active: () => !!dirtyRef.current && !closing.current, ask: () => { requestClose() } })
    }
    const marker = `folha-${++localSeq}`
    history.pushState({ ...(history.state || {}), localSheet: marker }, '')
    const onPop = () => {
      if (closing.current || history.state?.localSheet === marker) return
      if (dirtyRef.current) {
        history.pushState({ ...(history.state || {}), localSheet: marker }, '')
        requestClose()
      } else {
        closing.current = true
        onCloseRef.current?.()
      }
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      setTimeout(() => { if (history.state?.localSheet === marker) history.back() }, 0)
    }
  }, [open, requestClose])

  // toque no fundo: só se o pointerdown E o click forem fora da caixa (arrastar a selecionar não fecha)
  const downOut = useRef(false)
  const outside = (e) => {
    const dlg = ref.current
    if (e.target !== dlg) return false
    const r = dlg.getBoundingClientRect()
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
  }

  // arrastar a pega para baixo (> 80 px ou com velocidade) fecha
  const drag = useRef(null)
  const grab = {
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      drag.current = { y: e.clientY, t: performance.now(), dy: 0 }
      e.currentTarget.setPointerCapture?.(e.pointerId)
      ref.current.style.transition = 'none'
    },
    onPointerMove: (e) => {
      const d = drag.current
      if (!d) return
      d.dy = Math.max(0, e.clientY - d.y)
      ref.current.style.transform = d.dy ? `translateY(${d.dy}px)` : ''
    },
    onPointerUp: async () => {
      const d = drag.current
      drag.current = null
      const dlg = ref.current
      if (!d || !dlg) return
      dlg.style.transition = ''
      const v = d.dy / Math.max(1, performance.now() - d.t)
      if (d.dy > 80 || (v > 0.6 && d.dy > 24)) {
        const closed = await requestClose()
        if (!closed && ref.current) ref.current.style.transform = ''
      } else dlg.style.transform = ''
    },
  }
  grab.onPointerCancel = grab.onPointerUp

  const ctx = useMemo(() => ({ requestClose, guard, dirty }), [requestClose, guard, dirty])
  if (!open) return null

  const menuNode = menu?.some((m) => m && !m.hidden)
    ? <Menu items={menu} label="Mais ações" className="r" />
    : <span className="r" />
  const head = variant === 'form' ? (
    <div className="sheet-head form">
      <Button variant="quiet" className="l" onClick={requestClose}>Cancelar</Button>
      <h2 id={titleId} tabIndex={-1} data-sheet-title="">{title}</h2>
      {menuNode}
    </div>
  ) : (
    <div className="sheet-head">
      <IconButton icon="x" label="Fechar" className="l" onClick={requestClose} />
      {variant === 'full' && title ? <h2 id={titleId} tabIndex={-1} data-sheet-title="">{title}</h2> : <span />}
      {menuNode}
    </div>
  )
  const titled = variant !== 'detail' && title
  return createPortal(
    <SheetCtx.Provider value={ctx}>
      {!HAS_DIALOG && <div className="sheet-scrim" aria-hidden="true" onClick={requestClose} />}
      <dialog ref={ref} className={['sheet', variant, className].filter(Boolean).join(' ')} tabIndex={-1}
        aria-labelledby={labelledBy || (titled ? titleId : undefined)}
        aria-label={!labelledBy && !titled && title ? String(title) : undefined}
        role={HAS_DIALOG ? undefined : 'dialog'} aria-modal={HAS_DIALOG ? undefined : 'true'}
        onPointerDown={(e) => { downOut.current = outside(e) }}
        onClick={(e) => { if (downOut.current && outside(e)) requestClose(); downOut.current = false }}>
        <div className="grabber" aria-hidden="true" {...grab} />
        {head}
        <div className={`sheet-body${variant === 'form' ? ' form' : ''}`}>{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </dialog>
    </SheetCtx.Provider>,
    document.body,
  )
}
