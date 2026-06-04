import React from 'react'
import { PALETTE, hexToRgba, svc } from '../data'
import { Icon, Card, Serif, Label, Rule, AIBadge, AvatarStack, Eucalyptus } from '../ui'

function StatTile({ value, label, accent, onClick }) {
  return (
    <div onClick={onClick} style={{ flex: 1, background: 'var(--paper-card)', borderRadius: 16, padding: '14px 14px 13px', border: '1px solid rgba(74,63,53,0.05)', boxShadow: '0 4px 16px rgba(74,63,53,0.05)', cursor: onClick ? 'pointer' : 'default', minWidth: 0 }}>
      <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 34, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 6, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}

function SectionHead({ children, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 2px 12px' }}>
      <Label size={11.5}>{children}</Label>
      {action && <button onClick={onAction} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.terracotta, letterSpacing: '0.02em', padding: 0 }}>{action}</button>}
    </div>
  )
}

function AccountMenu({ ctx, onClose }) {
  const { t, lang, accent, userName, signOut, tw, setTw, isDesktop } = ctx
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1800, background: 'rgba(46,40,32,.35)', display: 'flex', alignItems: isDesktop ? 'flex-start' : 'center', justifyContent: 'center', padding: 24, paddingTop: isDesktop ? 80 : 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 300, background: 'var(--paper)', borderRadius: 18, padding: '20px 20px 22px', boxShadow: '0 20px 50px rgba(46,40,32,.28)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: hexToRgba(accent, 0.16), color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 17 }}>{(userName || '?').slice(0,1).toUpperCase()}</div>
          <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 17, color: PALETTE.nearBlack }}>{userName}</div>
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: PALETTE.inkSoft, marginBottom: 10 }}>{lang === 'pt' ? 'Cor de marca' : 'Brand colour'}</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['#A9744F','#B25B43','#8C5C3C','#93A07E'].map(c => (
            <button key={c} onClick={() => setTw(p => ({...p, accent: c}))} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: tw.accent === c ? '2px solid #29261b' : '2px solid transparent', cursor: 'pointer' }} />
          ))}
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: PALETTE.inkSoft, marginBottom: 10 }}>{lang === 'pt' ? 'Idioma' : 'Language'}</div>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,.06)', borderRadius: 8, padding: 2, gap: 2, marginBottom: 18 }}>
          {['pt','en'].map(l => (
            <button key={l} onClick={() => setTw(p => ({...p, lang: l}))} style={{ flex: 1, padding: '7px', borderRadius: 6, border: 'none', cursor: 'pointer', background: tw.lang === l ? 'rgba(255,255,255,.9)' : 'transparent', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, color: tw.lang === l ? PALETTE.nearBlack : PALETTE.inkSoft }}>{l.toUpperCase()}</button>
          ))}
        </div>
        <button onClick={() => { onClose(); ctx.goTab('definicoes') }} style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1px solid rgba(74,63,53,0.16)', background: 'transparent', color: PALETTE.ink, fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 10 }}>{lang === 'pt' ? 'Definições e propostas' : 'Settings & proposals'}</button>
        <button onClick={signOut} style={{ width: '100%', padding: '11px', borderRadius: 10, border: `1px solid ${hexToRgba(PALETTE.clay, 0.4)}`, background: 'transparent', color: PALETTE.clay, fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{lang === 'pt' ? 'Terminar sessão' : 'Sign out'}</button>
      </div>
    </div>
  )
}

export default function HomeScreen({ ctx }) {
  const { t, lang, accent, agendaEvents, leads, reservas, teamById, userName } = ctx
  const events = agendaEvents || []
  const allLeads = leads || []
  const allReservas = reservas || []
  const [menu, setMenu] = React.useState(false)

  const totalPago = allReservas.reduce((s, r) => s + (r.pago || 0), 0)
  const totalPrevisto = allReservas.reduce((s, r) => s + (r.total || 0), 0)
  const totalDivida = allReservas.reduce((s, r) => s + Math.max(0, (r.total || 0) - (r.pago || 0)), 0)
  const fmt = (n) => `€ ${n.toLocaleString('pt-PT')}`

  const now = new Date()
  const hour = now.getHours()
  const greet = hour < 12 ? (lang === 'pt' ? 'Bom dia' : 'Good morning') : hour < 20 ? (lang === 'pt' ? 'Boa tarde' : 'Good afternoon') : (lang === 'pt' ? 'Boa noite' : 'Good evening')
  const mesesPt = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const dateLabel = `${now.getDate()} ${mesesPt[now.getMonth()]}`

  const novas = allLeads.filter(l => l.estado === 'novo').length
  const propostas = allLeads.filter(l => l.estado === 'proposta' || l.estado === 'negociacao').length
  const ganhas = allLeads.filter(l => l.estado === 'ganho').length
  const conv = allLeads.length ? Math.round((ganhas / allLeads.length) * 100) : 0

  return (
    <div style={{ padding: '30px 18px 24px' }}>
      {menu && <AccountMenu ctx={ctx} onClose={() => setMenu(false)} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <Label size={10.5} style={{ marginBottom: 8, color: PALETTE.sage }}>{t('today')} · {dateLabel}</Label>
          <Serif size={32} weight={500}>{greet}{userName ? `, ${userName.split(' ')[0]}` : ''}</Serif>
        </div>
        <button onClick={() => setMenu(true)} style={{ position: 'relative', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--paper-card)', boxShadow: '0 3px 12px rgba(74,63,53,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bell" size={20} color={PALETTE.ink} stroke={1.5} />
          </div>
          {novas > 0 && <div style={{ position: 'absolute', top: 4, right: 4, width: 9, height: 9, borderRadius: '50%', background: accent, border: '2px solid var(--paper-card)' }} />}
        </button>
      </div>

      <Card sage onClick={() => ctx.goTab('conversas')} style={{ marginBottom: 22, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: hexToRgba(PALETTE.sage, 0.35), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Eucalyptus size={20} stem={PALETTE.terracottaDark} leaf={PALETTE.sage} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 14.5, color: PALETTE.nearBlack }}>{t('needs_attention')}</span>
              <AIBadge />
            </div>
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.ink }}>
              {novas === 0
                ? <span style={{ color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Nada pendente' : 'Nothing pending'}</span>
                : <><strong style={{ fontWeight: 600, color: PALETTE.terracottaDark }}>{novas} {lang === 'pt' ? (novas === 1 ? 'lead nova' : 'leads novas') : 'new leads'}</strong></>}
            </div>
          </div>
          <Icon name="chevR" size={20} color={PALETTE.sage} stroke={1.8} />
        </div>
      </Card>

      <SectionHead action={t('ver_tudo')} onAction={() => ctx.goTab('negocios')}>{t('comercial')}</SectionHead>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <StatTile value={String(allLeads.length)} label={t('leads_recebidas')} accent={accent} onClick={() => ctx.goTab('negocios')} />
        <StatTile value={`${conv}%`} label={t('taxa_conversao')} accent={PALETTE.sage} />
        <StatTile value={String(propostas)} label={t('propostas_enviadas')} accent={PALETTE.gold} />
      </div>

      <SectionHead action={t('ver_tudo')} onAction={() => ctx.goTab('agenda')}>{t('operacional')}</SectionHead>
      {events.length === 0
        ? <Card style={{ marginBottom: 24, padding: '28px 16px', textAlign: 'center' }}>
            <Eucalyptus size={22} stem={PALETTE.terracotta} leaf={PALETTE.sage} style={{ margin: '0 auto 10px' }} />
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>Sem eventos próximos</div>
          </Card>
        : <>
            <Card style={{ marginBottom: 12, padding: 0 }}>
              {events.slice(0, 3).map((e, i) => (
                <div key={e.id + i} onClick={() => ctx.push('reserva', { id: e.id })} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderTop: i === 0 ? 'none' : '1px solid rgba(74,63,53,0.07)', cursor: 'pointer' }}>
                  <div style={{ textAlign: 'center', width: 38, flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 22, color: PALETTE.nearBlack, lineHeight: 1 }}>{e.day}</div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 9.5, letterSpacing: '0.16em', color: PALETTE.inkSoft, textTransform: 'uppercase', marginTop: 2 }}>Jun</div>
                  </div>
                  <div style={{ width: 1, height: 30, background: 'rgba(74,63,53,0.1)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16.5, color: PALETTE.nearBlack, display: 'flex', alignItems: 'center', gap: 7 }}>
                      {e.name}
                      {e.conflict && <Icon name="alert" size={14} color={PALETTE.clay} stroke={1.8} />}
                    </div>
                    <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>{e.local} · {svc(lang, e.servicos)}</div>
                  </div>
                  <AvatarStack ids={e.team} size={26} teamById={teamById} />
                </div>
              ))}
            </Card>
          </>
      }

      <SectionHead action={t('ver_tudo')} onAction={() => ctx.goTab('financeiro')}>{t('financeiro')}</SectionHead>
      <Card style={{ padding: '18px 18px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <Label size={10}>{lang === 'pt' ? 'Faturado' : 'Invoiced'}</Label>
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 40, color: accent, lineHeight: 1.05, marginTop: 4 }}>{allReservas.length ? fmt(totalPago) : '—'}</div>
          </div>
        </div>
        <Rule dot style={{ margin: '14px 0' }} />
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <Label size={9.5}>{t('receita_prevista')}</Label>
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 22, color: PALETTE.nearBlack, marginTop: 3 }}>{allReservas.length ? fmt(totalPrevisto) : '—'}</div>
          </div>
          <div style={{ width: 1, background: 'rgba(74,63,53,0.1)' }} />
          <div style={{ flex: 1 }}>
            <Label size={9.5}>{t('pagamentos_pendentes')}</Label>
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 22, color: PALETTE.clay, marginTop: 3 }}>{allReservas.length ? fmt(totalDivida) : '—'}</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
