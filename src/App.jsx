import { useEffect, useState } from 'react'
import { db } from './supabase'
import { StoreProvider } from './store.jsx'
import { ToastProvider } from './ui/Toast.jsx'
import Shell from './shell/Shell.jsx'
import { SessionContext } from './shell/session.js'
import Login from './screens/Login/Login.jsx'

// Sessão → Entrar ou a app. Enquanto a sessão está por saber, a shell aparece já com
// esqueletos (nunca um ecrã em branco). Os toasts ("Anular", erros) vivem no ToastProvider.
export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    db.auth.getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  let body
  if (session === null) body = <Login />
  else if (session === undefined) body = <Shell booting />
  else body = <StoreProvider><Shell /></StoreProvider>

  return (
    <SessionContext.Provider value={session}>
      <ToastProvider>{body}</ToastProvider>
    </SessionContext.Provider>
  )
}
