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
  const [gcalUrl, setGcalUrl] = useState(null)
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
        const { data, error } = await db.from('projects').select('*').eq('active', true).order('sort_order')
        if (error) throw error
        setProjects(data)
        await Promise.all([loadEvents(), loadExpenses()])
        // a tabela settings pode ainda não existir — nunca bloquear a app por isso
        try {
          const { data: s } = await db.from('settings').select('value').eq('key', 'gcal_ics_url').maybeSingle()
          if (s?.value) setGcalUrl(s.value)
        } catch { /* sem settings */ }
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
    if (!gcalUrl) { setGoogleEvents([]); return }
    let alive = true
    setGcalError(null)
    fetchGoogleEvents(gcalUrl)
      .then((evs) => { if (alive) setGoogleEvents(evs) })
      .catch((e) => { if (alive) { setGoogleEvents([]); setGcalError(e.message || String(e)) } })
    return () => { alive = false }
  }, [gcalUrl])

  const saveGcalUrl = async (url) => {
    const value = url.trim()
    const { error } = await db.from('settings').upsert({ key: 'gcal_ics_url', value })
    if (error) throw error
    setGcalUrl(value || null)
  }

  const importRows = async (table, rows) => {
    const { error } = await db.from(table).insert(rows)
    if (error) throw error
    await Promise.all([loadEvents(), loadExpenses()])
  }

  const projectById = (id) => projects.find((p) => p.id === id)

  return (
    <Ctx.Provider value={{
      projects, events, expenses, loading, error, projectById,
      saveEvent, deleteEvent, saveExpense, deleteExpense, importRows,
      gcalUrl, googleEvents, gcalError, saveGcalUrl,
    }}>
      {children}
    </Ctx.Provider>
  )
}
