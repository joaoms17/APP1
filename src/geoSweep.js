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

// o que há para procurar: [{ key, ids, kind: 'local'|'titulo', text }] (eventos mais recentes primeiro)
export function sweepPlan(events, miss = loadMiss()) {
  const groups = new Map()
  for (const e of events) {
    if (hasCoords(e)) continue
    const loc = e.location?.trim()
    const key = loc ? `L:${loc}` : e.title?.trim() ? `T:${e.title.trim()}` : null
    if (!key || miss.has(key)) continue
    if (!groups.has(key)) groups.set(key, { key, ids: [], kind: loc ? 'local' : 'titulo', text: loc || e.title.trim() })
    groups.get(key).ids.push(e.id)
  }
  return [...groups.values()]
}

// save(ids, { lat, lng, location? }) grava; onProgress({ done, total, found }); stopped() pára entre pedidos
export async function sweepLocations(events, { projectNames = [], save, onProgress, stopped = () => false }) {
  const miss = loadMiss()
  const plan = sweepPlan(events, miss)
  let found = 0
  onProgress?.({ done: 0, total: plan.length, found })
  for (let i = 0; i < plan.length; i++) {
    if (stopped()) return
    const g = plan[i]
    let patch = null
    const fromLink = g.kind === 'local' ? coordsFromText(g.text) : null
    if (fromLink) patch = fromLink
    else if (g.kind === 'local') patch = await geocode(g.text)
    else {
      const r = await placeFromTitle(g.text, { skip: projectNames })
      if (r) patch = { lat: r.lat, lng: r.lng, location: r.label }
    }
    if (stopped()) return
    if (!patch && geoNet.failed) return // sem rede ou serviço em baixo: tenta-se na próxima sessão
    if (patch) {
      try {
        await save(g.ids, { lat: patch.lat, lng: patch.lng, ...(patch.location ? { location: patch.location } : {}) })
        found += g.ids.length
      } catch { /* fica para a próxima sessão */ }
    } else {
      miss.add(g.key)
      saveMiss(miss)
    }
    onProgress?.({ done: i + 1, total: plan.length, found })
    if (!fromLink) await wait(PAUSE_MS)
  }
}
