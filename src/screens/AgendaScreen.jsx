import React from 'react'
import { PALETTE, hexToRgba, svc, ROLE_LABEL } from '../data'
import { Icon, Card, Label, AvatarStack, Avatar, Chip, Eucalyptus, Btn } from '../ui'

function Segmented({ options, value, onChange, accent }) {
  return (
    <div style={{ display: 'flex', background: hexToRgba(PALETTE.ink, 0.06), borderRadius: 50, padding: 4, gap: 4 }}>
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{ flex: 1, padding: '9px 8px', borderRadius: 50, border: 'none', cursor: 'pointer', background: value === o.id ? 'var(--paper-card)' : 'transparent', boxShadow: value === o.id ? '0 2px 8px rgba(74,63,53,0.1)' : 'none', fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 12.5, letterSpacing: '0.04em', color: value === o.id ? accent : PALETTE.inkSoft, transition: 'all .2s' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function AgendaScreen({ ctx }) {
  const { t, accent, agendaEvents, team, teamById } = ctx
  const [view, setView] = React.useState('calendario')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '30px 18px 14px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 500, fontSize: 32, color: PALETTE.nearBlack, lineHeight: 1.1, marginBottom: 16 }}>{t('tab_agenda')}</div>
        <Segmented accent={accent} value={view} onChange={setView} options={[
          { id: 'calendario', label: t('calendario') },
          { id: 'equipa',     label: t('equipa') },
        ]} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 24px' }}>
        {view === 'calendario'
          ? <CalendarView ctx={ctx} teamById={teamById} />
          : <EquipaView ctx={ctx} team={team || []} accent={accent} />}
      </div>
    </div>
  )
}

const MONTHS_FULL_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTHS_FULL_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_ABBR_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTHS_ABBR_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
// parse "20 Jun 2026" → Date
function parseEventDate(str) {
  if (!str) return null
  const m = String(str).match(/(\d{1,2})\s+([A-Za-zçÇ]{3,})\s+(\d{4})/)
  if (!m) return null
  const day = +m[1], year = +m[3], k = m[2].slice(0, 3).toLowerCase()
  const pt = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  const en = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
  let mi = pt.indexOf(k); if (mi < 0) mi = en.indexOf(k)
  return mi >= 0 ? new Date(year, mi, day) : null
}

function CalendarView({ ctx, teamById }) {
  const { t, lang, accent, reservas } = ctx
  const lista = (reservas || []).map(r => ({ ...r, _date: parseEventDate(r.data) }))
  const today = new Date(); today.setHours(0,0,0,0)

  const [view, setView] = React.useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const dow = lang === 'pt' ? ['S','T','Q','Q','S','S','D'] : ['M','T','W','T','F','S','S']
  const monthName = (lang === 'pt' ? MONTHS_FULL_PT : MONTHS_FULL_EN)[view.getMonth()]
  const abbr = lang === 'pt' ? MONTHS_ABBR_PT : MONTHS_ABBR_EN

  const y = view.getFullYear(), mo = view.getMonth()
  const daysInMonth = new Date(y, mo + 1, 0).getDate()
  // Monday-first offset
  const firstDow = (new Date(y, mo, 1).getDay() + 6) % 7
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const eventsByDay = {}
  lista.forEach(r => { if (r._date && r._date.getFullYear() === y && r._date.getMonth() === mo) {
    const d = r._date.getDate(); (eventsByDay[d] = eventsByDay[d] || []).push(r)
  }})

  const upcoming = lista.filter(r => r._date && r._date >= today).sort((a, b) => a._date - b._date)
  const upList = upcoming.length ? upcoming : lista

  const move = (delta) => setView(new Date(y, mo + delta, 1))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 22, color: PALETTE.nearBlack }}>{monthName} {y}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => move(-1)} style={{ background: 'var(--paper-card)', border: '1px solid rgba(74,63,53,0.08)', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevL" size={16} color={PALETTE.ink} stroke={1.8} /></button>
          <button onClick={() => setView(new Date(today.getFullYear(), today.getMonth(), 1))} title={lang === 'pt' ? 'Hoje' : 'Today'} style={{ background: 'var(--paper-card)', border: '1px solid rgba(74,63,53,0.08)', borderRadius: 16, padding: '0 12px', height: 32, cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 11.5, color: PALETTE.ink }}>{lang === 'pt' ? 'Hoje' : 'Today'}</button>
          <button onClick={() => move(1)} style={{ background: 'var(--paper-card)', border: '1px solid rgba(74,63,53,0.08)', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevR" size={16} color={PALETTE.ink} stroke={1.8} /></button>
        </div>
      </div>
      <Card style={{ marginBottom: 18, padding: '14px 14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 8 }}>
          {dow.map((d, i) => <div key={i} style={{ textAlign: 'center', fontFamily: 'var(--sans)', fontSize: 10.5, color: PALETTE.inkSoft, letterSpacing: '0.05em' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {cells.map((d, idx) => {
            if (d == null) return <div key={'e'+idx} />
            const ev = eventsByDay[d]
            const isToday = d === today.getDate() && mo === today.getMonth() && y === today.getFullYear()
            return (
              <div key={d} onClick={() => ev && ctx.push('reserva', { id: ev[0].id })} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: isToday ? accent : 'transparent', cursor: ev ? 'pointer' : 'default' }}>
                <span style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: isToday ? 600 : 300, color: isToday ? '#FBF7F0' : PALETTE.ink }}>{d}</span>
                {ev && <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>{ev.slice(0,3).map((e, i) => <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: isToday ? '#FBF7F0' : e.color || PALETTE.terracotta }} />)}</div>}
              </div>
            )
          })}
        </div>
      </Card>

      <Label size={10.5} style={{ marginBottom: 12 }}>{t('proximos_eventos')}</Label>
      {upList.length === 0
        ? <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <Eucalyptus size={22} stem={PALETTE.terracotta} leaf={PALETTE.sage} style={{ margin: '0 auto 10px' }} />
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Sem eventos' : 'No events'}</div>
          </div>
        : upList.slice(0, 8).map((e) => (
            <Card key={e.id} onClick={() => ctx.push('reserva', { id: e.id })} style={{ marginBottom: 10, padding: '13px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ textAlign: 'center', width: 36 }}>
                  <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 21, color: PALETTE.nearBlack, lineHeight: 1 }}>{e._date ? e._date.getDate() : '–'}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 9, letterSpacing: '0.14em', color: PALETTE.inkSoft, textTransform: 'uppercase', marginTop: 2 }}>{e._date ? abbr[e._date.getMonth()] : ''}</div>
                </div>
                <div style={{ width: 1, height: 32, background: 'rgba(74,63,53,0.1)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16, color: PALETTE.nearBlack }}>{e.name}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 2 }}>{e.local} · {svc(lang, e.servicos)}</div>
                </div>
                <AvatarStack ids={e.team} size={26} teamById={teamById} />
              </div>
            </Card>
          ))
      }
    </div>
  )
}

function EquipaView({ ctx, team }) {
  const { t, lang, accent } = ctx
  const [filter, setFilter] = React.useState('all')
  const roles = ['all', 'maquilhadora', 'cabeleireira', 'fotografo', 'dj', 'musico', 'planner']
  const list = filter === 'all' ? team : team.filter(m => m.role === filter)
  const statusTone = { disp: PALETTE.sage, ferias: PALETTE.gold, indisp: PALETTE.clay }
  const statusLabel = { disp: t('disponivel'), ferias: t('ferias'), indisp: t('indisponivel') }

  return (
    <div>
      <Btn variant="soft" accent={accent} size="md" full icon="plus" style={{ marginBottom: 16 }} onClick={() => ctx.openCreate('team')}>
        {lang === 'pt' ? 'Adicionar colaborador' : 'Add team member'}
      </Btn>
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
        : list.map((m) => (
            <Card key={m.id} style={{ marginBottom: 10, padding: '14px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar initials={m.initials} color={m.color} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16.5, color: PALETTE.nearBlack }}>{m.name}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.inkSoft }}>{ROLE_LABEL[lang][m.role]}</div>
                </div>
                <Chip tone={{ bg: hexToRgba(statusTone[m.status] || PALETTE.inkSoft, 0.15), fg: statusTone[m.status] || PALETTE.inkSoft, dot: statusTone[m.status] || PALETTE.inkSoft }} size={11}>{statusLabel[m.status] || m.status}</Chip>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--sans)', fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: PALETTE.inkSoft, width: 86, flexShrink: 0 }}>{t('carga')}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 50, background: hexToRgba(PALETTE.ink, 0.07), overflow: 'hidden' }}>
                  <div style={{ width: `${((m.load || 0) / 6) * 100}%`, height: '100%', borderRadius: 50, background: (m.load || 0) >= 5 ? PALETTE.clay : accent }} />
                </div>
                <span style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: PALETTE.ink, width: 56, textAlign: 'right' }}>{m.load || 0} {lang === 'pt' ? 'eventos' : 'events'}</span>
              </div>
            </Card>
          ))
      }
    </div>
  )
}
