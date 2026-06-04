import React from 'react'
import { PALETTE, hexToRgba, svc, leadTone, LEAD_LABEL, ROLE_LABEL, SERVICE_LABEL } from '../data'
import { Icon, Avatar, Chip, Card, ServiceChip, Label, AIBadge, Btn, Eucalyptus } from '../ui'

function FieldRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0', borderBottom: '1px solid rgba(74,63,53,0.07)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: hexToRgba(PALETTE.sage, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={17} color={PALETTE.sage} stroke={1.6} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: PALETTE.inkSoft }}>{label}</div>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 14.5, color: PALETTE.nearBlack, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
}

export default function LeadScreen({ ctx, params }) {
  const { t, lang, accent, leads, team, teamById } = ctx
  const l = (leads || []).find((x) => x.id === params.id) || null

  if (!l) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
      <div style={{ fontFamily: 'var(--sans)', color: PALETTE.inkSoft }}>Lead não encontrada</div>
    </div>
  )

  const tone = leadTone(l.estado)
  const digits = (l.phone || '').replace(/[^\d+]/g, '')
  const openWhatsApp = () => { if (digits) window.open(`https://wa.me/${digits.replace(/\D/g, '')}`, '_blank') }
  const openPhone = () => { if (digits) window.location.href = `tel:${digits}` }
  const openEmail = () => { if (l.email) window.location.href = `mailto:${l.email}` }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      <div style={{ paddingTop: 50, paddingBottom: 14, paddingInline: 14, background: 'var(--paper-card)', borderBottom: '1px solid rgba(74,63,53,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={ctx.pop} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <Icon name="chevL" size={24} color={accent} stroke={2} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 21, color: PALETTE.nearBlack, lineHeight: 1.1 }}>{l.name}</div>
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>{l.tipo} · {l.data}</div>
          </div>
          <Chip tone={tone}>{LEAD_LABEL[lang][l.estado]}</Chip>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 20px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <ContactBtn icon="chat" label="WhatsApp" accent={PALETTE.sage} disabled={!digits} onClick={openWhatsApp} />
          <ContactBtn icon="phone" label={t('telefone')} accent={accent} disabled={!digits} onClick={openPhone} />
          <ContactBtn icon="send" label="Email" accent={PALETTE.gold} disabled={!l.email} onClick={openEmail} />
        </div>

        <Label size={10.5} style={{ marginBottom: 4 }}>{t('detalhes')}</Label>
        <Card style={{ marginBottom: 20, padding: '4px 16px' }}>
          <FieldRow icon="calendar" label={t('data')} value={l.data} />
          <FieldRow icon="pin" label={t('local')} value={l.local} />
          <FieldRow icon="users" label={t('convidados')} value={`${l.convidados} ${t('convidados_n')}`} />
          <div style={{ padding: '12px 0' }}>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: PALETTE.inkSoft, marginBottom: 8 }}>{t('servicos')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{(l.servicos || []).map((s) => <ServiceChip key={s} k={s} lang={lang} SERVICE_LABEL={SERVICE_LABEL} />)}</div>
          </div>
        </Card>

        <Label size={10.5} style={{ marginBottom: 8 }}>{t('estado')}</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
          {Object.entries(LEAD_LABEL[lang]).map(([est, label]) => {
            const on = l.estado === est
            const tn = leadTone(est)
            return (
              <button key={est} onClick={() => ctx.update('leads', l.id, { estado: est })} style={{
                fontFamily: 'var(--sans)', fontSize: 12, padding: '7px 13px', borderRadius: 50, cursor: 'pointer',
                border: `1px solid ${on ? tn.fg : 'rgba(74,63,53,0.16)'}`,
                background: on ? tn.bg : 'transparent', color: on ? tn.fg : PALETTE.inkSoft, fontWeight: on ? 500 : 400,
              }}>{label}</button>
            )
          })}
        </div>
      </div>

      <div style={{ flexShrink: 0, padding: '12px 18px 30px', background: 'var(--paper-card)', borderTop: '1px solid rgba(74,63,53,0.07)', display: 'flex', gap: 12 }}>
        <Btn variant="solid" accent={accent} size="md" full icon="arrowR" onClick={() => ctx.openCreate('reserva', {
          initial: { name: l.name, tipo: l.tipo, data_evento: l.data, local: l.local, servicos: l.servicos, convidados: l.convidados, estado: 'proposta' },
          onComplete: async (row, { update }) => { await update('leads', l.id, { estado: 'ganho' }); ctx.pop() },
        })}>{t('converter')}</Btn>
      </div>
    </div>
  )
}

function ContactBtn({ icon, label, accent, onClick, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{ flex: 1, background: 'var(--paper-card)', border: '1px solid rgba(74,63,53,0.06)', borderRadius: 16, padding: '14px 8px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, boxShadow: '0 3px 12px rgba(74,63,53,0.04)' }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: hexToRgba(accent, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={19} color={accent} stroke={1.7} />
      </div>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: PALETTE.ink, fontWeight: 400 }}>{label}</span>
    </button>
  )
}
