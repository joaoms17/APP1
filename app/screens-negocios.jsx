// screens-negocios.jsx — Deals tab: segmented Pipeline (CRM) | Reservas
// ctx = { t, lang, accent, push, pop, goTab }

function Segmented({ options, value, onChange, accent }) {
  return (
    <div style={{ display: 'flex', background: hexToRgba(PALETTE.ink, 0.06), borderRadius: 50, padding: 4, gap: 4 }}>
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{
          flex: 1, padding: '9px 8px', borderRadius: 50, border: 'none', cursor: 'pointer',
          background: value === o.id ? 'var(--paper-card)' : 'transparent',
          boxShadow: value === o.id ? '0 2px 8px rgba(74,63,53,0.1)' : 'none',
          fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 12.5, letterSpacing: '0.04em',
          color: value === o.id ? accent : PALETTE.inkSoft, transition: 'all .2s',
        }}>{o.label}{o.count != null && <span style={{ opacity: 0.6, marginLeft: 5 }}>{o.count}</span>}</button>
      ))}
    </div>
  );
}

function NegociosScreen({ ctx }) {
  const { t, lang, accent } = ctx;
  const [view, setView] = React.useState(ctx.params?.view || 'pipeline');
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '54px 18px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <Serif size={32} weight={500}>{t('tab_negocios')}</Serif>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(169,116,79,0.3)', marginTop: 4 }}>
            <Icon name="plus" size={22} color="#FBF7F0" stroke={2} />
          </div>
        </div>
        <Segmented accent={accent} value={view} onChange={setView} options={[
          { id: 'pipeline', label: t('pipeline'), count: LEADS.length },
          { id: 'reservas', label: t('reservas'), count: RESERVAS.length },
        ]} />
      </div>
      {view === 'pipeline'
        ? <PipelineView ctx={ctx} />
        : <ReservasView ctx={ctx} />}
    </div>
  );
}

function PipelineView({ ctx }) {
  const { t, lang, accent } = ctx;
  return (
    <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ display: 'flex', gap: 12, padding: '6px 18px 24px', height: '100%' }}>
        {PIPELINE_ORDER.map((est) => {
          const items = LEADS.filter((l) => l.estado === est);
          const tone = leadTone(est);
          return (
            <div key={est} style={{ width: 252, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px 10px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone.dot }} />
                <span style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 12, letterSpacing: '0.06em', color: PALETTE.nearBlack, textTransform: 'uppercase' }}>{LEAD_LABEL[lang][est]}</span>
                <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.inkSoft, marginLeft: 'auto' }}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', paddingBottom: 8 }}>
                {items.map((l) => (
                  <div key={l.id} onClick={() => ctx.push('lead', { id: l.id })} style={{
                    background: 'var(--paper-card)', borderRadius: 16, padding: 14, cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(74,63,53,0.06)', borderTop: `3px solid ${tone.dot}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Avatar initials={l.initials} color={l.color} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16, color: PALETTE.nearBlack, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                        <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: PALETTE.inkSoft }}>{l.tipo} · {l.data}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                      {l.servicos.map((s) => <ServiceChip key={s} k={s} lang={lang} />)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--sans)', fontSize: 11, color: PALETTE.inkSoft }}>
                        <Icon name={l.origem === 'Instagram' ? 'instagram' : l.origem === 'WhatsApp' ? 'chat' : 'user'} size={13} color={PALETTE.sage} stroke={1.6} />
                        {l.origem}
                      </span>
                      <span style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 17, color: accent }}>{l.valor}</span>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div style={{ border: '1px dashed rgba(74,63,53,0.18)', borderRadius: 16, padding: '20px 12px', textAlign: 'center', fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.inkSoft }}>—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReservasView({ ctx }) {
  const { t, lang, accent } = ctx;
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {RESERVAS.map((r) => {
          const tone = reservaTone(r.estado);
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
                <Rule style={{ marginBottom: 12 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {r.team.length > 0 ? <AvatarStack ids={r.team} size={28} /> : <span style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: PALETTE.clay }}>Equipa por atribuir</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 19, color: accent }}>€ {r.total.toLocaleString('pt-PT')}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { NegociosScreen, Segmented });
