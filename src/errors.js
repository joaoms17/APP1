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

// coluna em falta → ficheiro SQL que a acrescenta (docs_prep.sql traz as colunas dos documentos)
const COLUMN_SQL = {
  logo_path: 'docs_prep.sql',
  gross_value: 'import_historico.sql',
  project_id: 'docs_prep.sql',
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

// 23505 (valor repetido): o texto depende da restrição que falhou
const UNIQUE_TEXT = {
  gcal_calendars_url_key: 'Esse calendário já está ligado.',
  projects_name_key: 'Já existe um projeto com esse nome.',
  services_name_key: 'Já existe um serviço com esse nome.',
}
export const uniqueKeyOf = (ex) => (String(ex?.message || '') + ' ' + String(ex?.details || '')).match(/"?([a-z_]+_key)"?/)?.[1] || null

// Storage sem o bucket "anexos" (StorageApiError 400 com statusCode 404 "Bucket not found")
const isMissingBucket = (ex) => /bucket not found/i.test(String(ex?.message || ex?.error || ''))

export const SETUP_TEXT = 'Esta funcionalidade ainda não está configurada.'
// erro de configuração (tabela/coluna/bucket em falta): repetir nunca resolve — mostra-se o detalhe
export const isSetupError = (h) => h?.text === SETUP_TEXT

export function humanError(ex, { count } = {}) {
  const code = ex?.code ? String(ex.code) : ''
  const msg = String(ex?.message || ex || '')
  let text
  if (ex?.human) text = msg
  else if (isNetworkError(ex)) text = 'Sem ligação. Verifica a internet e tenta de novo.'
  else if (ex?.name === 'GcalError') text = msg // gcal.js já devolve texto legível
  else if (['42P01', '42703', 'PGRST204', 'PGRST205'].includes(code) || isMissingBucket(ex)) text = SETUP_TEXT
  else if (code === '23505') text = UNIQUE_TEXT[uniqueKeyOf(ex)] || 'Já existe um registo igual.'
  else if (code === '23503') {
    text = count
      ? `Este projeto tem ${count} ${count === 1 ? 'evento' : 'eventos'}, por isso não pode ser apagado. Desativa-o.`
      : 'Este projeto tem eventos, por isso não pode ser apagado. Desativa-o.'
  } else text = 'Não foi possível guardar. Tenta de novo.'

  const table = (msg.match(/relation "(?:public\.)?([a-z_]+)" does not exist/) || msg.match(/table '?(?:public\.)?([a-z_]+)'?/) || [])[1]
  // coluna em falta (42703 / PGRST204): "column events.start_time does not exist" · "'logo_path' column of 'projects'"
  const column = (msg.match(/column "?(?:[a-z_]+\.)?([a-z_]+)"? (?:of relation "[a-z_]+" )?does not exist/) || msg.match(/'([a-z_]+)' column/) || [])[1]
  const sql = column && COLUMN_SQL[column] ? ` — falta correr supabase/${COLUMN_SQL[column]}`
    : !column && table && SQL_OF[table] ? ` — falta correr supabase/${SQL_OF[table]}`
    : isMissingBucket(ex) ? ' — falta o bucket "anexos" no Storage (supabase/attachments.sql)'
    : code === '42P01' || code === 'PGRST205' ? ' — falta correr o SQL em supabase/'
    : code === '42703' || code === 'PGRST204' ? ' — falta uma coluna: corre os .sql de supabase/' : ''
  const detail = [code, msg].filter(Boolean).join(' · ') + sql
  return { text, detail }
}
