import React, { useState } from 'react'
import { db } from './supabase'
import { PALETTE } from './data'
import { Eucalyptus, Btn } from './ui'

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 12,
  border: '1px solid rgba(74,63,53,0.16)', background: 'var(--paper-card)',
  fontFamily: 'var(--sans)', fontSize: 15, color: PALETTE.nearBlack, outline: 'none', marginBottom: 12,
}
const labelStyle = { fontFamily: 'var(--sans)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: PALETTE.inkSoft, marginBottom: 6, display: 'block' }

export default function Auth() {
  const [mode, setMode] = useState('signin')   // signin | signup
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const accent = PALETTE.terracotta

  const submit = async () => {
    setErr(null); setMsg(null); setBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await db.auth.signUp({
          email, password: pass,
          options: { data: { full_name: name } },
        })
        if (error) throw error
        if (!data.session) setMsg('Conta criada. Confirme o email para entrar (ou desative "Confirm email" nas definições do Supabase).')
      } else {
        const { error } = await db.auth.signInWithPassword({ email, password: pass })
        if (error) throw error
      }
    } catch (e) {
      setErr(e.message || 'Erro ao autenticar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--paper)' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Eucalyptus size={36} stem={accent} leaf={PALETTE.sage} style={{ margin: '0 auto 14px' }} />
          <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 38, color: PALETTE.nearBlack, lineHeight: 1 }}>Ramo</div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: PALETTE.inkSoft, marginTop: 8 }}>Operação para equipas de eventos</div>
        </div>

        <div style={{ background: 'var(--paper-card)', borderRadius: 20, padding: '24px 22px', boxShadow: '0 12px 40px rgba(74,63,53,0.1)', border: '1px solid rgba(74,63,53,0.05)' }}>
          <div style={{ display: 'flex', background: 'rgba(74,63,53,0.06)', borderRadius: 10, padding: 3, gap: 3, marginBottom: 20 }}>
            {[['signin','Entrar'],['signup','Criar conta']].map(([id, label]) => (
              <button key={id} onClick={() => { setMode(id); setErr(null); setMsg(null) }} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', background: mode === id ? 'var(--paper-card)' : 'transparent', boxShadow: mode === id ? '0 2px 8px rgba(74,63,53,0.1)' : 'none', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, color: mode === id ? accent : PALETTE.inkSoft }}>{label}</button>
            ))}
          </div>

          {mode === 'signup' && (
            <>
              <label style={labelStyle}>Nome</label>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="O seu nome" />
            </>
          )}
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.pt" />
          <label style={labelStyle}>Palavra-passe</label>
          <input style={inputStyle} type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••"
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />

          {err && <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: PALETTE.clay, marginBottom: 12 }}>{err}</div>}
          {msg && <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: PALETTE.sage, marginBottom: 12, lineHeight: 1.5 }}>{msg}</div>}

          <Btn variant="solid" accent={accent} size="md" full onClick={submit}>
            {busy ? '…' : (mode === 'signin' ? 'Entrar' : 'Criar conta')}
          </Btn>
        </div>
      </div>
    </div>
  )
}
