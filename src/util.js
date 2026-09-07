export const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
export const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
export const WEEKDAYS = ['S','T','Q','Q','S','S','D'] // semana começa à segunda

const eur = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
export const fmtMoney = (n) => eur.format(Number(n) || 0)

export const todayYMD = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const fmtDate = (ymd) => {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-')
  return `${d}/${m}/${y}`
}

export const fmtTime = (t) => (t ? t.slice(0, 5) : '')

// 'yyyy-mm-dd' → {year, month(0-11)}
export const ymdParts = (ymd) => {
  const [y, m] = ymd.split('-').map(Number)
  return { year: y, month: m - 1 }
}
