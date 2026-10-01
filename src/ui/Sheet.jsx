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

// herdeiros do foco de origem (a linha vizinha, a seguir e antes): se a linha desaparecer enquanto a
// folha está aberta (apagar, mudar de dia), o foco vai para um sítio útil e não para o <body>
const FOCUSABLE = '.row-open:not([tabindex="-1"]), button:not([tabindex="-1"]), a[href]'
const focusableIn = (n) => (n && (n.matches(FOCUSABLE) ? n : n.querySelector(FOCUSABLE))) || null
const ITEMS = '.row, .today-card, .task, .srow'
function heirsOf(el) {
  const item = el?.closest?.(ITEMS)
  if (!item) return []
  // a seguinte e a anterior na ordem do ecrã (mesmo noutro grupo/mês)
  const all = [...(item.closest('.sh-tab, main') || document).querySelectorAll(ITEMS)].filter((n) => n.offsetParent !== null)
  const i = all.indexOf(item)
  return [all[i + 1], all[i - 1]].map(focusableIn).filter(Boolean)
}
function focusHeir(heirs) {
  // depois de a lista se redesenhar (e de outra folha que abra a seguir pôr o seu foco)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (document.activeElement && document.activeElement !== document.body) return
    const flash = document.querySelector('.row.flash, .today-card.flash')
    const visible = (n) => n?.isConnected && !n.closest('[hidden]')
    const target = (visible(flash) && focusableIn(flash)) || heirs.find(visible)
      || document.querySelector('.sh-tab:not([hidden]) h1, main h1')
    if (!target) return
    if (target.tagName === 'H1' && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: target.tagName === 'H1' })
  }))
}

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
  const leaving = useRef(false) // guard(fn) já perguntou: o que fn() fizer (trocar de folha) não pergunta outra vez
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  // pergunta "Descartar alterações?" (se houver) → true para avançar
  const confirmLeave = useCallback(async () => {
    if (!dirtyRef.current) return true
    if (asking.current) return false
    asking.current = true
    const ok = await askDiscard(dirtyRef.current)
    asking.current = false
    return ok
  }, [])

  const requestClose = useCallback(async () => {
    if (asking.current || closing.current) return false
    if (!(await confirmLeave())) return false
    closing.current = true
    onCloseRef.current?.()
    // o fecho não teve efeito (a folha continua aberta passado 1 s): ×, Escape e o fundo voltam a fechar
    setTimeout(() => { if (alive.current) closing.current = false }, 1000)
    return true
  }, [confirmLeave])

  const guard = useCallback(async (fn) => {
    if (!(await confirmLeave())) return false
    leaving.current = true
    try { await fn() } finally { leaving.current = false }
    return true
  }, [confirmLeave])

  useVisualViewport(open)

  // abrir: showModal, pilha de camadas, bloqueio do fundo, foco; fechar: devolve o foco
  useLayoutEffect(() => {
    if (!open) return
    const dlg = ref.current
    const prevFocus = document.activeElement
    const heirs = heirsOf(prevFocus)
    closing.current = false

    const onCancel = (e) => { e.preventDefault(); requestClose() }
    // fechado pelo browser (ex.: Escape repetido): se houver alterações, reabre e pergunta
    const onNativeClose = () => {
      // 'close' atrasado de um fecho anterior (React StrictMode desmonta e volta a montar o efeito:
      // o close() da limpeza chega depois do showModal() seguinte) — a folha está aberta: ignorar
      if (closing.current || dlg.open) return
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
      else if (prevFocus && prevFocus !== document.body) focusHeir(heirs)
    }
  }, [open])

  // voltar do browser: com rota (openSheet) o router fecha a folha e, com alterações, pergunta;
  // sem rota, a folha põe a sua própria entrada no histórico
  useEffect(() => {
    if (!open) return
    if (getRoute().sheet) {
      return registerSheetGuard({
        active: () => !!dirtyRef.current && !closing.current && !leaving.current,
        ask: () => { requestClose() },
        // outra folha vai substituir esta (ex.: "Ver" de um toast): pergunta sem fechar
        confirm: async () => {
          const ok = await confirmLeave()
          if (ok) closing.current = true
          return ok
        },
      })
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
  }, [open, requestClose, confirmLeave])

  // toque no fundo: só se o pointerdown E o click forem fora da caixa (arrastar a selecionar não fecha).
  // Nos primeiros 400 ms não conta: o 2.º clique de um duplo clique que abriu a folha não a fecha logo.
  const downOut = useRef(false)
  const openedAt = useRef(0)
  useLayoutEffect(() => { if (open) openedAt.current = performance.now() }, [open])
  const outside = (e) => {
    const dlg = ref.current
    if (e.target !== dlg || performance.now() - openedAt.current < 400) return false
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
