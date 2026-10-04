// Localizações (Local dos eventos → coordenadas para o mapa). Pesquisa no Photon (OpenStreetMap,
// gratuito, aceita pedidos do browser e pesquisa enquanto se escreve), com as sugestões puxadas para
// o Algarve. Devolve [{ label, lat, lng }]; nunca lança — sem rede, sem sugestões.
const PHOTON = 'https://photon.komoot.io/api/'
const BIAS = { lat: 37.1, lon: -8.2 } // Algarve

// o último pedido falhou (sem rede, serviço em baixo, limite de pedidos) — não é "não existe"
export const geoNet = { failed: false }

const uniq = (xs) => xs.filter((x, i) => x && xs.indexOf(x) === i)

// "Hotel Vila Joya, Albufeira" · "Rua de Santo António 12, Faro" · "Almancil, Loulé"
export function placeLabel(p = {}) {
  const street = p.street ? [p.street, p.housenumber].filter(Boolean).join(' ') : null
  const place = p.city || p.town || p.village || p.district || p.county
  const parts = uniq([p.name || street, place])
  if (parts.length < 2 && p.county) parts.push(p.county)
  if (p.countrycode && p.countrycode !== 'PT' && p.country) parts.push(p.country)
  return uniq(parts).join(', ')
}

export async function searchPlaces(q, { signal, limit = 5 } = {}) {
  const text = String(q || '').trim()
  if (text.length < 3) return []
  const url = `${PHOTON}?q=${encodeURIComponent(text)}&limit=${limit}&lat=${BIAS.lat}&lon=${BIAS.lon}`
  try {
    geoNet.failed = false
    const res = await fetch(url, { signal })
    if (!res.ok) { geoNet.failed = true; return [] }
    const data = await res.json()
    const seen = new Set()
    return (data.features || []).map((f) => ({
      label: placeLabel(f.properties),
      lng: f.geometry?.coordinates?.[0],
      lat: f.geometry?.coordinates?.[1],
    })).filter((r) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lng) && !seen.has(r.label) && seen.add(r.label))
  } catch {
    geoNet.failed = !signal?.aborted
    return []
  }
}

// o melhor resultado para um texto livre (local do Google, eventos antigos); null se nada
export async function geocode(q, { timeout = 4000 } = {}) {
  const ctl = new AbortController()
  let late = false
  const t = setTimeout(() => { late = true; ctl.abort() }, timeout)
  try {
    const r = (await searchPlaces(q, { signal: ctl.signal, limit: 1 }))[0] || null
    if (late) geoNet.failed = true // demorou demais: não quer dizer que não exista
    return r
  } finally {
    clearTimeout(t)
  }
}

// link do Google Maps ou coordenadas escritas: "…/@37.0911,-8.2449,15z" · "?q=37.09,-8.24" · "37.09, -8.24"
export function coordsFromText(s) {
  const m = String(s || '').match(/(?:@|[?&](?:q|query|ll)=|^\s*)(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/)
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
}

// ---- local a partir do título ("Ovar 90", "Casamento em Tavira", "Noiva Almancil") ----
const PT_BBOX = '-9.6,36.9,-6.1,42.2' // Portugal continental
const PLACE_RANK = { city: 0, town: 1, village: 2, suburb: 3, locality: 4, hamlet: 5 }
// palavras que nunca são o sítio (tipo de evento, ligações, nomes que se repetem nos títulos)
const NOT_PLACE = new Set(`
  a o as os de da do das dos e em no na nos nas com c para p por ao aos à às
  casamento casamentos noiva noivas noivo batizado batismo aniversario festa festas jantar almoco concerto
  concertos espetaculo show evento gig ensaio aula canto penteado penteados maquilhagem prova cabelo cabelos
  party welcome wedding bride dj banda musica musical live acustico duo trio set sunset private privado
`.split(/\s+/).filter(Boolean))
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const wordsOf = (s) => fold(s).split(/[^a-z0-9]+/).filter(Boolean)

// texto do título que pode ser um sítio: sem números, ligações, tipos de evento nem nomes de projetos
export function placeQuery(title, skip = []) {
  const no = new Set([...NOT_PLACE, ...skip.flatMap(wordsOf)])
  return wordsOf(title).filter((w) => w.length > 2 && !/\d/.test(w) && !no.has(w)).join(' ')
}
// para bares, hotéis, restaurantes… ("Pátio do Sol 21h"): como acima, mas com as ligações (do, da…)
const LINKS = new Set('a o as os de da do das dos e em no na nos nas'.split(' '))
function venueQuery(title, skip = []) {
  const no = new Set([...NOT_PLACE, ...skip.flatMap(wordsOf)])
  const ws = wordsOf(title).filter((w) => !/\d/.test(w) && (LINKS.has(w) || (w.length > 2 && !no.has(w))))
  while (ws.length && LINKS.has(ws[0])) ws.shift() // sem ligações soltas no início ou no fim
  while (ws.length && LINKS.has(ws[ws.length - 1])) ws.pop()
  return ws.join(' ')
}

const sig = (s) => wordsOf(s).filter((w) => w.length > 2)
const inTitle = (have, name) => have.includes(` ${wordsOf(name).join(' ')} `)
const hitOf = (f) => ({ label: placeLabel(f.properties), lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] })

async function photon(params, signal) {
  geoNet.failed = false
  const res = await fetch(`${PHOTON}?${params}&bbox=${PT_BBOX}&lat=${BIAS.lat}&lon=${BIAS.lon}`, { signal })
  if (!res.ok) { geoNet.failed = true; return [] }
  return (await res.json()).features || []
}

// sítio cujo nome está no título → { label, lat, lng } | null. Primeiro um estabelecimento com nome de
// 2+ palavras ("Pátio do Sol, Lagos"), depois uma localidade ("Ovar"). O nome tem de estar mesmo no título.
export async function placeFromTitle(title, { skip = [], signal } = {}) {
  const have = ` ${wordsOf(title).join(' ')} `
  try {
    const vq = venueQuery(title, skip)
    if (sig(vq).length >= 2) {
      const venue = (await photon(`q=${encodeURIComponent(vq)}&limit=8`, signal))
        .find((f) => f.properties?.name && !['place', 'highway', 'boundary'].includes(f.properties.osm_key)
          && sig(f.properties.name).length >= 2 && inTitle(have, f.properties.name))
      if (venue) return hitOf(venue)
      if (geoNet.failed) return null
    }
    const q = placeQuery(title, skip)
    if (q.length < 3) return null
    const town = (await photon(`q=${encodeURIComponent(q)}&limit=8&osm_tag=place`, signal))
      .filter((f) => f.properties?.name && inTitle(have, f.properties.name))
      .sort((a, b) => (PLACE_RANK[a.properties.osm_value] ?? 9) - (PLACE_RANK[b.properties.osm_value] ?? 9))[0]
    return town ? hitOf(town) : null
  } catch {
    geoNet.failed = !signal?.aborted
    return null
  }
}

// ---- locais que a Joana já usou (aprendidos dos próprios eventos) ----
// "Pátio do Sol, Fábrica da Pólvora" ensina "Pátio do Sol": um título com esse nome reutiliza o mesmo
// local e coordenadas, antes de procurar fora. → [{ name: palavras, label, lat, lng }] (nomes mais longos primeiro)
export function knownPlacesOf(events) {
  const byName = new Map()
  for (const e of events) {
    if (e.lat == null || e.lng == null || !e.location?.trim()) continue
    const name = wordsOf(e.location.split(',')[0]).join(' ')
    if (name.length < 4 || byName.has(name)) continue
    byName.set(name, { name, label: e.location.trim(), lat: Number(e.lat), lng: Number(e.lng) })
  }
  return [...byName.values()].sort((a, b) => b.name.length - a.name.length)
}
export function knownPlaceInTitle(title, known) {
  const have = ` ${wordsOf(title).join(' ')} `
  const k = known.find((p) => have.includes(` ${p.name} `))
  return k ? { label: k.label, lat: k.lat, lng: k.lng } : null
}

export const hasCoords = (ev) => ev?.lat != null && ev?.lng != null
