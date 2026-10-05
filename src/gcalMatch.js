import { foldText } from './format.js'

// Deduplicação do Google (spec §14.3) — uma só implementação, usada pela Lista, Mês,
// Receber e A tratar. Para cada (projeto, dia):
//   1) hora    — |hora do Google − start_time| ≤ 30 min, 1:1 (o mais próximo);
//   2) título  — ≥ 2 palavras de > 2 letras em comum, sem acentos, 1:1 — ou títulos iguais, ou todas
//      as palavras do mais curto no outro ("Ensaio" ↔ "Ensaio", "Concerto" ↔ "Concerto de Natal");
//   3) contagem — cada evento da app ainda livre esconde no máximo UM do Google
//      em que falte a hora de um dos lados.
// O que sobra fica "por registar". Registar a partir do Google copia a hora → emparelha no passo 1.

const TOLERANCE_MIN = 30

const hm = (t) => (t ? String(t).slice(0, 5) : null)
const minutesOf = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const words = (s) => new Set(foldText(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2))

const norm = (s) => foldText(s).split(/[^a-z0-9]+/).filter(Boolean).join(' ')

export function similarTitles(a, b) {
  if (norm(a) && norm(a) === norm(b)) return true
  const A = words(a)
  const B = words(b)
  let n = 0
  for (const w of A) if (B.has(w)) n++
  if (n >= 2) return true
  // título curto (uma palavra, ex.: "Ensaio") contido no outro
  const [short, long] = A.size <= B.size ? [A, B] : [B, A]
  return short.size > 0 && n === short.size
}

// Não é trabalho (ensaios, aulas de canto): nunca fica "por registar"
const NOT_WORK = [/\bensaios?\b/, /\baulas? de canto\b/]
export const isNotWork = (title) => NOT_WORK.some((re) => re.test(norm(title)))

// chave estável de um evento do Google (rota s=registar:<key>)
export const googleKey = (g) => [g.calendar_id || '', g.date, g.time || '', g.uid || g.title].join('|')

const ascKey = (x) => `${x.date} ${x.time || '99:99'}`

// events: eventos da app; googleEvents: [{date, time, title, location, project_id, calendar_id, uid}]
// ignored: chaves que a Joana mandou ignorar (Set) — saem dos pendentes, tal como os que não são trabalho
// → { pending (ordenados por data+hora, com key), byDay: Map ymd → pending[], matched: [{ g, event, by }] }
export function matchGoogle(events, googleEvents, ignored = null) {
  const appsBy = new Map()
  for (const e of events) {
    const k = `${e.project_id}|${e.event_date}`
    if (!appsBy.has(k)) appsBy.set(k, [])
    appsBy.get(k).push(e)
  }
  const googleBy = new Map()
  for (const g of googleEvents) {
    const k = `${g.project_id}|${g.date}`
    if (!googleBy.has(k)) googleBy.set(k, [])
    googleBy.get(k).push(g)
  }

  const pending = []
  const matched = []
  for (const [k, gs] of googleBy) {
    const apps = (appsBy.get(k) || []).map((e) => ({ e, t: hm(e.start_time), used: false }))
    if (!apps.length) { pending.push(...gs); continue }
    const ordered = gs.slice().sort((a, b) => ascKey(a).localeCompare(ascKey(b)))

    // 1) hora
    const left = []
    for (const g of ordered) {
      let best = null
      let bestDiff = TOLERANCE_MIN + 1
      if (g.time) {
        for (const a of apps) {
          if (a.used || !a.t) continue
          const diff = Math.abs(minutesOf(a.t) - minutesOf(g.time))
          if (diff < bestDiff) { best = a; bestDiff = diff }
        }
      }
      if (best) { best.used = true; matched.push({ g, event: best.e, by: 'hora' }) } else left.push(g)
    }

    // 2) título semelhante
    const left2 = []
    for (const g of left) {
      const a = apps.find((x) => !x.used && similarTitles(x.e.title, g.title))
      if (a) { a.used = true; matched.push({ g, event: a.e, by: 'titulo' }) } else left2.push(g)
    }

    // 3) contagem: só quando falta a hora de um dos lados
    for (const g of left2) {
      const a = apps.find((x) => !x.used && (!x.t || !g.time))
      if (a) { a.used = true; matched.push({ g, event: a.e, by: 'contagem' }) } else pending.push(g)
    }
  }

  // a mesma ocorrência repetida no feed (mesma chave) conta uma vez só
  const seen = new Set()
  const out = pending
    .map((g) => (g.key ? g : { ...g, key: googleKey(g) }))
    .filter((g) => !seen.has(g.key) && seen.add(g.key))
    .filter((g) => !isNotWork(g.title) && !ignored?.has(g.key))
    .sort((a, b) => ascKey(a).localeCompare(ascKey(b)))
  const byDay = new Map()
  for (const g of out) {
    if (!byDay.has(g.date)) byDay.set(g.date, [])
    byDay.get(g.date).push(g)
  }
  return { pending: out, byDay, matched }
}

// Eventos que vieram do Google (gcal_key) e já não estão no feed com essa chave. A chave inclui o dia e a
// hora, por isso uma mudança de dia/hora no Google aparece como "chave nova" + "chave antiga em falta":
//   moves — o mesmo evento do Google (mesmo calendário e uid) ainda está no feed, numa só ocorrência
//           que nenhum evento da app usa: o evento da app vai atrás (data, hora e chave novas);
//   gone  — não há para onde ir: "Já não está no Google" (a Joana escolhe Apagar ou Manter).
// Só se olha para calendários lidos sem erro (okCalendars), para nunca tomar uma falha de rede por um apagão.
// events: eventos da app (com gcal_key); feed: [{ calendar_id, date, time, uid, title }] de todo o feed;
// from: só ocorrências a partir deste dia contam como destino (as de séries antigas nunca foram importadas);
// skip: chaves ignoradas pela Joana (nunca são destino)
export function gcalSyncPlan(events, feed, okCalendars, { from = '', skip = null } = {}) {
  const feedKeys = new Set()
  const byUid = new Map() // calendar|uid → ocorrências
  for (const g of feed) {
    const key = googleKey(g)
    feedKeys.add(key)
    if (!g.uid) continue
    const k = `${g.calendar_id}|${g.uid}`
    if (!byUid.has(k)) byUid.set(k, [])
    byUid.get(k).push({ ...g, key })
  }
  const linked = new Set(events.map((e) => e.gcal_key).filter(Boolean))
  const moves = []
  const gone = []
  for (const e of events) {
    if (!e.gcal_key || feedKeys.has(e.gcal_key)) continue
    const [cal, , , uid] = e.gcal_key.split('|')
    if (!okCalendars.has(cal)) continue
    const free = uid
      ? (byUid.get(`${cal}|${uid}`) || []).filter((g) => !linked.has(g.key) && g.date >= from && !skip?.has(g.key) && !isNotWork(g.title))
      : []
    // uma só ocorrência livre desse evento do Google: foi para lá; nenhuma ou várias: desapareceu (a Joana decide)
    if (free.length === 1) {
      moves.push({ event: e, to: free[0] })
      linked.add(free[0].key)
    } else gone.push(e)
  }
  return { moves, gone }
}
