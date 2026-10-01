// Formatos da v2 (spec §8). Datas 'yyyy-mm-dd' tratadas sempre como dias de calendário
// (sem fuso); espaços entre número e unidade são inseparáveis (U+00A0), como o Intl.

const NB = '\u00a0'
const MINUS = '\u2212' // "−" tipográfico em despesas e deltas negativos

// ---------- nomes ----------------------------------------------------------
export const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const MONTHS_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] // eixos dos gráficos
// índice = getDay() (0 = domingo)
export const WEEKDAYS_FULL = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
export const WEEKDAYS_DAY = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
export const WEEKDAYS_ABBR = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '')

// texto sem acentos e em minúsculas (pesquisa e comparação de títulos)
export const foldText = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// ---------- dinheiro -------------------------------------------------------
// useGrouping 'always': em pt-PT o Intl só separa milhares a partir de 5
// dígitos (2549,75 aparecia "colado"); assim 2 549,75 € sai sempre separado
const eurV1 = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', useGrouping: 'always' })
const eur0 = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', useGrouping: 'always', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const eur2 = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', useGrouping: 'always', minimumFractionDigits: 2, maximumFractionDigits: 2 })

const toCents = (n) => Math.round((Number(n) || 0) * 100) / 100

// fmtMoney(n) — sem opções mantém o formato da v1 (sempre com cêntimos: "520,00 €").
// fmtMoney(n, { cents }) — v2: 'auto' (520 € · 269,50 €) · 'never' (16 753 €) · 'always' (−22,53 €);
// { sign: true } acrescenta "+" aos positivos. Negativos levam sempre "−".
export function fmtMoney(n, opts) {
  if (!opts) return eurV1.format(Number(n) || 0)
  const { cents = 'auto', sign = false } = opts
  const v = toCents(n)
  const abs = Math.abs(v)
  const shown = cents === 'never' ? Math.round(abs) : abs
  const body = cents === 'never' ? eur0.format(shown)
    : cents === 'always' || !Number.isInteger(abs) ? eur2.format(abs)
    : eur0.format(abs)
  const pre = shown === 0 ? '' : v < 0 ? MINUS : sign ? '+' : ''
  return pre + body
}

// número de capa: { sign: '−'|'', int: '6 073', dec: ',75 €' } — os cêntimos vão a 60 %.
// Sem cêntimos a parte inteira leva o "€" ({ int: '520 €', dec: '' }).
export function fmtMoneyParts(n, { cents = 'auto' } = {}) {
  const v = toCents(n)
  const s = fmtMoney(Math.abs(v), { cents })
  const i = s.indexOf(',')
  const zero = cents === 'never' ? Math.round(Math.abs(v)) === 0 : v === 0
  return {
    sign: v < 0 && !zero ? MINUS : '',
    int: i < 0 ? s : s.slice(0, i),
    dec: i < 0 ? '' : s.slice(i),
  }
}

// eixos dos gráficos: 850 € · 1 mil € · 1,7 mil € · 250 mil € · 1 M € · 1,5 M €
// (a partir do milhão "M €": nunca "1000 mil €")
const dec1 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1, useGrouping: 'always' })
export function fmtMoneyCompact(n) {
  const v = Number(n) || 0
  const abs = Math.abs(v)
  if (abs < 0.5) return '0'
  const pre = v < 0 ? MINUS : ''
  if (abs >= 999950) return `${pre}${dec1.format(abs / 1e6)}${NB}M${NB}€`
  if (abs >= 999.5) return `${pre}${dec1.format(abs / 1000)}${NB}mil${NB}€`
  return `${pre}${Math.round(abs)}${NB}€`
}

// deltas: "+9 %" · "−16 %" · "0 %" · "+6 501 %" (milhares separados, como o dinheiro)
const int0 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0, useGrouping: 'always' })
export function fmtPct(n, { sign = true } = {}) {
  const v = Math.round(Number(n) || 0)
  const pre = v < 0 ? MINUS : v > 0 && sign ? '+' : ''
  return `${pre}${int0.format(Math.abs(v))}${NB}%`
}

// ---------- datas (dias de calendário) -------------------------------------
const pad = (n) => String(n).padStart(2, '0')
const parts = (ymd) => String(ymd).slice(0, 10).split('-').map(Number)
const utc = (ymd) => { const [y, m, d] = parts(ymd); return Date.UTC(y, m - 1, d) }

export const toYMD = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
export const todayYMD = () => toYMD(new Date())
// dia (no fuso do aparelho, Lisboa) de um timestamp da BD ("2026-09-29T23:30:00.123456+00:00" → "2026-09-30");
// nunca o .slice(0, 10), que é o dia UTC
export const dayOfTimestamp = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : toYMD(d)
}

export const addDays = (ymd, n) => {
  const x = new Date(utc(ymd) + n * 86400000)
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`
}
// dias de a até b (positivo se b é depois de a)
export const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 86400000)
export const weekdayOf = (ymd) => new Date(utc(ymd)).getUTCDay()

// 'yyyy-mm-dd' → {year, month(0-11)}
export const ymdParts = (ymd) => {
  const [y, m] = parts(ymd)
  return { year: y, month: m - 1 }
}

// formatador geral de dias; os nomeados abaixo cobrem os casos da spec.
// weekday: 'abbr' (qua) · 'day' (quarta) · 'full' (quarta-feira) · null
// month:   'abbr' (30 set) · 'long' (30 de setembro)
export function fmtDay(ymd, { weekday = 'day', month = 'abbr', year = false } = {}) {
  if (!ymd) return ''
  const [y, m, d] = parts(ymd)
  const wd = weekday === 'abbr' ? WEEKDAYS_ABBR : weekday === 'full' ? WEEKDAYS_FULL : weekday === 'day' ? WEEKDAYS_DAY : null
  const date = month === 'long'
    ? `${d} de ${MONTHS_LONG[m - 1]}${year ? ` de ${y}` : ''}`
    : `${d} ${MONTHS_ABBR[m - 1]}${year ? ` ${y}` : ''}`
  return wd ? `${wd[weekdayOf(ymd)]}, ${date}` : date
}

// "Quarta, 30 de setembro" — cabeçalhos de dia, facto do detalhe
export const fmtDayLong = (ymd, { year = false } = {}) => cap(fmtDay(ymd, { weekday: 'day', month: 'long', year }))

// "Quarta-feira · 30 de setembro" — kicker da Agenda (o CSS põe em caixa alta)
export const fmtKicker = (ymd) => {
  if (!ymd) return ''
  const [, m, d] = parts(ymd)
  return `${cap(WEEKDAYS_FULL[weekdayOf(ymd)])} · ${d} de ${MONTHS_LONG[m - 1]}`
}

// "qua 30" (bloco de data) · { year: true } → "sáb, 17 out 2026" (valor dos campos de data)
export const fmtDayShort = (ymd, { year = false } = {}) => {
  if (!ymd) return ''
  if (year) return fmtDay(ymd, { weekday: 'abbr', month: 'abbr', year: true })
  return `${WEEKDAYS_ABBR[weekdayOf(ymd)]} ${parts(ymd)[2]}`
}

export const fmtDM = (ymd) => fmtDay(ymd, { weekday: null })                 // 24 ago
export const fmtDMY = (ymd) => fmtDay(ymd, { weekday: null, year: true })    // 12 ago 2026

// "setembro" · { year: true } → "julho de 2025"
export const fmtMonth = (ymd, { year = false } = {}) => {
  if (!ymd) return ''
  const [y, m] = parts(ymd)
  return `${MONTHS_LONG[m - 1]}${year ? ` de ${y}` : ''}`
}

// Hoje · Amanhã · Ontem · Sábado (nos próximos 6 dias) · null
export function relDay(ymd, today = todayYMD()) {
  const n = daysBetween(today, ymd)
  if (n === 0) return 'Hoje'
  if (n === 1) return 'Amanhã'
  if (n === -1) return 'Ontem'
  if (n > 1 && n < 7) return cap(WEEKDAYS_DAY[weekdayOf(ymd)])
  return null
}

// antiguidade: "há 19 dias" · "há 3 meses" · "há 1 ano e 3 meses"
export function ago(ymd, today = todayYMD()) {
  const n = daysBetween(ymd, today)
  if (n <= 0) return 'hoje'
  if (n === 1) return 'ontem'
  if (n < 45) return `há ${n} dias`
  const months = Math.round(n / 30.4)
  const mm = (k) => `${k} ${k === 1 ? 'mês' : 'meses'}`
  if (months < 12) return `há ${mm(months)}`
  const y = Math.floor(months / 12)
  const r = months % 12
  return `há ${y} ${y === 1 ? 'ano' : 'anos'}${r ? ` e ${mm(r)}` : ''}`
}

// ---------- compatibilidade v1 ---------------------------------------------
// dd/mm/aaaa — só para os PDFs (a UI da v2 não mostra datas numéricas)
export const fmtDate = (ymd) => {
  if (!ymd) return ''
  const [y, m, d] = String(ymd).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export const fmtTime = (t) => (t ? String(t).slice(0, 5) : '')
