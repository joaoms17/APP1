import React from 'react'
import { PALETTE, hexToRgba, ROLE_LABEL } from '../data'
import { Icon, Card, Label, Avatar, Chip, Eucalyptus, Btn } from '../ui'

export default function EquipaScreen({ ctx }) {
  const { t, lang, accent, team, reservas } = ctx
  const [filter, setFilter] = React.useState('all')
  const roles = ['all', 'maquilhadora', 'cabeleireira', 'musico', 'assistente']
  const list = filter === 'all' ? (team || []) : (team || []).filter(m => m.role === filter)
  const statusTone = { disp: PALETTE.sage, ferias: PALETTE.gold, indisp: PALETTE.clay }
  const statusLabel = { disp: t('disponivel'), ferias: t('ferias'), indisp: t('indisponivel') }
  const nextStatus = { disp: 'ferias', ferias: 'indisp', indisp: 'disp' }
  const eventosDe = (id) => (reservas || []).filter(r => (r.team || []).includes(id) && r.estado !== 'cancelada')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '30px 18px 14px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 500, fontSize: 32, color: PALETTE.nearBlack, lineHeight: 1.1, marginBottom: 16 }}>{t('equipa')}</div>
        <Btn variant="soft" accent={accent} size="md" full icon="plus" onClick={() => ctx.openCreate('team')}>
          {lang === 'pt' ? 'Adicionar colaborador' : 'Add team member'}
        </Btn>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 24px' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 18, paddingBottom: 2 }}>
          {roles.map((r) => (
            <button key={r} onClick={() => setFilter(r)} style={{ flexShrink: 0, fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, padding: '7px 14px', borderRadius: 50, cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${filter === r ? accent : 'rgba(74,63,53,0.12)'}`, background: filter === r ? hexToRgba(accent, 0.1) : 'transparent', color: filter === r ? accent : PALETTE.inkSoft }}>
              {r === 'all' ? (lang === 'pt' ? 'Todos' : 'All') : ROLE_LABEL[lang][r]}
            </button>
          ))}
        </div>

        {list.length === 0
          ? <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Eucalyptus size={22} stem={PALETTE.terracotta} leaf={PALETTE.sage} style={{ margin: '0 auto 10px' }} />
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Sem colaboradores' : 'No team members'}</div>
            </div>
          : list.map((m) => {
              const eventos = eventosDe(m.id)
              const st = m.status || 'disp'
              return (
                <Card key={m.id} style={{ marginBottom: 10, padding: '14px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar initials={m.initials} color={m.color} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16.5, color: PALETTE.nearBlack }}>{m.name}</div>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.inkSoft }}>
                        {ROLE_LABEL[lang][m.role] || m.role} · {eventos.length} {lang === 'pt' ? (eventos.length === 1 ? 'evento' : 'eventos') : 'events'}
                      </div>
                    </div>
                    <button onClick={() => ctx.update('team', m.id, { status: nextStatus[st] })} title={lang === 'pt' ? 'Tocar para alterar' : 'Tap to change'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <Chip tone={{ bg: hexToRgba(statusTone[st], 0.15), fg: statusTone[st], dot: statusTone[st] }} size={11}>{statusLabel[st]}</Chip>
                    </button>
                  </div>
                  {eventos.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(74,63,53,0.07)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {eventos.slice(0, 4).map(ev => (
                        <button key={ev.id} onClick={() => ctx.push('reserva', { id: ev.id })} style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: PALETTE.ink, background: hexToRgba(PALETTE.sage, 0.12), border: 'none', borderRadius: 50, padding: '5px 11px', cursor: 'pointer' }}>
                          {ev.data} · {ev.name}
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              )
            })
        }
      </div>
    </div>
  )
}
