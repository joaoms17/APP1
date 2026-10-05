// Seletores puros da v2 (spec §9.1, §14.2–14.3; plano §F.4). Sem React: o store usa-os
// com useMemo e scripts/check-selectors.mjs confirma os números das fixtures em Node.
// Convenções: today = 'yyyy-mm-dd'; pbe = Map event_id → pagamentos (paymentsByEvent do store).
import { addDays, daysBetween, foldText } from './format.js'
import { isNotWork, matchGoogle } from './gcalMatch.js'

export { isNotWork, matchGoogle }

const EPS = 0.005
const num = (v) => Number(v) || 0
const cents = (n) => Math.round(n * 100) / 100 // totais sem ruído de vírgula flutuante
const sumBy = (xs, f) => cents(xs.reduce((a, x) => a + f(x), 0))
const timeKey = (e) => (e.start_time ? String(e.start_time).slice(0, 5) : '99:99') // sem hora → fim do dia
const yearOf = (ymd) => Number(String(ymd).slice(0, 4))
const monthOf = (ymd) => Number(String(ymd).slice(5, 7)) - 1

// payments → Map event_id → [pagamentos] (o store já o tem; útil fora do React)
export function paymentsByEventOf(payments) {
  const m = new Map()
  for (const p of payments || []) {
    if (!m.has(p.event_id)) m.set(p.event_id, [])
    m.get(p.event_id).push(p)
  }
  return m
}

// ---------- pagamento e estado (spec §9.1) --------------------------------
// recebido até agora: soma dos pagamentos; eventos antigos sem pagamentos
// registados contam pelo flag paid (mesma regra da v1)
export const paidAmountOf = (ev, pbe) => {
  const ps = pbe?.get(ev.id)
  if (ps && ps.length) return ps.reduce((a, p) => a + num(p.amount), 0)
  return ev.paid ? num(ev.value) : 0
}

export const missingOf = (ev, pbe) => Math.max(0, num(ev.value) - paidAmountOf(ev, pbe))

// sem valor ainda (0 €, sem pagamentos nem marcado como recebido): não é "Recebido" — falta pôr o valor
export const noValueOf = (ev, pbe) => num(ev.value) <= EPS && !ev.paid && !(pbe?.get(ev.id)?.length)

// 'novalue' | 'paid' | 'partial' | 'due' | 'overdue' | 'partial-overdue' — o evento de hoje NÃO está em atraso.
// Recebido = não falta nada (spec §9.1). O flag paid só conta sem pagamentos (legado, via
// paidAmountOf): com pagamentos manda a soma, mesmo que o flag tenha ficado desatualizado.
// Um evento de 0 € não tem nada a receber (nunca fica "Em atraso").
export const eventStateOf = (ev, pbe, today) => {
  if (noValueOf(ev, pbe)) return 'novalue'
  const got = paidAmountOf(ev, pbe)
  const total = num(ev.value)
  if (got >= total - EPS) return 'paid'
  const past = ev.event_date < today
  if (got > EPS) return past ? 'partial-overdue' : 'partial'
  return past ? 'overdue' : 'due'
}

// data em que ficou recebido: último pagamento, senão paid_at (legado), senão o dia do evento
export const receivedOnOf = (ev, pbe) => {
  const ps = pbe?.get(ev.id)
  const last = ps && ps.length ? ps.map((p) => p.paid_at).filter(Boolean).sort().pop() : null
  return last || ev.paid_at || ev.event_date
}

// ---------- ordem -----------------------------------------------------------
// data + hora em todas as listas (sem hora → fim do dia)
export const compareAsc = (a, b) =>
  a.event_date < b.event_date ? -1 : a.event_date > b.event_date ? 1 : timeKey(a).localeCompare(timeKey(b))
export const sortAsc = (events) => events.slice().sort(compareAsc)
export const sortDesc = (events) => events.slice().sort((a, b) => compareAsc(b, a))

// ---------- dinheiro (spec §14.2) ------------------------------------------
// Em atraso = já realizado com valor em falta; A receber = hoje ou futuro com valor em falta;
// Sinais = recebido em eventos ainda por fechar.
export function receivablesOf(events, pbe, today) {
  const overdue = []
  const upcoming = []
  let overdueTotal = 0, upcomingTotal = 0, depositsTotal = 0, depositsCount = 0
  for (const e of events) {
    const miss = missingOf(e, pbe)
    if (miss <= EPS) continue
    if (e.event_date < today) { overdue.push(e); overdueTotal += miss } else { upcoming.push(e); upcomingTotal += miss }
    const got = paidAmountOf(e, pbe)
    if (got > EPS) { depositsTotal += got; depositsCount++ }
  }
  overdue.sort(compareAsc)
  upcoming.sort(compareAsc)
  return {
    overdue, upcoming,
    overdueTotal: cents(overdueTotal), upcomingTotal: cents(upcomingTotal),
    depositsTotal: cents(depositsTotal), depositsCount,
    oldestDate: overdue.length ? overdue[0].event_date : null,
  }
}

// antiguidade do Em atraso (Receber): só devolve os grupos com eventos, do mais antigo para o mais recente
const AGING = [
  { key: 'gt90', label: 'Há mais de 3 meses', test: (d) => d > 90 },
  { key: 'd31to90', label: 'Entre 1 e 3 meses', test: (d) => d > 30 && d <= 90 },
  { key: 'le30', label: 'Últimos 30 dias', test: (d) => d <= 30 },
]
export function agingGroups(overdue, today, pbe) {
  return AGING
    .map(({ key, label, test }) => {
      const events = overdue.filter((e) => test(daysBetween(e.event_date, today)))
      return { key, label, events, total: sumBy(events, (e) => missingOf(e, pbe)) }
    })
    .filter((g) => g.events.length)
}

// resumo de uma lista de eventos (cabeçalhos de grupo, cartão do mês, pesquisa)
// total = faturado; got = recebido (limitado ao valor de cada evento); missing = o que falta
export function summaryOf(events, pbe) {
  return {
    count: events.length,
    total: sumBy(events, (e) => num(e.value)),
    got: sumBy(events, (e) => Math.min(num(e.value), paidAmountOf(e, pbe))),
    missing: sumBy(events, (e) => missingOf(e, pbe)),
  }
}

// ---------- Google (spec §14.3) --------------------------------------------
export const googlePendingOf = (pending, today) => ({
  past: pending.filter((g) => g.date < today),
  upcoming: pending.filter((g) => g.date >= today),
})

// ---------- pesquisa (spec §10.4): sem acentos, em título, local e notas ----
// cada palavra da pesquisa tem de aparecer em algum dos campos ("figuras faro", "noiva almancil")
const matchesAll = (fields, q) => {
  const words = foldText(q).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const text = fields.map((s) => foldText(s)).join(' \n ')
  return words.every((w) => text.includes(w))
}
export const eventMatches = (ev, q) => matchesAll([ev.title, ev.location, ev.notes], q)
export const googleMatches = (g, q) => matchesAll([g.title, g.location], q)

// ---------- projetos e categorias ------------------------------------------
// projeto escolhível num ano: ativo e dentro do período (mesma regra da v1)
export const isProjectActive = (p, year) =>
  p.active !== false
  && (p.active_from == null || p.active_from <= year)
  && (p.active_to == null || p.active_to >= year)

// chips do formulário: ativos (+ o atual), o último usado primeiro, depois os mais usados
// nos últimos 180 dias, depois a ordem do projeto
export function projectsByUsage(projects, events, today, lastId, currentId) {
  const year = yearOf(today)
  const from = addDays(today, -180)
  const uses = new Map()
  for (const e of events) {
    if (e.event_date >= from && e.event_date <= today) uses.set(e.project_id, (uses.get(e.project_id) || 0) + 1)
  }
  return projects
    .filter((p) => isProjectActive(p, year) || p.id === currentId)
    .sort((a, b) =>
      (b.id === lastId) - (a.id === lastId)
      || (uses.get(b.id) || 0) - (uses.get(a.id) || 0)
      || (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

// categorias de despesa já usadas, das mais frequentes para as menos
export function expenseCategoriesOf(expenses) {
  const n = new Map()
  for (const x of expenses) {
    const c = String(x.category || '').trim()
    if (c) n.set(c, (n.get(c) || 0) + 1)
  }
  return [...n.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt'))
    .map(([c]) => c)
}

// ---------- Painel (spec §10.13) -------------------------------------------
// Penteados vs música: projetos do tipo 'hair' contra todos os outros (que são de música).
// Por tipo: receita líquida do ano por mês, nº de eventos, média por evento, parte do total e a
// variação face ao ano anterior — no ano corrente só até ao mesmo dia (como a capa do Painel).
export function kindSplitOf(events, projects, year, today) {
  const kindOf = new Map(projects.map((p) => [p.id, p.kind === 'hair' ? 'hair' : 'music']))
  const cur = yearOf(today) === year
  const md = today.slice(4)
  const mk = (key, label) => ({ key, label, byMonth: Array(12).fill(0), net: 0, count: 0, valued: 0, prevNet: 0, ytd: 0, prevYtd: 0 })
  const k = { hair: mk('hair', 'Penteados'), music: mk('music', 'Música') }
  for (const e of events) {
    const x = k[kindOf.get(e.project_id) || 'music']
    const y = yearOf(e.event_date)
    const v = num(e.value)
    if (y === year) {
      x.byMonth[monthOf(e.event_date)] += v; x.net += v; x.count++
      if (v > EPS) x.valued++
      if (cur && e.event_date <= `${year}${md}`) x.ytd += v
    } else if (y === year - 1) {
      x.prevNet += v
      if (cur && e.event_date <= `${year - 1}${md}`) x.prevYtd += v
    }
  }
  const total = k.hair.net + k.music.net
  const pct = (a, b) => (b ? Math.round(((a - b) / Math.abs(b)) * 100) : null)
  return [k.hair, k.music].map((x) => ({
    key: x.key, label: x.label, count: x.count,
    byMonth: x.byMonth.map(cents), net: cents(x.net), prevNet: cents(x.prevNet),
    share: total > EPS ? x.net / total : 0,
    // média por evento só dos eventos com valor (os "valor pendente" não valem 0 €)
    avg: x.valued ? cents(x.net / x.valued) : null,
    delta: cur ? pct(cents(x.ytd), cents(x.prevYtd)) : pct(cents(x.net), cents(x.prevNet)),
  }))
}

// receita = valor líquido dos eventos do ano (regra da v1); retido = bruto − líquido;
// a média conta só os meses fechados; Em atraso/futuros respeitam o ano escolhido (D19)
export function yearTotals(events, expenses, pbe, year, today) {
  const z = () => Array(12).fill(0)
  const byMonth = { net: z(), netPrev: z(), gross: z(), paid: z(), unpaid: z(), exp: z(), expPrev: z(), saldo: z(), count: z() }
  const byProject = {}
  let overdueYear = 0, upcomingYear = 0, overdueYearCount = 0
  for (const e of events) {
    const y = yearOf(e.event_date)
    const m = monthOf(e.event_date)
    const value = num(e.value)
    if (y === year - 1) byMonth.netPrev[m] += value
    if (y !== year) continue
    const got = paidAmountOf(e, pbe)
    const miss = Math.max(0, value - got)
    byMonth.net[m] += value
    byMonth.gross[m] += num(e.gross_value ?? e.value)
    byMonth.paid[m] += Math.min(value, got)
    byMonth.unpaid[m] += miss
    byMonth.count[m]++
    ;(byProject[e.project_id] ||= z())[m] += value
    if (miss > EPS) {
      if (e.event_date < today) { overdueYear += miss; overdueYearCount++ } else upcomingYear += miss
    }
  }
  for (const x of expenses) {
    const y = yearOf(x.expense_date)
    const m = monthOf(x.expense_date)
    if (y === year) byMonth.exp[m] += num(x.amount)
    else if (y === year - 1) byMonth.expPrev[m] += num(x.amount)
  }
  for (const k of Object.keys(byMonth)) byMonth[k] = byMonth[k].map(cents)
  for (const k of Object.keys(byProject)) byProject[k] = byProject[k].map(cents)
  byMonth.saldo = byMonth.net.map((v, i) => cents(v - byMonth.exp[i]))

  const total = (a) => cents(a.reduce((s, v) => s + v, 0))
  const net = total(byMonth.net), netPrev = total(byMonth.netPrev)
  const gross = total(byMonth.gross)
  const exp = total(byMonth.exp), expPrev = total(byMonth.expPrev)
  const saldo = cents(net - exp), saldoPrev = cents(netPrev - expPrev)
  const pct = (a, b) => (b ? Math.round(((a - b) / Math.abs(b)) * 100) : null)

  const ty = yearOf(today)
  const closedMonths = year < ty ? 12 : year === ty ? monthOf(today) : 0
  const avgClosed = closedMonths ? cents(total(byMonth.net.slice(0, closedMonths)) / closedMonths) : null
  const avgPrev = netPrev > 0 ? cents(netPrev / 12) : null

  // ano corrente: comparação justa com o ano anterior só até ao mesmo dia (o ano completo fica
  // como comparação secundária). Eventos pela data do evento, despesas pela data da despesa.
  let ytd = null
  if (year === ty) {
    const md = today.slice(4) // '-10-01'
    const until = `${year}${md}`, untilPrev = `${year - 1}${md}`
    let n = 0, np = 0, x = 0, xp = 0
    for (const e of events) {
      if (e.event_date >= `${year}-01-01` && e.event_date <= until) n += num(e.value)
      else if (e.event_date >= `${year - 1}-01-01` && e.event_date <= untilPrev) np += num(e.value)
    }
    for (const ex of expenses) {
      if (ex.expense_date >= `${year}-01-01` && ex.expense_date <= until) x += num(ex.amount)
      else if (ex.expense_date >= `${year - 1}-01-01` && ex.expense_date <= untilPrev) xp += num(ex.amount)
    }
    n = cents(n); np = cents(np); x = cents(x); xp = cents(xp)
    const s = cents(n - x), sp = cents(np - xp)
    ytd = {
      until, untilPrev, net: n, netPrev: np, exp: x, expPrev: xp, saldo: s, saldoPrev: sp,
      deltaNet: pct(n, np), deltaExp: pct(x, xp), deltaSaldo: pct(s, sp),
    }
  }

  // melhor mês: maior saldo positivo (um ano só com despesas, ou só com meses em prejuízo,
  // não tem "melhor mês" — R1-64)
  let bestMonth = null
  byMonth.saldo.forEach((v, i) => {
    if (v > 0 && (bestMonth === null || v > byMonth.saldo[bestMonth])) bestMonth = i
  })

  return {
    year, net, gross, retained: cents(gross - net), exp, saldo,
    netPrev, expPrev, saldoPrev,
    deltaNet: pct(net, netPrev), deltaExp: pct(exp, expPrev), deltaSaldo: pct(saldo, saldoPrev),
    ytd,
    overdueYear: cents(overdueYear), overdueYearCount, upcomingYear: cents(upcomingYear),
    closedMonths, avgClosed, avgPrev,
    bestMonth: bestMonth === null ? null : { month: bestMonth, saldo: byMonth.saldo[bestMonth] },
    eventsCount: total(byMonth.count),
    hasData: net > 0 || exp > 0 || byMonth.count.some(Boolean),
    byMonth, byProject,
  }
}

// ---------- por projeto e previsão (Painel) ----------------------------------
// média por evento de cada projeto: eventos com valor nos últimos 12 meses até hoje; sem nenhum,
// todos os eventos com valor. → Map project_id → { avg, n } (só projetos com pelo menos um valor)
export function projectAverages(events, today) {
  const from = `${yearOf(today) - 1}${today.slice(4)}`
  const recent = new Map()
  const all = new Map()
  const add = (m, e) => { const s = m.get(e.project_id) || { sum: 0, n: 0 }; s.sum += num(e.value); s.n++; m.set(e.project_id, s) }
  for (const e of events) {
    if (num(e.value) <= EPS) continue
    add(all, e)
    if (e.event_date >= from && e.event_date <= today) add(recent, e)
  }
  const out = new Map()
  for (const [pid, s] of all) {
    const r = recent.get(pid)
    const use = r && r.n > 0 ? r : s
    out.set(pid, { avg: cents(use.sum / use.n), n: use.n, recent: !!(r && r.n > 0) })
  }
  return out
}

// números de cada projeto num ano. A média e o total só contam eventos com valor (os "valor pendente"
// ficam à parte em pending). Variação: no ano corrente, até hoje vs o ano anterior até ao mesmo dia
// (como a capa e o Penteados vs música); noutros anos, ano inteiro vs ano inteiro.
// → [{ project_id, count, total, valued, avg, pending, prevTotal, prevCount, delta }] ordenado pelo total
export function projectStatsOf(events, year, today, pbe) {
  const cur = yearOf(today) === year
  const md = today.slice(4)
  const m = new Map()
  const get = (pid) => m.get(pid) || m.set(pid, { project_id: pid, count: 0, total: 0, valued: 0, pending: 0, ytd: 0, prevTotal: 0, prevCount: 0 }).get(pid)
  for (const e of events) {
    const y = yearOf(e.event_date)
    const v = num(e.value)
    if (y === year) {
      const s = get(e.project_id)
      s.count++
      if (v > EPS) { s.total += v; s.valued++; if (cur && e.event_date <= today) s.ytd += v } else if (noValueOf(e, pbe)) s.pending++
    } else if (y === year - 1) {
      const s = get(e.project_id)
      s.prevCount++
      if (!cur || e.event_date <= `${year - 1}${md}`) s.prevTotal += v
    }
  }
  const pct = (a, b) => (b > EPS ? Math.round(((a - b) / b) * 100) : null)
  return [...m.values()]
    .filter((s) => s.count > 0)
    .map((s) => ({
      project_id: s.project_id, count: s.count, valued: s.valued, pending: s.pending, prevCount: s.prevCount,
      total: cents(s.total), prevTotal: cents(s.prevTotal),
      avg: s.valued ? cents(s.total / s.valued) : null,
      // sem nenhum valor ainda no ano não há variação a mostrar (não é −100 %)
      delta: s.valued ? pct(cents(cur ? s.ytd : s.total), cents(s.prevTotal)) : null,
    }))
    .sort((a, b) => b.total - a.total || b.count - a.count)
}

// previsão de um ano: o que já tem valor + os eventos sem valor estimados pela média do projeto.
// → { done, booked, estimated, estimatedCount, unknownCount, total, byMonth: [{ done, booked, estimated }] }
//   done = eventos até hoje com valor · booked = eventos futuros com valor · estimated = sem valor × média
export function forecastOf(events, year, today, averages, pbe) {
  const byMonth = Array.from({ length: 12 }, () => ({ done: 0, booked: 0, estimated: 0, count: 0 }))
  let estimatedCount = 0, unknownCount = 0
  const unknown = new Set()
  for (const e of events) {
    if (yearOf(e.event_date) !== year) continue
    const mo = byMonth[monthOf(e.event_date)]
    mo.count++
    const v = num(e.value)
    if (v > EPS) { if (e.event_date <= today) mo.done += v; else mo.booked += v; continue }
    if (!noValueOf(e, pbe)) continue // 0 € com pagamentos ou marcado como recebido: não é "valor pendente"
    const a = averages.get(e.project_id)
    if (a) { mo.estimated += a.avg; estimatedCount++ } else { unknownCount++; unknown.add(e.project_id) }
  }
  for (const mo of byMonth) { mo.done = cents(mo.done); mo.booked = cents(mo.booked); mo.estimated = cents(mo.estimated); mo.total = cents(mo.done + mo.booked + mo.estimated) }
  const sum = (k) => cents(byMonth.reduce((s, mo) => s + mo[k], 0))
  const done = sum('done'), booked = sum('booked'), estimated = sum('estimated')
  return { year, done, booked, estimated, estimatedCount, unknownCount, unknownProjects: unknown.size, total: cents(done + booked + estimated), byMonth }
}
