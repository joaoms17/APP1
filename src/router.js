// Router por hash, sem dependências (spec §3.3; plano §F.5).
//   #/<separador>/<…>?<query>                  → { tab, path, params }
//   …&s=<tipo>[:<id>]&s.<param>=<valor>        → folha aberta por cima da rota (sheet)
// Abrir uma folha faz pushState (voltar do browser fecha-a); fechar volta atrás no histórico.
// Parâmetros de folha que não cabem no URL (File[], objetos) ficam em memória (s.ref).
// A última rota (sem folha) fica em localStorage "joana.v2.rota" e é reposta ao abrir a app.
import { useSyncExternalStore } from 'react'

export const TABS = ['agenda', 'receber', 'despesas', 'painel', 'definicoes']
export const SHEET_TYPES = ['evento', 'evento-editar', 'novo', 'registar', 'despesa', 'projeto', 'projeto-novo',
  'calendario-novo', 'mes', 'anexo', 'orcamento', 'cronograma', 'precos', 'texto']

const STORE_KEY = 'joana.v2.rota'
const HAS_WINDOW = typeof window !== 'undefined'

const listeners = new Set()
const memo = new Map() // s.ref → { chave: objeto }
let memoSeq = 0
let current = null
let currentHash = ''
let guard = null        // { active(), ask() } — folha com alterações por guardar
let bypassGuard = false // o próprio closeSheet() vai voltar atrás: não perguntar
let pendingBack = false // history.back() pedido e ainda sem popstate
let queued = []         // navegações pedidas enquanto o back não chega
let started = false

// ---------- URL ⇄ rota -----------------------------------------------------
const readLS = () => { try { return localStorage.getItem(STORE_KEY) } catch { return null } }
const writeLS = (v) => { try { localStorage.setItem(STORE_KEY, v) } catch { /* modo privado */ } }

function normHash(to) {
  let h = String(to ?? '').trim()
  if (h.startsWith('#')) h = h.slice(1)
  if (!h.startsWith('/')) h = '/' + h
  return '#' + h
}

function parse(hash) {
  const h = normHash(hash).slice(1)
  const qi = h.indexOf('?')
  const pathStr = qi < 0 ? h : h.slice(0, qi)
  const query = new URLSearchParams(qi < 0 ? '' : h.slice(qi + 1))
  let path = pathStr.split('/').filter(Boolean).map((s) => { try { return decodeURIComponent(s) } catch { return s } })
  if (!TABS.includes(path[0])) path = ['agenda']
  const params = {}
  const sheetParams = {}
  let s = null
  for (const [k, v] of query) {
    if (k === 's') s = v
    else if (k.startsWith('s.')) sheetParams[k.slice(2)] = v
    else params[k] = v
  }
  let sheet = null
  if (s) {
    const i = s.indexOf(':')
    const type = i < 0 ? s : s.slice(0, i)
    const id = i < 0 ? null : s.slice(i + 1) || null
    const { ref, ...rest } = sheetParams
    sheet = { type, id, params: { ...rest, ...(ref && memo.get(ref)) } }
  }
  return { tab: path[0], path, params, sheet }
}

// ':' e '/' ficam legíveis no URL (são válidos na query)
const qs = (q) => q.toString().replace(/%3A/gi, ':').replace(/%2F/gi, '/')

function build(path, params = {}, sheet = null) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v != null && v !== false) q.set(k, String(v))
  if (sheet) {
    q.set('s', sheet.id != null && sheet.id !== '' ? `${sheet.type}:${sheet.id}` : sheet.type)
    const objs = {}
    for (const [k, v] of Object.entries(sheet.params || {})) {
      if (v == null) continue
      if (['string', 'number', 'boolean'].includes(typeof v)) q.set(`s.${k}`, String(v))
      else objs[k] = v
    }
    if (Object.keys(objs).length) {
      const ref = String(++memoSeq)
      memo.set(ref, objs)
      if (memo.size > 12) memo.delete(memo.keys().next().value)
      q.set('s.ref', ref)
    }
  }
  const str = qs(q)
  return '#/' + path.map(encodeURIComponent).join('/') + (str ? '?' + str : '')
}

const withoutSheet = (r) => build(r.path, r.params)

function emit(hash) {
  if (hash === currentHash) return
  currentHash = hash
  current = parse(hash)
  writeLS(withoutSheet(current))
  for (const fn of listeners) fn()
}

const sameSheet = (a, b) => (!a && !b) || (a && b && a.type === b.type && a.id === b.id)

function onPop() {
  const hash = normHash(location.hash)
  if (pendingBack) {
    pendingBack = false
    bypassGuard = false
    emit(hash)
    const q = queued
    queued = []
    for (const fn of q) fn()
    return
  }
  const next = parse(hash)
  if (!bypassGuard && guard?.active() && current?.sheet && !sameSheet(current.sheet, next.sheet)) {
    // voltar do browser com alterações por guardar: repõe a folha e pergunta
    history.pushState({ sheet: true }, '', currentHash)
    guard.ask()
    return
  }
  bypassGuard = false
  emit(hash)
}

function start() {
  if (started || !HAS_WINDOW) return
  started = true
  let hash = normHash(location.hash)
  if (!location.hash || location.hash === '#' || location.hash === '#/') hash = normHash(readLS() || '#/agenda')
  // as folhas nunca são repostas ao abrir a app
  const r = parse(hash)
  hash = withoutSheet(r)
  history.replaceState(null, '', hash)
  currentHash = hash
  current = parse(hash)
  writeLS(hash)
  window.addEventListener('popstate', onPop)
  window.addEventListener('hashchange', onPop)
  window.addEventListener('keydown', onKey)
}

// ---------- atalhos globais: "/" Procurar · "N" Novo ------------------------
const isEditable = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
function onKey(e) {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return
  if (document.querySelector('dialog[open]')) return
  if (e.key === '/') {
    e.preventDefault()
    navigate('#/agenda/lista?q=')
  } else if (e.key === 'n' || e.key === 'N') {
    e.preventDefault()
    const r = getRoute()
    const data = r.tab === 'agenda' && r.path[1] === 'mes' && r.path[2] ? r.path[2] : undefined
    openSheet('novo', { kind: r.tab === 'despesas' ? 'despesa' : 'evento', data })
  }
}

// ---------- API --------------------------------------------------------------
export function getRoute() {
  if (!current) current = parse(HAS_WINDOW ? location.hash : '#/agenda')
  return current
}

function subscribe(fn) {
  start()
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// { tab, path, params, sheet: { type, id, params } | null } — o mesmo objeto até o URL mudar
export function useRoute() {
  return useSyncExternalStore(subscribe, getRoute, getRoute)
}

// navigate('#/receber/recibos') · navigate('#/agenda', { replace: true })
export function navigate(to, { replace = false } = {}) {
  start()
  if (pendingBack) { queued.push(() => navigate(to, { replace })); return }
  const r = parse(to)
  const hash = build(r.path, r.params, r.sheet)
  if (hash === currentHash) return
  if (replace) history.replaceState(history.state, '', hash)
  else history.pushState(null, '', hash)
  emit(hash)
}

// funde na query da rota atual (replace); null/undefined/false removem a chave, '' fica ("q=" = modo Procurar)
export function setParams(patch) {
  start()
  if (pendingBack) { queued.push(() => setParams(patch)); return }
  const r = getRoute()
  const params = { ...r.params }
  for (const [k, v] of Object.entries(patch || {})) {
    if (v == null || v === false) delete params[k]
    else params[k] = String(v)
  }
  const hash = build(r.path, params, r.sheet)
  if (hash === currentHash) return
  history.replaceState(history.state, '', hash)
  emit(hash)
}

// openSheet('evento', 'ev-1') · openSheet('novo', { kind: 'evento', data: '2026-10-17' }) · openSheet('registar', { key })
export function openSheet(type, idOrParams) {
  start()
  if (pendingBack) { queued.push(() => openSheet(type, idOrParams)); return }
  const r = getRoute()
  const isObj = idOrParams != null && typeof idOrParams === 'object'
  const { id = null, ...params } = isObj ? idOrParams : { id: idOrParams ?? null }
  const hash = build(r.path, r.params, { type, id, params })
  history.pushState({ sheet: true }, '', hash)
  emit(hash)
}

// troca a folha aberta sem criar entrada no histórico (Detalhe → Editar, Evento ⇄ Despesa)
export function replaceSheet(type, idOrParams) {
  start()
  const r = getRoute()
  const isObj = idOrParams != null && typeof idOrParams === 'object'
  const { id = null, ...params } = isObj ? idOrParams : { id: idOrParams ?? null }
  const hash = build(r.path, r.params, { type, id, params })
  history.replaceState(history.state?.sheet ? history.state : { sheet: true }, '', hash)
  emit(hash)
}

export function closeSheet() {
  start()
  const r = getRoute()
  if (!r.sheet || pendingBack) return
  if (history.state?.sheet) {
    // a folha foi aberta com pushState: voltar atrás limpa o histórico
    bypassGuard = true
    pendingBack = true
    history.back()
    // rede de segurança: se o popstate não chegar, fecha por replace
    setTimeout(() => {
      if (!pendingBack) return
      pendingBack = false
      bypassGuard = false
      const hash = withoutSheet(getRoute())
      history.replaceState(null, '', hash)
      emit(hash)
      const q = queued
      queued = []
      for (const fn of q) fn()
    }, 400)
  } else {
    const hash = withoutSheet(r)
    history.replaceState(null, '', hash)
    emit(hash)
  }
}

// A folha com alterações regista-se aqui: o "voltar" do browser pergunta antes de fechar.
// registerSheetGuard({ active: () => bool, ask: () => void }) → função para remover
export function registerSheetGuard(g) {
  guard = g
  return () => { if (guard === g) guard = null }
}

// href de uma rota (para <a>): routeHref('#/receber/atraso')
export const routeHref = (to) => normHash(to)

// arranca já (antes do primeiro render): repõe a última rota e tira folhas do URL
start()
