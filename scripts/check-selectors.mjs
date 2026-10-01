// Confirma os números canónicos da v2 (plano §F.8, spec §8, §14.2, §16) com as fixtures do harness.
// Uso: node scripts/check-selectors.mjs <fixtures.mjs>   (hoje = 2026-09-30 10:00, como no harness)
// Sai com código 1 se algum número falhar.
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// src/ é ESM num package.json sem "type": o Node avisa ao detetar a sintaxe — só esse aviso é silenciado
const emitWarning = process.emitWarning
process.emitWarning = function (w, ...rest) {
  const code = typeof rest[0] === 'object' ? rest[0]?.code : rest[1]
  if (code === 'MODULE_TYPELESS_PACKAGE_JSON') return
  return emitWarning.call(this, w, ...rest)
}

if (!process.argv[2]) {
  console.error('Uso: node scripts/check-selectors.mjs <fixtures.mjs>')
  process.exit(2)
}
const F = await import(pathToFileURL(resolve(process.argv[2])).href)
const S = await import('../src/selectors.js')
const { parseGoogleIcs } = await import('../src/gcalParse.js')
const fmt = await import('../src/format.js')
const { darkMark } = await import('../src/color.js')
const util = await import('../src/util.js')

const NOW = new Date(2026, 8, 30, 10, 0)
const TODAY = '2026-09-30'

// ---------- verificação ----------
let fails = 0
let total = 0
const show = (v) => (typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v) ?? String(v))
const check = (name, got, want) => {
  total++
  const ok = typeof want === 'number' && typeof got === 'number'
    ? Math.abs(got - want) < 0.005
    : show(got) === show(want)
  if (!ok) fails++
  console.log(`${ok ? '  ok  ' : 'FALHA '} ${name}${ok ? '' : `\n         obtido ${show(got)} · esperado ${show(want)}`}`)
}
const section = (t) => console.log(`\n${t}`)
const sp = (s) => String(s).replace(/\u00a0/g, ' ') // compara com espaços normais
// KPIs, cartão do mês e resumos de filtro mostram euros arredondados (cents: 'never')
const euro = (n) => sp(fmt.fmtMoney(n, { cents: 'never' }))

// ---------- dados ----------
const events = F.events
const pbe = S.paymentsByEventOf(F.payments)
const google = []
for (const cal of F.gcal_calendars) {
  for (const g of parseGoogleIcs(F.ics[cal.id], NOW)) google.push({ ...g, project_id: cal.project_id, calendar_id: cal.id })
}
const rec = S.receivablesOf(events, pbe, TODAY)
const aging = S.agingGroups(rec.overdue, TODAY, pbe)
const gm = S.matchGoogle(events, google)
const gp = S.googlePendingOf(gm.pending, TODAY)
const y26 = S.yearTotals(events, F.expenses, pbe, 2026, TODAY)
const y25 = S.yearTotals(events, F.expenses, pbe, 2025, TODAY)

// ================= §F.8 — números canónicos =================
section('§F.8 · Em atraso e A receber')
check('Em atraso · eventos', rec.overdue.length, 21)
check('Em atraso · total', rec.overdueTotal, 6073.75)
check('A receber · eventos', rec.upcoming.length, 11)
check('A receber · total', rec.upcomingTotal, 3449.90)

section('§F.8 · Antiguidade')
check('grupos', aging.map((g) => g.key), ['gt90', 'd31to90', 'le30'])
const ag = Object.fromEntries(aging.map((g) => [g.key, g]))
check('Há mais de 3 meses · eventos', ag.gt90?.events.length, 5)
check('Há mais de 3 meses · total', ag.gt90?.total, 1509.60)
check('Entre 1 e 3 meses · eventos', ag.d31to90?.events.length, 10)
check('Entre 1 e 3 meses · total', ag.d31to90?.total, 2911.90)
check('Últimos 30 dias · eventos', ag.le30?.events.length, 6)
check('Últimos 30 dias · total', ag.le30?.total, 1652.25)

section('§F.8 · Sinais')
check('Sinais recebidos · total', rec.depositsTotal, 629)
check('Sinais recebidos · eventos', rec.depositsCount, 4)

section('§F.8 · Google')
check('eventos lidos dos feeds', google.length, 7)
check('pendentes', gm.pending.length, 6)
check('já aconteceram', gp.past.map((g) => `${g.date} ${g.title}`), ['2026-09-12 Banda — Festa de setembro'])
check('próximos', gp.upcoming.length, 5)
const leonor = gm.matched.find((m) => m.g.title === 'Noiva Leonor (Google)')
check('"Noiva Leonor (Google)" 09:00 escondida', gm.pending.some((g) => g.title === 'Noiva Leonor (Google)'), false)
check('… pela hora, com a Noiva Leonor Pires', leonor ? `${leonor.by} · ${leonor.g.time} · ${leonor.event.id}` : null, 'hora · 09:00 · ev-today-2')

section('§F.8 · Painel 2026')
check('receita líquida', y26.net, 16753)
check('bruto', y26.gross, 18225)
check('retido', y26.retained, 1472)
check('despesas', y26.exp, 1301.33)
check('saldo', y26.saldo, 15451.67)
check('saldo vs 2025 (%)', y26.deltaSaldo, 12)
check('Em atraso · eventos de 2026', y26.overdueYear, 5094.15)
check('eventos futuros de 2026', y26.upcomingYear, 3449.90)
check('média mensal', y26.avgClosed, 1348.36)
check('meses fechados', y26.closedMonths, 8)

// ================= extra — regras da spec =================
section('Extra · Painel (spec §10.13, §16)')
check('receita vs 2025 (%)', y26.deltaNet, 9)
check('despesas vs 2025 (%)', y26.deltaExp, -16)
check('despesas 2025', y26.expPrev, 1555.13)
check('média 2025', y26.avgPrev, 1283.49)
check('despesas de setembro', y26.byMonth.exp[8], 174.31)
check('Em atraso · eventos de 2025', y25.overdueYear, 979.60)
check('2025 muda os valores', y25.net !== y26.net && y25.exp !== y26.exp, true)
check('ano sem dados (2024)', S.yearTotals(events, F.expenses, pbe, 2024, TODAY).hasData, false)
check('melhor mês de 2026', y26.bestMonth && [fmt.MONTHS_LONG[y26.bestMonth.month], euro(y26.bestMonth.saldo)], ['setembro', '2 936 €'])

section('Painel · comparação até ao mesmo dia (ano corrente)')
{
  // contas feitas à parte, à mão, sobre as fixtures: 2026 até 30/09 vs 2025 até 30/09
  const sumIn = (rows, key, val, from, to) => Math.round(rows.filter((r) => r[key] >= from && r[key] <= to)
    .reduce((a, r) => a + Number(r[val]), 0) * 100) / 100
  const n26 = sumIn(events, 'event_date', 'value', '2026-01-01', '2026-09-30')
  const n25 = sumIn(events, 'event_date', 'value', '2025-01-01', '2025-09-30')
  const x26 = sumIn(F.expenses, 'expense_date', 'amount', '2026-01-01', '2026-09-30')
  const x25 = sumIn(F.expenses, 'expense_date', 'amount', '2025-01-01', '2025-09-30')
  const pctOf = (a, b) => Math.round(((a - b) / Math.abs(b)) * 100)
  const yt = y26.ytd
  check('ytd existe no ano corrente', !!yt, true)
  check('ytd · datas de corte', yt && [yt.until, yt.untilPrev], ['2026-09-30', '2025-09-30'])
  check('ytd · receita 2026 / 2025', yt && [yt.net, yt.netPrev], [n26, n25])
  check('ytd · despesas 2026 / 2025', yt && [yt.exp, yt.expPrev], [x26, x25])
  check('ytd · saldo e variação', yt && [yt.saldo, yt.deltaSaldo], [Math.round((n26 - x26) * 100) / 100, pctOf(n26 - x26, n25 - x25)])
  check('ytd · eventos marcados depois de hoje não entram', yt && yt.net < y26.net, true)
  check('ano passado (2025) não tem ytd', S.yearTotals(events, F.expenses, pbe, 2025, TODAY).ytd, null)
}

section('Painel · penteados vs música')
{
  // contas à parte: Cabelos (tipo hair) contra o resto, 2026; variação até 30/09 contra 2025 até 30/09
  const hairIds = new Set(F.projects.filter((p) => p.kind === 'hair').map((p) => p.id))
  const r2 = (n) => Math.round(n * 100) / 100
  const sum = (pred) => r2(events.filter(pred).reduce((a, e) => a + Number(e.value), 0))
  const in26 = (e) => e.event_date.startsWith('2026')
  const hairNet = sum((e) => in26(e) && hairIds.has(e.project_id))
  const musicNet = sum((e) => in26(e) && !hairIds.has(e.project_id))
  const hairN = events.filter((e) => in26(e) && hairIds.has(e.project_id)).length
  const ytd = (y, hair) => sum((e) => e.event_date >= `${y}-01-01` && e.event_date <= `${y}-09-30` && hairIds.has(e.project_id) === hair)
  const pctOf = (a, b) => Math.round(((a - b) / Math.abs(b)) * 100)
  const [h, m] = S.kindSplitOf(events, F.projects, 2026, TODAY)
  check('penteados · receita 2026', h.net, hairNet)
  check('música · receita 2026', m.net, musicNet)
  check('penteados + música = receita líquida do ano', r2(h.net + m.net), y26.net)
  check('penteados · eventos e média', [h.count, h.avg], [hairN, r2(hairNet / hairN)])
  check('partes somam 100 %', Math.round((h.share + m.share) * 1000) / 1000, 1)
  check('penteados · variação até 30 set', h.delta, pctOf(ytd(2026, true), ytd(2025, true)))
  check('música · variação até 30 set', m.delta, pctOf(ytd(2026, false), ytd(2025, false)))
  check('meses somam o total (penteados)', r2(h.byMonth.reduce((a, v) => a + v, 0)), h.net)
}

section('Extra · Agenda e Receber (spec §10.3–10.4, §10.11)')
const todays = events.filter((e) => e.event_date === TODAY)
check('Hoje · eventos', todays.length, 2)
check('Hoje · ainda por receber', S.summaryOf(todays, pbe).missing, 770)
check('Noiva Leonor · estado', S.eventStateOf(events.find((e) => e.id === 'ev-today-2'), pbe, TODAY), 'partial')
check('Concerto de hoje · estado (hoje não é atraso)', S.eventStateOf(events.find((e) => e.id === 'ev-today-1'), pbe, TODAY), 'due')
check('Amanhã · por receber', S.summaryOf(events.filter((e) => e.event_date === '2026-10-01'), pbe).missing, 269.50)
check('em atraso em setembro', rec.overdue.filter((e) => e.event_date.startsWith('2026-09')).length, 6)
const sep = S.summaryOf(events.filter((e) => e.event_date.startsWith('2026-09')), pbe)
check('Setembro · eventos · faturado · recebido · falta', [sep.count, euro(sep.total), euro(sep.got), euro(sep.missing)], [9, '3 110 €', '688 €', '2 422 €'])
const casamento = S.summaryOf(events.filter((e) => S.eventMatches(e, 'casamento')), pbe)
check('"casamento" · eventos · total · falta', [casamento.count, euro(casamento.total), sp(fmt.fmtMoney(casamento.missing, { cents: 'auto' }))], [13, '4 979 €', '703,25 €'])
check('"antonio" encontra "Santo António"', events.some((e) => S.eventMatches(e, 'antonio') && /António/.test(e.location || '')), true)
check('Em atraso · o mais antigo', rec.oldestDate, '2025-07-12')
check('… há quanto tempo', fmt.ago(rec.oldestDate, TODAY), 'há 1 ano e 3 meses')
check('estados coerentes com o Em atraso', rec.overdue.every((e) => ['overdue', 'partial-overdue'].includes(S.eventStateOf(e, pbe, TODAY))), true)
check('chaves dos pendentes únicas', new Set(gm.pending.map((g) => g.key)).size, gm.pending.length)
check('pendentes por dia (3 out)', (gm.byDay.get('2026-10-03') || []).map((g) => g.time), ['21:00'])

section('Extra · deduplicação do Google (spec §14.3, casos sintéticos)')
{
  const ev = (id, project_id, event_date, start_time, title) => ({ id, project_id, event_date, start_time, title, value: 100 })
  const g = (project_id, date, time, title) => ({ project_id, date, time, title, calendar_id: 'gc-x' })
  const by = (apps, gs) => { const r = S.matchGoogle(apps, gs); return [r.pending.map((x) => x.title), r.matched.map((m) => m.by)] }
  check('hora a 20 min → escondido', by([ev('a', 'p', '2026-10-10', '21:00:00', 'Concerto')], [g('p', '2026-10-10', '21:20', 'Banda')]), [[], ['hora']])
  check('hora a 45 min e títulos diferentes → por registar', by([ev('a', 'p', '2026-10-10', '21:00:00', 'Concerto')], [g('p', '2026-10-10', '21:45', 'Banda')]), [['Banda'], []])
  check('título com 2 palavras em comum (sem acentos) → escondido', by([ev('a', 'p', '2026-10-10', '12:00:00', 'Casamento Inês e Rui')], [g('p', '2026-10-10', '16:00', 'Noiva Ines & Rui')]), [[], ['titulo']])
  check('contagem: um evento sem hora esconde só um', by([ev('a', 'p', '2026-10-10', null, 'Arraial')], [g('p', '2026-10-10', '10:00', 'Ensaio'), g('p', '2026-10-10', null, 'Jantar')]), [['Jantar'], ['contagem']])
  check('1:1 pela hora mais próxima', by([ev('a', 'p', '2026-10-10', '21:00:00', 'X'), ev('b', 'p', '2026-10-10', '21:40:00', 'Y')], [g('p', '2026-10-10', '21:30', 'G1'), g('p', '2026-10-10', '21:10', 'G2')]), [[], ['hora', 'hora']])
  check('outro projeto no mesmo dia → por registar', by([ev('a', 'p', '2026-10-10', '21:00:00', 'Concerto')], [g('q', '2026-10-10', '21:00', 'Concerto')]), [['Concerto'], []])
}

section('Extra · estados (spec §9.1, casos sintéticos)')
{
  const e = (id, value, paid, event_date = '2026-09-20') => ({ id, value, paid, event_date, receipt_issued: false })
  const pays = S.paymentsByEventOf([{ id: 'p1', event_id: 'flag', amount: 100 }])
  check('legado (paid sem pagamentos) → paid', S.eventStateOf(e('leg', 300, true), pays, TODAY), 'paid')
  check('flag desatualizado: paid mas pagamentos < valor → conta a soma', [S.eventStateOf(e('flag', 300, true), pays, TODAY), S.missingOf(e('flag', 300, true), pays)], ['partial-overdue', 200])
  check('0 € no passado → paid (nada a receber)', S.eventStateOf(e('zero', 0, false), pays, TODAY), 'paid')
}

section('Extra · projetos e categorias')
const usage = S.projectsByUsage(F.projects, events, TODAY, 'p-gospel')
check('projetos ativos em 2026', F.projects.filter((p) => S.isProjectActive(p, 2026)).length, 7)
check('chips: ativos, o último usado primeiro', [usage.length, usage[0]?.id], [7, 'p-gospel'])
check('chips: + o atual (inativo)', S.projectsByUsage(F.projects, events, TODAY, null, 'p-gaga').some((p) => p.id === 'p-gaga'), true)
check('categorias de despesa', [...S.expenseCategoriesOf(F.expenses)].sort(), ['Deslocações', 'Equipamento', 'Formação', 'Imagem', 'Material'])

section('Extra · formatos (spec §8)')
check('fmtMoney(520) — v1', sp(fmt.fmtMoney(520)), '520,00 €')
check('util reexporta fmtMoney e MONTHS da v1', [sp(util.fmtMoney(2549.75)), util.MONTHS[8], util.MONTHS_SHORT[8]], ['2 549,75 €', 'Setembro', 'Set'])
check('auto', [520, 269.5, 6073.75].map((n) => sp(fmt.fmtMoney(n, { cents: 'auto' }))), ['520 €', '269,50 €', '6 073,75 €'])
check('never', [16753, 5094.15].map((n) => sp(fmt.fmtMoney(n, { cents: 'never' }))), ['16 753 €', '5 094 €'])
check('always', [-22.53, -174.31].map((n) => sp(fmt.fmtMoney(n, { cents: 'always' }))), ['−22,53 €', '−174,31 €'])
check('fmtMoneyParts', fmt.fmtMoneyParts(6073.75), { sign: '', int: '6\u00a0073', dec: ',75\u00a0€' })
check('fmtMoneyCompact', [850, 1000, 1700].map((n) => sp(fmt.fmtMoneyCompact(n))), ['850 €', '1 mil €', '1,7 mil €'])
check('fmtPct', [9, -16].map((n) => sp(fmt.fmtPct(n))), ['+9 %', '−16 %'])
check('fmtDayLong', fmt.fmtDayLong(TODAY), 'Quarta, 30 de setembro')
check('fmtKicker', fmt.fmtKicker(TODAY), 'Quarta-feira · 30 de setembro')
check('fmtDayShort', [fmt.fmtDayShort(TODAY), fmt.fmtDayShort('2026-10-17', { year: true })], ['qua 30', 'sáb, 17 out 2026'])
check('fmtDM / fmtDMY', [fmt.fmtDM('2026-08-24'), fmt.fmtDMY('2026-08-12')], ['24 ago', '12 ago 2026'])
check('relDay', ['2026-09-30', '2026-10-01', '2026-09-29', '2026-10-03', '2026-10-10'].map((d) => fmt.relDay(d, TODAY)), ['Hoje', 'Amanhã', 'Ontem', 'Sábado', null])
check('ago', ['2026-09-11', '2026-06-30'].map((d) => fmt.ago(d, TODAY)), ['há 19 dias', 'há 3 meses'])
check('fmtTime', fmt.fmtTime('09:00:00'), '09:00')

section('Extra · cor de projeto (spec §7)')
const PRESETS = { '#d46a8f': '#d46a8f', '#cf9c3f': '#ba8826', '#12a89e': '#12a89e', '#cd7c5a': '#cb7a58', '#9c7ed4': '#9c7ed4', '#4f9f68': '#4f9f68', '#6d8ed6': '#6d8ed6', '#a49b3f': '#9e9539', '#c263ac': '#c263ac' }
check('darkMark das 9 predefinidas', Object.keys(PRESETS).map(darkMark), Object.values(PRESETS))
check('darkMark branco / amarelo', [darkMark('#ffffff'), darkMark('#ffff00')], ['#929292', '#9d9900'])

console.log(`\n${total} verificações · ${fails} falhas`)
process.exit(fails ? 1 : 0)
