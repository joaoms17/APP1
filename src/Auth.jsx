import { useState } from 'react'
import { db } from './supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    const { error } = await db.auth.signInWithPassword({ email, password })
    if (error) setErr('Não foi possível entrar. Verifica o email e a password.')
    setBusy(false)
  }

  return (
    <div className="login-wrap">
      <form className="login" onSubmit={submit}>
        <h1>Joana</h1>
        <div className="hairline" />
        <div className="sub">Agenda &amp; Finanças</div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? 'A entrar…' : 'Entrar'}</button>
      </form>
    </div>
  )
}
