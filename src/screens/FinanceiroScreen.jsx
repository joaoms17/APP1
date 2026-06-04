import React from 'react'
import { PALETTE, hexToRgba, PAY_LABEL } from '../data'
import { Icon, Card, Label, Avatar, Eucalyptus } from '../ui'

export default function FinanceiroScreen({ ctx }) {
  const { t, lang, accent, reservas } = ctx
  const lista = reservas || []
  const months = lang === 'pt' ? ['Jan','Fev','Mar','Abr','Mai','Jun'] : ['Jan','Feb','Mar','Apr','May','Jun']
  const pendentes = lista.filter(r => r.pay !== 'pago' && (r.total - r.pago) > 0)

  const totalPago = lista.reduce((s, r) => s + (r.pago || 0), 0)
  const totalPrevisto = lista.reduce((s, r) => s + (r.total || 0), 0)
  const totalDivida = lista.reduce((s, r) => s + Math.max(0, (r.total || 0) - (r.pago || 0)), 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '30px 18px 6px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 500, fontSize: 32, color: PALETTE.nearBlack, lineHeight: 1.1 }}>{t('tab_financeiro')}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 24px' }}>
        <Card style={{ marginBottom: 16, padding: '20px 18px 18px' }}>
          <Label size={10}>{t('receita_mes')}</Label>
          <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 46, color: accent, lineHeight: 1, marginTop: 4 }}>
            {lista.length === 0 ? '—' : `€ ${totalPago.toLocaleString('pt-PT')}`}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 96, marginTop: 20 }}>
            {months.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: '100%', height: `${i === months.length - 1 ? 80 : 20 + i * 12}px`, borderRadius: 5, background: i === months.length - 1 ? accent : hexToRgba(PALETTE.sage, 0.4) }} />
                <span style={{ fontFamily: 'var(--sans)', fontSize: 9.5, color: PALETTE.inkSoft }}>{m}</span>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
          <Card style={{ flex: 1, padding: '15px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <Icon name="sparkle" size={14} color={PALETTE.sage} stroke={1.7} />
              <Label size={9.5}>{t('receita_prevista')}</Label>
            </div>
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 26, color: PALETTE.nearBlack }}>
              {lista.length === 0 ? '—' : `€ ${totalPrevisto.toLocaleString('pt-PT')}`}
            </div>
          </Card>
          <Card style={{ flex: 1, padding: '15px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <Icon name="clock" size={14} color={PALETTE.clay} stroke={1.7} />
              <Label size={9.5}>{t('pagamentos_pendentes')}</Label>
            </div>
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 26, color: PALETTE.clay }}>
              {lista.length === 0 ? '—' : `€ ${totalDivida.toLocaleString('pt-PT')}`}
            </div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, color: PALETTE.inkSoft, marginTop: 2 }}>{pendentes.length} {lang === 'pt' ? 'reservas' : 'bookings'}</div>
          </Card>
        </div>

        <Label size={10.5} style={{ marginBottom: 12 }}>{t('pagamentos_pendentes')}</Label>
        {pendentes.length === 0
          ? <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <Eucalyptus size={22} stem={PALETTE.terracotta} leaf={PALETTE.sage} style={{ margin: '0 auto 10px' }} />
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Sem pagamentos pendentes' : 'No pending payments'}</div>
            </div>
          : pendentes.map((r) => {
              const divida = (r.total || 0) - (r.pago || 0)
              const payTone = { pago: PALETTE.sage, parcial: PALETTE.gold, nao_pago: PALETTE.clay }[r.pay] || PALETTE.clay
              return (
                <Card key={r.id} onClick={() => ctx.push('reserva', { id: r.id })} style={{ marginBottom: 10, padding: '13px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar initials={r.initials} color={r.color} size={42} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16, color: PALETTE.nearBlack }}>{r.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: payTone }} />
                        <span style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: PALETTE.inkSoft }}>{PAY_LABEL[lang][r.pay]} · {r.data}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 17, color: PALETTE.clay, whiteSpace: 'nowrap' }}>€ {divida.toLocaleString('pt-PT')}</div>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: PALETTE.inkSoft }}>{t('em_divida').toLowerCase()}</div>
                    </div>
                  </div>
                </Card>
              )
            })
        }
      </div>
    </div>
  )
}
