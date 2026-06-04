import React from 'react'
import { PALETTE, hexToRgba, PAY_LABEL } from '../data'
import { Icon, Card, Label, Avatar, Eucalyptus } from '../ui'

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
// parse "20 Jun 2026" → month index 0-11 (PT or EN abbrev)
function monthIndexOf(str) {
  if (!str) return null
  const m = String(str).match(/([A-Za-zçÇ]{3,})/)
  if (!m) return null
  const k = m[1].slice(0, 3).toLowerCase()
  const pt = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  const en = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
  let i = pt.indexOf(k); if (i >= 0) return i
  i = en.indexOf(k); return i >= 0 ? i : null
}

export default function FinanceiroScreen({ ctx }) {
  const { t, lang, accent, reservas } = ctx
  const lista = reservas || []
  const MN = lang === 'pt' ? MONTHS_PT : MONTHS_EN
  const pendentes = lista.filter(r => r.pay !== 'pago' && (r.total - r.pago) > 0)

  const totalPago = lista.reduce((s, r) => s + (r.pago || 0), 0)
  const totalPrevisto = lista.reduce((s, r) => s + (r.total || 0), 0)
  const totalDivida = lista.reduce((s, r) => s + Math.max(0, (r.total || 0) - (r.pago || 0)), 0)

  // real revenue by month (event date) — only months that have bookings
  const byMonth = {}
  lista.forEach(r => { const mi = monthIndexOf(r.data); if (mi != null) byMonth[mi] = (byMonth[mi] || 0) + (r.total || 0) })
  const chart = Object.keys(byMonth).map(Number).sort((a,b) => a-b).map(mi => ({ label: MN[mi], value: byMonth[mi] }))
  const chartMax = chart.reduce((m, c) => Math.max(m, c.value), 0) || 1

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '30px 18px 6px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 500, fontSize: 32, color: PALETTE.nearBlack, lineHeight: 1.1 }}>{t('tab_financeiro')}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 24px' }}>
        <Card style={{ marginBottom: 16, padding: '20px 18px 18px' }}>
          <Label size={10}>{lang === 'pt' ? 'Total faturado' : 'Total invoiced'}</Label>
          <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 46, color: accent, lineHeight: 1, marginTop: 4 }}>
            {lista.length === 0 ? '—' : `€ ${totalPago.toLocaleString('pt-PT')}`}
          </div>
          {chart.length > 0 && (
            <>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, color: PALETTE.inkSoft, marginTop: 14, marginBottom: 4 }}>{lang === 'pt' ? 'Valor por mês de evento' : 'Value by event month'}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 96, marginTop: 8 }}>
                {chart.map((c, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div title={`€ ${c.value.toLocaleString('pt-PT')}`} style={{ width: '100%', height: `${Math.max(6, (c.value / chartMax) * 80)}px`, borderRadius: 5, background: i === chart.length - 1 ? accent : hexToRgba(PALETTE.sage, 0.4) }} />
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 9.5, color: PALETTE.inkSoft }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
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
