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

// Chave de um evento do Google (gcal_key na base de dados, rota s=registar:<key>, ignorados):
//   calendário|dia|hora|uid           — evento simples
//   calendário|dia|hora|uid|r:<dia>   — ocorrência de uma série (dia ORIGINAL da ocorrência)
// O dia e a hora na chave são os que a app viu no Google da última vez: se o Google mudar, a chave do
// feed deixa de bater com a do evento e a app sabe que foi o Google (não a Joana) que mudou.
// A identidade (gid = calendário|uid|dia original) não muda quando o evento muda de dia ou de hora.
export const googleKey = (g) => [g.calendar_id || '', g.date, g.time || '', g.uid || g.title].join('|') + (g.recur ? `|r:${g.recur}` : '')
export const legacyKey = (g) => [g.calendar_id || '', g.date, g.time || '', g.uid || g.title].join('|') // formato antigo (séries sem r:)
export function parseKey(key) {
  const [cal = '', date = '', time = '', uid = '', r = ''] = String(key || '').split('|')
  return { cal, date, time, uid, recur: r.startsWith('r:') ? r.slice(2) : '' }
}
// "Este e os seguintes" no Google parte a série num UID novo <uid>_R<data>: continua a ser o mesmo evento
const baseUid = (uid) => String(uid || '').replace(/_R\d{8}(T\d{6}Z?)?(?=@|$)/, '')
// identidade de uma ocorrência do feed: calendário|uid|dia original; sem uid não há identidade (a chave toda)
export const gidOf = (g) => (g.uid ? `${g.calendar_id || ''}|${baseUid(g.uid)}|${g.recur || ''}` : `key|${googleKey(g)}`)
// identidades possíveis de uma chave guardada, por ordem. Numa chave antiga (sem r:) não se sabe se era um
// evento simples ou uma ocorrência de série: nesse caso o dia da chave é o dia original da ocorrência.
export function gidsOfKey(key) {
  const k = parseKey(key)
  const id = `${k.cal}|${baseUid(k.uid)}`
  return k.recur ? [`${id}|${k.recur}`, `key|${key}`] : [`${id}|`, `${id}|${k.date}`, `key|${key}`]
}
export const gidOfKey = (key) => gidsOfKey(key)[0]
// (g) => o evento do Google tem uma destas chaves (ligadas ou ignoradas): pela chave, pela chave antiga ou
// pela identidade — continua de fora depois de mudar de dia ou de hora no Google
export function skipByKeys(keys) {
  const set = new Set(keys)
  const gids = new Set([...set].flatMap(gidsOfKey))
  return (g) => set.has(g.key || googleKey(g)) || set.has(legacyKey(g)) || gids.has(gidOf(g))
}

const ascKey = (x) => `${x.date} ${x.time || '99:99'}`

// events: eventos da app; googleEvents: [{date, time, title, location, project_id, calendar_id, uid}]
// ignored: chaves que a Joana mandou ignorar (Set) ou uma função (g) => boolean — saem dos pendentes,
// tal como os que não são trabalho
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
    .filter((g) => !isNotWork(g.title) && !(typeof ignored === 'function' ? ignored(g) : ignored?.has(g.key)))
    .sort((a, b) => ascKey(a).localeCompare(ascKey(b)))
  const byDay = new Map()
  for (const g of out) {
    if (!byDay.has(g.date)) byDay.set(g.date, [])
    byDay.get(g.date).push(g)
  }
  return { pending: out, byDay, matched }
}

// Sincronização dos eventos que vieram do Google (gcal_key) com o feed atual. Cada evento encontra a sua
// ocorrência no feed pela identidade (calendário|uid|dia original), que não muda quando o evento muda de dia
// ou de hora no Google:
//   moves  — o Google mudou o dia/hora (o feed já não bate com a chave): o evento da app vai atrás.
//            Se foi a Joana a mudar o dia na app, a chave continua a bater com o Google e nada acontece.
//            Nunca com um feed mais antigo do que o evento (updated_at > leitura): espera pela próxima.
//   relink — a app já mostra o dia e a hora do Google, só a chave está desatualizada: atualiza a chave, sem aviso.
//   gone   — a ocorrência já não está no feed (apagada ou cancelada), ou outro evento da app já está ligado a
//            ela (duplicado antigo): "Já não está no Google" (Apagar ou Manter). Só para eventos criados antes
//            da leitura do feed (um evento importado noutro aparelho com um feed mais novo espera).
// okCalendars: Map calendário → hora da última leitura sem erro (calendários com erro ficam de fora).
// Mudanças de dia de uma série inteira (sexta → sábado) mudam o dia original das ocorrências: as antigas ficam
// "Já não está no Google" e as novas entram como eventos novos.
const hmOf = (t) => (t ? String(t).slice(0, 5) : '')
export function gcalSyncPlan(events, feed, okCalendars) {
  const byGid = new Map()
  const byKey = new Map()
  for (const g of feed) {
    const x = { ...g, key: googleKey(g) }
    const gid = gidOf(g)
    if (!byGid.has(gid)) byGid.set(gid, x)
    byKey.set(x.key, x)
  }
  const linked = events.filter((e) => e.gcal_key)
  const owner = new Map() // chave do feed → evento da app que a tem tal e qual
  for (const e of linked) if (byKey.has(e.gcal_key) && !owner.has(e.gcal_key)) owner.set(e.gcal_key, e.id)
  const taken = new Set(owner.keys())
  const moves = []
  const relink = []
  const gone = []
  for (const e of linked) {
    if (owner.get(e.gcal_key) === e.id) continue // em dia com o Google
    const k = parseKey(e.gcal_key)
    const readAt = okCalendars.get(k.cal)
    if (!readAt) continue
    let g = null
    for (const gid of gidsOfKey(e.gcal_key)) {
      const c = byGid.get(gid)
      if (c && !taken.has(c.key)) { g = c; break }
    }
    // série que passou a evento simples no Google: o evento simples com o mesmo uid
    if (!g && k.recur) {
      const c = byGid.get(`${k.cal}|${baseUid(k.uid)}|`)
      if (c && !taken.has(c.key)) g = c
    }
    if (g) {
      taken.add(g.key)
      if (e.event_date === g.date && hmOf(e.start_time) === (g.time || '')) relink.push({ event: e, to: g })
      else if (!(e.updated_at && e.updated_at > readAt)) moves.push({ event: e, to: g })
      continue
    }
    if (e.created_at && e.created_at > readAt) continue
    gone.push(e)
  }
  return { moves, relink, gone }
}
