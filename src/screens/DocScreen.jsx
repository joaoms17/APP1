import React from 'react'
import { PALETTE, hexToRgba, SERVICE_LABEL } from '../data'
import { Icon, Label, Rule, Btn, AIBadge, Eucalyptus } from '../ui'

export default function DocScreen({ ctx, params }) {
  const { t, lang, accent, reservas, reservaById } = ctx
  const r = reservaById(params.reservaId) || (reservas || [])[0]
  const [sent, setSent] = React.useState(false)

  if (!r) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
      <div style={{ fontFamily: 'var(--sans)', color: PALETTE.inkSoft }}>Reserva não encontrada</div>
    </div>
  )

  const prices = { makeup: [r.tipo === 'Convidada' ? 95 : 320, 'Maquilhagem noiva + prova', 'Bridal makeup + trial'], hair: [380, 'Penteado noiva + 4 damas', 'Bridal hair + 4 bridesmaids'], photo: [950, 'Cobertura fotográfica · dia completo', 'Photography · full day'], dj: [800, 'DJ · 6 horas + equipamento', 'DJ · 6 hours + gear'], music: [600, 'Música ao vivo · cerimónia', 'Live music · ceremony'], planning: [1500, 'Coordenação completa', 'Full coordination'], video: [700, 'Vídeo highlights', 'Highlights video'] }
  const lineItems = (r.servicos || []).map(s => ({ name: SERVICE_LABEL[lang]?.[s] || s, desc: lang === 'pt' ? (prices[s]?.[1] || '') : (prices[s]?.[2] || ''), price: prices[s]?.[0] || 0 }))
  const subtotal = lineItems.reduce((a, b) => a + b.price, 0)
  const iva = Math.round(subtotal * 0.23)
  const total = subtotal + iva

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper-warm)' }}>
      <div style={{ paddingTop: 50, paddingBottom: 14, paddingInline: 14, background: 'var(--paper-card)', borderBottom: '1px solid rgba(74,63,53,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={ctx.pop} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <Icon name="chevL" size={24} color={accent} stroke={2} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 21, color: PALETTE.nearBlack }}>{t('orcamento')}</div>
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>{r.name}</div>
          </div>
          <AIBadge label={t('gerado_ia')} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 24px' }}>
        {sent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: hexToRgba(PALETTE.sage, 0.18), borderRadius: 14, padding: '12px 14px', marginBottom: 16 }}>
            <Icon name="check2" size={20} color={PALETTE.sage} stroke={1.8} />
            <span style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 13, color: PALETTE.nearBlack }}>{lang === 'pt' ? 'Orçamento enviado por WhatsApp' : 'Quote sent via WhatsApp'}</span>
          </div>
        )}

        <div style={{ background: 'var(--paper-card)', borderRadius: 14, boxShadow: '0 14px 40px rgba(74,63,53,0.12)', overflow: 'hidden', border: '1px solid rgba(74,63,53,0.05)' }}>
          <div style={{ padding: '30px 28px 22px', textAlign: 'center', borderBottom: '1px solid rgba(74,63,53,0.1)' }}>
            <Eucalyptus size={26} stem={PALETTE.terracotta} leaf={PALETTE.sage} style={{ margin: '0 auto 12px' }} />
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 26, color: PALETTE.nearBlack, letterSpacing: '0.02em' }}>Ramo Eventos</div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, letterSpacing: '0.28em', textTransform: 'uppercase', color: PALETTE.sage, marginTop: 6 }}>Lisboa · Portugal</div>
          </div>

          <div style={{ padding: '24px 28px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <Label size={9}>{t('cliente')}</Label>
                <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 17, color: PALETTE.nearBlack, marginTop: 3 }}>{r.name}</div>
                <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>{r.local}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Label size={9}>{t('data')}</Label>
                <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 17, color: PALETTE.nearBlack, marginTop: 3 }}>{r.data}</div>
                <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>Ref. RM-2026-{(r.id || '').slice(0,3).toUpperCase()}</div>
              </div>
            </div>

            <Rule dot style={{ marginBottom: 18 }} />

            {lineItems.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, padding: '11px 0', borderBottom: '1px solid rgba(74,63,53,0.07)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 14, color: PALETTE.nearBlack }}>{it.name}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>{it.desc}</div>
                </div>
                <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16, color: PALETTE.ink, whiteSpace: 'nowrap' }}>€ {it.price.toLocaleString('pt-PT')}</div>
              </div>
            ))}

            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                <span style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>Subtotal</span>
                <span style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 13.5, color: PALETTE.inkSoft }}>€ {subtotal.toLocaleString('pt-PT')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                <span style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>IVA 23%</span>
                <span style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 13.5, color: PALETTE.inkSoft }}>€ {iva.toLocaleString('pt-PT')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 14, borderTop: `2px solid ${hexToRgba(accent, 0.3)}` }}>
                <span style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: PALETTE.nearBlack }}>{t('total')}</span>
                <span style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 30, color: accent, whiteSpace: 'nowrap', flexShrink: 0 }}>€ {total.toLocaleString('pt-PT')}</span>
              </div>
            </div>

            <div style={{ marginTop: 22, padding: '14px 16px', background: 'var(--surface-sage)', borderRadius: 12, border: '1px solid rgba(147,160,126,0.45)' }}>
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.ink, lineHeight: 1.6 }}>
                {lang === 'pt' ? 'Sinal de 30% para confirmar a reserva. Restante até 7 dias antes do evento. Proposta válida por 14 dias.' : '30% deposit to confirm the booking. Balance up to 7 days before the event. Valid for 14 days.'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, padding: '0 4px' }}>
          <Eucalyptus size={15} stem={PALETTE.terracottaDark} leaf={PALETTE.sage} />
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 11.5, color: PALETTE.inkSoft, lineHeight: 1.4 }}>
            {lang === 'pt' ? 'Preparado pela IA a partir dos dados da reserva. Reveja antes de enviar.' : 'Prepared by AI from the booking data. Review before sending.'}
          </span>
        </div>
      </div>

      <div style={{ flexShrink: 0, padding: '12px 18px 30px', background: 'var(--paper-card)', borderTop: '1px solid rgba(74,63,53,0.07)', display: 'flex', gap: 12 }}>
        <Btn variant="ghost" accent={accent} size="md" icon="edit">{t('editar')}</Btn>
        <Btn variant="solid" accent={accent} size="md" full icon="send" onClick={() => setSent(true)}>{t('enviar_cliente')}</Btn>
      </div>
    </div>
  )
}
