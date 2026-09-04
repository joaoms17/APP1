import { useEffect, useState } from 'react'
import { db } from './supabase'
import { StoreProvider, useStore } from './store'
import Auth from './Auth'
import Calendar from './screens/Calendar'
import Events from './screens/Events'
import Expenses from './screens/Expenses'
import Dashboard from './screens/Dashboard'
import ImportCsv from './screens/ImportCsv'
import './styles.css'

const TABS = [
  { id: 'calendar', label: 'Agenda', icon: '📅' },
  { id: 'events', label: 'Eventos', icon: '🎤' },
  { id: 'expenses', label: 'Despesas', icon: '💸' },
  { id: 'dashboard', label: 'Painel', icon: '📊' },
  { id: 'import', label: 'Importar', icon: '⬆️' },
]

function Shell() {
  const { loading, error } = useStore()
  const [tab, setTab] = useState('calendar')

  if (loading) return <div className="empty">A carregar…</div>
  if (error) return (
    <div className="app">
      <div className="note">
        Erro a carregar dados: {error}
        <br /><br />
        Se ainda não correste o <b>supabase/schema.sql</b> no SQL Editor do Supabase, é esse o passo em falta.
      </div>
    </div>
  )

  return (
    <div className="app">
      {tab === 'calendar' && <Calendar />}
      {tab === 'events' && <Events />}
      {tab === 'expenses' && <Expenses />}
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'import' && <ImportCsv />}
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <span className="icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    db.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <Auth />
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
