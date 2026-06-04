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
  const suggested = (team || []).filter(m => m.status === 'disp').slice(0, 2)

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
          <ContactBtn icon="chat" label="WhatsApp" accent={PALETTE.sage} onClick={() => ctx.push('conversa', { id: l.id })} />
          <ContactBtn icon="phone" label={t('telefone')} accent={accent} />
          <ContactBtn icon="file" label={t('proposta')} accent={PALETTE.gold} />
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

        {suggested.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingLeft: 2 }}>
              <Label size={10.5}>{t('sugestao_equipa')}</Label><AIBadge />
            </div>
            <Card sage style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12.5, color: PALETTE.ink, marginBottom: 14, lineHeight: 1.5 }}>
                {lang === 'pt' ? `Disponíveis a ${l.data}:` : `Available on ${l.data}:`}
              </div>
              {suggested.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                  <Avatar initials={m.initials} color={m.color} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 15.5, color: PALETTE.nearBlack }}>{m.name}</div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: PALETTE.inkSoft }}>{ROLE_LABEL[lang][m.role]}</div>
                  </div>
                  <Chip tone={{ bg: hexToRgba(PALETTE.sage, 0.2), fg: PALETTE.terracottaDark, dot: PALETTE.sage }} size={11}>{t('disponivel')}</Chip>
                </div>
              ))}
            </Card>
          </>
        )}
      </div>

      <div style={{ flexShrink: 0, padding: '12px 18px 30px', background: 'var(--paper-card)', borderTop: '1px solid rgba(74,63,53,0.07)', display: 'flex', gap: 12 }}>
        <Btn variant="ghost" accent={accent} size="md" icon="chat" onClick={() => ctx.push('conversa', { id: l.id })}>{t('rever')}</Btn>
        <Btn variant="solid" accent={accent} size="md" full icon="arrowR" onClick={() => ctx.push('reserva', { id: l.id })}>{t('converter')}</Btn>
      </div>
    </div>
  )
}

function ContactBtn({ icon, label, accent, onClick }) {
  return (
    <button onClick={onClick} style={{ flex: 1, background: 'var(--paper-card)', border: '1px solid rgba(74,63,53,0.06)', borderRadius: 16, padding: '14px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, boxShadow: '0 3px 12px rgba(74,63,53,0.04)' }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: hexToRgba(accent, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={19} color={accent} stroke={1.7} />
      </div>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: PALETTE.ink, fontWeight: 400 }}>{label}</span>
    </button>
  )
}
