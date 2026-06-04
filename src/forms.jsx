import React, { useState } from 'react'
import { PALETTE, hexToRgba, genId, initialsOf, colorFor, extractLead, SERVICE_LABEL, ROLE_LABEL, LEAD_LABEL, RESERVA_LABEL } from './data'
import { Icon, Btn, Eucalyptus, AIBadge } from './ui'

// ─── Modal shell (full-screen on mobile, centered card on desktop) ───
export function Modal({ title, onClose, isDesktop, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(46,40,32,.45)',
        display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center',
        padding: isDesktop ? 24 : 0,
        backdropFilter: 'blur(2px)',
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--paper)', width: isDesktop ? 460 : '100%',
          maxHeight: isDesktop ? '88vh' : '92vh',
          borderRadius: isDesktop ? 20 : '20px 20px 0 0',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(46,40,32,.3)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid rgba(74,63,53,0.08)', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 21, color: PALETTE.nearBlack }}>{title}</div>
          <button onClick={onClose} style={{ background: 'rgba(74,63,53,0.06)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={18} color={PALETTE.inkSoft} stroke={2} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 22px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Field primitives ─────────────────────────────────────────
const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 12,
  border: '1px solid rgba(74,63,53,0.16)', background: 'var(--paper-card)',
  fontFamily: 'var(--sans)', fontSize: 14, color: PALETTE.nearBlack, outline: 'none',
}
const labelStyle = { fontFamily: 'var(--sans)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: PALETTE.inkSoft, marginBottom: 6, display: 'block' }

function Field({ def, value, onChange, lang }) {
  if (def.type === 'services') {
    const sel = value || []
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{def.label}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {Object.keys(SERVICE_LABEL[lang]).map((k) => {
            const on = sel.includes(k)
            return (
              <button key={k} type="button" onClick={() => onChange(on ? sel.filter(x => x !== k) : [...sel, k])}
                style={{ fontFamily: 'var(--sans)', fontSize: 12.5, padding: '7px 13px', borderRadius: 50, cursor: 'pointer',
                  border: `1px solid ${on ? PALETTE.sage : 'rgba(74,63,53,0.16)'}`,
                  background: on ? hexToRgba(PALETTE.sage, 0.16) : 'var(--paper-card)',
                  color: on ? PALETTE.terracottaDark : PALETTE.inkSoft, fontWeight: on ? 500 : 400 }}>
                {SERVICE_LABEL[lang][k]}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
  if (def.type === 'select') {
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{def.label}</label>
        <select value={value || ''} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
          {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    )
  }
  if (def.type === 'textarea') {
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{def.label}</label>
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
    )
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{def.label}</label>
      <input type={def.type === 'number' ? 'number' : 'text'} value={value ?? ''} placeholder={def.placeholder || ''}
        onChange={(e) => onChange(def.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        style={inputStyle} />
    </div>
  )
}

// ─── Schemas per entity ───────────────────────────────────────
function schema(type, lang, t) {
  const leadEstados = Object.entries(LEAD_LABEL[lang]).map(([value, label]) => ({ value, label }))
  const resEstados = Object.entries(RESERVA_LABEL[lang]).map(([value, label]) => ({ value, label }))
  const roles = Object.entries(ROLE_LABEL[lang]).map(([value, label]) => ({ value, label }))
  const tipos = (lang === 'pt'
    ? ['Casamento', 'Convidada', 'Aniversário', 'Evento corporativo', 'Outro']
    : ['Wedding', 'Guest', 'Birthday', 'Corporate event', 'Other']).map(v => ({ value: v, label: v }))

  if (type === 'lead') return {
    title: lang === 'pt' ? 'Nova lead' : 'New lead', table: 'leads',
    fields: [
      { key: 'name', label: t('nome'), type: 'text', required: true },
      { key: 'tipo', label: t('tipo_evento'), type: 'select', options: tipos },
      { key: 'estado', label: t('estado'), type: 'select', options: leadEstados },
      { key: 'data_evento', label: t('data'), type: 'text', placeholder: '12 Set 2026' },
      { key: 'local', label: t('local'), type: 'text' },
      { key: 'servicos', label: t('servicos'), type: 'services' },
      { key: 'convidados', label: t('convidados'), type: 'number' },
      { key: 'valor', label: t('valor'), type: 'text', placeholder: '€ 1.250' },
      { key: 'origem', label: t('origem'), type: 'select', options: ['WhatsApp', 'Instagram', 'Referência', 'Website'].map(v => ({ value: v, label: v })) },
      { key: 'phone', label: t('telefone'), type: 'text' },
      { key: 'email', label: t('email'), type: 'text' },
    ],
    defaults: { estado: 'novo', origem: 'WhatsApp', tipo: tipos[0].value },
  }
  if (type === 'reserva') return {
    title: lang === 'pt' ? 'Nova reserva' : 'New booking', table: 'bookings',
    fields: [
      { key: 'name', label: t('cliente'), type: 'text', required: true },
      { key: 'tipo', label: t('tipo_evento'), type: 'select', options: tipos },
      { key: 'estado', label: t('estado'), type: 'select', options: resEstados },
      { key: 'data_evento', label: t('data'), type: 'text', placeholder: '20 Jun 2026' },
      { key: 'hora', label: t('hora'), type: 'text', placeholder: '09:00' },
      { key: 'local', label: t('local'), type: 'text' },
      { key: 'servicos', label: t('servicos'), type: 'services' },
      { key: 'convidados', label: t('convidados'), type: 'number' },
      { key: 'total', label: t('total') + ' (€)', type: 'number' },
      { key: 'sinal', label: t('sinal') + ' (€)', type: 'number' },
      { key: 'notes', label: t('observacoes'), type: 'textarea' },
    ],
    defaults: { estado: 'pre', tipo: tipos[0].value, total: 0, sinal: 0 },
  }
  if (type === 'team') return {
    title: lang === 'pt' ? 'Novo colaborador' : 'New team member', table: 'team',
    fields: [
      { key: 'name', label: t('nome'), type: 'text', required: true },
      { key: 'role', label: lang === 'pt' ? 'Função' : 'Role', type: 'select', options: roles },
      { key: 'status', label: t('estado'), type: 'select', options: [
        { value: 'disp', label: t('disponivel') }, { value: 'ferias', label: t('ferias') }, { value: 'indisp', label: t('indisponivel') },
      ] },
    ],
    defaults: { role: roles[0].value, status: 'disp' },
  }
  return null
}

// build a DB-shaped row from form values
function buildRow(type, v) {
  const id = genId()
  const initials = initialsOf(v.name)
  const color = colorFor(v.name)
  if (type === 'lead') return {
    id, name: v.name, initials, color, estado: v.estado || 'novo', tipo: v.tipo,
    data_evento: v.data_evento || null, local: v.local || null, servicos: v.servicos || [],
    convidados: v.convidados || null, valor: v.valor || null, origem: v.origem || null,
    phone: v.phone || null, email: v.email || null,
  }
  if (type === 'reserva') return {
    id, name: v.name, initials, color, estado: v.estado || 'pre', tipo: v.tipo,
    data_evento: v.data_evento || 'A definir', hora: v.hora || null, local: v.local || null,
    servicos: v.servicos || [], total: v.total || 0, sinal: v.sinal || 0, pago: 0,
    pay_status: 'nao_pago', convidados: v.convidados || 0, notes: v.notes || null,
  }
  if (type === 'team') return {
    id, name: v.name, initials, color, role: v.role, load_count: 0, status: v.status || 'disp',
  }
  return null
}

export function EntityForm({ type, initial, lang, t, accent, isDesktop, persist, onClose, onComplete }) {
  const sc = schema(type, lang, t)
  const [vals, setVals] = useState({ ...(sc?.defaults || {}), ...(initial || {}) })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  if (!sc) return null

  const set = (k, val) => setVals(p => ({ ...p, [k]: val }))

  const save = async () => {
    if (!vals.name || !vals.name.trim()) { setErr(lang === 'pt' ? 'O nome é obrigatório.' : 'Name is required.'); return }
    setSaving(true); setErr(null)
    try {
      const row = buildRow(type, vals)
      await persist(sc.table, row)
      if (onComplete) await onComplete(row)
      onClose()
    } catch (e) {
      console.error(e); setErr(lang === 'pt' ? 'Erro ao guardar. Verifique a ligação ao Supabase.' : 'Save failed. Check the Supabase connection.')
      setSaving(false)
    }
  }

  return (
    <Modal title={sc.title} onClose={onClose} isDesktop={isDesktop}>
      {sc.fields.map((f) => <Field key={f.key} def={f} value={vals[f.key]} onChange={(val) => set(f.key, val)} lang={lang} />)}
      {err && <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: PALETTE.clay, marginBottom: 12 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        <Btn variant="ghost" accent={accent} size="md" onClick={onClose}>{t('cancelar')}</Btn>
        <Btn variant="solid" accent={accent} size="md" full icon="check" onClick={save}>{saving ? '…' : t('guardar')}</Btn>
      </div>
    </Modal>
  )
}

// ─── Paste a WhatsApp message → extract → create lead ─────────
export function WhatsAppModal({ lang, t, accent, isDesktop, onClose, onSubmit }) {
  const [step, setStep] = useState('paste')   // paste | review
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [text, setText] = useState('')
  const [f, setF] = useState({ tipo: 'Casamento', data: '', local: '', servicos: [], convidados: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const extract = () => {
    const e = extractLead(text)
    setF({ tipo: e.tipo || 'Casamento', data: e.data || '', local: e.local || '', servicos: e.servicos || [], convidados: e.convidados ?? '' })
    setStep('review')
  }

  const tipos = (lang === 'pt' ? ['Casamento','Convidada','Aniversário','Evento corporativo','Outro'] : ['Wedding','Guest','Birthday','Corporate event','Other']).map(v => ({ value: v, label: v }))

  const save = async () => {
    if (!name.trim()) { setErr(lang === 'pt' ? 'Indique o nome do cliente.' : 'Enter the client name.'); return }
    setSaving(true); setErr(null)
    try {
      await onSubmit({ name: name.trim(), phone: phone.trim(), text, fields: { ...f, convidados: f.convidados === '' ? null : Number(f.convidados) } })
      onClose()
    } catch (e) { console.error(e); setErr(lang === 'pt' ? 'Erro ao guardar.' : 'Save failed.'); setSaving(false) }
  }

  return (
    <Modal title={lang === 'pt' ? 'Mensagem do WhatsApp' : 'WhatsApp message'} onClose={onClose} isDesktop={isDesktop}>
      {step === 'paste' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '10px 12px', borderRadius: 12, background: hexToRgba(PALETTE.sage, 0.14) }}>
            <Eucalyptus size={16} stem={PALETTE.terracottaDark} leaf={PALETTE.sage} />
            <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.ink, lineHeight: 1.4 }}>
              {lang === 'pt' ? 'Cole ou reencaminhe a conversa. A IA extrai os dados da lead.' : 'Paste or forward the chat. AI extracts the lead details.'}
            </span>
          </div>
          <label style={labelStyle}>{lang === 'pt' ? 'Texto da mensagem' : 'Message text'}</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} autoFocus
            placeholder={lang === 'pt' ? 'Boa tarde! Vou casar a 12 de setembro na Quinta dos Sonhos, em Sintra. Queria maquilhagem e cabelo para mim e 4 damas, cerca de 120 convidados…' : 'Hi! Getting married on 12 September at…'}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 150 }} />
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            <Btn variant="ghost" accent={accent} size="md" onClick={onClose}>{t('cancelar')}</Btn>
            <Btn variant="solid" accent={accent} size="md" full icon="sparkle" onClick={extract} style={{ opacity: text.trim() ? 1 : 0.5, pointerEvents: text.trim() ? 'auto' : 'none' }}>{lang === 'pt' ? 'Extrair com IA' : 'Extract with AI'}</Btn>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Reveja e ajuste antes de criar' : 'Review and adjust before creating'}</span>
            <AIBadge />
          </div>
          <Field def={{ label: t('nome'), type: 'text' }} value={name} onChange={setName} lang={lang} />
          <Field def={{ label: t('telefone'), type: 'text' }} value={phone} onChange={setPhone} lang={lang} />
          <Field def={{ label: t('tipo_evento'), type: 'select', options: tipos }} value={f.tipo} onChange={(v) => setF(p => ({ ...p, tipo: v }))} lang={lang} />
          <Field def={{ label: t('data'), type: 'text', placeholder: '12 Set 2026' }} value={f.data} onChange={(v) => setF(p => ({ ...p, data: v }))} lang={lang} />
          <Field def={{ label: t('local'), type: 'text' }} value={f.local} onChange={(v) => setF(p => ({ ...p, local: v }))} lang={lang} />
          <Field def={{ label: t('servicos'), type: 'services' }} value={f.servicos} onChange={(v) => setF(p => ({ ...p, servicos: v }))} lang={lang} />
          <Field def={{ label: t('convidados'), type: 'number' }} value={f.convidados} onChange={(v) => setF(p => ({ ...p, convidados: v }))} lang={lang} />
          {err && <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: PALETTE.clay, marginBottom: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            <Btn variant="ghost" accent={accent} size="md" onClick={() => setStep('paste')}>{t('voltar')}</Btn>
            <Btn variant="solid" accent={accent} size="md" full icon="check" onClick={save}>{saving ? '…' : t('criar_lead')}</Btn>
          </div>
        </>
      )}
    </Modal>
  )
}

// ─── Small payment modal ──────────────────────────────────────
export function PaymentModal({ reserva, preset, lang, t, accent, isDesktop, onClose, onSave }) {
  const restante = (reserva.total || 0) - (reserva.pago || 0)
  const sinalEmFalta = Math.max(0, (reserva.sinal || 0) - (reserva.pago || 0))
  const [amount, setAmount] = useState(preset?.amount != null ? preset.amount : (restante > 0 ? restante : 0))
  const [saving, setSaving] = useState(false)
  const chips = [
    sinalEmFalta > 0 ? { label: lang === 'pt' ? `Sinal · €${sinalEmFalta.toLocaleString('pt-PT')}` : `Deposit · €${sinalEmFalta}`, val: sinalEmFalta } : null,
    restante > 0 ? { label: lang === 'pt' ? `Em dívida · €${restante.toLocaleString('pt-PT')}` : `Outstanding · €${restante}`, val: restante } : null,
  ].filter(Boolean)
  return (
    <Modal title={t('registar')} onClose={onClose} isDesktop={isDesktop}>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: PALETTE.inkSoft, marginBottom: 14 }}>
        {reserva.name} · {lang === 'pt' ? 'em dívida' : 'outstanding'}: € {restante.toLocaleString('pt-PT')}
      </div>
      {chips.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {chips.map((c, i) => (
            <button key={i} onClick={() => setAmount(c.val)} style={{ fontFamily: 'var(--sans)', fontSize: 12.5, padding: '7px 13px', borderRadius: 50, cursor: 'pointer', border: `1px solid ${Number(amount) === c.val ? accent : 'rgba(74,63,53,0.16)'}`, background: Number(amount) === c.val ? hexToRgba(accent, 0.12) : 'transparent', color: Number(amount) === c.val ? accent : PALETTE.inkSoft, fontWeight: 500 }}>{c.label}</button>
          ))}
        </div>
      )}
      <Field def={{ label: lang === 'pt' ? 'Valor recebido (€)' : 'Amount received (€)', type: 'number' }} value={amount} onChange={setAmount} lang={lang} />
      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        <Btn variant="ghost" accent={accent} size="md" onClick={onClose}>{t('cancelar')}</Btn>
        <Btn variant="solid" accent={accent} size="md" full icon="check" onClick={async () => {
          setSaving(true)
          const novoPago = Math.min((reserva.total || 0), (reserva.pago || 0) + Number(amount || 0))
          const pay = novoPago >= (reserva.total || 0) && reserva.total > 0 ? 'pago' : novoPago > 0 ? 'parcial' : 'nao_pago'
          await onSave({ pago: novoPago, pay_status: pay })
          onClose()
        }}>{saving ? '…' : t('confirmar')}</Btn>
      </div>
    </Modal>
  )
}
