import { forwardRef, useEffect, useRef, useState } from 'react'
import { db } from '../../supabase'
import { Button, Callout, Field, IconButton, TextInput, useField } from '../../ui'
import { isNetworkError } from '../../errors.js'
import './Login.css'

// Entrar (spec §10.1): wordmark, lema, email + password ligados aos rótulos,
// "Mostrar password", erro num Callout e "A entrar…" enquanto espera.

const BAD_LOGIN = 'Não foi possível entrar. Verifica o email e a password.'
const OFFLINE = 'Sem ligação. Verifica a internet e tenta de novo.'

// password com o olho dentro do campo (o Field dá o id, o rótulo e o aria)
const PasswordInput = forwardRef(function PasswordInput({ value, onChange, shown, onToggle }, ref) {
  const f = useField()
  return (
    <div className={`control lg-pw${f?.invalid ? ' invalid' : ''}`}>
      <input ref={ref} id={f?.id} aria-describedby={f?.describedBy} aria-invalid={f?.invalid || undefined}
        type={shown ? 'text' : 'password'}
        value={value} onChange={(e) => onChange(e.target.value)} autoComplete="current-password"
        enterKeyHint="go" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <IconButton icon={shown ? 'eyeOff' : 'eye'} label={shown ? 'Esconder password' : 'Mostrar password'}
        aria-pressed={shown} onClick={onToggle} />
    </div>
  )
})

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [err, setErr] = useState(null)
  const [missing, setMissing] = useState({}) // campos por preencher: { email, password }
  const [busy, setBusy] = useState(false)
  const emailRef = useRef(null)
  const pwRef = useRef(null)

  // fora da shell ninguém põe o título da janela
  useEffect(() => { document.title = 'Entrar · Joana' }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    // campo vazio: diz qual é, junto ao campo (não só o foco)
    const miss = { email: !email.trim(), password: !password }
    if (miss.email || miss.password) {
      setMissing(miss)
      setErr(null)
      if (miss.email) emailRef.current?.focus()
      else pwRef.current?.focus()
      return
    }
    setMissing({})
    setBusy(true)
    setErr(null)
    try {
      const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      // a sessão chega pelo onAuthStateChange (App) e este ecrã sai
    } catch (ex) {
      setErr(isNetworkError(ex) || ex?.status === 0 ? OFFLINE : BAD_LOGIN)
      setBusy(false)
    }
  }

  // ao escrever, o aviso desse campo sai
  const typing = (set, k) => (v) => {
    set(v)
    if (missing[k]) setMissing((m) => ({ ...m, [k]: false }))
  }

  return (
    <main className="lg-wrap">
      <form className="lg-form" aria-labelledby="lg-title" onSubmit={submit} noValidate>
        <div className="lg-brand">
          <h1 id="lg-title">Joana</h1>
          <i aria-hidden="true" />
          <p>Concertos, noivas e contas.</p>
        </div>
        <div className="card lg-card">
          {err && <Callout tone="error">{err}</Callout>}
          <Field label="Email" error={missing.email && 'Escreve o teu email.'}>
            <TextInput ref={emailRef} type="email" value={email} onChange={typing(setEmail, 'email')} autoComplete="email"
              inputMode="email" enterKeyHint="next" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </Field>
          <Field label="Password" error={missing.password && 'Escreve a tua password.'}>
            <PasswordInput ref={pwRef} value={password} onChange={typing(setPassword, 'password')} shown={shown}
              onToggle={() => setShown((s) => !s)} />
          </Field>
          <Button type="submit" variant="primary" size="lg" block loading={busy} loadingLabel="A entrar…">
            Entrar
          </Button>
        </div>
        <p className="lg-foot">Só a Joana e o João têm acesso.</p>
      </form>
    </main>
  )
}
