// Sessão do Supabase para quem precisa dela sem a pedir de novo (sidebar, Definições).
//   const session = useSession()      // undefined = ainda a saber · null = sem sessão
//   const { name, email } = accountOf(session)
import { createContext, useContext } from 'react'

export const SessionContext = createContext(undefined)
export const useSession = () => useContext(SessionContext)

// nome a mostrar: o do perfil ou a 1.ª parte do email ("joana@…" → "Joana")
export function accountOf(session) {
  const user = session?.user
  const email = user?.email || ''
  const meta = user?.user_metadata || {}
  const raw = meta.name || meta.full_name || email.split('@')[0].split(/[._\-+\d]/)[0] || ''
  const name = raw ? raw[0].toUpperCase() + raw.slice(1) : 'Joana'
  return { name, email }
}
