// Mensagens de erro para pessoas (spec §10.16): nunca mostrar ex.message cru à Joana.
// humanError(ex, { count }) → { text, detail } — o detalhe técnico vai para "Detalhes para o João".

// tabela em falta → ficheiro SQL que a cria (pasta supabase/)
const SQL_OF = {
  projects: 'schema.sql',
  events: 'schema.sql',
  expenses: 'schema.sql',
  payments: 'payments.sql',
  attachments: 'attachments.sql',
  gcal_calendars: 'gcal_calendars.sql',
  services: 'orcamentos.sql',
  quotes: 'orcamentos.sql',
  quote_items: 'orcamentos.sql',
  schedule_items: 'orcamentos.sql',
}

// erro nosso, já com texto para mostrar (validações das ações do store)
export const userError = (message) => Object.assign(new Error(message), { human: true })

export function isNetworkError(ex) {
  if (!ex) return false
  if (ex.network) return true
  const msg = String(ex.message || ex)
  if (/failed to fetch|networkerror|load failed|network request failed|internet connection appears to be offline/i.test(msg)) return true
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export function humanError(ex, { count } = {}) {
  const code = ex?.code ? String(ex.code) : ''
  const msg = String(ex?.message || ex || '')
  let text
  if (ex?.human) text = msg
  else if (isNetworkError(ex)) text = 'Sem ligação. Verifica a internet e tenta de novo.'
  else if (ex?.name === 'GcalError') text = msg // gcal.js já devolve texto legível
  else if (['42P01', '42703', 'PGRST204', 'PGRST205'].includes(code)) text = 'Esta funcionalidade ainda não está configurada.'
  else if (code === '23505') text = 'Esse calendário já está ligado.'
  else if (code === '23503') {
    text = count
      ? `Este projeto tem ${count} ${count === 1 ? 'evento' : 'eventos'}, por isso não pode ser apagado. Desativa-o.`
      : 'Este projeto tem eventos, por isso não pode ser apagado. Desativa-o.'
  } else text = 'Não foi possível guardar. Tenta de novo.'

  const table = (msg.match(/relation "(?:public\.)?([a-z_]+)" does not exist/) || msg.match(/table '?(?:public\.)?([a-z_]+)'?/) || [])[1]
  const sql = table && SQL_OF[table] ? ` — falta correr supabase/${SQL_OF[table]}`
    : code === '42P01' ? ' — falta correr o SQL em supabase/' : ''
  const detail = [code, msg].filter(Boolean).join(' · ') + sql
  return { text, detail }
}
