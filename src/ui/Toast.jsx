import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { topLayer, useTopLayer } from './layers.js'
import { confirmDialog } from './ConfirmDialog.jsx'
import { humanError, isSetupError } from '../errors.js'
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

// "Detalhes" de um erro (spec §10.16 — "Detalhes para o João"): o texto técnico num diálogo, com Copiar.
// Na PWA do iPhone não há consola: é a única forma de o João saber o que falta (ex.: que .sql correr).
export async function showErrorDetail(detail) {
  const ok = await confirmDialog({ title: 'Detalhes para o João', text: detail, confirmLabel: 'Copiar', cancelLabel: 'Fechar', primary: 'cancel' })
  if (ok) { try { await navigator.clipboard?.writeText(detail) } catch { /* sem permissão */ } }
}
export const detailsAction = (detail) => (detail ? { label: 'Detalhes', run: () => showErrorDetail(detail) } : null)
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
  clear: () => {},
}
export const useToast = () => useContext(Ctx) || FALLBACK

// Formulário que grava (Novo/Editar evento, despesa, projeto, calendário):
//   alive.current — o formulário ainda está aberto (depois do await, só fecha/navega se estiver);
//   fail(ex, retry) — erro com "Tentar de novo"; o toast sai quando o formulário fecha, e o retry
//   nunca grava um formulário que já foi fechado ou descartado.
export function useFormSave() {
  const { notifyError, clear } = useToast()
  const alive = useRef(true)
  const errId = useRef(null)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (errId.current != null) clear(errId.current)
    }
  }, [clear])
  const fail = useCallback((ex, retry) => {
    errId.current = notifyError(ex, retry && alive.current ? () => { if (alive.current) retry() } : undefined)
  }, [notifyError])
  return { alive, fail }
}

let seq = 0

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null) // { id, text, icon, tone, action, duration }
  const pending = useRef(null) // { id, row, undo, commit } da operação com Anular visível
  const remaining = useRef(new Map()) // id → ms que faltam (sobrevive à troca de contentor)
  const top = useTopLayer()
  const hostRef = useRef(null)
  const returnFocus = useRef(null) // onde estava o foco quando o toast apareceu

  const show = useCallback((t) => {
    const id = ++seq
    remaining.current = new Map([[id, t.duration]])
    const a = document.activeElement
    if (a && a !== document.body && !hostRef.current?.contains(a)) returnFocus.current = a
    setToast({ id, ...t })
    return id
  }, [])

  // o toast vai sair com o foco lá dentro (Anular, Ver, Tentar de novo): o foco volta para onde estava
  // (ou para a folha aberta, ou para o conteúdo) — nunca cai no <body>
  const keepFocus = useCallback(() => {
    if (!hostRef.current?.contains(document.activeElement)) return
    requestAnimationFrame(() => {
      if (document.activeElement && document.activeElement !== document.body) return
      const back = returnFocus.current
      const target = (back?.isConnected && !back.closest('[hidden], [inert]') && back)
        || topLayer() || document.getElementById('conteudo')
      if (!target) return
      if (!target.matches('button, a[href], input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    })
  }, [])

  // confirma a operação pendente (toast novo ou tempo esgotado); se falhar, desfaz e avisa
  const settleRef = useRef(null)
  // erro com "Tentar de novo"; se repetir nunca resolve (configuração em falta, valor repetido),
  // ou não há o que repetir, a ação é "Detalhes" (o texto técnico para o João)
  const notifyError = useCallback((ex, retry) => {
    const h = humanError(ex)
    console.warn(h.detail)
    settleRef.current?.() // o erro substitui o toast anterior: o que estava pendente fica gravado
    const pointless = isSetupError(h) || String(ex?.code || '') === '23505'
    return show({ text: h.text, icon: 'alert', tone: 'error', duration: DUR.error,
      action: retry && !pointless ? { label: 'Tentar de novo', run: retry } : ex?.human ? null : detailsAction(h.detail) })
  }, [show])

  // leaving: a página está a sair (pagehide) — o pedido costuma ser cortado a meio; uma falha aí
  // não desfaz nada: a remoção continua guardada (store: joana.v2.pendente) e o arranque seguinte grava-a
  const settle = useCallback(async ({ leaving = false } = {}) => {
    const p = pending.current
    pending.current = null
    if (!p?.commit) return
    try {
      await p.commit(p.row)
    } catch (ex) {
      if (leaving) return
      try { await p.undo?.(p.row) } catch { /* nada a repor */ }
      notifyError(ex, p.retry)
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
      // opts.retry: a ação refaz as contas (ex.: o que falta receber) em vez de repetir às cegas
      notifyError(ex, opts.retry || (() => run(opts)))
      return null
    }
    // outra operação terminou entretanto (dois toques seguidos): fica gravada antes de ser substituída
    if (pending.current) settle()
    const id = show({ text: opts.text, icon: opts.icon || 'checkCircle', duration: opts.duration ?? DUR.undo,
      action: undo ? { label: 'Anular', undo: true } : null })
    pending.current = { id, row, undo, commit: opts.commit, retry: opts.retry }
    return row
  }, [settle, show, notifyError])

  // Anular: se falhar, o erro aparece com "Tentar de novo" (que volta a anular)
  const undoNow = useCallback(async (id) => {
    const p = pending.current
    if (!p || (id != null && p.id !== id)) return
    pending.current = null
    keepFocus()
    setToast((t) => (t && t.id === p.id ? null : t))
    const again = async () => {
      try { await p.undo?.(p.row) } catch (ex) { notifyError(ex, again) }
    }
    await again()
  }, [notifyError, keepFocus])

  const onAction = useCallback((t) => {
    if (t.action?.undo) return undoNow(t.id)
    keepFocus()
    setToast(null)
    t.action?.run?.()
  }, [undoNow, keepFocus])

  const onExpire = useCallback((t) => {
    setToast((cur) => (cur && cur.id === t.id ? null : cur))
    if (pending.current?.id === t.id) settle()
  }, [settle])

  // fecha o toast e grava o pendente (devolve a promessa: ex. antes de terminar sessão)
  const dismiss = useCallback(() => { setToast(null); return settle() }, [settle])
  // tira um toast que já não faz sentido (ex.: o erro de um formulário que fechou)
  const clear = useCallback((id) => { setToast((t) => (t && t.id === id && pending.current?.id !== id ? null : t)) }, [])

  // Ctrl/Cmd+Z anula enquanto há um "Anular" no ecrã (com teclado, o toast fica no fim da página e
  // os 10 s não chegavam para lá chegar com Tab — WCAG 2.2.1). Dentro de um campo, fica o desfazer do campo.
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'z' || !pending.current?.undo) return
      const el = e.target
      if (el?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName || '')) return
      e.preventDefault()
      undoNow()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undoNow])

  // ao sair da página, grava o que estava à espera do Anular
  useEffect(() => {
    const onHide = () => { settle({ leaving: true }) }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [settle])

  const api = useMemo(() => ({ notify, notifyError, undoable, undoCurrent: () => undoNow(), dismiss, clear }),
    [notify, notifyError, undoable, undoNow, dismiss, clear])

  return (
    <Ctx.Provider value={api}>
      {children}
      {createPortal(
        <div ref={hostRef} className="toast-host" role="status" aria-live="polite">
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
      {toast.action && (
        <button type="button" className="act" onClick={() => onAction(toast)}
          {...(toast.action.undo ? { 'aria-keyshortcuts': 'Control+Z Meta+Z', title: 'Anular (Ctrl+Z)' } : {})}>
          {toast.action.label}
        </button>
      )}
      <span className="timer" aria-hidden="true" />
    </div>
  )
}

export default ToastProvider
