// screens-agenda.jsx — Calendar + Team availability
// ctx = { t, lang, accent, push, pop, goTab }

function AgendaScreen({ ctx }) {
  const { t, accent } = ctx;
  const [view, setView] = React.useState('calendario');
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '54px 18px 14px', flexShrink: 0 }}>
        <Serif size={32} weight={500} style={{ marginBottom: 16 }}>{t('tab_agenda')}</Serif>
        <Segmented accent={accent} value={view} onChange={setView} options={[
          { id: 'calendario', label: t('calendario') },
          { id: 'equipa', label: t('equipa') },
        ]} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 24px' }}>
        {view === 'calendario' ? <CalendarView ctx={ctx} /> : <EquipaAvailView ctx={ctx} />}
      </div>
    </div>
  );
}

const EVENTS_BY_DAY = {
  16: [{ c: PALETTE.inkSoft }], 20: [{ c: PALETTE.terracotta }, { c: PALETTE.gold }],
  27: [{ c: PALETTE.gold }], 5: [{ c: PALETTE.sage }], 12: [{ c: PALETTE.terracottaDark }],
};

function CalendarView({ ctx }) {
  const { t, lang, accent } = ctx;
  const [scope, setScope] = React.useState('mes');
  const dow = lang === 'pt' ? ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  // June 2026 starts on Monday (1 Jun = Mon)
  const days = [];
  for (let i = 0; i < 30; i++) days.push(i + 1);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Serif size={22} weight={600}>{lang === 'pt' ? 'Junho' : 'June'} 2026</Serif>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={{ background: 'var(--paper-card)', border: '1px solid rgba(74,63,53,0.08)', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevL" size={16} color={PALETTE.ink} stroke={1.8} /></button>
            <button style={{ background: 'var(--paper-card)', border: '1px solid rgba(74,63,53,0.08)', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevR" size={16} color={PALETTE.ink} stroke={1.8} /></button>
          </div>
        </div>
      </div>
      {/* scope toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['dia', t('dia')], ['semana', t('semana')], ['mes', t('mes')]].map(([id, label]) => (
          <button key={id} onClick={() => setScope(id)} style={{ flex: 1, padding: '7px', borderRadius: 50, border: `1px solid ${scope === id ? accent : 'rgba(74,63,53,0.12)'}`, background: scope === id ? hexToRgba(accent, 0.1) : 'transparent', color: scope === id ? accent : PALETTE.inkSoft, fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{label}</button>
        ))}
      </div>
      {/* month grid */}
      <Card style={{ marginBottom: 18, padding: '14px 14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 8 }}>
          {dow.map((d, i) => <div key={i} style={{ textAlign: 'center', fontFamily: 'var(--sans)', fontSize: 10.5, color: PALETTE.inkSoft, letterSpacing: '0.05em' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {days.map((d) => {
            const ev = EVENTS_BY_DAY[d];
            const today = d === 4;
            return (
              <div key={d} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: today ? accent : 'transparent', position: 'relative' }}>
                <span style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: today ? 600 : 300, color: today ? '#FBF7F0' : PALETTE.ink }}>{d}</span>
                {ev && (
                  <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                    {ev.map((e, i) => <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: today ? '#FBF7F0' : e.c }} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      {/* upcoming list */}
      <Label size={10.5} style={{ marginBottom: 12 }}>{t('proximos_eventos')}</Label>
      {AGENDA_EVENTS.map((e, i) => (
        <Card key={i} onClick={() => ctx.push('reserva', { id: e.id })} style={{ marginBottom: 10, padding: '13px 15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'center', width: 36 }}>
              <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 21, color: e.conflict ? PALETTE.clay : PALETTE.nearBlack, lineHeight: 1 }}>{e.day}</div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 9, letterSpacing: '0.14em', color: PALETTE.inkSoft, textTransform: 'uppercase', marginTop: 2 }}>Jun</div>
            </div>
            <div style={{ width: 1, height: 32, background: 'rgba(74,63,53,0.1)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16, color: PALETTE.nearBlack, display: 'flex', alignItems: 'center', gap: 7 }}>
                {e.name}{e.conflict && <Icon name="alert" size={14} color={PALETTE.clay} stroke={1.8} />}
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 2 }}>{e.local} · {svc(lang, e.servicos)}</div>
            </div>
            <AvatarStack ids={e.team} size={26} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function EquipaAvailView({ ctx }) {
  const { t, lang, accent } = ctx;
  const [filter, setFilter] = React.useState('all');
  const roles = ['all', 'maquilhadora', 'cabeleireira', 'fotografo', 'dj', 'musico', 'planner'];
  const list = filter === 'all' ? TEAM : TEAM.filter((m) => m.role === filter);
  const statusTone = { disp: PALETTE.sage, ferias: PALETTE.gold, indisp: PALETTE.clay };
  const statusLabel = { disp: t('disponivel'), ferias: t('ferias'), indisp: t('indisponivel') };
  return (
    <div>
      {/* filter chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 18, paddingBottom: 2 }}>
        {roles.map((r) => (
          <button key={r} onClick={() => setFilter(r)} style={{ flexShrink: 0, fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, padding: '7px 14px', borderRadius: 50, cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${filter === r ? accent : 'rgba(74,63,53,0.12)'}`, background: filter === r ? hexToRgba(accent, 0.1) : 'transparent', color: filter === r ? accent : PALETTE.inkSoft }}>
            {r === 'all' ? (lang === 'pt' ? 'Todos' : 'All') : ROLE_LABEL[lang][r]}
          </button>
        ))}
      </div>
      <Label size={10.5} style={{ marginBottom: 12 }}>{t('ver_quem_disponivel')}</Label>
      {list.map((m) => (
        <Card key={m.id} style={{ marginBottom: 10, padding: '14px 15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Avatar initials={m.initials} color={m.color} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16.5, color: PALETTE.nearBlack }}>{m.name}</div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.inkSoft }}>{ROLE_LABEL[lang][m.role]}</div>
            </div>
            <Chip tone={{ bg: hexToRgba(statusTone[m.status], 0.15), fg: statusTone[m.status], dot: statusTone[m.status] }} size={11}>{statusLabel[m.status]}</Chip>
          </div>
          {/* workload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: PALETTE.inkSoft, width: 86, flexShrink: 0 }}>{t('carga')}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 50, background: hexToRgba(PALETTE.ink, 0.07), overflow: 'hidden' }}>
              <div style={{ width: `${(m.load / 6) * 100}%`, height: '100%', borderRadius: 50, background: m.load >= 5 ? PALETTE.clay : accent }} />
            </div>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: PALETTE.ink, width: 56, textAlign: 'right' }}>{m.load} {lang === 'pt' ? 'eventos' : 'events'}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

Object.assign(window, { AgendaScreen, CalendarView, EquipaAvailView });
