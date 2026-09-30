import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { useTopLayer } from './layers.js'
import { humanError } from '../errors.js'
import './hooks.js'
import './components.css'

// Toast único (spec §9.13). 10 s com Anular · 6 s com "Ver" · 4 s informativo;
// pausa com toque, foco ou rato por cima. Um toast novo confirma (commit) a operação pendente
// do anterior. Com uma folha aberta, o toast vai para dentro dela (senão ficava inerte).
// O anúncio aos leitores de ecrã vai por um contentor role="status" que já existe antes de o
// texto chegar (.toast-host): uma região viva inserida já com texto muitas vezes não é lida.
//
//   const { notify, undoable } = useToast()
//   notify({ text, action: { label: 'Ver', run }, duration })
//   await undoable({ text, run: async () => row, undo: async (row) => …, commit: async (row) => …, duration })
//     → devolve o resultado de run (ou null se falhou: aparece o erro com "Tentar de novo")

const DUR = { undo: 10000, action: 6000, info: 4000, error: 10000 }
const Ctx = createContext(null)

// sem provider não rebenta: notify não mostra nada e undoable corre e confirma logo
const FALLBACK = {
  notify: () => {},
  notifyError: (ex) => { console.warn(humanError(ex).detail) },
  undoable: async ({ run, apply, commit }) => {
    try {
      const row = await (run || apply)?.()
      await commit?.(row)
      return row
    } catch (ex) {
      console.warn(humanError(ex).detail)
      return null
    }
  },
  undoCurrent: () => {},
  dismiss: () => {},
}
export const useToast = () => useContext(Ctx) || FALLBACK

let seq = 0

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null) // { id, text, icon, tone, action, duration }
  const pending = useRef(null) // { id, row, undo, commit } da operação com Anular visível
  const remaining = useRef(new Map()) // id → ms que faltam (sobrevive à troca de contentor)
  const top = useTopLayer()

  const show = useCallback((t) => {
    const id = ++seq
    remaining.current = new Map([[id, t.duration]])
    setToast({ id, ...t })
    return id
  }, [])

  // confirma a operação pendente (toast novo ou tempo esgotado); se falhar, desfaz e avisa
  const settleRef = useRef(null)
  const notifyError = useCallback((ex, retry) => {
    const h = humanError(ex)
    console.warn(h.detail)
    settleRef.current?.() // o erro substitui o toast anterior: o que estava pendente fica gravado
    show({ text: h.text, icon: 'alert', tone: 'error', duration: DUR.error,
      action: retry ? { label: 'Tentar de novo', run: retry } : null })
  }, [show])

  const settle = useCallback(async () => {
    const p = pending.current
    pending.current = null
    if (!p?.commit) return
    try {
      await p.commit(p.row)
    } catch (ex) {
      try { await p.undo?.(p.row) } catch { /* nada a repor */ }
      notifyError(ex)
    }
  }, [notifyError])
  settleRef.current = settle

  const notify = useCallback(({ text, action = null, duration, icon = 'checkCircle', tone } = {}) => {
    settle()
    return show({ text, action, icon, tone, duration: duration ?? (action ? DUR.action : DUR.info) })
  }, [settle, show])

  const undoable = useCallback(async function run(opts) {
    const doIt = opts.run || opts.apply
    const undo = opts.undo || opts.revert
    await settle() // o anterior fica gravado antes de começar este
    let row
    try {
      row = await doIt()
    } catch (ex) {
      notifyError(ex, () => run(opts))
      return null
    }
    // outra operação terminou entretanto (dois toques seguidos): fica gravada antes de ser substituída
    if (pending.current) settle()
    const id = show({ text: opts.text, icon: opts.icon || 'checkCircle', duration: opts.duration ?? DUR.undo,
      action: undo ? { label: 'Anular', undo: true } : null })
    pending.current = { id, row, undo, commit: opts.commit }
    return row
  }, [settle, show, notifyError])

  const undoNow = useCallback(async (id) => {
    const p = pending.current
    if (!p || (id != null && p.id !== id)) return
    pending.current = null
    setToast((t) => (t && t.id === p.id ? null : t))
    try { await p.undo?.(p.row) } catch (ex) { notifyError(ex) }
  }, [notifyError])

  const onAction = useCallback((t) => {
    if (t.action?.undo) return undoNow(t.id)
    setToast(null)
    t.action?.run?.()
  }, [undoNow])

  const onExpire = useCallback((t) => {
    setToast((cur) => (cur && cur.id === t.id ? null : cur))
    if (pending.current?.id === t.id) settle()
  }, [settle])

  // fecha o toast e grava o pendente (devolve a promessa: ex. antes de terminar sessão)
  const dismiss = useCallback(() => { setToast(null); return settle() }, [settle])

  // ao sair da página, grava o que estava à espera do Anular
  useEffect(() => {
    const onHide = () => { settle() }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [settle])

  const api = useMemo(() => ({ notify, notifyError, undoable, undoCurrent: () => undoNow(), dismiss }),
    [notify, notifyError, undoable, undoNow, dismiss])

  return (
    <Ctx.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-host" role="status" aria-live="polite">
          {toast && <ToastView key={toast.id} toast={toast} remaining={remaining.current} onAction={onAction} onExpire={onExpire} />}
        </div>,
        top || document.body,
      )}
    </Ctx.Provider>
  )
}

function ToastView({ toast, remaining, onAction, onExpire }) {
  const ref = useRef(null)
  const [paused, setPaused] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    const left = remaining.get(toast.id) ?? toast.duration
    el.style.setProperty('--toast-dur', `${toast.duration}ms`)
    el.style.setProperty('--toast-delay', `${left - toast.duration}ms`)
  }, [toast, remaining])

  useEffect(() => {
    if (paused) return
    const start = Date.now()
    const left = remaining.get(toast.id) ?? toast.duration
    const t = setTimeout(() => onExpire(toast), left)
    return () => {
      clearTimeout(t)
      if (remaining.has(toast.id)) remaining.set(toast.id, Math.max(0, left - (Date.now() - start)))
    }
  }, [paused, toast, remaining, onExpire])

  return (
    <div ref={ref} className={`toast${paused ? ' paused' : ''}${toast.tone === 'error' ? ' error' : ''}`}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPaused(true) }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setPaused(false) }}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget)) setPaused(false) }}>
      <Icon name={toast.icon || 'checkCircle'} />
      <span className="txt">{toast.text}</span>
      {toast.action && <button type="button" className="act" onClick={() => onAction(toast)}>{toast.action.label}</button>}
      <span className="timer" aria-hidden="true" />
    </div>
  )
}

export default ToastProvider
