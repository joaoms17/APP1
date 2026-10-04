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

// localidade portuguesa cujo nome está no título → { label, lat, lng } | null
export async function placeFromTitle(title, { skip = [], signal } = {}) {
  const q = placeQuery(title, skip)
  if (q.length < 3) return null
  const have = ` ${wordsOf(title).join(' ')} `
  try {
    geoNet.failed = false
    const res = await fetch(`${PHOTON}?q=${encodeURIComponent(q)}&limit=8&osm_tag=place&bbox=${PT_BBOX}`, { signal })
    if (!res.ok) { geoNet.failed = true; return null }
    const data = await res.json()
    const hit = (data.features || [])
      .filter((f) => f.properties?.name && have.includes(` ${wordsOf(f.properties.name).join(' ')} `))
      .sort((a, b) => (PLACE_RANK[a.properties.osm_value] ?? 9) - (PLACE_RANK[b.properties.osm_value] ?? 9))[0]
    if (!hit) return null
    const [lng, lat] = hit.geometry.coordinates
    return { label: placeLabel(hit.properties), lat, lng }
  } catch {
    geoNet.failed = !signal?.aborted
    return null
  }
}

export const hasCoords = (ev) => ev?.lat != null && ev?.lng != null
