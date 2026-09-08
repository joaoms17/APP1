import { useEffect, useState } from 'react'
import { db } from './supabase'
import { StoreProvider, useStore } from './store'
import Auth from './Auth'
import Calendar from './screens/Calendar'
import Events from './screens/Events'
import Expenses from './screens/Expenses'
import Dashboard from './screens/Dashboard'
import Projects from './screens/Projects'
import Quotes from './screens/Quotes'
import './styles.css'

const ic = { width: 21, height: 21, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ICONS = {
  calendar: (
    <svg {...ic}>
      <rect x="3.5" y="5" width="17" height="16" rx="3.5" />
      <path d="M3.5 10h17M8 2.8v3.4M16 2.8v3.4" />
      <circle cx="12" cy="15.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  music: (
    <svg {...ic}>
      <path d="M9 18.5V6.2c0-.5.35-.93.84-1.02l8-1.6c.63-.13 1.16.35 1.16 1v11.4" />
      <circle cx="6.5" cy="18.5" r="2.6" />
      <circle cx="16.5" cy="16" r="2.6" />
    </svg>
  ),
  wallet: (
    <svg {...ic}>
      <rect x="3" y="6.5" width="18" height="13" rx="3" />
      <path d="M3 10h18M7 15h3.5" />
    </svg>
  ),
  chart: (
    <svg {...ic}>
      <path d="M4 20h16" />
      <path d="M7 20v-6.5M12 20V9.5M17 20V5.5" />
    </svg>
  ),
  doc: (
    <svg {...ic}>
      <path d="M7 2.8h7l4 4V19a2.2 2.2 0 0 1-2.2 2.2H7A2.2 2.2 0 0 1 4.8 19V5A2.2 2.2 0 0 1 7 2.8Z" />
      <path d="M13.6 3v4.2h4.2M8.5 12h7M8.5 15.8h7" />
    </svg>
  ),
  gear: (
    <svg {...ic}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8" />
    </svg>
  ),
}
const TABS = [
  { id: 'calendar', label: 'Agenda', icon: ICONS.calendar },
  { id: 'events', label: 'Eventos', icon: ICONS.music },
  { id: 'expenses', label: 'Despesas', icon: ICONS.wallet },
  { id: 'dashboard', label: 'Painel', icon: ICONS.chart },
  { id: 'projects', label: 'Projetos', icon: ICONS.gear },
  // separador Doc escondido até os templates (bases com logotipo) chegarem
  // { id: 'doc', label: 'Doc', icon: ICONS.doc, subtle: true },
]

function Shell() {
  const { loading, error, pendingUndo, undoDelete } = useStore()
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
      {tab === 'projects' && <Projects />}
      {tab === 'doc' && <Quotes />}
      {pendingUndo && (
        <div className="undo-toast">
          <span>{pendingUndo.kind === 'event' ? 'Evento apagado.' : 'Despesa apagada.'}</span>
          <button onClick={undoDelete}>Anular</button>
        </div>
      )}
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={`${tab === t.id ? 'active' : ''}${t.subtle ? ' subtle' : ''}`} onClick={() => setTab(t.id)}>
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
