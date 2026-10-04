// Localizações (Local dos eventos → coordenadas para o mapa). Pesquisa no Photon (OpenStreetMap,
// gratuito, aceita pedidos do browser e pesquisa enquanto se escreve), com as sugestões puxadas para
// o Algarve. Devolve [{ label, lat, lng }]; nunca lança — sem rede, sem sugestões.
const PHOTON = 'https://photon.komoot.io/api/'
const BIAS = { lat: 37.1, lon: -8.2 } // Algarve

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
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const data = await res.json()
    const seen = new Set()
    return (data.features || []).map((f) => ({
      label: placeLabel(f.properties),
      lng: f.geometry?.coordinates?.[0],
      lat: f.geometry?.coordinates?.[1],
    })).filter((r) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lng) && !seen.has(r.label) && seen.add(r.label))
  } catch {
    return []
  }
}

// o melhor resultado para um texto livre (local do Google, eventos antigos); null se nada
export async function geocode(q, { timeout = 4000 } = {}) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeout)
  try {
    return (await searchPlaces(q, { signal: ctl.signal, limit: 1 }))[0] || null
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

export const hasCoords = (ev) => ev?.lat != null && ev?.lng != null
