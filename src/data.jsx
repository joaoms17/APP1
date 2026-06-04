import { db } from './supabase'

// ─── i18n ────────────────────────────────────────────────────
export const STR = {
  pt: {
    appName: 'Ramo', appTagline: 'Operação para equipas de eventos',
    tab_inicio: 'Início', tab_conversas: 'Conversas', tab_negocios: 'Negócios',
    tab_agenda: 'Agenda', tab_financeiro: 'Financeiro',
    greeting: 'Bom dia', manager: 'Marta', today: 'Hoje',
    comercial: 'Comercial', operacional: 'Operacional', financeiro: 'Financeiro',
    leads_recebidas: 'Leads recebidas', taxa_conversao: 'Taxa de conversão',
    propostas_enviadas: 'Propostas enviadas', proximos_eventos: 'Próximos eventos',
    disponibilidades: 'Disponibilidades', conflitos: 'Conflitos',
    receita_mes: 'Receita do mês', receita_prevista: 'Receita prevista',
    pagamentos_pendentes: 'Pagamentos pendentes', ver_tudo: 'Ver tudo',
    needs_attention: 'A precisar de si', este_mes: 'este mês',
    new_leads_wa: 'leads novas no WhatsApp', por_aprovar: 'por aprovar',
    conversas: 'Conversas', pesquisar: 'Pesquisar conversas', wa_connected: 'WhatsApp Business ligado',
    nova_lead: 'Nova lead', extrair: 'Extrair com IA', escrever: 'Escrever mensagem',
    ai_extraiu: 'A IA leu a conversa', criar_lead: 'Criar lead', rever: 'Rever',
    sugestao_resposta: 'Sugestão de resposta', sugestao_equipa: 'Sugestão de equipa',
    aprovar: 'Aprovar e enviar', editar: 'Editar', dados_extraidos: 'Dados extraídos',
    aprovacao_humana: 'Sempre com a sua aprovação',
    nome: 'Nome', tipo_evento: 'Tipo de evento', data: 'Data', local: 'Local',
    servicos: 'Serviços', convidados: 'Convidados', observacoes: 'Observações',
    origem: 'Origem', telefone: 'Telefone', email: 'Email', valor: 'Valor', estado: 'Estado',
    equipa: 'Equipa', cliente: 'Cliente', hora: 'Hora',
    pipeline: 'Pipeline', reservas: 'Reservas', oportunidades: 'oportunidades',
    converter: 'Converter em reserva', detalhes: 'Detalhes', pagamentos: 'Pagamentos',
    documentos: 'Documentos', interno: 'Notas', historico: 'Histórico de contactos',
    calendario: 'Calendário', dia: 'Dia', semana: 'Semana', mes: 'Mês',
    disponivel: 'Disponível', indisponivel: 'Indisponível', ferias: 'Férias',
    carga: 'Carga de trabalho', conflito_detetado: 'Conflito detetado',
    ver_quem_disponivel: 'Quem está disponível',
    faturacao: 'Faturação', em_divida: 'Em dívida', sinal: 'Sinal',
    total: 'Total', pago: 'Pago', parcial: 'Parcial', nao_pago: 'Não pago',
    pedir_pagamento: 'Pedir pagamento', registar: 'Registar pagamento',
    orcamento: 'Orçamento', contrato: 'Contrato', proposta: 'Proposta comercial',
    brochura: 'Brochura', gerar: 'Gerar com IA', gerado_ia: 'Gerado pela IA',
    enviar_cliente: 'Enviar ao cliente', pre_visualizar: 'Pré-visualizar',
    tarefas: 'Tarefas', responsavel: 'Responsável', prazo: 'Prazo',
    voltar: 'Voltar', guardar: 'Guardar', cancelar: 'Cancelar', confirmar: 'Confirmar',
    adicionar: 'Adicionar', enviar: 'Enviar', mensagem_interna: 'Mensagem da equipa',
    convidados_n: 'convidados', noiva: 'Noiva', damas: 'damas',
  },
  en: {
    appName: 'Ramo', appTagline: 'Operations for event teams',
    tab_inicio: 'Home', tab_conversas: 'Chats', tab_negocios: 'Deals',
    tab_agenda: 'Calendar', tab_financeiro: 'Finance',
    greeting: 'Good morning', manager: 'Marta', today: 'Today',
    comercial: 'Sales', operacional: 'Operations', financeiro: 'Finance',
    leads_recebidas: 'Leads received', taxa_conversao: 'Conversion rate',
    propostas_enviadas: 'Proposals sent', proximos_eventos: 'Upcoming events',
    disponibilidades: 'Availability', conflitos: 'Conflicts',
    receita_mes: 'Revenue this month', receita_prevista: 'Forecast revenue',
    pagamentos_pendentes: 'Pending payments', ver_tudo: 'See all',
    needs_attention: 'Needs you', este_mes: 'this month',
    new_leads_wa: 'new WhatsApp leads', por_aprovar: 'to approve',
    conversas: 'Chats', pesquisar: 'Search chats', wa_connected: 'WhatsApp Business connected',
    nova_lead: 'New lead', extrair: 'Extract with AI', escrever: 'Write a message',
    ai_extraiu: 'AI read the conversation', criar_lead: 'Create lead', rever: 'Review',
    sugestao_resposta: 'Suggested reply', sugestao_equipa: 'Suggested team',
    aprovar: 'Approve & send', editar: 'Edit', dados_extraidos: 'Extracted data',
    aprovacao_humana: 'Always with your approval',
    nome: 'Name', tipo_evento: 'Event type', data: 'Date', local: 'Venue',
    servicos: 'Services', convidados: 'Guests', observacoes: 'Notes',
    origem: 'Source', telefone: 'Phone', email: 'Email', valor: 'Value', estado: 'Status',
    equipa: 'Team', cliente: 'Client', hora: 'Time',
    pipeline: 'Pipeline', reservas: 'Bookings', oportunidades: 'opportunities',
    converter: 'Convert to booking', detalhes: 'Details', pagamentos: 'Payments',
    documentos: 'Documents', interno: 'Notes', historico: 'Contact history',
    calendario: 'Calendar', dia: 'Day', semana: 'Week', mes: 'Month',
    disponivel: 'Available', indisponivel: 'Unavailable', ferias: 'Holiday',
    carga: 'Workload', conflito_detetado: 'Conflict detected',
    ver_quem_disponivel: "Who's available",
    faturacao: 'Revenue', em_divida: 'Outstanding', sinal: 'Deposit',
    total: 'Total', pago: 'Paid', parcial: 'Partial', nao_pago: 'Unpaid',
    pedir_pagamento: 'Request payment', registar: 'Record payment',
    orcamento: 'Quote', contrato: 'Contract', proposta: 'Proposal',
    brochura: 'Brochure', gerar: 'Generate with AI', gerado_ia: 'AI-generated',
    enviar_cliente: 'Send to client', pre_visualizar: 'Preview',
    tarefas: 'Tasks', responsavel: 'Owner', prazo: 'Due',
    voltar: 'Back', guardar: 'Save', cancelar: 'Cancel', confirmar: 'Confirm',
    adicionar: 'Add', enviar: 'Send', mensagem_interna: 'Team note',
    convidados_n: 'guests', noiva: 'Bride', damas: 'bridesmaids',
  },
}
export function makeT(lang) { return (k) => (STR[lang]?.[k]) || STR.pt[k] || k }

// ─── Palette ─────────────────────────────────────────────────
export const PALETTE = {
  terracotta: '#A9744F', terracottaDark: '#8C5C3C', sage: '#93A07E',
  sageLight: '#C7CFB9', gold: '#C8A86B', paper: '#F5EFE6', paperWarm: '#EFE7DA',
  paperCard: '#FBF7F0', ink: '#4A3F35', inkSoft: '#6E6155', nearBlack: '#2E2820',
  clay: '#B25B43',
}

export function hexToRgba(hex, a) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16)
  return `rgba(${r},${g},${b},${a})`
}

// ─── Status tones ────────────────────────────────────────────
export function leadTone(estado) {
  const m = { novo: PALETTE.terracotta, contactado: PALETTE.sage, qualificacao: PALETTE.gold, proposta: PALETTE.sage, negociacao: PALETTE.terracotta, ganho: PALETTE.sage, perdido: PALETTE.inkSoft }
  const base = m[estado] || PALETTE.inkSoft
  return { bg: hexToRgba(base, 0.14), fg: base, dot: base }
}
export function reservaTone(estado) {
  const m = { pre: PALETTE.inkSoft, disp: PALETTE.gold, proposta: PALETTE.gold, sinal: PALETTE.terracotta, confirmada: PALETTE.sage, concluida: PALETTE.nearBlack, cancelada: PALETTE.clay }
  const base = m[estado] || PALETTE.inkSoft
  return { bg: hexToRgba(base, 0.14), fg: base, dot: base }
}

export const LEAD_LABEL = {
  pt: { novo: 'Novo pedido', contactado: 'Contactado', qualificacao: 'Qualificação', proposta: 'Proposta enviada', negociacao: 'Negociação', ganho: 'Fechado ganho', perdido: 'Fechado perdido' },
  en: { novo: 'New request', contactado: 'Contacted', qualificacao: 'Qualifying', proposta: 'Proposal sent', negociacao: 'Negotiation', ganho: 'Won', perdido: 'Lost' },
}
export const RESERVA_LABEL = {
  pt: { pre: 'Pré-reserva', disp: 'Disponibilidade pendente', proposta: 'Proposta enviada', sinal: 'Aguarda sinal', confirmada: 'Confirmada', concluida: 'Concluída', cancelada: 'Cancelada' },
  en: { pre: 'Pre-booking', disp: 'Availability pending', proposta: 'Proposal sent', sinal: 'Awaiting deposit', confirmada: 'Confirmed', concluida: 'Completed', cancelada: 'Cancelled' },
}
export const PAY_LABEL = {
  pt: { pago: 'Pago', parcial: 'Parcialmente pago', nao_pago: 'Não pago' },
  en: { pago: 'Paid', parcial: 'Partially paid', nao_pago: 'Unpaid' },
}
export const SERVICE_LABEL = {
  pt: { makeup: 'Maquilhagem', hair: 'Cabelo', music: 'Música ao vivo' },
  en: { makeup: 'Makeup', hair: 'Hair', music: 'Live music' },
}
export const ROLE_LABEL = {
  pt: { maquilhadora: 'Maquilhadora', cabeleireira: 'Cabeleireira', musico: 'Músico', assistente: 'Assistente' },
  en: { maquilhadora: 'Makeup artist', cabeleireira: 'Hairstylist', musico: 'Musician', assistente: 'Assistant' },
}
export function svc(lang, keys) { return (keys || []).map((k) => SERVICE_LABEL[lang]?.[k] || k).join(' · ') }

export const PIPELINE_ORDER = ['novo', 'contactado', 'qualificacao', 'proposta', 'negociacao', 'ganho']

// ─── Empty default data (Supabase fills this) ─────────────────
export const defaultData = {
  team: [],
  conversas: [],
  leads: [],
  reservas: [],
  agendaEvents: [],
  settings: null,
  priceItems: [],
  proposals: [],
}

// ─── Supabase loader ──────────────────────────────────────────
export async function loadFromSupabase() {
  const [
    { data: teamRows },
    { data: convRows },
    { data: msgRows },
    { data: extRows },
    { data: leadRows },
    { data: bookRows },
    { data: btRows },
    { data: agendaRows },
  ] = await Promise.all([
    db.from('team').select('*').order('name'),
    db.from('conversations').select('*').order('time', { ascending: false }),
    db.from('messages').select('*').order('id'),
    db.from('extract_data').select('*'),
    db.from('leads').select('*'),
    db.from('bookings').select('*').order('data_evento'),
    db.from('booking_team').select('*'),
    db.from('agenda_events').select('*').order('day'),
  ])

  const [
    { data: settingsRows },
    { data: priceRows },
    { data: proposalRows },
  ] = await Promise.all([
    db.from('settings').select('*').limit(1),
    db.from('price_items').select('*').order('sort'),
    db.from('proposals').select('*').order('created_at', { ascending: false }),
  ])
  const settings = (settingsRows && settingsRows[0]) || null
  const priceItems = priceRows || []
  const proposals = proposalRows || []

  const team = (teamRows || []).map(r => ({
    id: r.id, name: r.name, role: r.role, initials: r.initials,
    color: r.color, load: r.load_count, status: r.status,
  }))

  const conversas = (convRows || []).map(c => {
    const msgs = (msgRows || []).filter(m => m.conversation_id === c.id)
      .map(m => ({ from: m.from_type, t: m.content, time: m.time }))
    const ext = (extRows || []).find(e => e.conversation_id === c.id)
    return {
      id: c.id, name: c.name, initials: c.initials, color: c.color,
      last: c.last_message, time: c.time, unread: c.unread_count,
      aiReady: c.ai_ready, phone: c.phone,
      messages: msgs.length ? msgs : undefined,
      extract: ext ? {
        nome: ext.nome, tipo: ext.tipo_evento, data: ext.data_evento,
        local: ext.local, servicos: ext.servicos || [], convidados: ext.convidados, obs: ext.obs,
      } : undefined,
    }
  })

  const leads = (leadRows || []).map(r => ({
    id: r.id, name: r.name, initials: r.initials, color: r.color,
    estado: r.estado, tipo: r.tipo, data: r.data_evento, local: r.local,
    servicos: r.servicos || [], convidados: r.convidados, valor: r.valor,
    origem: r.origem, phone: r.phone, email: r.email,
  }))

  const reservas = (bookRows || []).map(r => {
    const teamIds = (btRows || []).filter(bt => bt.booking_id === r.id).map(bt => bt.team_id)
    return {
      id: r.id, name: r.name, initials: r.initials, color: r.color,
      estado: r.estado, data: r.data_evento, hora: r.hora, local: r.local,
      tipo: r.tipo, servicos: r.servicos || [], team: teamIds,
      total: r.total, sinal: r.sinal, pago: r.pago, pay: r.pay_status,
      convidados: r.convidados, notes: r.notes,
    }
  })

  const agendaEvents = (agendaRows || []).map(r => ({
    id: r.id, day: r.day, name: r.name, local: r.local,
    team: r.team_ids || [], servicos: r.servicos || [], conflict: r.has_conflict,
  }))

  return { team, conversas, leads, reservas, agendaEvents, settings, priceItems, proposals }
}

// ─── Proposal generation ──────────────────────────────────────
// Picks, within each category, the price item whose `services` is a
// subset of the lead's selected services and matches the MOST services
// (most specific package wins).
function pickBest(items, selected) {
  const sel = new Set(selected || [])
  const eligible = items.filter(it => (it.services || []).every(s => sel.has(s)))
  if (!eligible.length) return null
  // prefer the one requiring the most services; tie-break by sort
  return eligible.sort((a, b) =>
    (b.services?.length || 0) - (a.services?.length || 0) || (a.sort || 0) - (b.sort || 0)
  )[0]
}

export function generateProposalContent(lead, settings, priceItems) {
  const selected = lead.servicos || []
  const noiva = (priceItems || []).filter(p => p.category === 'noiva')
  const convidadas = (priceItems || []).filter(p => p.category === 'convidadas')
  const extras = (priceItems || []).filter(p => p.category === 'extra')

  const mainPkg = pickBest(noiva, selected)
  const convPkg = pickBest(convidadas, selected)
  const s = settings || {}

  const toLine = (it) => it ? ({ title: it.title, description: it.description || '', price: Number(it.price) || 0, unit: it.unit || '' }) : null

  return {
    company: s.company_name || 'Ramo Eventos',
    location: s.location || 'Lisboa · Portugal',
    logo_url: s.logo_url || '',
    about: s.about || '',
    packages: [toLine(mainPkg)].filter(Boolean),
    convidadas: [toLine(convPkg)].filter(Boolean),
    extras: (extras || []).map(e => ({ title: e.title, description: e.description || '', price: Number(e.price) || 0, unit: e.unit || '' })),
    deslocacao_rate: s.deslocacao_rate ?? 0.5,
    payment: s.payment_terms || '',
    terms: s.terms || '',
  }
}

// ─── CRUD helpers ─────────────────────────────────────────────
const AVATAR_COLORS = [PALETTE.terracotta, PALETTE.sage, PALETTE.gold, PALETTE.clay, PALETTE.terracottaDark, PALETTE.inkSoft]

export function genId() {
  return (globalThis.crypto?.randomUUID?.() || ('id' + Date.now() + Math.random().toString(16).slice(2)))
}
export function initialsOf(name) {
  const p = (name || '').trim().split(/\s+/)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?'
}
export function colorFor(seed) {
  let h = 0
  for (const c of (seed || 'x')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

// ─── Extract lead fields from pasted WhatsApp text (heuristic, PT/EN) ───
const _MONTHS = { janeiro:0,fevereiro:1,'março':2,marco:2,abril:3,maio:4,junho:5,julho:6,agosto:7,setembro:8,outubro:9,novembro:10,dezembro:11,
  jan:0,fev:1,mar:2,abr:3,mai:4,jun:5,jul:6,ago:7,set:8,out:9,nov:10,dez:11,
  january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11 }
const _ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function _extractDate(text) {
  let m = text.match(/(\d{1,2})\s*(?:de\s+)?([a-zA-Zçà-úÀ-Ú]{3,})(?:\s*(?:de\s+)?(\d{4}))?/)
  if (m) {
    const mi = _MONTHS[m[2].toLowerCase()]
    if (mi != null) { const y = m[3] || (new Date().getFullYear() + 0); return `${+m[1]} ${_ABBR[mi]} ${y}` }
  }
  m = text.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/)
  if (m) { const d = +m[1], mi = +m[2] - 1; let y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : new Date().getFullYear(); if (mi >= 0 && mi < 12) return `${d} ${_ABBR[mi]} ${y}` }
  return null
}

export function extractLead(text) {
  const lower = (text || '').toLowerCase()
  const svcMap = [
    ['makeup', /maquilhag|make[ -]?up/], ['hair', /cabelo|penteado|hair/],
    ['photo', /fotograf|fotógraf|photo/], ['dj', /\bdj\b/],
    ['music', /música ao vivo|live music|banda|músico/], ['planning', /wedding planner|planeamento|coordenaç/],
    ['video', /v[ií]deo/],
  ]
  const servicos = svcMap.filter(([, re]) => re.test(lower)).map(([k]) => k)
  const g = lower.match(/(\d{1,4})\s*(convidad|pessoas|guests|invitad)/)
  const convidados = g ? Number(g[1]) : null
  const data = _extractDate(text)
  const tipo = /aniversá|birthday/.test(lower) ? 'Aniversário'
    : /casa(mento|r)|wedding|noiv/.test(lower) ? 'Casamento'
    : /convidad|guest/.test(lower) ? 'Convidada' : 'Casamento'
  let local = null
  const lm = (text || '').match(/\b(?:em|na|no|at|in)\s+([A-ZÀ-Þ][\wÀ-ÿ'’.\- ]{2,40})/)
  if (lm) local = lm[1].trim().replace(/[.,;!?].*$/, '').trim()
  return { tipo, data, local, servicos, convidados }
}

export async function insertRow(table, row) {
  const { data, error } = await db.from(table).insert(row).select()
  if (error) throw error
  return data?.[0]
}
export async function updateRow(table, id, patch) {
  const { error } = await db.from(table).update(patch).eq('id', id)
  if (error) throw error
}
export async function deleteRow(table, id) {
  const { error } = await db.from(table).delete().eq('id', id)
  if (error) throw error
}
