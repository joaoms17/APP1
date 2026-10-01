import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { db } from './supabase'
import { fetchGoogleEvents } from './gcal'
import { compressImage } from './img'
import { FEATURES } from './features.js'
import { todayYMD, toYMD, fmtMoney } from './format.js'
import * as S from './selectors.js'
import { humanError, userError, isSetupError } from './errors.js'
import { useToast, detailsAction } from './ui/Toast.jsx'
import { openSheet } from './router.js'

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)
export { humanError }

const EPS = 0.005
const nowIso = () => new Date().toISOString()
const money = (n) => fmtMoney(n, { cents: 'auto' })
const sumAmount = (ps) => ps.reduce((a, p) => a + Number(p.amount), 0)

// localStorage (modo privado/bloqueado nunca rebenta)
const LS = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { if (v == null || v === '') localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* sem armazenamento */ } },
  json: (k) => { try { return JSON.parse(localStorage.getItem(k)) || {} } catch { return {} } },
}
const K_LAST_PROJECT = 'joana.v2.ultimoProjeto'
const K_RECEBER_SEEN = 'joana.v2.receberVistoEm'
const K_GCAL_OK = 'joana.v2.gcal'
const K_PENDING = 'joana.v2.pendente'

// remoções à espera do Anular, guardadas até serem gravadas: se a página for recarregada ou
// fechada dentro dos 10 s, o arranque seguinte conclui-as (o pagehide não chega a gravar)
const Pending = {
  list: () => { try { const v = JSON.parse(localStorage.getItem(K_PENDING)); return Array.isArray(v) ? v : [] } catch { return [] } },
  add(item) { LS.set(K_PENDING, JSON.stringify([...Pending.list().filter((x) => !(x.kind === item.kind && x.id === item.id)), item])) },
  drop(kind, id) {
    const rest = Pending.list().filter((x) => !(x.kind === kind && x.id === id))
    LS.set(K_PENDING, rest.length ? JSON.stringify(rest) : null)
  },
}
const HIDDEN_KEY = { event: 'events', expense: 'expenses', payment: 'payments', attachment: 'attachments', gcal: 'gcal' }

// tabela que ainda não existe (SQL por correr): lê-se como vazia, nunca bloqueia a app.
// Qualquer outra falha de leitura lança e o estado anterior fica como estava (nunca "sem pagamentos").
const isMissingTable = (e) => ['42P01', 'PGRST205'].includes(String(e?.code || ''))
const rowsOrThrow = ({ data, error }) => {
  if (error && !isMissingTable(error)) throw error
  return data || []
}

// junta/atualiza linhas no estado local depois de uma escrita (a lista fica certa mesmo que a
// leitura seguinte falhe); sort = ordem da leitura da BD
const upsertRows = (rows, add, sort) => {
  const byId = new Map(add.filter(Boolean).map((r) => [r.id, r]))
  if (!byId.size) return rows
  const out = rows.map((r) => (byId.has(r.id) ? { ...r, ...byId.get(r.id) } : r))
  for (const r of byId.values()) if (!rows.some((x) => x.id === r.id)) out.push(r)
  return sort ? out.sort(sort) : out
}
const byKeyDesc = (k) => (a, b) => (a[k] < b[k] ? 1 : a[k] > b[k] ? -1 : 0)
const byKeyAsc = (k) => (a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0)
const EVENTS_ORDER = byKeyDesc('event_date')
const EXPENSES_ORDER = byKeyDesc('expense_date')

// ids escondidos enquanto uma remoção espera pelo Anular
const NO_HIDDEN = { events: new Set(), expenses: new Set(), payments: new Set(), attachments: new Set(), gcal: new Set() }
const visible = (rows, hidden) => (hidden.size ? rows.filter((r) => !hidden.has(r.id)) : rows)

// campos vazios dos formulários → null (a BD recusa '' em time/numeric)
const blank = (v) => v == null || (typeof v === 'string' && !v.trim())
function cleanEvent(ev) {
  const row = { ...ev }
  for (const k of ['start_time', 'location', 'notes', 'gross_value']) if (k in row && blank(row[k])) row[k] = null
  return row
}
function cleanExpense(ex) {
  const row = { ...ex }
  for (const k of ['project_id', 'category']) if (k in row && blank(row[k])) row[k] = null
  return row
}
let ghostSeq = 0

export function StoreProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [rawEvents, setEvents] = useState([])
  const [rawExpenses, setExpenses] = useState([])
  const [phase1, setPhase1] = useState(true)   // projetos + eventos + pagamentos (a Agenda fica utilizável)
  const [phase2, setPhase2] = useState(true)   // despesas, anexos, calendários Google (+ documentos)
  const [error, setError] = useState(null)
  const [errorInfo, setErrorInfo] = useState(null)
  const [rawPayments, setPayments] = useState([])
  const [rawAttachments, setAttachments] = useState([])
  const [services, setServices] = useState([])
  const [quotes, setQuotes] = useState([])
  const [quoteItems, setQuoteItems] = useState([])
  // as linhas acabadas de ler (o acceptQuote logo a seguir ao saveQuote não pode usar o estado do render)
  const quoteItemsRef = useRef([])
  const [scheduleItems, setScheduleItems] = useState([])
  const [rawGcal, setGcalCalendars] = useState([])
  const [gcalData, setGcalData] = useState({}) // calendar_id → { events, ok, at, lastOkAt, message, detail }
  const [gcalBusy, setGcalBusy] = useState(0)
  const [pendingUndo, setPendingUndo] = useState(null) // {kind:'event'|'expense', row} (compatibilidade v1)
  const [hidden, setHidden] = useState(NO_HIDDEN)
  const [overrides, setOverrides] = useState({}) // event_id → campos otimistas (paid, receipt_issued…)
  const [ghosts, setGhosts] = useState([]) // pagamentos a gravar (aparecem logo; pending: true)
  const ghostRef = useRef([])
  const [today, setToday] = useState(todayYMD)
  const [lastProjectId, setLastProjectIdState] = useState(() => LS.get(K_LAST_PROJECT) || null)
  const [receberSeenAt, setReceberSeenAt] = useState(() => LS.get(K_RECEBER_SEEN))
  const toast = useToast()
  const lastGcalFetch = useRef(0)
  const gcalInflight = useRef(new Set())
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const loadEvents = useCallback(async () => {
    const { data, error } = await db.from('events').select('*').order('event_date', { ascending: false })
    if (error) throw error
    setEvents(data)
  }, [])

  const loadExpenses = useCallback(async () => {
    const { data, error } = await db.from('expenses').select('*').order('expense_date', { ascending: false })
    if (error) throw error
    setExpenses(data)
  }, [])

  // a última leitura de payments correu bem: o "Recebi" só calcula o que falta com ela
  const paymentsFresh = useRef(false)
  const loadPayments = useCallback(async () => {
    let rows
    try {
      rows = rowsOrThrow(await db.from('payments').select('*').order('paid_at'))
    } catch (e) {
      paymentsFresh.current = false
      throw e
    }
    paymentsFresh.current = true
    setPayments(rows)
    return rows
  }, [])

  // falhas de leitura que não bloqueiam a app (anexos, lista de calendários): avisos visíveis
  const [loadFailed, setLoadFailed] = useState({ attachments: null, gcal: null })
  const markLoad = (k, err) => setLoadFailed((s) => (s[k] === (err || null) ? s : { ...s, [k]: err || null }))

  const loadAttachments = useCallback(async () => {
    try {
      setAttachments(rowsOrThrow(await db.from('attachments').select('*').order('created_at')))
      markLoad('attachments', null)
    } catch (e) {
      markLoad('attachments', humanError(e))
      throw e
    }
  }, [])

  const loadQuotes = useCallback(async () => {
    // estas tabelas podem ainda não existir — nunca bloquear a app (mas uma falha não as esvazia)
    const [s, q, qi, sc] = await Promise.all([
      db.from('services').select('*').order('sort_order'),
      db.from('quotes').select('*').order('created_at', { ascending: false }),
      db.from('quote_items').select('*').order('sort_order'),
      db.from('schedule_items').select('*').order('time_at'),
    ])
    const rows = [s, q, qi, sc].map(rowsOrThrow)
    setServices(rows[0])
    setQuotes(rows[1])
    quoteItemsRef.current = rows[2]
    setQuoteItems(quoteItemsRef.current)
    setScheduleItems(rows[3])
  }, [])

  const loadGcalCalendars = useCallback(async () => {
    try {
      setGcalCalendars(rowsOrThrow(await db.from('gcal_calendars').select('*').order('created_at')))
      markLoad('gcal', null)
    } catch (e) {
      markLoad('gcal', humanError(e))
      throw e
    }
  }, [])

  const fail = (e) => {
    setError(e?.message || String(e))
    setErrorInfo(humanError(e))
  }

  // remoções que ficaram à espera do Anular quando a página saiu: esconde-as já (no mesmo
  // render que os dados) e grava-as a seguir
  const resumePending = useRef(null)

  // carregamento em 2 fases (spec §10.2): a Agenda fica utilizável depois da fase 1
  const load = useCallback(async () => {
    setError(null)
    setErrorInfo(null)
    setPhase1(true)
    setPhase2(true)
    let evRows
    try {
      const [pr, ev] = await Promise.all([
        db.from('projects').select('*').order('sort_order'),
        db.from('events').select('*').order('event_date', { ascending: false }),
        loadPayments(),
      ])
      if (pr.error) throw pr.error
      if (ev.error) throw ev.error
      setProjects(pr.data)
      setEvents(ev.data)
      evRows = ev.data
    } catch (e) {
      fail(e)
      setPhase1(false)
      setPhase2(false)
      return
    }
    const resume = resumePending.current?.(evRows)
    setPhase1(false)
    const [ex, att, gc] = await Promise.allSettled([
      loadExpenses(), loadAttachments(), loadGcalCalendars(), FEATURES.docs ? loadQuotes() : null,
    ])
    if (ex.status === 'rejected') fail(ex.reason)
    else warnLoadFailed(att.status === 'rejected', gc.status === 'rejected')
    setPhase2(false)
    await resume
  }, [loadPayments, loadExpenses, loadAttachments, loadGcalCalendars, loadQuotes])

  useEffect(() => { load() }, [load])

  // anexos ou calendários por ler: toast de erro com "Tentar de novo" (e as marcas no Detalhe,
  // nas Definições e na faixa do Google) — nunca "nenhum anexo" / "sem calendários" em silêncio
  const warnLoadFailed = (att, gc) => {
    if (!att && !gc) return
    const what = [att && 'os anexos', gc && 'os calendários do Google'].filter(Boolean).join(' nem ')
    toast.notify({
      text: `Não foi possível carregar ${what}.`, icon: 'alert', tone: 'error', duration: 10000,
      action: { label: 'Tentar de novo', run: () => retryLoads(att, gc) },
    })
  }
  const retryLoads = async (att = true, gc = true) => {
    const [a, g] = await Promise.allSettled([att ? loadAttachments() : null, gc ? loadGcalCalendars() : null])
    warnLoadFailed(a.status === 'rejected', g.status === 'rejected')
  }

  // o dia muda à meia-noite e ao voltar à app
  useEffect(() => {
    const tick = () => setToday((t) => { const n = todayYMD(); return n === t ? t : n })
    const id = setInterval(tick, 60 * 1000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [])

  // ---------- dados visíveis: sem o que está à espera do Anular, com os valores otimistas ----------
  const events = useMemo(() => {
    const rows = visible(rawEvents, hidden.events)
    return Object.keys(overrides).length ? rows.map((e) => (overrides[e.id] ? { ...e, ...overrides[e.id] } : e)) : rows
  }, [rawEvents, hidden.events, overrides])
  const expenses = useMemo(() => visible(rawExpenses, hidden.expenses), [rawExpenses, hidden.expenses])
  const payments = useMemo(() => {
    const rows = visible(rawPayments, hidden.payments)
    return ghosts.length ? [...rows, ...ghosts] : rows
  }, [rawPayments, hidden.payments, ghosts])
  const attachments = useMemo(() => visible(rawAttachments, hidden.attachments), [rawAttachments, hidden.attachments])
  const gcalCalendars = useMemo(() => visible(rawGcal, hidden.gcal), [rawGcal, hidden.gcal])

  const hide = useCallback((kind, id, on) => setHidden((h) => {
    const s = new Set(h[kind])
    if (on) s.add(id); else s.delete(id)
    return { ...h, [kind]: s }
  }), [])
  const setOverride = useCallback((id, fields) => setOverrides((o) => ({ ...o, [id]: { ...o[id], ...fields } })), [])
  const clearOverride = useCallback((id, ...keys) => setOverrides((o) => {
    if (!o[id]) return o
    const rest = { ...o[id] }
    for (const k of keys) delete rest[k]
    const n = { ...o }
    if (Object.keys(rest).length) n[id] = rest; else delete n[id]
    return n
  }), [])

  // ---------- depois de uma escrita bem-sucedida ----------------------------------------
  // A escrita já está na BD e no estado local; recarregar é só para apanhar o resto. Uma falha
  // aqui nunca chega ao "Não foi possível guardar" (o "Tentar de novo" voltaria a inserir):
  // fica na consola e o "Recebi" seguinte volta a ler os pagamentos antes de calcular.
  const reloadAfterWrite = async (...loaders) => {
    try {
      await Promise.all(loaders.filter(Boolean).map((f) => f()))
      return true
    } catch (ex) {
      console.warn('Gravado, mas não foi possível recarregar:', humanError(ex).detail)
      return false
    }
  }
  const putEventsLocal = (...rows) => setEvents((es) => upsertRows(es, rows, EVENTS_ORDER))
  const patchEventLocal = (id, patch) => setEvents((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  const saveEvent = async (ev) => {
    const row = { ...cleanEvent(ev), updated_at: nowIso() }
    const { data, error } = ev.id
      ? await db.from('events').update(row).eq('id', ev.id).select()
      : await db.from('events').insert(row).select()
    if (error) throw error
    if (data?.length) putEventsLocal(...data)
    else if (ev.id) patchEventLocal(ev.id, row)
    await reloadAfterWrite(loadEvents)
  }

  // --- pagamentos parciais ---------------------------------------------
  const paymentsByEvent = useMemo(() => S.paymentsByEventOf(payments), [payments])

  // recebido até agora: soma dos pagamentos; eventos antigos sem pagamentos
  // registados contam pelo flag paid
  const paidAmount = useCallback((ev) => S.paidAmountOf(ev, paymentsByEvent), [paymentsByEvent])

  const paymentState = useCallback((ev) => {
    const got = paidAmount(ev)
    const total = Number(ev.value)
    if (ev.paid || (total > 0 && got >= total - EPS)) return 'paid'
    if (got > EPS) return 'partial'
    return 'unpaid'
  }, [paidAmount])

  // grava o flag paid do evento a partir dos pagamentos na BD (sem os ids de `without`, que vão
  // ser apagados a seguir) → { paid, paid_at }. Lança se a leitura ou a escrita falharem: quem
  // apaga pagamentos chama-o ANTES do delete, para um evento nunca ficar "Recebido" sem pagamentos.
  const syncPaidFlag = async (ev, without = []) => {
    const { data: ps, error: e1 } = await db.from('payments').select('id, amount, paid_at').eq('event_id', ev.id)
    if (e1) throw e1
    const rows = (ps || []).filter((p) => !without.includes(p.id))
    const got = rows.reduce((a, p) => a + Number(p.amount), 0)
    const full = Number(ev.value) > 0 && got >= Number(ev.value) - EPS
    const lastDate = rows.map((p) => p.paid_at).sort().pop() || null
    const patch = { paid: full, paid_at: full ? lastDate : null }
    const { error: e2 } = await db.from('events').update({ ...patch, updated_at: nowIso() }).eq('id', ev.id)
    if (e2) throw e2
    patchEventLocal(ev.id, patch)
    return patch
  }
  // depois de inserir: o flag é secundário (com pagamentos manda a soma) — uma falha não desfaz nada
  const syncPaidFlagQuiet = async (ev) => {
    try { await syncPaidFlag(ev) } catch (ex) { console.warn('Flag paid por atualizar:', humanError(ex).detail) }
  }
  const putPaymentsLocal = (...rows) => setPayments((ps) => upsertRows(ps, rows, byKeyAsc('paid_at')))
  const dropPaymentLocal = (id) => setPayments((ps) => ps.filter((p) => p.id !== id))

  const addPayment = async (ev, amount, paid_at) => {
    const { data, error } = await db.from('payments').insert({ event_id: ev.id, amount, paid_at }).select()
    if (error) throw error
    putPaymentsLocal(...(data || []))
    await syncPaidFlagQuiet(ev)
    await reloadAfterWrite(loadEvents, loadPayments)
  }

  const deletePayment = async (payment, ev) => {
    await syncPaidFlag(ev, [payment.id])
    const { error } = await db.from('payments').delete().eq('id', payment.id)
    if (error) throw error
    dropPaymentLocal(payment.id)
    await reloadAfterWrite(loadEvents, loadPayments)
  }

  // --- orçamentos, tabela de preços e cronograma -------------------------
  const itemsForQuote = useCallback((quoteId) =>
    quoteItems.filter((i) => i.quote_id === quoteId), [quoteItems])

  const quoteTotal = useCallback((q) => {
    const items = quoteItems.filter((i) => i.quote_id === q.id)
    return items.reduce((a, i) => a + Number(i.unit_price) * i.qty, 0) - Number(q.discount || 0)
  }, [quoteItems])

  const saveService = async (s) => {
    const { error } = s.id
      ? await db.from('services').update(s).eq('id', s.id)
      : await db.from('services').insert(s)
    if (error) throw error
    await reloadAfterWrite(loadQuotes)
  }

  const deleteService = async (id) => {
    const { error } = await db.from('services').delete().eq('id', id)
    if (error) throw error
    await reloadAfterWrite(loadQuotes)
  }

  // guarda o orçamento e substitui as linhas de uma vez
  const saveQuote = async (q, items) => {
    let quoteId = q.id
    const row = { ...q, updated_at: nowIso() }
    if (quoteId) {
      const { error } = await db.from('quotes').update(row).eq('id', quoteId)
      if (error) throw error
    } else {
      const { data, error } = await db.from('quotes').insert(row).select('id').single()
      if (error) throw error
      quoteId = data.id
    }
    if (items) {
      await db.from('quote_items').delete().eq('quote_id', quoteId)
      if (items.length) {
        const { error } = await db.from('quote_items').insert(
          items.map((i, n) => ({ quote_id: quoteId, service_name: i.service_name, unit_price: i.unit_price, qty: i.qty, sort_order: n })))
        if (error) throw error
      }
    }
    await reloadAfterWrite(loadQuotes)
    return quoteId
  }

  const deleteQuote = async (id) => {
    const { error } = await db.from('quotes').delete().eq('id', id)
    if (error) throw error
    await reloadAfterWrite(loadQuotes)
  }

  // aceitar: cria o evento no projeto do orçamento e liga-o. O orçamento aberto a partir de um evento
  // (v2) já nasce ligado a ele: aí só fica aceite — um 2.º evento duplicava a receita e o "por receber"
  const acceptQuote = async (q) => {
    const linkedId = q.event_id ?? quotes.find((x) => x.id === q.id)?.event_id
    if (linkedId && live.current.events.some((e) => e.id === linkedId)) {
      const { error } = await db.from('quotes').update({ status: 'accepted', event_id: linkedId, updated_at: nowIso() }).eq('id', q.id)
      if (error) throw error
      await reloadAfterWrite(loadQuotes)
      return linkedId
    }
    const proj = projects.find((p) => p.id === q.project_id)
      || projects.find((p) => p.kind === 'hair') || projects[0]
    const items = quoteItemsRef.current.filter((i) => i.quote_id === q.id)
    const total = items.reduce((a, i) => a + Number(i.unit_price) * i.qty, 0) - Number(q.discount || 0)
    const { data: ev, error } = await db.from('events').insert({
      project_id: proj.id,
      title: proj.kind === 'hair' ? `Casamento ${q.client_name}` : q.client_name, // "Casamento" só nos Cabelos
      event_date: q.event_date || todayYMD(),
      location: q.location || null,
      gross_value: total,
      value: total,
      paid: false,
      notes: 'Criado a partir de orçamento aceite',
    }).select('id').single()
    if (error) throw error
    await db.from('quotes').update({ status: 'accepted', event_id: ev.id, updated_at: nowIso() }).eq('id', q.id)
    await reloadAfterWrite(loadEvents, loadQuotes)
    return ev.id
  }

  const scheduleFor = useCallback((eventId) =>
    scheduleItems.filter((s) => s.event_id === eventId), [scheduleItems])

  // substitui o cronograma do evento pelas linhas dadas
  const saveSchedule = async (eventId, rows) => {
    await db.from('schedule_items').delete().eq('event_id', eventId)
    const clean = rows.filter((r) => r.time_at && r.person?.trim())
    if (clean.length) {
      const { error } = await db.from('schedule_items').insert(
        clean.map((r) => ({ event_id: eventId, time_at: r.time_at, person: r.person.trim(), service: r.service?.trim() || null })))
      if (error) throw error
    }
    await reloadAfterWrite(loadQuotes)
  }

  // --- anexos (fotos de recibos/faturas) ---------------------------------
  const attachmentsFor = useCallback((kind, id) =>
    attachments.filter((a) => a.parent_kind === kind && a.parent_id === id), [attachments])

  // sobe o ficheiro e cria a linha, sem recarregar (usado em lote por createEvent/createExpense)
  const uploadAttachment = async (kind, id, file) => {
    const blob = await compressImage(file)
    const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'bin')
    const path = `${kind}/${id}/${Date.now()}.${ext}`
    const { error: upErr } = await db.storage.from('anexos').upload(path, blob, { contentType: blob.type || file.type })
    if (upErr) throw upErr
    const { data, error } = await db.from('attachments').insert({ parent_kind: kind, parent_id: id, path, name: file.name }).select()
    if (error) throw error
    return data?.[0] || null
  }
  const putAttachmentsLocal = (...rows) => setAttachments((as) => upsertRows(as, rows, byKeyAsc('created_at')))

  const addAttachment = async (kind, id, file) => {
    putAttachmentsLocal(await uploadAttachment(kind, id, file))
    await reloadAfterWrite(loadAttachments)
  }

  const deleteAttachment = async (att) => {
    await db.storage.from('anexos').remove([att.path])
    const { error } = await db.from('attachments').delete().eq('id', att.id)
    if (error) throw error
    setAttachments((as) => as.filter((a) => a.id !== att.id))
    await reloadAfterWrite(loadAttachments)
  }

  const attachmentUrl = async (att) => {
    const { data, error } = await db.storage.from('anexos').createSignedUrl(att.path, 3600)
    if (error) throw error
    return data.signedUrl
  }

  // logotipo do projeto (para os documentos)
  const setProjectLogo = async (project, file) => {
    const blob = await compressImage(file, 800)
    const path = `logos/${project.id}-${Date.now()}.jpg`
    const { error: upErr } = await db.storage.from('anexos').upload(path, blob, { contentType: blob.type || file.type })
    if (upErr) throw upErr
    if (project.logo_path) await db.storage.from('anexos').remove([project.logo_path]).catch(() => {})
    await saveProject({ id: project.id, logo_path: path })
  }

  const removeProjectLogo = async (project) => {
    if (project.logo_path) await db.storage.from('anexos').remove([project.logo_path]).catch(() => {})
    await saveProject({ id: project.id, logo_path: null })
  }

  const logoUrl = async (project) => {
    if (!project?.logo_path) return null
    const { data, error } = await db.storage.from('anexos').createSignedUrl(project.logo_path, 3600)
    if (error) throw error
    return data.signedUrl
  }

  // --- apagar com Anular (o registo só sai da base de dados quando o toast expira) ----
  // apaga o registo (se falhar, lança: o toast repõe a linha e avisa) e depois os anexos órfãos
  const finalizeUndo = useCallback(async (p) => {
    if (!p) return
    const { error } = await db.from(p.kind === 'event' ? 'events' : 'expenses').delete().eq('id', p.row.id)
    if (error) throw error
    try {
      const kind = p.kind === 'event' ? 'event' : 'expense'
      const { data: atts } = await db.from('attachments').select('*').eq('parent_kind', kind).eq('parent_id', p.row.id)
      if (atts?.length) {
        await db.storage.from('anexos').remove(atts.map((a) => a.path))
        await db.from('attachments').delete().eq('parent_kind', kind).eq('parent_id', p.row.id)
      }
    } catch { /* tabela de anexos pode não existir */ }
  }, [])

  // grava uma remoção diferida — { kind: event|expense|payment|attachment|gcal, id, … }.
  // Usada no fim do toast e no arranque (remoções que ficaram por gravar quando a página saiu).
  const commitRemoval = async (it, evRows) => {
    if (it.kind === 'event' || it.kind === 'expense') {
      await finalizeUndo({ kind: it.kind, row: { id: it.id } })
      if (it.kind === 'event') {
        setEvents((es) => es.filter((e) => e.id !== it.id))
        setPayments((ps) => ps.filter((p) => p.event_id !== it.id))
      } else setExpenses((es) => es.filter((e) => e.id !== it.id))
    } else if (it.kind === 'payment') {
      // o flag primeiro: se falhar, o pagamento fica (nunca "Recebido" sem pagamentos)
      const ev = (evRows || live.current.rawEvents).find((e) => e.id === it.event_id)
      if (ev) await syncPaidFlag(ev, [it.id])
      const { error } = await db.from('payments').delete().eq('id', it.id)
      if (error) throw error
      dropPaymentLocal(it.id)
    } else if (it.kind === 'attachment') {
      if (it.path) await db.storage.from('anexos').remove([it.path]).catch(() => {})
      const { error } = await db.from('attachments').delete().eq('id', it.id)
      if (error) throw error
      setAttachments((as) => as.filter((a) => a.id !== it.id))
    } else if (it.kind === 'gcal') {
      const { error } = await db.from('gcal_calendars').delete().eq('id', it.id)
      if (error) throw error
      setGcalCalendars((cs) => cs.filter((c) => c.id !== it.id))
    }
    Pending.drop(it.kind, it.id)
  }

  // remoção com Anular: esconde já e guarda-a em localStorage até ser gravada ou anulada
  const deferRemoval = (it, { text, run, undo, commit, retry }) => toast.undoable({
    text,
    run: async () => {
      Pending.add(it)
      hide(HIDDEN_KEY[it.kind], it.id, true)
      return (await run?.()) ?? it
    },
    undo: async () => {
      Pending.drop(it.kind, it.id)
      hide(HIDDEN_KEY[it.kind], it.id, false)
      await undo?.()
    },
    commit: async () => {
      await commitRemoval(it)
      hide(HIDDEN_KEY[it.kind], it.id, false)
      await commit?.()
    },
    retry,
  })

  resumePending.current = (evRows) => {
    const list = Pending.list().filter((it) => HIDDEN_KEY[it.kind] && it.id)
    if (!list.length) return null
    setHidden((h) => {
      const n = { ...h }
      for (const it of list) n[HIDDEN_KEY[it.kind]] = new Set([...n[HIDDEN_KEY[it.kind]], it.id])
      return n
    })
    return (async () => {
      for (const it of list) {
        try {
          await commitRemoval(it, evRows)
        } catch (ex) {
          Pending.drop(it.kind, it.id)
          toast.notifyError(ex)
        }
        hide(HIDDEN_KEY[it.kind], it.id, false)
      }
    })()
  }

  const softDelete = (kind, row) => deferRemoval({ kind, id: row.id }, {
    text: kind === 'event' ? 'Evento apagado' : 'Despesa apagada',
    run: async () => { setPendingUndo({ kind, row }); return row },
    undo: async () => { setPendingUndo(null) },
    commit: async () => { setPendingUndo((cur) => (cur?.row?.id === row.id ? null : cur)) },
    retry: () => softDelete(kind, row),
  })

  // v1: o "Anular" do toast antigo — agora anula a operação pendente do Toast
  const undoDelete = () => toast.undoCurrent()

  const deleteEvent = (row) => softDelete('event', row)
  const deleteExpense = (row) => softDelete('expense', row)

  const saveExpense = async (ex) => {
    const row = cleanExpense(ex)
    const { data, error } = ex.id
      ? await db.from('expenses').update(row).eq('id', ex.id).select()
      : await db.from('expenses').insert(row).select()
    if (error) throw error
    setExpenses((xs) => upsertRows(xs, data?.length ? data : ex.id ? [{ id: ex.id, ...row }] : [], EXPENSES_ORDER))
    await reloadAfterWrite(loadExpenses)
  }

  // --- Google Calendar: estado por calendário -------------------------------
  const gcalRef = useRef({ data: gcalData, cals: gcalCalendars })
  gcalRef.current = { data: gcalData, cals: gcalCalendars }

  const fetchCalendars = useCallback(async (cals) => {
    const list = cals.filter((c) => !gcalInflight.current.has(c.id))
    if (!list.length) return
    list.forEach((c) => gcalInflight.current.add(c.id))
    setGcalBusy((n) => n + 1)
    const results = await Promise.all(list.map((cal) =>
      fetchGoogleEvents(cal.url).then((evs) => ({ cal, evs }), (err) => ({ cal, err }))))
    list.forEach((c) => gcalInflight.current.delete(c.id))
    lastGcalFetch.current = Date.now()
    if (!mounted.current) return
    const at = nowIso()
    const okAt = LS.json(K_GCAL_OK)
    const patch = {}
    for (const { cal, evs, err } of results) {
      const prev = gcalRef.current.data[cal.id]
      if (err) {
        const h = humanError(err)
        patch[cal.id] = { events: prev?.events || [], ok: false, at, lastOkAt: prev?.lastOkAt || okAt[cal.id] || null, message: h.text, detail: h.detail }
      } else {
        patch[cal.id] = { events: evs, ok: true, at, lastOkAt: at, message: null, detail: null }
        okAt[cal.id] = at
      }
    }
    LS.set(K_GCAL_OK, JSON.stringify(okAt))
    setGcalData((d) => ({ ...d, ...patch }))
    setGcalBusy((n) => n - 1)
  }, [])

  // calendários novos (ou o primeiro carregamento): ir buscar os que ainda não têm dados
  useEffect(() => {
    const missing = gcalCalendars.filter((c) => !gcalRef.current.data[c.id])
    if (missing.length) fetchCalendars(missing)
  }, [gcalCalendars, fetchCalendars])

  // ao voltar à app, refrescar o Google Calendar (com folga de 5 min)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastGcalFetch.current < 5 * 60 * 1000) return
      fetchCalendars(gcalRef.current.cals)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [fetchCalendars])

  // "Tentar de novo": todos os calendários, sem folga (e a lista, se não foi possível lê-la)
  const gcalListFailed = useRef(false)
  gcalListFailed.current = !!loadFailed.gcal
  const refreshGcal = useCallback(async () => {
    if (gcalListFailed.current) {
      try { await loadGcalCalendars() } catch { return } // os novos calendários são lidos pelo efeito acima
    }
    return fetchCalendars(gcalRef.current.cals)
  }, [fetchCalendars, loadGcalCalendars])

  const googleEvents = useMemo(() => gcalCalendars.flatMap((cal) =>
    (gcalData[cal.id]?.events || []).map((e) => ({ ...e, project_id: cal.project_id, calendar_id: cal.id }))),
  [gcalCalendars, gcalData])

  const gcalStatus = useMemo(() => {
    const byCalendar = {}
    const failures = []
    let lastOkAt = null
    for (const cal of gcalCalendars) {
      const d = gcalData[cal.id]
      if (!d) continue
      byCalendar[cal.id] = { ok: d.ok, at: d.at, lastOkAt: d.lastOkAt, message: d.message, detail: d.detail }
      if (!d.ok) failures.push({ calendar_id: cal.id, project_id: cal.project_id, message: d.message })
      if (d.lastOkAt && (!lastOkAt || d.lastOkAt > lastOkAt)) lastOkAt = d.lastOkAt
    }
    // a própria lista de calendários não foi lida: o aviso aparece na faixa (Agenda, Receber)
    if (loadFailed.gcal) failures.push({ calendar_id: 'lista', project_id: null, message: loadFailed.gcal.text })
    return { lastOkAt, failures, refreshing: gcalBusy > 0, byCalendar, listError: loadFailed.gcal }
  }, [gcalCalendars, gcalData, gcalBusy, loadFailed.gcal])
  const gcalError = gcalStatus.failures[0]?.message || null

  const addGcalCalendar = async (url, project_id) => {
    const { data, error } = await db.from('gcal_calendars').insert({ url: url.trim(), project_id }).select()
    if (error) throw error
    setGcalCalendars((cs) => upsertRows(cs, data || [], byKeyAsc('created_at')))
    await reloadAfterWrite(loadGcalCalendars)
  }

  const removeGcalCalendar = async (id) => {
    const { error } = await db.from('gcal_calendars').delete().eq('id', id)
    if (error) throw error
    setGcalCalendars((cs) => cs.filter((c) => c.id !== id))
  }

  const loadProjects = useCallback(async () => {
    const { data, error } = await db.from('projects').select('*').order('sort_order')
    if (error) throw error
    setProjects(data)
  }, [])

  const saveProject = async (p) => {
    const { data, error } = p.id
      ? await db.from('projects').update(p).eq('id', p.id).select()
      : await db.from('projects').insert(p).select()
    if (error) throw error
    setProjects((ps) => upsertRows(ps, data?.length ? data : p.id ? [p] : [], (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)))
    await reloadAfterWrite(loadProjects)
  }

  const deleteProject = async (id) => {
    const { error } = await db.from('projects').delete().eq('id', id)
    if (error) throw error
    setProjects((ps) => ps.filter((p) => p.id !== id))
    await reloadAfterWrite(loadProjects)
  }

  const importRows = async (table, rows) => {
    const { error } = await db.from(table).insert(rows)
    if (error) throw error
    await reloadAfterWrite(loadEvents, loadExpenses)
  }

  const projectById = (id) => projects.find((p) => p.id === id)

  // projetos escolhíveis para eventos novos: ativos e dentro do período
  const activeProjects = (yearRef = new Date().getFullYear()) => projects.filter((p) => S.isProjectActive(p, yearRef))

  // ======================================================================
  // v2 — seletores (selectors.js + useMemo) — spec §14.4
  // ======================================================================
  const pbe = paymentsByEvent
  const eventsAsc = useMemo(() => S.sortAsc(events), [events])
  const eventState = useCallback((ev) => S.eventStateOf(ev, pbe, today), [pbe, today])
  const missing = useCallback((ev) => S.missingOf(ev, pbe), [pbe])
  const receivables = useMemo(() => S.receivablesOf(events, pbe, today), [events, pbe, today])
  const agingGroups = useMemo(() => S.agingGroups(receivables.overdue, today, pbe), [receivables, today, pbe])
  const googleMatch = useMemo(() => S.matchGoogle(events, googleEvents), [events, googleEvents])
  const googlePending = useMemo(() => S.googlePendingOf(googleMatch.pending, today), [googleMatch, today])
  const googleByDay = googleMatch.byDay
  const projectsByUsage = useMemo(() => S.projectsByUsage(projects, events, today, lastProjectId), [projects, events, today, lastProjectId])
  const projectOptions = useCallback((currentId) => S.projectsByUsage(projects, events, today, lastProjectId, currentId),
    [projects, events, today, lastProjectId])
  const expenseCategories = useMemo(() => S.expenseCategoriesOf(expenses), [expenses])
  const yearTotals = useCallback((year) => S.yearTotals(events, expenses, pbe, Number(year), today), [events, expenses, pbe, today])
  const summary = useCallback((evs) => S.summaryOf(evs, pbe), [pbe])

  const eventById = useCallback((id) => events.find((e) => e.id === id) || null, [events])
  const expenseById = useCallback((id) => expenses.find((x) => x.id === id) || null, [expenses])
  const attachmentById = useCallback((id) => attachments.find((a) => a.id === id) || null, [attachments])
  const findGoogle = useCallback((key) => googleMatch.pending.find((g) => g.key === key)
    || googleEvents.find((g) => g.key === key || `${g.calendar_id || ''}|${g.date}|${g.time || ''}|${g.uid || g.title}` === key) || null,
  [googleMatch, googleEvents])

  // Receber: ponto de novidades — algo que passou a Em atraso ou um Google já realizado depois da
  // última visita (spec §3.1). Os recibos não entram: por omissão os eventos não levam recibo.
  const receberHasNews = useMemo(() => {
    const { overdue } = receivables
    const past = googlePending.past
    if (!receberSeenAt) return overdue.length > 0 || past.length > 0
    const seenMs = Date.parse(receberSeenAt)
    if (Number.isNaN(seenMs)) return overdue.length > 0
    const seenDay = toYMD(new Date(seenMs))
    if (overdue.some((e) => e.event_date >= seenDay)) return true
    return past.some((g) => g.date >= seenDay)
  }, [receivables, googlePending, receberSeenAt])

  const markReceberSeen = useCallback(() => {
    const now = nowIso()
    LS.set(K_RECEBER_SEEN, now)
    setReceberSeenAt(now)
  }, [])

  const setLastProjectId = useCallback((id) => {
    LS.set(K_LAST_PROJECT, id || null)
    setLastProjectIdState(id || null)
  }, [])

  // ======================================================================
  // v2 — ações (leem o evento vivo e usam undoable/notify) — plano §F.4
  // ======================================================================
  const live = useRef({})
  live.current = { events, rawEvents, pbe, today, hidden }
  const liveEvent = (ev) => live.current.events.find((e) => e.id === (ev?.id ?? ev)) || ev

  // pagamentos a caminho: entram logo na lista (otimista) e contam para o que falta, mesmo antes
  // do re-render — dois toques seguidos em "Recebi" nunca registam o resto duas vezes
  const putGhost = (g) => { ghostRef.current = [...ghostRef.current, g]; setGhosts(ghostRef.current) }
  const dropGhost = (id) => { ghostRef.current = ghostRef.current.filter((g) => g.id !== id); setGhosts(ghostRef.current) }
  const liveGot = (cur, pbeNow = live.current.pbe) => {
    const rows = pbeNow.get(cur.id) || []
    const ids = new Set(rows.map((p) => p.id))
    const all = [...rows, ...ghostRef.current.filter((g) => g.event_id === cur.id && !ids.has(g.id))]
    return S.paidAmountOf(cur, new Map([[cur.id, all]]))
  }
  const liveMissing = (cur, pbeNow) => Math.max(0, Math.round((Number(cur.value) - liveGot(cur, pbeNow)) * 100) / 100)

  // o que falta só se calcula com pagamentos lidos com sucesso: se a última leitura falhou,
  // lê de novo (uma só leitura para toques seguidos); se voltar a falhar, não regista nada
  const freshRead = useRef(null)
  const ensurePayments = async () => {
    if (paymentsFresh.current) return live.current.pbe
    freshRead.current ||= loadPayments().finally(() => { freshRead.current = null })
    const rows = await freshRead.current
    const hiddenP = live.current.hidden.payments
    return S.paymentsByEventOf([...rows.filter((p) => !hiddenP.has(p.id))])
  }
  const paymentsUnreadable = (ex, retry) => {
    console.warn('Pagamentos por ler:', humanError(ex).detail)
    toast.notifyError(userError('Não foi possível confirmar os pagamentos deste evento. Verifica a ligação e tenta de novo.'), retry)
    return null
  }

  const insertPayment = async (event_id, amount, paid_at) => {
    const { data, error } = await db.from('payments').insert({ event_id, amount, paid_at }).select().single()
    if (error) throw error
    return data
  }

  // regista um pagamento (sinal, parte ou o resto) → linha inserida; Anular apaga-a.
  // Depois do INSERT nada volta a lançar (o "Tentar de novo" só existe se o INSERT falhou).
  const recordPayment = async (ev, amount, date, { retry, pbe: pbeIn } = {}) => {
    const amt = Math.round(Number(amount) * 100) / 100
    if (!(amt > 0)) throw userError('O valor tem de ser maior do que 0 €.')
    const again = retry || (() => recordPayment(ev, amount, date))
    let pbeNow = pbeIn
    if (!pbeNow) {
      try { pbeNow = await ensurePayments() } catch (ex) { return paymentsUnreadable(ex, again) }
    }
    const cur = liveEvent(ev)
    const got = liveGot(cur, pbeNow)
    const miss = liveMissing(cur, pbeNow)
    const text = amt >= miss - EPS
      ? <><b>{money(amt)} registados</b> · {cur.title}</>
      : got > EPS ? <>Pagamento de <b>{money(amt)}</b> registado</> : <>Sinal de <b>{money(amt)}</b> registado</>
    const ghost = { id: `a-gravar-${++ghostSeq}`, event_id: cur.id, amount: amt, paid_at: date || live.current.today, created_at: nowIso(), pending: true }
    putGhost(ghost)
    return toast.undoable({
      text,
      run: async () => {
        let row
        try {
          row = await insertPayment(cur.id, amt, ghost.paid_at)
          putPaymentsLocal(row)
        } finally {
          dropGhost(ghost.id)
        }
        await syncPaidFlagQuiet(cur)
        await reloadAfterWrite(loadEvents, loadPayments)
        return row
      },
      // o flag primeiro (sem este pagamento): se falhar, nada mudou e o erro aparece com "Tentar de novo"
      undo: async (row) => {
        await syncPaidFlag(cur, [row.id])
        const { error } = await db.from('payments').delete().eq('id', row.id)
        if (error) throw error
        dropPaymentLocal(row.id)
        await reloadAfterWrite(loadEvents, loadPayments)
      },
      retry: again,
    })
  }

  // "Recebi 370 €": regista o que falta, com a data de hoje
  const receiveRemaining = async (ev) => {
    const retry = () => receiveRemaining(ev)
    let pbeNow
    try { pbeNow = await ensurePayments() } catch (ex) { return paymentsUnreadable(ex, retry) }
    const cur = liveEvent(ev)
    const miss = liveMissing(cur, pbeNow)
    if (miss <= EPS) return null
    return recordPayment(cur, miss, live.current.today, { retry, pbe: pbeNow })
  }

  // sobe os ficheiros um a um → { rows (gravados), failed: [{ file, error }] }
  const uploadAll = async (kind, id, files) => {
    const rows = []
    const failed = []
    for (const f of files || []) {
      try { rows.push(await uploadAttachment(kind, id, f)) } catch (error) { failed.push({ file: f, error }) }
    }
    putAttachmentsLocal(...rows)
    return { rows, failed }
  }
  // "Despesa guardada, mas um anexo não foi enviado." (+ porquê, quando se sabe) · detalhe para o João
  const failedNotice = (what, failed) => {
    if (!failed.length) return null
    const h = humanError(failed[0].error)
    const why = isSetupError(h) ? ' Os anexos ainda não estão configurados.'
      : h.text.startsWith('Sem ligação') ? ' Sem ligação à internet.' : ''
    const n = failed.length === 1 ? 'um anexo não foi enviado' : `${failed.length} anexos não foram enviados`
    return { text: `${what} guardad${what === 'Evento' ? 'o' : 'a'}, mas ${n}.${why}`, detail: h.detail, setup: isSetupError(h) }
  }

  // evento novo: nunca envia paid/paid_at; o pagamento vira linhas de payments
  // payment: { kind: 'none'|'deposit'|'full', amount, date } → id; toast "Evento guardado · Ver".
  // Com o INSERT feito devolve sempre o id (uma falha a seguir nunca leva a inserir de novo).
  const createEvent = async (fields, { payment, files } = {}) => {
    const { id: _id, paid: _p, paid_at: _pa, ...rest } = fields || {}
    const row = { ...cleanEvent(rest), paid: false, paid_at: null, updated_at: nowIso() }
    if (blank(row.value)) row.value = row.gross_value ?? 0
    const { data, error } = await db.from('events').insert(row).select().single()
    if (error) throw error
    const id = data.id
    putEventsLocal({ ...row, ...data })
    let payFailed = null
    if (payment && payment.kind && payment.kind !== 'none') {
      const amt = Math.round(Number(payment.kind === 'full' ? payment.amount ?? row.value : payment.amount) * 100) / 100
      if (amt > 0) {
        let pay = null
        try {
          pay = await insertPayment(id, amt, payment.date || live.current.today)
          putPaymentsLocal(pay)
        } catch (ex) { payFailed = ex }
        if (pay) await syncPaidFlagQuiet({ id, value: row.value })
      }
    }
    const { failed } = await uploadAll('event', id, files)
    await reloadAfterWrite(loadEvents, loadPayments, files?.length ? loadAttachments : null)
    if (row.project_id) setLastProjectId(row.project_id)
    const att = failedNotice('Evento', failed)
    const view = { label: 'Ver', run: () => openSheet('evento', id) }
    if (payFailed) {
      toast.notify({ text: 'Evento guardado, mas o pagamento não ficou registado.', icon: 'alert', action: view })
      console.warn(humanError(payFailed).detail)
    } else if (att) toast.notify({ text: att.text, icon: 'alert', action: att.setup ? detailsAction(att.detail) : view })
    else toast.notify({ text: 'Evento guardado', icon: 'checkCircle', action: view })
    return id
  }

  // despesa nova (+ ficheiros) → id; toast "Despesa guardada · Ver"
  const createExpense = async (fields, { files } = {}) => {
    const { id: _id, ...rest } = fields || {}
    const clean = cleanExpense(rest)
    const { data, error } = await db.from('expenses').insert(clean).select().single()
    if (error) throw error
    const id = data.id
    setExpenses((xs) => upsertRows(xs, [{ ...clean, ...data }], EXPENSES_ORDER))
    const { failed } = await uploadAll('expense', id, files)
    await reloadAfterWrite(loadExpenses, files?.length ? loadAttachments : null)
    const att = failedNotice('Despesa', failed)
    const view = { label: 'Ver', run: () => openSheet('despesa', id) }
    if (att) toast.notify({ text: att.text, icon: 'alert', action: att.setup ? detailsAction(att.detail) : view })
    else toast.notify({ text: 'Despesa guardada', icon: 'checkCircle', action: view })
    return id
  }

  // Editar → Guardar: nunca envia paid/paid_at (o estado de pagamento só muda por pagamentos e
  // markUnpaid; com pagamentos, o estado vem da soma e o flag não conta). Líquido vazio = bruto.
  const updateEventFields = async (id, fields) => {
    const { id: _id, paid: _p, paid_at: _pa, ...rest } = fields || {}
    if ('value' in rest && blank(rest.value)) {
      rest.value = !blank(rest.gross_value) ? rest.gross_value : liveEvent(id)?.gross_value ?? 0
    }
    await saveEvent({ id, ...rest })
  }

  // Recibo emitido (Detalhe) — grava logo, com Anular
  const setReceipt = async (ev, on) => {
    const cur = liveEvent(ev)
    const prev = !!cur.receipt_issued
    const next = !!on
    if (prev === next) return cur
    const write = async (val) => {
      setOverride(cur.id, { receipt_issued: val })
      try {
        const { error } = await db.from('events').update({ receipt_issued: val, updated_at: nowIso() }).eq('id', cur.id)
        if (error) throw error
        patchEventLocal(cur.id, { receipt_issued: val })
      } finally {
        clearOverride(cur.id, 'receipt_issued')
      }
      await reloadAfterWrite(loadEvents)
    }
    return toast.undoable({
      text: next ? <>Recibo de <b>{cur.title}</b> marcado como emitido</> : <>Recibo de <b>{cur.title}</b> desmarcado</>,
      run: async () => { await write(next); return cur },
      undo: async () => write(prev),
    })
  }

  // eventos antigos marcados como pagos sem pagamentos registados
  const markUnpaid = async (ev) => {
    const cur = liveEvent(ev)
    const prev = { paid: !!cur.paid, paid_at: cur.paid_at ?? null }
    return toast.undoable({
      text: 'Marcado como não recebido',
      run: async () => { await saveEvent({ id: cur.id, paid: false, paid_at: null }); return cur },
      undo: async () => saveEvent({ id: cur.id, ...prev }),
    })
  }

  // apagar pagamento: sai logo da lista; só é apagado na base de dados quando o toast expira
  // (ou no arranque seguinte, se a página sair antes)
  const removePaymentDeferred = async (p, ev) => {
    if (p?.pending) return null // ainda a gravar
    const cur = liveEvent(ev || p.event_id)
    const rest = (live.current.pbe.get(cur.id) || []).filter((x) => x.id !== p.id)
    const full = Number(cur.value) > 0 && sumAmount(rest) >= Number(cur.value) - EPS
    return deferRemoval({ kind: 'payment', id: p.id, event_id: cur.id }, {
      text: <>Pagamento de <b>{money(p.amount)}</b> apagado</>,
      run: async () => {
        setOverride(cur.id, { paid: full, paid_at: full ? cur.paid_at : null })
        return p
      },
      undo: async () => { clearOverride(cur.id, 'paid', 'paid_at') },
      commit: async () => {
        clearOverride(cur.id, 'paid', 'paid_at')
        await reloadAfterWrite(loadEvents, loadPayments)
      },
      retry: () => removePaymentDeferred(p, ev),
    })
  }

  const removeAttachmentDeferred = async (att) => deferRemoval({ kind: 'attachment', id: att.id, path: att.path }, {
    text: 'Anexo removido',
    retry: () => removeAttachmentDeferred(att),
  })

  const removeGcalDeferred = async (cal) => deferRemoval({ kind: 'gcal', id: cal.id }, {
    text: 'Calendário removido',
    retry: () => removeGcalDeferred(cal),
  })

  return (
    <Ctx.Provider value={{
      projects, events, expenses, loading: phase1, error, projectById, activeProjects,
      saveEvent, deleteEvent, saveExpense, deleteExpense, importRows,
      saveProject, deleteProject,
      paymentsByEvent, paidAmount, paymentState, addPayment, deletePayment,
      attachmentsFor, addAttachment, deleteAttachment, attachmentUrl,
      services, quotes, itemsForQuote, quoteTotal, saveService, deleteService,
      saveQuote, deleteQuote, acceptQuote, scheduleFor, saveSchedule, scheduleItems,
      setProjectLogo, removeProjectLogo, logoUrl,
      pendingUndo, undoDelete,
      gcalCalendars, googleEvents, gcalError, addGcalCalendar, removeGcalCalendar,
      // v2 — estado
      loadingPhases: { phase1, phase2 }, errorInfo, reload: load, payments, attachments,
      today, eventsAsc, eventState, missing, receivables, agingGroups,
      googlePending, googleByDay, googleMatch, findGoogle, projectsByUsage, projectOptions, lastProjectId,
      expenseCategories, yearTotals, summary, eventById, expenseById, attachmentById,
      gcalStatus, receberHasNews, markReceberSeen, loadFailures: loadFailed, retryLoads,
      // v2 — ações
      recordPayment, receiveRemaining, createEvent, createExpense, updateEventFields, setReceipt, markUnpaid,
      removePaymentDeferred, removeAttachmentDeferred, removeGcalDeferred, refreshGcal, setLastProjectId,
      notify: toast.notify, notifyError: toast.notifyError, undoable: toast.undoable, humanError,
    }}>
      {children}
    </Ctx.Provider>
  )
}
