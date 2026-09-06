import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { db } from './supabase'
import { fetchGoogleEvents } from './gcal'

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

export function StoreProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [events, setEvents] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [gcalCalendars, setGcalCalendars] = useState([])
  const [googleEvents, setGoogleEvents] = useState([])
  const [gcalError, setGcalError] = useState(null)

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

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await db.from('projects').select('*').order('sort_order')
        if (error) throw error
        setProjects(data)
        await Promise.all([loadEvents(), loadExpenses()])
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
  }, [loadEvents, loadExpenses])

  const saveEvent = async (ev) => {
    const row = { ...ev, updated_at: new Date().toISOString() }
    const { error } = ev.id
      ? await db.from('events').update(row).eq('id', ev.id)
      : await db.from('events').insert(row)
    if (error) throw error
    await loadEvents()
  }

  const deleteEvent = async (id) => {
    const { error } = await db.from('events').delete().eq('id', id)
    if (error) throw error
    await loadEvents()
  }

  const saveExpense = async (ex) => {
    const { error } = ex.id
      ? await db.from('expenses').update(ex).eq('id', ex.id)
      : await db.from('expenses').insert(ex)
    if (error) throw error
    await loadExpenses()
  }

  const deleteExpense = async (id) => {
    const { error } = await db.from('expenses').delete().eq('id', id)
    if (error) throw error
    await loadExpenses()
  }

  useEffect(() => {
    if (gcalCalendars.length === 0) { setGoogleEvents([]); return }
    let alive = true
    setGcalError(null)
    Promise.all(gcalCalendars.map((cal) =>
      fetchGoogleEvents(cal.url)
        .then((evs) => evs.map((e) => ({ ...e, project_id: cal.project_id, calendar_id: cal.id })))
        .catch((e) => { if (alive) setGcalError(e.message || String(e)); return [] })
    )).then((lists) => { if (alive) setGoogleEvents(lists.flat()) })
    return () => { alive = false }
  }, [gcalCalendars])

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
      gcalCalendars, googleEvents, gcalError, addGcalCalendar, removeGcalCalendar,
    }}>
      {children}
    </Ctx.Provider>
  )
}
