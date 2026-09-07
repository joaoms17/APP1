import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { db } from './supabase'
import { fetchGoogleEvents } from './gcal'
import { compressImage } from './img'

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

const todayLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function StoreProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [events, setEvents] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [payments, setPayments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [services, setServices] = useState([])
  const [quotes, setQuotes] = useState([])
  const [quoteItems, setQuoteItems] = useState([])
  const [scheduleItems, setScheduleItems] = useState([])
  const [gcalCalendars, setGcalCalendars] = useState([])
  const [googleEvents, setGoogleEvents] = useState([])
  const [gcalError, setGcalError] = useState(null)
  const [gcalTick, setGcalTick] = useState(0)
  const [pendingUndo, setPendingUndo] = useState(null) // {kind:'event'|'expense', row}
  const undoTimer = useRef(null)
  const lastGcalFetch = useRef(0)

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

  const loadPayments = useCallback(async () => {
    // a tabela payments pode ainda não existir — nunca bloquear a app
    try {
      const { data } = await db.from('payments').select('*').order('paid_at')
      setPayments(data || [])
    } catch { /* sem payments */ }
  }, [])

  const loadAttachments = useCallback(async () => {
    try {
      const { data } = await db.from('attachments').select('*').order('created_at')
      setAttachments(data || [])
    } catch { /* sem attachments */ }
  }, [])

  const loadQuotes = useCallback(async () => {
    // estas tabelas podem ainda não existir — nunca bloquear a app
    try {
      const [s, q, qi, sc] = await Promise.all([
        db.from('services').select('*').order('sort_order'),
        db.from('quotes').select('*').order('created_at', { ascending: false }),
        db.from('quote_items').select('*').order('sort_order'),
        db.from('schedule_items').select('*').order('time_at'),
      ])
      setServices(s.data || [])
      setQuotes(q.data || [])
      setQuoteItems(qi.data || [])
      setScheduleItems(sc.data || [])
    } catch { /* sem orçamentos */ }
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await db.from('projects').select('*').order('sort_order')
        if (error) throw error
        setProjects(data)
        await Promise.all([loadEvents(), loadExpenses(), loadPayments(), loadAttachments(), loadQuotes()])
        // a tabela gcal_calendars pode ainda não existir — nunca bloquear a app
        try {
          const { data: g } = await db.from('gcal_calendars').select('*').order('created_at')
          if (g) setGcalCalendars(g)
        } catch { /* sem gcal_calendars */ }
      } catch (e) {
        setError(e.message || String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [loadEvents, loadExpenses, loadPayments, loadAttachments, loadQuotes])

  // ao voltar à app, refrescar o Google Calendar (com folga de 5 min)
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') setGcalTick((t) => t + 1) }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const saveEvent = async (ev) => {
    const row = { ...ev, updated_at: new Date().toISOString() }
    const { error } = ev.id
      ? await db.from('events').update(row).eq('id', ev.id)
      : await db.from('events').insert(row)
    if (error) throw error
    await loadEvents()
  }

  // --- pagamentos parciais ---------------------------------------------
  const paymentsByEvent = useMemo(() => {
    const m = new Map()
    for (const p of payments) {
      if (!m.has(p.event_id)) m.set(p.event_id, [])
      m.get(p.event_id).push(p)
    }
    return m
  }, [payments])

  // recebido até agora: soma dos pagamentos; eventos antigos sem pagamentos
  // registados contam pelo flag paid
  const paidAmount = useCallback((ev) => {
    const ps = paymentsByEvent.get(ev.id)
    if (ps && ps.length) return ps.reduce((a, p) => a + Number(p.amount), 0)
    return ev.paid ? Number(ev.value) : 0
  }, [paymentsByEvent])

  const paymentState = useCallback((ev) => {
    const got = paidAmount(ev)
    const total = Number(ev.value)
    if (ev.paid || (total > 0 && got >= total - 0.005)) return 'paid'
    if (got > 0.005) return 'partial'
    return 'unpaid'
  }, [paidAmount])

  const syncPaidFlag = async (ev) => {
    const { data: ps } = await db.from('payments').select('amount, paid_at').eq('event_id', ev.id)
    const got = (ps || []).reduce((a, p) => a + Number(p.amount), 0)
    const full = Number(ev.value) > 0 && got >= Number(ev.value) - 0.005
    const lastDate = (ps || []).map((p) => p.paid_at).sort().pop() || null
    await db.from('events').update({ paid: full, paid_at: full ? lastDate : null, updated_at: new Date().toISOString() }).eq('id', ev.id)
  }

  const addPayment = async (ev, amount, paid_at) => {
    const { error } = await db.from('payments').insert({ event_id: ev.id, amount, paid_at })
    if (error) throw error
    await syncPaidFlag(ev)
    await Promise.all([loadEvents(), loadPayments()])
  }

  const deletePayment = async (payment, ev) => {
    const { error } = await db.from('payments').delete().eq('id', payment.id)
    if (error) throw error
    await syncPaidFlag(ev)
    await Promise.all([loadEvents(), loadPayments()])
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
    await loadQuotes()
  }

  const deleteService = async (id) => {
    const { error } = await db.from('services').delete().eq('id', id)
    if (error) throw error
    await loadQuotes()
  }

  // guarda o orçamento e substitui as linhas de uma vez
  const saveQuote = async (q, items) => {
    let quoteId = q.id
    const row = { ...q, updated_at: new Date().toISOString() }
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
    await loadQuotes()
    return quoteId
  }

  const deleteQuote = async (id) => {
    const { error } = await db.from('quotes').delete().eq('id', id)
    if (error) throw error
    await loadQuotes()
  }

  // aceitar: cria o evento de Cabelos com o valor do orçamento e liga-o
  const acceptQuote = async (q) => {
    const hair = projects.find((p) => p.kind === 'hair') || projects[0]
    const total = quoteTotal(q)
    const { data: ev, error } = await db.from('events').insert({
      project_id: hair.id,
      title: `Casamento ${q.client_name}`,
      event_date: q.event_date || todayLocal(),
      location: q.location || null,
      gross_value: total,
      value: total,
      paid: false,
      notes: 'Criado a partir de orçamento aceite',
    }).select('id').single()
    if (error) throw error
    await db.from('quotes').update({ status: 'accepted', event_id: ev.id, updated_at: new Date().toISOString() }).eq('id', q.id)
    await Promise.all([loadEvents(), loadQuotes()])
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
    await loadQuotes()
  }

  // --- anexos (fotos de recibos/faturas) ---------------------------------
  const attachmentsFor = useCallback((kind, id) =>
    attachments.filter((a) => a.parent_kind === kind && a.parent_id === id), [attachments])

  const addAttachment = async (kind, id, file) => {
    const blob = await compressImage(file)
    const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'bin')
    const path = `${kind}/${id}/${Date.now()}.${ext}`
    const { error: upErr } = await db.storage.from('anexos').upload(path, blob, { contentType: blob.type || file.type })
    if (upErr) throw upErr
    const { error } = await db.from('attachments').insert({ parent_kind: kind, parent_id: id, path, name: file.name })
    if (error) throw error
    await loadAttachments()
  }

  const deleteAttachment = async (att) => {
    await db.storage.from('anexos').remove([att.path])
    const { error } = await db.from('attachments').delete().eq('id', att.id)
    if (error) throw error
    await loadAttachments()
  }

  const attachmentUrl = async (att) => {
    const { data, error } = await db.storage.from('anexos').createSignedUrl(att.path, 3600)
    if (error) throw error
    return data.signedUrl
  }

  // --- apagar com Anular (o registo só sai da base de dados após 6s) ----
  const finalizeUndo = useCallback(async (p) => {
    if (!p) return
    try {
      // limpar anexos órfãos antes de apagar o registo
      const kind = p.kind === 'event' ? 'event' : 'expense'
      const { data: atts } = await db.from('attachments').select('*').eq('parent_kind', kind).eq('parent_id', p.row.id)
      if (atts?.length) {
        await db.storage.from('anexos').remove(atts.map((a) => a.path))
        await db.from('attachments').delete().eq('parent_kind', kind).eq('parent_id', p.row.id)
      }
    } catch { /* tabela de anexos pode não existir */ }
    try {
      await db.from(p.kind === 'event' ? 'events' : 'expenses').delete().eq('id', p.row.id)
    } catch { /* se falhar, o registo reaparece no próximo carregamento */ }
  }, [])

  const softDelete = (kind, row) => {
    if (undoTimer.current) { clearTimeout(undoTimer.current); undoTimer.current = null }
    if (pendingUndo) finalizeUndo(pendingUndo)
    if (kind === 'event') setEvents((es) => es.filter((e) => e.id !== row.id))
    else setExpenses((es) => es.filter((e) => e.id !== row.id))
    const p = { kind, row }
    setPendingUndo(p)
    undoTimer.current = setTimeout(() => {
      finalizeUndo(p)
      setPendingUndo((cur) => (cur === p ? null : cur))
      undoTimer.current = null
    }, 6000)
  }

  const undoDelete = () => {
    if (!pendingUndo) return
    if (undoTimer.current) { clearTimeout(undoTimer.current); undoTimer.current = null }
    const { kind, row } = pendingUndo
    const key = kind === 'event' ? 'event_date' : 'expense_date'
    const put = (es) => [...es, row].sort((a, b) => b[key].localeCompare(a[key]))
    if (kind === 'event') setEvents(put)
    else setExpenses(put)
    setPendingUndo(null)
  }

  const deleteEvent = (row) => softDelete('event', row)
  const deleteExpense = (row) => softDelete('expense', row)

  const saveExpense = async (ex) => {
    const { error } = ex.id
      ? await db.from('expenses').update(ex).eq('id', ex.id)
      : await db.from('expenses').insert(ex)
    if (error) throw error
    await loadExpenses()
  }

  useEffect(() => {
    if (gcalCalendars.length === 0) { setGoogleEvents([]); return }
    if (gcalTick > 0 && Date.now() - lastGcalFetch.current < 5 * 60 * 1000) return
    lastGcalFetch.current = Date.now()
    let alive = true
    setGcalError(null)
    Promise.all(gcalCalendars.map((cal) =>
      fetchGoogleEvents(cal.url)
        .then((evs) => evs.map((e) => ({ ...e, project_id: cal.project_id, calendar_id: cal.id })))
        .catch((e) => { if (alive) setGcalError(e.message || String(e)); return [] })
    )).then((lists) => { if (alive) setGoogleEvents(lists.flat()) })
    return () => { alive = false }
  }, [gcalCalendars, gcalTick])

  const addGcalCalendar = async (url, project_id) => {
    const { error } = await db.from('gcal_calendars').insert({ url: url.trim(), project_id })
    if (error) throw error
    const { data } = await db.from('gcal_calendars').select('*').order('created_at')
    setGcalCalendars(data || [])
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
    const { error } = p.id
      ? await db.from('projects').update(p).eq('id', p.id)
      : await db.from('projects').insert(p)
    if (error) throw error
    await loadProjects()
  }

  const deleteProject = async (id) => {
    const { error } = await db.from('projects').delete().eq('id', id)
    if (error) throw error
    await loadProjects()
  }

  const importRows = async (table, rows) => {
    const { error } = await db.from(table).insert(rows)
    if (error) throw error
    await Promise.all([loadEvents(), loadExpenses()])
  }

  const projectById = (id) => projects.find((p) => p.id === id)

  // projetos escolhíveis para eventos novos: ativos e dentro do período
  const activeProjects = (yearRef = new Date().getFullYear()) => projects.filter((p) =>
    p.active !== false
    && (p.active_from == null || p.active_from <= yearRef)
    && (p.active_to == null || p.active_to >= yearRef))

  return (
    <Ctx.Provider value={{
      projects, events, expenses, loading, error, projectById, activeProjects,
      saveEvent, deleteEvent, saveExpense, deleteExpense, importRows,
      saveProject, deleteProject,
      paymentsByEvent, paidAmount, paymentState, addPayment, deletePayment,
      attachmentsFor, addAttachment, deleteAttachment, attachmentUrl,
      services, quotes, itemsForQuote, quoteTotal, saveService, deleteService,
      saveQuote, deleteQuote, acceptQuote, scheduleFor, saveSchedule,
      pendingUndo, undoDelete,
      gcalCalendars, googleEvents, gcalError, addGcalCalendar, removeGcalCalendar,
    }}>
      {children}
    </Ctx.Provider>
  )
}
