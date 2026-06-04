import React from 'react'
import { PALETTE, hexToRgba } from '../data'
import { Icon, Label, Rule, Btn, AIBadge, Eucalyptus, Chip } from '../ui'

const inp = { boxSizing: 'border-box', padding: '7px 9px', borderRadius: 8, border: '1px solid rgba(74,63,53,0.2)', background: 'var(--paper)', fontFamily: 'var(--sans)', fontSize: 13, color: PALETTE.nearBlack, outline: 'none' }

export default function ProposalScreen({ ctx, params }) {
  const { lang, accent, proposals } = ctx
  const prop = (proposals || []).find(p => p.id === params.id)
  const [c, setC] = React.useState(prop ? prop.content : null)
  const [editing, setEditing] = React.useState(false)
  const [status, setStatus] = React.useState(prop ? prop.status : 'rascunho')
  const [savedMsg, setSavedMsg] = React.useState(null)

  if (!prop || !c) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
      <div style={{ fontFamily: 'var(--sans)', color: PALETTE.inkSoft }}>Proposta não encontrada</div>
    </div>
  )

  const setField = (k, v) => setC(p => ({ ...p, [k]: v }))
  const setLine = (group, i, k, v) => setC(p => ({ ...p, [group]: p[group].map((it, idx) => idx === i ? { ...it, [k]: v } : it) }))
  const removeLine = (group, i) => setC(p => ({ ...p, [group]: p[group].filter((_, idx) => idx !== i) }))
  const addExtra = () => setC(p => ({ ...p, extras: [...(p.extras || []), { title: lang === 'pt' ? 'Novo serviço' : 'New service', description: '', price: 0, unit: '' }] }))

  const save = async () => { await ctx.update('proposals', prop.id, { content: c }); setEditing(false); flash(lang === 'pt' ? 'Guardado ✓' : 'Saved ✓') }
  const send = async () => { await ctx.update('proposals', prop.id, { content: c, status: 'enviada' }); setStatus('enviada'); flash(lang === 'pt' ? 'Proposta marcada como enviada' : 'Marked as sent') }
  const flash = (m) => { setSavedMsg(m); setTimeout(() => setSavedMsg(null), 2200) }
  const fmt = (n) => `${Number(n || 0).toLocaleString('pt-PT')} €`

  const statusTone = { rascunho: PALETTE.inkSoft, enviada: PALETTE.gold, aceite: PALETTE.sage }[status] || PALETTE.inkSoft
  const statusLabel = { rascunho: lang === 'pt' ? 'Rascunho' : 'Draft', enviada: lang === 'pt' ? 'Enviada' : 'Sent', aceite: lang === 'pt' ? 'Aceite' : 'Accepted' }[status]

  const Section = ({ children }) => <div style={{ fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: PALETTE.sage, fontWeight: 500, margin: '22px 0 12px' }}>{children}</div>

  const LineBlock = ({ group, it, i }) => (
    <div style={{ padding: '11px 0', borderBottom: '1px solid rgba(74,63,53,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        {editing
          ? <input value={it.title} onChange={e => setLine(group, i, 'title', e.target.value)} style={{ ...inp, flex: 1, fontWeight: 600 }} />
          : <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 14, color: PALETTE.nearBlack, flex: 1 }}>{it.title}</div>}
        {editing
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="number" value={it.price} onChange={e => setLine(group, i, 'price', Number(e.target.value))} style={{ ...inp, width: 74, textAlign: 'right' }} />
              <input value={it.unit} onChange={e => setLine(group, i, 'unit', e.target.value)} placeholder="un." style={{ ...inp, width: 60 }} />
            </div>
          : <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16, color: accent, whiteSpace: 'nowrap' }}>{fmt(it.price)}{it.unit ? <span style={{ fontSize: 11, color: PALETTE.inkSoft }}> /{it.unit}</span> : ''}</div>}
      </div>
      {editing
        ? <textarea value={it.description} onChange={e => setLine(group, i, 'description', e.target.value)} rows={2} placeholder={lang === 'pt' ? 'Descrição' : 'Description'} style={{ ...inp, width: '100%', marginTop: 6, resize: 'vertical', fontSize: 12 }} />
        : it.description ? <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.inkSoft, marginTop: 3, lineHeight: 1.5 }}>{it.description}</div> : null}
      {editing && <button onClick={() => removeLine(group, i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.clay, fontFamily: 'var(--sans)', fontSize: 11.5, marginTop: 4 }}>{lang === 'pt' ? 'Remover' : 'Remove'}</button>}
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper-warm)' }}>
      <div style={{ paddingTop: 28, paddingBottom: 14, paddingInline: 14, background: 'var(--paper-card)', borderBottom: '1px solid rgba(74,63,53,0.07)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={ctx.pop} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}><Icon name="chevL" size={24} color={accent} stroke={2} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 20, color: PALETTE.nearBlack }}>{lang === 'pt' ? 'Proposta comercial' : 'Proposal'}</div>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.inkSoft }}>{prop.client_name}</div>
        </div>
        <Chip tone={{ bg: hexToRgba(statusTone, 0.16), fg: statusTone, dot: statusTone }} size={11}>{statusLabel}</Chip>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 24px' }}>
        {savedMsg && <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: hexToRgba(PALETTE.sage, 0.18), borderRadius: 14, padding: '12px 14px', marginBottom: 16, fontFamily: 'var(--sans)', fontSize: 13, color: PALETTE.nearBlack }}><Icon name="check2" size={18} color={PALETTE.sage} stroke={1.8} />{savedMsg}</div>}

        <div style={{ background: 'var(--paper-card)', borderRadius: 14, boxShadow: '0 14px 40px rgba(74,63,53,0.12)', overflow: 'hidden', border: '1px solid rgba(74,63,53,0.05)' }}>
          {/* letterhead */}
          <div style={{ padding: '28px 26px 20px', textAlign: 'center', borderBottom: '1px solid rgba(74,63,53,0.1)' }}>
            {c.logo_url ? <img src={c.logo_url} alt="logo" style={{ maxHeight: 70, maxWidth: 200, objectFit: 'contain', marginBottom: 10 }} /> : <Eucalyptus size={26} stem={accent} leaf={PALETTE.sage} style={{ margin: '0 auto 10px' }} />}
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 25, color: PALETTE.nearBlack }}>{c.company}</div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, letterSpacing: '0.28em', textTransform: 'uppercase', color: PALETTE.sage, marginTop: 6 }}>{c.location}</div>
          </div>

          <div style={{ padding: '20px 26px 28px' }}>
            {/* sobre */}
            {(c.about || editing) && <>
              <Section>{lang === 'pt' ? 'Sobre' : 'About'}</Section>
              {editing
                ? <textarea value={c.about} onChange={e => setField('about', e.target.value)} rows={4} style={{ ...inp, width: '100%', resize: 'vertical' }} />
                : <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.ink, lineHeight: 1.6 }}>{c.about}</div>}
            </>}

            {/* noivas */}
            <Section>{lang === 'pt' ? 'Noivas' : 'Bride'}</Section>
            {c.packages.length ? c.packages.map((it, i) => <LineBlock key={i} group="packages" it={it} i={i} />)
              : <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Sem pacote para os serviços selecionados.' : 'No package for selected services.'}</div>}

            {c.convidadas.length > 0 && <>
              <Section>{lang === 'pt' ? 'Convidadas' : 'Guests'}</Section>
              {c.convidadas.map((it, i) => <LineBlock key={i} group="convidadas" it={it} i={i} />)}
            </>}

            {(c.extras?.length > 0 || editing) && <>
              <Section>{lang === 'pt' ? 'Outros serviços' : 'Extras'}</Section>
              {(c.extras || []).map((it, i) => <LineBlock key={i} group="extras" it={it} i={i} />)}
              {editing && <button onClick={addExtra} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, fontFamily: 'var(--sans)', fontSize: 12.5, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="plus" size={14} color={accent} stroke={2} />{lang === 'pt' ? 'Adicionar serviço' : 'Add service'}</button>}
            </>}

            <Section>{lang === 'pt' ? 'Deslocação' : 'Travel'}</Section>
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.ink }}>
              {lang === 'pt' ? 'Calculada a ' : 'Charged at '}
              {editing ? <input type="number" step="0.05" value={c.deslocacao_rate} onChange={e => setField('deslocacao_rate', Number(e.target.value))} style={{ ...inp, width: 70 }} /> : <strong>{c.deslocacao_rate} €</strong>}
              {lang === 'pt' ? ' por quilómetro.' : ' per km.'}
            </div>

            {(c.payment || editing) && <>
              <Section>{lang === 'pt' ? 'Pagamento' : 'Payment'}</Section>
              {editing
                ? <textarea value={c.payment} onChange={e => setField('payment', e.target.value)} rows={4} style={{ ...inp, width: '100%', resize: 'vertical' }} />
                : <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.payment}</div>}
            </>}

            {(c.terms || editing) && <>
              <Section>{lang === 'pt' ? 'Termos e condições' : 'Terms'}</Section>
              {editing
                ? <textarea value={c.terms} onChange={e => setField('terms', e.target.value)} rows={7} style={{ ...inp, width: '100%', resize: 'vertical' }} />
                : <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 11.5, color: PALETTE.inkSoft, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.terms}</div>}
            </>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, padding: '0 4px' }}>
          <Eucalyptus size={15} stem={PALETTE.terracottaDark} leaf={PALETTE.sage} />
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 11.5, color: PALETTE.inkSoft, lineHeight: 1.4 }}>
            {lang === 'pt' ? 'Gerada a partir da tabela de preços e dos serviços da lead. Edite antes de enviar.' : 'Generated from the price table and the lead services. Edit before sending.'}
          </span>
        </div>
      </div>

      <div style={{ flexShrink: 0, padding: '12px 18px 30px', background: 'var(--paper-card)', borderTop: '1px solid rgba(74,63,53,0.07)', display: 'flex', gap: 12 }}>
        {editing
          ? <Btn variant="solid" accent={accent} size="md" full icon="check" onClick={save}>{lang === 'pt' ? 'Guardar alterações' : 'Save changes'}</Btn>
          : <>
              <Btn variant="ghost" accent={accent} size="md" icon="edit" onClick={() => setEditing(true)}>{lang === 'pt' ? 'Editar' : 'Edit'}</Btn>
              <Btn variant="solid" accent={accent} size="md" full icon="send" onClick={send}>{lang === 'pt' ? 'Marcar enviada' : 'Mark sent'}</Btn>
            </>}
      </div>
    </div>
  )
}
