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
  const eventosDe = (id) => (reservas || []).filter(r => (r.team || []).includes(id) && r.estado !== 'cancelada')
  const [editId, setEditId] = React.useState(null)
  const [d, setD] = React.useState({})
  const roleOpts = Object.entries(ROLE_LABEL[lang])
  const startEdit = (m) => { setEditId(m.id); setD({ name: m.name, role: m.role, status: m.status || 'disp' }) }
  const saveEdit = async (id) => { await ctx.update('team', id, { name: d.name, role: d.role, status: d.status }); setEditId(null) }
  const inp = { boxSizing: 'border-box', width: '100%', padding: '9px 11px', borderRadius: 10, border: '1px solid rgba(74,63,53,0.18)', background: 'var(--paper)', fontFamily: 'var(--sans)', fontSize: 14, color: PALETTE.nearBlack, outline: 'none' }

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
              if (editId === m.id) return (
                <Card key={m.id} style={{ marginBottom: 10, padding: '14px 15px' }}>
                  <Label size={9.5} style={{ marginBottom: 5 }}>{lang === 'pt' ? 'Nome' : 'Name'}</Label>
                  <input value={d.name} onChange={e => setD(p => ({ ...p, name: e.target.value }))} style={{ ...inp, marginBottom: 10 }} />
                  <Label size={9.5} style={{ marginBottom: 5 }}>{lang === 'pt' ? 'Função' : 'Role'}</Label>
                  <select value={d.role} onChange={e => setD(p => ({ ...p, role: e.target.value }))} style={{ ...inp, marginBottom: 10 }}>
                    {roleOpts.map(([v, lab]) => <option key={v} value={v}>{lab}</option>)}
                  </select>
                  <Label size={9.5} style={{ marginBottom: 5 }}>{t('estado')}</Label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {Object.keys(statusTone).map(s => (
                      <button key={s} onClick={() => setD(p => ({ ...p, status: s }))} style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, border: `1px solid ${d.status === s ? statusTone[s] : 'rgba(74,63,53,0.16)'}`, background: d.status === s ? hexToRgba(statusTone[s], 0.14) : 'transparent', color: d.status === s ? statusTone[s] : PALETTE.inkSoft, fontWeight: d.status === s ? 500 : 400 }}>{statusLabel[s]}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => { ctx.remove('team', m.id); setEditId(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.clay, fontFamily: 'var(--sans)', fontSize: 12.5 }}>{lang === 'pt' ? 'Eliminar' : 'Delete'}</button>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => setEditId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.inkSoft, fontFamily: 'var(--sans)', fontSize: 12.5 }}>{t('cancelar')}</button>
                    <Btn variant="solid" accent={accent} size="sm" icon="check" onClick={() => saveEdit(m.id)}>{lang === 'pt' ? 'Guardar' : 'Save'}</Btn>
                  </div>
                </Card>
              )
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
                    <Chip tone={{ bg: hexToRgba(statusTone[st], 0.15), fg: statusTone[st], dot: statusTone[st] }} size={11}>{statusLabel[st]}</Chip>
                    <button onClick={() => startEdit(m)} title={lang === 'pt' ? 'Editar' : 'Edit'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                      <Icon name="edit" size={17} color={PALETTE.inkSoft} stroke={1.6} />
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
