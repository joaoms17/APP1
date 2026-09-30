// Hooks partilhados da v2 (plano §F.3).
import { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react'

const HAS_WINDOW = typeof window !== 'undefined'

// ---------- media queries ----------------------------------------------------
export function useMediaQuery(query) {
  const subscribe = useCallback((cb) => {
    if (!HAS_WINDOW || !window.matchMedia) return () => {}
    const m = window.matchMedia(query)
    m.addEventListener?.('change', cb)
    return () => m.removeEventListener?.('change', cb)
  }, [query])
  const get = () => (HAS_WINDOW && window.matchMedia ? window.matchMedia(query).matches : false)
  return useSyncExternalStore(subscribe, get, () => false)
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')

// ---------- preferências locais (localStorage "joana.v2.<chave>", JSON) -------
// Todas as instâncias da mesma chave ficam sincronizadas. Falhas de armazenamento
// (modo privado, bloqueado) nunca rebentam: fica o valor por omissão.
const PREFIX = 'joana.v2.'
const cache = new Map()
const prefSubs = new Map()

function readPref(key, def) {
  if (cache.has(key)) return cache.get(key)
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw == null ? def : JSON.parse(raw)
  } catch { return def }
}

function writePref(key, value) {
  cache.set(key, value)
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch { /* sem armazenamento */ }
  if (key === 'texto') applyTextScale(value)
  for (const fn of prefSubs.get(key) || []) fn(value)
}

export function useLocalPref(key, def) {
  const [value, setValue] = useState(() => readPref(key, def))
  useEffect(() => {
    if (!prefSubs.has(key)) prefSubs.set(key, new Set())
    const set = prefSubs.get(key)
    set.add(setValue)
    setValue(readPref(key, def))
    return () => set.delete(setValue)
  }, [key])
  const update = useCallback((next) => {
    const val = typeof next === 'function' ? next(readPref(key, def)) : next
    writePref(key, val)
  }, [key])
  return [value, update]
}

// Tamanho do texto (Definições): useLocalPref('texto') com 'normal' | 'grande' | 'muito-grande'
// (ou um número) escreve --text-scale em :root.
export const TEXT_SCALES = { normal: 1, grande: 1.125, 'muito-grande': 1.25 }
export function applyTextScale(value) {
  if (!HAS_WINDOW) return
  const n = typeof value === 'number' ? value : TEXT_SCALES[value] || 1
  if (n === 1) document.documentElement.style.removeProperty('--text-scale')
  else document.documentElement.style.setProperty('--text-scale', String(n))
}
if (HAS_WINDOW) applyTextScale(readPref('texto', 'normal'))

// ---------- scroll por rota -------------------------------------------------------
// Os separadores ficam montados; o scroll da janela é guardado por rota e reposto ao voltar.
const scrollPos = new Map()
export function useScrollRestore(routeKey) {
  useLayoutEffect(() => {
    if (!HAS_WINDOW || routeKey == null) return
    window.scrollTo(0, scrollPos.get(routeKey) || 0)
    const onScroll = () => scrollPos.set(routeKey, window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [routeKey])
}

// ---------- teclado do iOS ----------------------------------------------------------
// Escreve --vvh (altura visível) e --kb (altura do teclado) em :root enquanto houver
// uma folha aberta: a barra de ações da folha fica sempre acima do teclado (spec §9.11).
let vvUsers = 0
let vvCleanup = null
function vvStart() {
  const vv = window.visualViewport
  if (!vv) return null
  const root = document.documentElement
  const update = () => {
    root.style.setProperty('--vvh', `${Math.round(vv.height)}px`)
    root.style.setProperty('--kb', `${Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))}px`)
  }
  update()
  vv.addEventListener('resize', update)
  vv.addEventListener('scroll', update)
  return () => {
    vv.removeEventListener('resize', update)
    vv.removeEventListener('scroll', update)
    root.style.removeProperty('--vvh')
    root.style.removeProperty('--kb')
  }
}
export function useVisualViewport(active = true) {
  useEffect(() => {
    if (!active || !HAS_WINDOW) return
    if (vvUsers++ === 0) vvCleanup = vvStart()
    return () => {
      if (--vvUsers === 0) { vvCleanup?.(); vvCleanup = null }
    }
  }, [active])
}
