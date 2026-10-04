// Router por hash, sem dependências (spec §3.3; plano §F.5).
//   #/<separador>/<…>?<query>                  → { tab, path, params }
//   …&s=<tipo>[:<id>]&s.<param>=<valor>        → folha aberta por cima da rota (sheet)
// Abrir uma folha faz pushState (voltar do browser fecha-a); fechar volta atrás no histórico.
// Parâmetros de folha que não cabem no URL (File[], objetos) ficam em memória (s.ref).
// A última rota (sem folha) fica em localStorage "joana.v2.rota" e é reposta ao abrir a app.
import { FEATURES } from './features.js'
import { useSyncExternalStore } from 'react'

export const TABS = ['agenda', 'receber', 'despesas', 'painel', 'definicoes']
export const TAB_LABELS = { agenda: 'Agenda', receber: 'Receber', despesas: 'Despesas', painel: 'Painel', definicoes: 'Definições' }
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
let shortcuts = false   // N e / só com a app (sessão iniciada) montada — nunca no ecrã Entrar
const lastByTab = new Map() // separador → último URL (sem folha): a tabbar volta onde se estava
let lastTab = null          // último separador que não é Definições (para o "‹ Voltar")

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
  // Despesas escondidas (FEATURES.expenses): um link antigo para #/despesas abre a Agenda
  if (!TABS.includes(path[0]) || (path[0] === 'despesas' && !FEATURES.expenses)) path = ['agenda']
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

function remember(r) {
  const h = withoutSheet(r)
  lastByTab.set(r.tab, h)
  if (r.tab !== 'definicoes') lastTab = r.tab
  writeLS(h)
}

function emit(hash) {
  if (hash === currentHash) return
  currentHash = hash
  current = parse(hash)
  remember(current)
  for (const fn of listeners) fn()
}

const sameSheet = (a, b) => (!a && !b) || (a && b && a.type === b.type && a.id === b.id)

let backHops = 0 // voltas extra para saltar entradas repetidas da mesma folha

function onPop() {
  const hash = normHash(location.hash)
  // popstate e hashchange chegam os dois para o mesmo voltar: o segundo (já tratado) não muda nada
  if (!pendingBack && hash === currentHash) return
  if (pendingBack) {
    // voltou-se para uma entrada repetida da mesma folha (ex.: aberta duas vezes seguidas):
    // continua a voltar até a folha fechar — senão o × ficava sem efeito
    const back = parse(hash)
    if (current?.sheet && back.sheet && sameSheet(current.sheet, back.sheet) && backHops < 5) {
      backHops++
      history.back()
      return
    }
    backHops = 0
    pendingBack = false
    bypassGuard = false
    emit(hash)
    const q = queued
    queued = []
    for (const fn of q) fn()
    return
  }
  // voltar do browser com uma confirmação aberta: o voltar cancela a confirmação e a folha por baixo
  // fica onde está — nunca abre outra pergunta por cima nem deixa a primeira órfã
  if (confirmStack.length) {
    confirmStack[confirmStack.length - 1]()
    if (current?.sheet) {
      if (hash !== currentHash) history.pushState({ sheet: true }, '', currentHash)
      return
    }
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
  if (!location.hash || location.hash === '#' || location.hash === '#/') {
    hash = normHash(readLS() || '#/agenda')
    // ao abrir, a Agenda abre na vista preferida (Mês por omissão), não na última vista/dia guardados
    if (/^#\/agenda(\/(lista|mes)(\/[\d-]+)?)?$/.test(hash)) hash = '#/agenda'
  }
  // as folhas nunca são repostas ao abrir a app
  const r = parse(hash)
  hash = withoutSheet(r)
  history.replaceState(null, '', hash)
  currentHash = hash
  current = parse(hash)
  remember(current)
  window.addEventListener('popstate', onPop)
  window.addEventListener('hashchange', onPop)
  window.addEventListener('keydown', onKey)
}

// ---------- atalhos globais: "/" Procurar · "N" Novo ------------------------
const isEditable = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
function onKey(e) {
  if (!shortcuts || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return
  if (document.querySelector('dialog[open]')) return
  if (e.key === '/') {
    e.preventDefault()
    // volta à pesquisa que estava (texto e filtros) ou abre uma nova; depois foca o campo
    const r = getRoute()
    if (!(r.tab === 'agenda' && 'q' in r.params)) {
      navigate('q' in parse(tabHref('agenda')).params ? tabHref('agenda') : '#/agenda/lista?q=')
    }
    setTimeout(() => document.querySelector('.sh-tab:not([hidden]) input[type="search"]')?.focus(), 60)
  } else if (e.key === 'n' || e.key === 'N') {
    e.preventDefault()
    openNew()
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

// navigate('#/receber/google') · navigate('#/agenda', { replace: true })
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

// a folha aberta tem alterações por guardar e vai ser substituída por outra (ex.: o "Ver" de um
// toast): pergunta "Descartar alterações?" primeiro; go() só corre se a pessoa confirmar
function guarded(nextSheet, go) {
  if (bypassGuard || !guard?.active() || !current?.sheet || sameSheet(current.sheet, nextSheet)) return go()
  if (!guard.confirm) { guard.ask(); return }
  guard.confirm().then((ok) => { if (ok) go() })
}

// openSheet('evento', 'ev-1') · openSheet('novo', { kind: 'evento', data: '2026-10-17' }) · openSheet('registar', { key })
export function openSheet(type, idOrParams) {
  start()
  if (pendingBack) { queued.push(() => openSheet(type, idOrParams)); return }
  const r = getRoute()
  const isObj = idOrParams != null && typeof idOrParams === 'object'
  const { id = null, ...params } = isObj ? idOrParams : { id: idOrParams ?? null }
  const hash = build(r.path, r.params, { type, id, params })
  // a mesma folha já está aberta (2.º toque antes de a folha aparecer): não cria outra entrada
  if (hash === currentHash) return
  guarded({ type, id }, () => {
    history.pushState({ sheet: true }, '', hash)
    emit(hash)
  })
}

// troca a folha aberta sem criar entrada no histórico (Detalhe → Editar, Evento ⇄ Despesa)
export function replaceSheet(type, idOrParams) {
  start()
  const r = getRoute()
  const isObj = idOrParams != null && typeof idOrParams === 'object'
  const { id = null, ...params } = isObj ? idOrParams : { id: idOrParams ?? null }
  const hash = build(r.path, r.params, { type, id, params })
  if (hash === currentHash) return
  guarded({ type, id }, () => {
    history.replaceState(history.state?.sheet ? history.state : { sheet: true }, '', hash)
    emit(hash)
  })
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

// "Novo" (tabbar, sidebar, tecla N): Despesa no separador Despesas, Evento nos outros (sempre Evento
// com as despesas escondidas);
// na Agenda › Mês usa o dia selecionado como data
export function openNew() {
  const r = getRoute()
  const data = r.tab === 'agenda' && r.path[1] === 'mes' && r.path[2] ? r.path[2] : undefined
  openSheet('novo', { kind: FEATURES.expenses && r.tab === 'despesas' ? 'despesa' : 'evento', data })
}

// último URL visitado de um separador (vista, filtros e pesquisa sobrevivem à troca)
export const tabHref = (tab) => lastByTab.get(tab) || `#/${tab}`

// destino do "‹ Voltar" das Definições: o separador de onde se veio
export function backRoute() {
  const tab = lastTab || 'agenda'
  return { tab, href: tabHref(tab), label: TAB_LABELS[tab] }
}

// A folha com alterações regista-se aqui: o "voltar" do browser pergunta antes de fechar.
// registerSheetGuard({ active: () => bool, ask: () => void, confirm?: () => Promise<bool> }) → função para remover
// confirm: pergunta e responde (sem fechar) — usado quando outra folha a vai substituir
export function registerSheetGuard(g) {
  guard = g
  return () => { if (guard === g) guard = null }
}

// confirmações abertas (ConfirmDialog regista o seu "Cancelar" aqui): o voltar do browser cancela a de cima
const confirmStack = []
export function registerConfirmCancel(fn) {
  confirmStack.push(fn)
  return () => { const i = confirmStack.lastIndexOf(fn); if (i >= 0) confirmStack.splice(i, 1) }
}

// atalhos de teclado (N, /): o Shell com sessão liga-os ao montar e desliga-os ao desmontar
export function enableShortcuts() {
  shortcuts = true
  return () => { shortcuts = false }
}

// href de uma rota (para <a>): routeHref('#/receber/atraso')
export const routeHref = (to) => normHash(to)

// arranca já (antes do primeiro render): repõe a última rota e tira folhas do URL
start()
