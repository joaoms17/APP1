import React from 'react'
import { PALETTE, hexToRgba, svc, leadTone, reservaTone, LEAD_LABEL, RESERVA_LABEL, PIPELINE_ORDER, SERVICE_LABEL } from '../data'
import { Icon, Avatar, ServiceChip, AvatarStack, Card, Chip, Eucalyptus } from '../ui'

function Segmented({ options, value, onChange, accent }) {
  return (
    <div style={{ display: 'flex', background: hexToRgba(PALETTE.ink, 0.06), borderRadius: 50, padding: 4, gap: 4 }}>
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{ flex: 1, padding: '9px 8px', borderRadius: 50, border: 'none', cursor: 'pointer', background: value === o.id ? 'var(--paper-card)' : 'transparent', boxShadow: value === o.id ? '0 2px 8px rgba(74,63,53,0.1)' : 'none', fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 12.5, letterSpacing: '0.04em', color: value === o.id ? accent : PALETTE.inkSoft, transition: 'all .2s' }}>
          {o.label}{o.count != null && <span style={{ opacity: 0.6, marginLeft: 5 }}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export default function NegociosScreen({ ctx }) {
  const { t, lang, accent, leads, reservas, teamById } = ctx
  const [view, setView] = React.useState(ctx.params?.view || 'pipeline')
  const reservasList = reservas || []
  // Closed deals (won/lost) leave the pipeline — won ones live as bookings
  const leadsList = (leads || []).filter(l => l.estado !== 'ganho' && l.estado !== 'perdido')
  const [menu, setMenu] = React.useState(false)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '30px 18px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 500, fontSize: 32, color: PALETTE.nearBlack, lineHeight: 1.1 }}>{t('tab_negocios')}</div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => { if (view === 'reservas') ctx.openCreate('reserva'); else setMenu(m => !m) }} style={{ width: 42, height: 42, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(169,116,79,0.3)', marginTop: 4 }}>
              <Icon name="plus" size={22} color="#FBF7F0" stroke={2} />
            </button>
            {menu && view === 'pipeline' && (
              <>
                <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{ position: 'absolute', top: 50, right: 0, zIndex: 50, background: 'var(--paper-card)', borderRadius: 14, boxShadow: '0 12px 32px rgba(74,63,53,0.18)', border: '1px solid rgba(74,63,53,0.08)', overflow: 'hidden', width: 230 }}>
                  <button onClick={() => { setMenu(false); ctx.openPasteChat() }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', background: 'none', border: 'none', borderBottom: '1px solid rgba(74,63,53,0.07)', cursor: 'pointer', textAlign: 'left' }}>
                    <Icon name="chat" size={18} color={PALETTE.sage} stroke={1.7} />
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: PALETTE.nearBlack }}>{lang === 'pt' ? 'Colar mensagem WhatsApp' : 'Paste WhatsApp message'}</span>
                  </button>
                  <button onClick={() => { setMenu(false); ctx.openCreate('lead') }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <Icon name="edit" size={18} color={accent} stroke={1.7} />
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: PALETTE.nearBlack }}>{lang === 'pt' ? 'Lead manual' : 'Manual lead'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <Segmented accent={accent} value={view} onChange={setView} options={[
          { id: 'pipeline', label: t('pipeline'), count: leadsList.length },
          { id: 'reservas', label: t('reservas'), count: reservasList.length },
        ]} />
      </div>
      {view === 'pipeline'
        ? <PipelineView ctx={ctx} leads={leadsList} lang={lang} accent={accent} t={t} />
        : <ReservasView ctx={ctx} reservas={reservasList} lang={lang} accent={accent} t={t} teamById={teamById} />}
    </div>
  )
}

function PipelineView({ ctx, leads, lang, accent, t }) {
  if (leads.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24 }}>
        <Eucalyptus size={28} stem={PALETTE.terracotta} leaf={PALETTE.sage} />
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Pipeline vazio' : 'Empty pipeline'}</div>
      </div>
    )
  }
  // only show stages that have leads
  const stages = PIPELINE_ORDER.filter((est) => leads.some((l) => l.estado === est))
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '6px 18px 24px' }}>
      {stages.map((est) => {
        const items = leads.filter((l) => l.estado === est)
        const tone = leadTone(est)
        return (
          <div key={est} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 2px 10px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone.dot }} />
              <span style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 12, letterSpacing: '0.06em', color: PALETTE.nearBlack, textTransform: 'uppercase' }}>{LEAD_LABEL[lang][est]}</span>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.inkSoft, marginLeft: 'auto' }}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((l) => (
                <div key={l.id} onClick={() => ctx.push('lead', { id: l.id })} style={{ background: 'var(--paper-card)', borderRadius: 16, padding: 14, cursor: 'pointer', boxShadow: '0 4px 16px rgba(74,63,53,0.06)', borderLeft: `3px solid ${tone.dot}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar initials={l.initials} color={l.color} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16.5, color: PALETTE.nearBlack, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: PALETTE.inkSoft }}>{l.tipo}{l.data ? ` · ${l.data}` : ''}</div>
                    </div>
                    {l.valor && <span style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 17, color: accent, flexShrink: 0 }}>{l.valor}</span>}
                  </div>
                  {(l.servicos || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 11 }}>
                      {l.servicos.map((s) => <ServiceChip key={s} k={s} lang={lang} SERVICE_LABEL={SERVICE_LABEL} />)}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 11, fontFamily: 'var(--sans)', fontSize: 11, color: PALETTE.inkSoft }}>
                    <Icon name={l.origem === 'Instagram' ? 'instagram' : l.origem === 'WhatsApp' ? 'chat' : 'user'} size={13} color={PALETTE.sage} stroke={1.6} />
                    {l.origem || (lang === 'pt' ? 'Manual' : 'Manual')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ReservasView({ ctx, reservas, lang, accent, t, teamById }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 24px' }}>
      {reservas.length === 0
        ? <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <Eucalyptus size={28} stem={PALETTE.terracotta} leaf={PALETTE.sage} style={{ margin: '0 auto 12px' }} />
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>Sem reservas ainda</div>
          </div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reservas.map((r) => {
              const tone = reservaTone(r.estado)
              return (
                <Card key={r.id} onClick={() => ctx.push('reserva', { id: r.id })} pad={0}>
                  <div style={{ padding: '16px 16px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <Avatar initials={r.initials} color={r.color} size={46} ring />
                        <div>
                          <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 18, color: PALETTE.nearBlack }}>{r.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.inkSoft }}>
                            <Icon name="calendar" size={13} color={PALETTE.inkSoft} stroke={1.6} />{r.data} · {r.hora}
                          </div>
                        </div>
                      </div>
                      <Chip tone={tone}>{RESERVA_LABEL[lang][r.estado]}</Chip>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12.5, color: PALETTE.ink, marginBottom: 12 }}>
                      <Icon name="pin" size={14} color={PALETTE.sage} stroke={1.6} />{r.local}
                    </div>
                    <div style={{ height: 1, background: 'rgba(74,63,53,0.08)', marginBottom: 12 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        {r.team?.length > 0
                          ? <AvatarStack ids={r.team} size={28} teamById={teamById} />
                          : <span style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: PALETTE.clay }}>Equipa por atribuir</span>}
                      </div>
                      <span style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 19, color: accent, whiteSpace: 'nowrap' }}>€ {(r.total || 0).toLocaleString('pt-PT')}</span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
      }
    </div>
  )
}
