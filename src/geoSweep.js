import { coordsFromText, geoNet, geocode, hasCoords, placeFromTitle } from './geo.js'

// Varrimento dos locais (corre sozinho depois de a app abrir, uma vez por sessão):
//   · com local mas sem coordenadas → procura o local;
//   · sem local → tira a localidade do título ("Ovar 90" → Ovar) e grava local + coordenadas.
// Um pedido de cada vez, com pausa (o serviço do mapa é gratuito: sem rajadas). O que não se encontrou
// fica guardado neste aparelho para não voltar a ser procurado em cada arranque.
const K_MISS = 'duet.geoMiss'
const PAUSE_MS = 1100
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function loadMiss() {
  try { return new Set(JSON.parse(localStorage.getItem(K_MISS)) || []) } catch { return new Set() }
}
function saveMiss(set) {
  try { localStorage.setItem(K_MISS, JSON.stringify([...set].slice(-2000))) } catch { /* sem armazenamento */ }
}

// o que há para procurar: [{ key, ids, tries }] (eventos mais recentes primeiro). tries = o que tentar,
// por ordem: { local } procura um local escrito; { titulo } tira a localidade de um título.
// Sem local, primeiro o evento do Google do mesmo dia e projeto (hints: id → g): o local dele, depois o
// título dele; por fim o título do próprio evento.
export function sweepPlan(events, hints = new Map(), miss = loadMiss()) {
  const groups = new Map()
  for (const e of events) {
    if (hasCoords(e)) continue
    const loc = e.location?.trim()
    const g = loc ? null : hints.get(e.id)
    const tries = loc ? [{ local: loc }]
      : [g?.location?.trim() && { local: g.location.trim() }, g?.title && { titulo: g.title }, e.title?.trim() && { titulo: e.title.trim() }]
        .filter(Boolean)
    if (!tries.length) continue
    const key = tries.map((t) => (t.local ? `L:${t.local}` : `T:${t.titulo}`)).join(' / ')
    if (miss.has(key)) continue
    if (!groups.has(key)) groups.set(key, { key, ids: [], tries, hasLoc: !!loc })
    groups.get(key).ids.push(e.id)
  }
  return [...groups.values()]
}

// um local escrito → { lat, lng, location? } (o nome arrumado só quando o texto era um link)
async function locate(text) {
  const c = coordsFromText(text)
  if (c) return { ...c, quick: true }
  const r = await geocode(text)
  return r ? { lat: r.lat, lng: r.lng, label: r.label } : null
}

// save(ids, { lat, lng, location? }) grava; onProgress({ done, total, found }); stopped() pára entre pedidos
export async function sweepLocations(events, { hints, projectNames = [], save, onProgress, stopped = () => false }) {
  const miss = loadMiss()
  const plan = sweepPlan(events, hints, miss)
  let found = 0
  onProgress?.({ done: 0, total: plan.length, found })
  for (let i = 0; i < plan.length; i++) {
    if (stopped()) return
    const g = plan[i]
    let patch = null
    let netFail = false
    let quick = true
    for (const t of g.tries) {
      if (t.local) {
        const r = await locate(t.local)
        quick = quick && !!r?.quick
        // o local escrito fica como está; vindo do Google, fica o texto do Google (ou o nome, se era um link)
        if (r) patch = { lat: r.lat, lng: r.lng, ...(g.hasLoc ? {} : { location: /^https?:/i.test(t.local) && r.label ? r.label : t.local }) }
      } else {
        quick = false
        const r = await placeFromTitle(t.titulo, { skip: projectNames })
        if (r) patch = { lat: r.lat, lng: r.lng, location: r.label }
      }
      if (patch) break
      if (geoNet.failed) { netFail = true; break }
      if (!quick) await wait(PAUSE_MS)
    }
    if (stopped()) return
    if (netFail) return // sem rede ou serviço em baixo: tenta-se na próxima sessão
    if (patch) {
      try {
        await save(g.ids, patch)
        found += g.ids.length
      } catch { /* fica para a próxima sessão */ }
    } else {
      miss.add(g.key)
      saveMiss(miss)
    }
    onProgress?.({ done: i + 1, total: plan.length, found })
    if (!quick) await wait(PAUSE_MS)
  }
}
