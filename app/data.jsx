// data.jsx — shared mock data, i18n strings, and visual primitives for "Ramo"
// Operação para equipas de eventos. Brand: Hairstyled by Joana design system.

// ─────────────────────────────────────────────────────────────
// i18n — PT (default) / EN. t(lang, key)
// ─────────────────────────────────────────────────────────────
const STR = {
  pt: {
    appName: 'Ramo', appTagline: 'Operação para equipas de eventos',
    tab_inicio: 'Início', tab_conversas: 'Conversas', tab_negocios: 'Negócios',
    tab_agenda: 'Agenda', tab_financeiro: 'Financeiro',
    greeting: 'Bom dia', manager: 'Marta', today: 'Hoje',
    // dashboard
    comercial: 'Comercial', operacional: 'Operacional', financeiro: 'Financeiro',
    leads_recebidas: 'Leads recebidas', taxa_conversao: 'Taxa de conversão',
    propostas_enviadas: 'Propostas enviadas', proximos_eventos: 'Próximos eventos',
    disponibilidades: 'Disponibilidades', conflitos: 'Conflitos',
    receita_mes: 'Receita do mês', receita_prevista: 'Receita prevista',
    pagamentos_pendentes: 'Pagamentos pendentes', ver_tudo: 'Ver tudo',
    needs_attention: 'A precisar de si', este_mes: 'este mês',
    new_leads_wa: 'leads novas no WhatsApp', por_aprovar: 'por aprovar',
    // whatsapp
    conversas: 'Conversas', pesquisar: 'Pesquisar conversas', wa_connected: 'WhatsApp Business ligado',
    nova_lead: 'Nova lead', extrair: 'Extrair com IA', escrever: 'Escrever mensagem',
    ai_extraiu: 'A IA leu a conversa', criar_lead: 'Criar lead', rever: 'Rever',
    sugestao_resposta: 'Sugestão de resposta', sugestao_equipa: 'Sugestão de equipa',
    aprovar: 'Aprovar e enviar', editar: 'Editar', dados_extraidos: 'Dados extraídos',
    aprovacao_humana: 'Sempre com a sua aprovação',
    // fields
    nome: 'Nome', tipo_evento: 'Tipo de evento', data: 'Data', local: 'Local',
    servicos: 'Serviços', convidados: 'Convidados', observacoes: 'Observações',
    origem: 'Origem', telefone: 'Telefone', email: 'Email', valor: 'Valor', estado: 'Estado',
    equipa: 'Equipa', cliente: 'Cliente', hora: 'Hora',
    // negocios
    pipeline: 'Pipeline', reservas: 'Reservas', oportunidades: 'oportunidades',
    converter: 'Converter em reserva', detalhes: 'Detalhes', pagamentos: 'Pagamentos',
    documentos: 'Documentos', interno: 'Notas', historico: 'Histórico de contactos',
    // agenda
    calendario: 'Calendário', dia: 'Dia', semana: 'Semana', mes: 'Mês',
    disponivel: 'Disponível', indisponivel: 'Indisponível', ferias: 'Férias',
    carga: 'Carga de trabalho', conflito_detetado: 'Conflito detetado',
    ver_quem_disponivel: 'Quem está disponível',
    // financeiro
    faturacao: 'Faturação', em_divida: 'Em dívida', sinal: 'Sinal',
    total: 'Total', pago: 'Pago', parcial: 'Parcial', nao_pago: 'Não pago',
    pedir_pagamento: 'Pedir pagamento', registar: 'Registar pagamento',
    // docs
    orcamento: 'Orçamento', contrato: 'Contrato', proposta: 'Proposta comercial',
    brochura: 'Brochura', gerar: 'Gerar com IA', gerado_ia: 'Gerado pela IA',
    enviar_cliente: 'Enviar ao cliente', pre_visualizar: 'Pré-visualizar',
    // tarefas
    tarefas: 'Tarefas', responsavel: 'Responsável', prazo: 'Prazo',
    // generic
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
};
function makeT(lang) { return (k) => (STR[lang] && STR[lang][k]) || STR.pt[k] || k; }

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const PALETTE = {
  terracotta: '#A9744F', terracottaDark: '#8C5C3C', sage: '#93A07E',
  sageLight: '#C7CFB9', gold: '#C8A86B', paper: '#F5EFE6', paperWarm: '#EFE7DA',
  paperCard: '#FBF7F0', ink: '#4A3F35', inkSoft: '#6E6155', nearBlack: '#2E2820',
  clay: '#B25B43',
};
function hexToRgba(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// status → tone colors {bg, fg, dot}
function leadTone(estado) {
  const m = {
    novo: PALETTE.terracotta, contactado: PALETTE.sage, qualificacao: PALETTE.gold,
    proposta: PALETTE.sage, negociacao: PALETTE.terracotta, ganho: PALETTE.sage,
    perdido: PALETTE.inkSoft,
  };
  const base = m[estado] || PALETTE.inkSoft;
  return { bg: hexToRgba(base, 0.14), fg: base, dot: base };
}
function reservaTone(estado) {
  const m = {
    pre: PALETTE.inkSoft, disp: PALETTE.gold, proposta: PALETTE.gold,
    sinal: PALETTE.terracotta, confirmada: PALETTE.sage, concluida: PALETTE.nearBlack,
    cancelada: PALETTE.clay,
  };
  const base = m[estado] || PALETTE.inkSoft;
  return { bg: hexToRgba(base, 0.14), fg: base, dot: base };
}
const LEAD_LABEL = {
  pt: { novo: 'Novo pedido', contactado: 'Contactado', qualificacao: 'Qualificação', proposta: 'Proposta enviada', negociacao: 'Negociação', ganho: 'Fechado ganho', perdido: 'Fechado perdido' },
  en: { novo: 'New request', contactado: 'Contacted', qualificacao: 'Qualifying', proposta: 'Proposal sent', negociacao: 'Negotiation', ganho: 'Won', perdido: 'Lost' },
};
const RESERVA_LABEL = {
  pt: { pre: 'Pré-reserva', disp: 'Disponibilidade pendente', proposta: 'Proposta enviada', sinal: 'Aguarda sinal', confirmada: 'Confirmada', concluida: 'Concluída', cancelada: 'Cancelada' },
  en: { pre: 'Pre-booking', disp: 'Availability pending', proposta: 'Proposal sent', sinal: 'Awaiting deposit', confirmada: 'Confirmed', concluida: 'Completed', cancelada: 'Cancelled' },
};
const PAY_LABEL = {
  pt: { pago: 'Pago', parcial: 'Parcialmente pago', nao_pago: 'Não pago' },
  en: { pago: 'Paid', parcial: 'Partially paid', nao_pago: 'Unpaid' },
};
const SERVICE_LABEL = {
  pt: { makeup: 'Maquilhagem', hair: 'Cabelo', photo: 'Fotografia', dj: 'DJ', music: 'Música ao vivo', planning: 'Wedding planning', video: 'Vídeo' },
  en: { makeup: 'Makeup', hair: 'Hair', photo: 'Photography', dj: 'DJ', music: 'Live music', planning: 'Wedding planning', video: 'Video' },
};
const ROLE_LABEL = {
  pt: { maquilhadora: 'Maquilhadora', cabeleireira: 'Cabeleireira', fotografo: 'Fotógrafo', dj: 'DJ', musico: 'Músico', planner: 'Wedding Planner', assistente: 'Assistente' },
  en: { maquilhadora: 'Makeup artist', cabeleireira: 'Hairstylist', fotografo: 'Photographer', dj: 'DJ', musico: 'Musician', planner: 'Wedding planner', assistente: 'Assistant' },
};
function svc(lang, keys) { return keys.map((k) => SERVICE_LABEL[lang][k]).join(' · '); }

// ─────────────────────────────────────────────────────────────
// TEAM
// ─────────────────────────────────────────────────────────────
const TEAM = [
  { id: 'ines', name: 'Inês Carvalho', role: 'maquilhadora', initials: 'IC', color: PALETTE.terracotta, load: 4, status: 'disp' },
  { id: 'sofia', name: 'Sofia Nunes', role: 'cabeleireira', initials: 'SN', color: PALETTE.sage, load: 5, status: 'disp' },
  { id: 'miguel', name: 'Miguel Torres', role: 'fotografo', initials: 'MT', color: PALETTE.gold, load: 3, status: 'disp' },
  { id: 'rui', name: 'Rui Almeida', role: 'dj', initials: 'RA', color: PALETTE.clay, load: 2, status: 'ferias' },
  { id: 'bruno', name: 'Bruno Lima', role: 'musico', initials: 'BL', color: PALETTE.inkSoft, load: 2, status: 'disp' },
  { id: 'carla', name: 'Carla Mendes', role: 'planner', initials: 'CM', color: PALETTE.terracottaDark, load: 3, status: 'indisp' },
  { id: 'helena', name: 'Helena Dias', role: 'assistente', initials: 'HD', color: PALETTE.sage, load: 1, status: 'disp' },
];
function teamById(id) { return TEAM.find((m) => m.id === id); }

// ─────────────────────────────────────────────────────────────
// CONVERSAS (WhatsApp)
// ─────────────────────────────────────────────────────────────
const CONVERSAS = [
  {
    id: 'ana', name: 'Ana Pereira', initials: 'AP', color: PALETTE.terracotta,
    last: 'Queria maquilhagem e cabelo para mim e as minhas 4 damas…',
    time: '14:32', unread: 2, aiReady: true, phone: '+351 912 345 678',
    messages: [
      { from: 'them', t: 'Boa tarde 🙂 Vi o vosso trabalho no Instagram e adorei!', time: '14:21' },
      { from: 'them', t: 'Vou casar no dia 12 de setembro, na Quinta dos Sonhos, em Sintra. Seremos cerca de 120 convidados.', time: '14:22' },
      { from: 'them', t: 'Queria maquilhagem e cabelo para mim e as minhas 4 damas. É possível?', time: '14:32' },
    ],
    extract: {
      nome: 'Ana Pereira', tipo: 'Casamento', data: '12 Set 2026',
      local: 'Quinta dos Sonhos, Sintra', servicos: ['makeup', 'hair'],
      convidados: 120, obs: 'Noiva + 4 damas · Veio do Instagram',
    },
  },
  { id: 'rita', name: 'Rita Fonseca', initials: 'RF', color: PALETTE.sage, last: 'Perfeito, muito obrigada! Fico a aguardar.', time: '11:08', unread: 0, aiReady: false, phone: '+351 933 221 100' },
  { id: 'beatriz', name: 'Beatriz Costa', initials: 'BC', color: PALETTE.gold, last: 'Conseguem mesmo no dia 20 de junho?', time: 'Ontem', unread: 1, aiReady: false, phone: '+351 961 887 220' },
  { id: 'catarina', name: 'Catarina Lopes', initials: 'CL', color: PALETTE.clay, last: '🎙️ Mensagem de voz · 0:18', time: 'Ontem', unread: 0, aiReady: false, phone: '+351 915 552 010' },
  { id: 'mariana', name: 'Mariana Reis', initials: 'MR', color: PALETTE.terracottaDark, last: 'Combinado para a reunião de quinta.', time: 'Seg', unread: 0, aiReady: false, phone: '+351 938 010 455' },
];

// ─────────────────────────────────────────────────────────────
// LEADS (pipeline)
// ─────────────────────────────────────────────────────────────
const LEADS = [
  { id: 'ana', name: 'Ana & Pedro', initials: 'AP', color: PALETTE.terracotta, estado: 'novo', tipo: 'Casamento', data: '12 Set 2026', local: 'Sintra', servicos: ['makeup', 'hair'], convidados: 120, valor: '€ 1.250', origem: 'WhatsApp', phone: '+351 912 345 678', email: 'ana.pereira@email.pt' },
  { id: 'catarina', name: 'Catarina Lopes', initials: 'CL', color: PALETTE.clay, estado: 'contactado', tipo: 'Aniversário', data: '28 Jun 2026', local: 'Lisboa', servicos: ['music'], convidados: 60, valor: '€ 600', origem: 'WhatsApp', phone: '+351 915 552 010', email: 'catarina@email.pt' },
  { id: 'mariana', name: 'Mariana Reis', initials: 'MR', color: PALETTE.terracottaDark, estado: 'qualificacao', tipo: 'Casamento', data: '3 Out 2026', local: 'Óbidos', servicos: ['planning'], convidados: 90, valor: '€ 3.500', origem: 'Instagram', phone: '+351 938 010 455', email: 'mariana.reis@email.pt' },
  { id: 'rita', name: 'Rita Fonseca', initials: 'RF', color: PALETTE.sage, estado: 'proposta', tipo: 'Convidada', data: '5 Jul 2026', local: 'Cascais', servicos: ['makeup'], convidados: 1, valor: '€ 95', origem: 'WhatsApp', phone: '+351 933 221 100', email: 'rita.f@email.pt' },
  { id: 'beatriz', name: 'Beatriz & João', initials: 'BJ', color: PALETTE.gold, estado: 'negociacao', tipo: 'Casamento', data: '20 Jun 2026', local: 'Cascais', servicos: ['dj', 'photo'], convidados: 140, valor: '€ 2.100', origem: 'Referência', phone: '+351 961 887 220', email: 'beatriz.costa@email.pt' },
  { id: 'teresa', name: 'Teresa & Nuno', initials: 'TN', color: PALETTE.inkSoft, estado: 'ganho', tipo: 'Casamento', data: '16 Mai 2026', local: 'Mafra', servicos: ['makeup', 'hair', 'photo'], convidados: 110, valor: '€ 2.900', origem: 'Instagram', phone: '+351 910 000 111', email: 'teresa@email.pt' },
];
const PIPELINE_ORDER = ['novo', 'contactado', 'qualificacao', 'proposta', 'negociacao', 'ganho'];

// ─────────────────────────────────────────────────────────────
// RESERVAS
// ─────────────────────────────────────────────────────────────
const RESERVAS = [
  {
    id: 'sara', name: 'Sara & Tiago', initials: 'ST', color: PALETTE.terracotta,
    estado: 'confirmada', data: '20 Jun 2026', hora: '09:00', local: 'Quinta da Boavista, Cascais',
    tipo: 'Casamento', servicos: ['makeup', 'hair', 'photo'], team: ['ines', 'sofia', 'miguel'],
    total: 2400, sinal: 720, pago: 720, pay: 'parcial', convidados: 130,
    notes: 'Prova de penteado feita a 2 Jun. Noiva quer apanhado baixo com flores naturais.',
  },
  {
    id: 'filipa', name: 'Filipa & André', initials: 'FA', color: PALETTE.gold,
    estado: 'sinal', data: '27 Jun 2026', hora: '16:00', local: 'Palácio dos Marqueses, Oeiras',
    tipo: 'Casamento', servicos: ['dj', 'music'], team: ['rui', 'bruno'],
    total: 1800, sinal: 540, pago: 0, pay: 'nao_pago', convidados: 160,
    notes: 'Confirmar lista de músicas até 15 Jun. Som para cerimónia ao ar livre.',
  },
  {
    id: 'mafalda', name: 'Mafalda Reis', initials: 'MA', color: PALETTE.sage,
    estado: 'proposta', data: '5 Jul 2026', hora: '08:30', local: 'Hotel Tivoli, Lisboa',
    tipo: 'Convidada', servicos: ['makeup'], team: ['ines'],
    total: 95, sinal: 0, pago: 0, pay: 'nao_pago', convidados: 1,
    notes: 'Convidada de casamento. Maquilhagem natural, tons quentes.',
  },
  {
    id: 'carolina', name: 'Carolina & Hugo', initials: 'CH', color: PALETTE.terracottaDark,
    estado: 'disp', data: '12 Set 2026', hora: '08:00', local: 'Quinta dos Sonhos, Sintra',
    tipo: 'Casamento', servicos: ['makeup', 'hair'], team: [],
    total: 1250, sinal: 0, pago: 0, pay: 'nao_pago', convidados: 120,
    notes: 'A verificar disponibilidade da equipa para a data.',
  },
  {
    id: 'teresa', name: 'Teresa & Nuno', initials: 'TN', color: PALETTE.inkSoft,
    estado: 'concluida', data: '16 Mai 2026', hora: '09:00', local: 'Palácio de Mafra',
    tipo: 'Casamento', servicos: ['makeup', 'hair', 'photo'], team: ['ines', 'sofia', 'miguel'],
    total: 2900, sinal: 870, pago: 2900, pay: 'pago', convidados: 110,
    notes: 'Evento concluído. Testemunho recebido — 5 estrelas.',
  },
];
function reservaById(id) { return RESERVAS.find((r) => r.id === id); }

// upcoming events for agenda (confirmed/booked, sorted)
const AGENDA_EVENTS = [
  { id: 'beatriz', day: 20, name: 'Beatriz & João', local: 'Cascais', team: ['rui', 'miguel'], servicos: ['dj', 'photo'], conflict: false },
  { id: 'sara', day: 20, name: 'Sara & Tiago', local: 'Cascais', team: ['ines', 'sofia', 'miguel'], servicos: ['makeup', 'hair', 'photo'], conflict: true },
  { id: 'filipa', day: 27, name: 'Filipa & André', local: 'Oeiras', team: ['rui', 'bruno'], servicos: ['dj', 'music'], conflict: false },
];

Object.assign(window, {
  STR, makeT, PALETTE, hexToRgba, leadTone, reservaTone,
  LEAD_LABEL, RESERVA_LABEL, PAY_LABEL, SERVICE_LABEL, ROLE_LABEL, svc,
  TEAM, teamById, CONVERSAS, LEADS, PIPELINE_ORDER, RESERVAS, reservaById, AGENDA_EVENTS,
});
