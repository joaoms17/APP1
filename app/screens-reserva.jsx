// screens-reserva.jsx — Reserva detail with internal tabs
// ctx = { t, lang, accent, push, pop, goTab }

function ReservaScreen({ ctx, params }) {
  const { t, lang, accent } = ctx;
  const r = reservaById(params.id) || RESERVAS[0];
  const tone = reservaTone(r.estado);
  const [tab, setTab] = React.useState('detalhes');
  const tabs = [
    { id: 'detalhes', label: t('detalhes') },
    { id: 'equipa', label: t('equipa') },
    { id: 'pagamentos', label: t('pagamentos') },
    { id: 'docs', label: t('documentos') },
    { id: 'notas', label: t('interno') },
  ];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      <DetailHeader ctx={ctx} title={r.name} sub={`${r.data} · ${r.hora}`} chip={<Chip tone={tone}>{RESERVA_LABEL[lang][r.estado]}</Chip>} />
      {/* sub-tabs */}
      <div style={{ flexShrink: 0, background: 'var(--paper-card)', borderBottom: '1px solid rgba(74,63,53,0.07)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 4, padding: '4px 12px 0', minWidth: 'min-content' }}>
          {tabs.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '10px 12px 12px', whiteSpace: 'nowrap',
              fontFamily: 'var(--sans)', fontWeight: tab === tb.id ? 500 : 400, fontSize: 13,
              color: tab === tb.id ? accent : PALETTE.inkSoft,
              borderBottom: `2px solid ${tab === tb.id ? accent : 'transparent'}`,
            }}>{tb.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 28px' }}>
        {tab === 'detalhes' && <DetalhesTab ctx={ctx} r={r} />}
        {tab === 'equipa' && <EquipaTab ctx={ctx} r={r} />}
        {tab === 'pagamentos' && <PagamentosTab ctx={ctx} r={r} />}
        {tab === 'docs' && <DocsTab ctx={ctx} r={r} />}
        {tab === 'notas' && <NotasTab ctx={ctx} r={r} />}
      </div>
    </div>
  );
}

function DetalhesTab({ ctx, r }) {
  const { t, lang } = ctx;
  return (
    <div>
      <Card style={{ marginBottom: 18, padding: '4px 16px' }}>
        <FieldRow icon="calendar" label={t('data')} value={`${r.data} · ${r.hora}`} />
        <FieldRow icon="pin" label={t('local')} value={r.local} />
        <FieldRow icon="users" label={t('convidados')} value={`${r.convidados} ${t('convidados_n')}`} />
        <div style={{ padding: '12px 0' }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: PALETTE.inkSoft, marginBottom: 8 }}>{t('servicos')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{r.servicos.map((s) => <ServiceChip key={s} k={s} lang={lang} />)}</div>
        </div>
      </Card>
      <Label size={10.5} style={{ marginBottom: 8 }}>{t('observacoes')}</Label>
      <Card sage>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13.5, color: PALETTE.ink, lineHeight: 1.6 }}>{r.notes}</div>
      </Card>
    </div>
  );
}

function EquipaTab({ ctx, r }) {
  const { t, lang, accent } = ctx;
  const conflict = r.id === 'sara';
  return (
    <div>
      {conflict && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: hexToRgba(PALETTE.clay, 0.1), borderRadius: 14, padding: '12px 14px', marginBottom: 16 }}>
          <Icon name="alert" size={19} color={PALETTE.clay} stroke={1.8} />
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12.5, color: PALETTE.clay, flex: 1, lineHeight: 1.4 }}>
            {lang === 'pt' ? 'Miguel está noutro evento neste dia. Verifique o conflito.' : 'Miguel is on another event this day. Check the conflict.'}
          </span>
        </div>
      )}
      {r.team.length > 0 ? r.team.map((id) => {
        const m = teamById(id);
        const clash = conflict && id === 'miguel';
        return (
          <Card key={id} style={{ marginBottom: 10, padding: '12px 14px', border: clash ? `1px solid ${hexToRgba(PALETTE.clay, 0.5)}` : '1px solid rgba(74,63,53,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar initials={m.initials} color={m.color} size={42} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16, color: PALETTE.nearBlack }}>{m.name}</div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.inkSoft }}>{ROLE_LABEL[lang][m.role]}</div>
              </div>
              {clash
                ? <Chip tone={{ bg: hexToRgba(PALETTE.clay, 0.14), fg: PALETTE.clay, dot: PALETTE.clay }} size={11}>{t('conflito_detetado')}</Chip>
                : <Icon name="check2" size={20} color={PALETTE.sage} stroke={1.8} />}
            </div>
          </Card>
        );
      }) : (
        <div style={{ border: '1px dashed rgba(74,63,53,0.18)', borderRadius: 16, padding: '28px 16px', textAlign: 'center', marginBottom: 12 }}>
          <Eucalyptus size={22} stem={PALETTE.terracotta} leaf={PALETTE.sage} style={{ margin: '0 auto 10px' }} />
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Sem equipa atribuída' : 'No team assigned'}</div>
        </div>
      )}
      <Btn variant="soft" accent={accent} size="md" full icon="plus" style={{ marginTop: 6 }}>{lang === 'pt' ? 'Atribuir colaborador' : 'Assign collaborator'}</Btn>
    </div>
  );
}

function PagamentosTab({ ctx, r }) {
  const { t, lang, accent } = ctx;
  const divida = r.total - r.pago;
  const pct = Math.round((r.pago / r.total) * 100);
  const payTone = { pago: PALETTE.sage, parcial: PALETTE.gold, nao_pago: PALETTE.clay }[r.pay];
  return (
    <div>
      <Card style={{ marginBottom: 18, padding: '20px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <Label size={10}>{t('total')}</Label>
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 38, color: PALETTE.nearBlack, lineHeight: 1.05, marginTop: 3 }}>€ {r.total.toLocaleString('pt-PT')}</div>
          </div>
          <Chip tone={{ bg: hexToRgba(payTone, 0.16), fg: payTone, dot: payTone }}>{PAY_LABEL[lang][r.pay]}</Chip>
        </div>
        {/* progress */}
        <div style={{ height: 8, borderRadius: 50, background: hexToRgba(PALETTE.ink, 0.08), overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 50, background: accent }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <PayCell label={t('sinal')} value={r.sinal} sub={r.pago >= r.sinal && r.sinal > 0 ? t('pago') : t('nao_pago')} ok={r.pago >= r.sinal && r.sinal > 0} />
          <div style={{ width: 1, background: 'rgba(74,63,53,0.1)' }} />
          <PayCell label={t('pago')} value={r.pago} accent={PALETTE.sage} />
          <div style={{ width: 1, background: 'rgba(74,63,53,0.1)' }} />
          <PayCell label={t('em_divida')} value={divida} accent={divida > 0 ? PALETTE.clay : PALETTE.sage} />
        </div>
      </Card>
      <div style={{ display: 'flex', gap: 12 }}>
        <Btn variant="ghost" accent={accent} size="md" full icon="chat">{t('pedir_pagamento')}</Btn>
        <Btn variant="solid" accent={accent} size="md" full icon="plus">{t('registar')}</Btn>
      </div>
    </div>
  );
}
function PayCell({ label, value, sub, ok, accent = PALETTE.nearBlack }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: PALETTE.inkSoft }}>{label}</div>
      <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 19, color: accent, marginTop: 3 }}>€ {value.toLocaleString('pt-PT')}</div>
      {sub && <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: ok ? PALETTE.sage : PALETTE.clay, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function DocsTab({ ctx, r }) {
  const { t, lang, accent } = ctx;
  const docs = [
    { id: 'orcamento', label: t('orcamento'), status: 'sent', icon: 'file' },
    { id: 'contrato', label: t('contrato'), status: r.estado === 'confirmada' || r.estado === 'concluida' ? 'signed' : 'draft', icon: 'file' },
  ];
  const statusLabel = { sent: lang === 'pt' ? 'Enviado' : 'Sent', signed: lang === 'pt' ? 'Assinado' : 'Signed', draft: lang === 'pt' ? 'Rascunho' : 'Draft' };
  const statusTone = { sent: PALETTE.gold, signed: PALETTE.sage, draft: PALETTE.inkSoft };
  return (
    <div>
      {docs.map((d) => (
        <Card key={d.id} onClick={() => ctx.push('doc', { reservaId: r.id, type: d.id })} style={{ marginBottom: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 42, height: 52, borderRadius: 8, background: hexToRgba(PALETTE.terracotta, 0.1), border: `1px solid ${hexToRgba(PALETTE.terracotta, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="file" size={22} color={accent} stroke={1.5} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16.5, color: PALETTE.nearBlack }}>{d.label}</div>
              <div style={{ marginTop: 5 }}><Chip tone={{ bg: hexToRgba(statusTone[d.status], 0.14), fg: statusTone[d.status], dot: statusTone[d.status] }} size={11}>{statusLabel[d.status]}</Chip></div>
            </div>
            <Icon name="chevR" size={20} color={PALETTE.inkSoft} stroke={1.8} />
          </div>
        </Card>
      ))}
      {/* generate with AI */}
      <Card sage style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Eucalyptus size={18} stem={PALETTE.terracottaDark} leaf={PALETTE.sage} />
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 14, color: PALETTE.nearBlack }}>{lang === 'pt' ? 'Gerar documento' : 'Generate document'}</span>
          <AIBadge />
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12.5, color: PALETTE.ink, marginBottom: 14, lineHeight: 1.5 }}>
          {lang === 'pt' ? 'A IA prepara o documento com os dados da reserva e o branding da empresa.' : 'AI prepares the document from booking data and your company branding.'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[t('proposta'), t('contrato'), t('brochura')].map((x) => (
            <button key={x} onClick={() => ctx.push('doc', { reservaId: r.id, type: 'orcamento' })} style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.terracottaDark, background: 'var(--paper-card)', border: `1px solid ${hexToRgba(PALETTE.terracotta, 0.3)}`, borderRadius: 50, padding: '8px 14px', cursor: 'pointer' }}>+ {x}</button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function NotasTab({ ctx, r }) {
  const { lang, accent } = ctx;
  const notes = lang === 'pt' ? [
    { who: 'sofia', t: 'Confirmo presença às 8h. Levo os ferros novos.', time: '09:14' },
    { who: 'ines', t: 'Perfeito. A noiva quer começar pela maquilhagem.', time: '09:20' },
    { who: 'me', t: 'Combinado. Miguel chega às 10h para as fotos do getting ready.', time: '09:25' },
  ] : [
    { who: 'sofia', t: 'Confirmed, I will be there at 8am with the new irons.', time: '09:14' },
    { who: 'ines', t: 'Perfect. The bride wants to start with makeup.', time: '09:20' },
    { who: 'me', t: 'Agreed. Miguel arrives at 10am for getting-ready photos.', time: '09:25' },
  ];
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Espaço interno desta reserva' : 'Internal space for this booking'}</span>
      </div>
      {notes.map((n, i) => {
        const me = n.who === 'me';
        const m = me ? null : teamById(n.who);
        return (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14, flexDirection: me ? 'row-reverse' : 'row' }}>
            {!me && <Avatar initials={m.initials} color={m.color} size={34} />}
            <div style={{ maxWidth: '74%' }}>
              {!me && <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: PALETTE.inkSoft, marginBottom: 3, paddingLeft: 2 }}>{m.name.split(' ')[0]}</div>}
              <div style={{ padding: '10px 14px', borderRadius: me ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: me ? hexToRgba(accent, 0.13) : 'var(--paper-card)', border: me ? 'none' : '1px solid rgba(74,63,53,0.06)' }}>
                <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.ink, lineHeight: 1.5 }}>{n.t}</div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: PALETTE.inkSoft, textAlign: 'right', marginTop: 3 }}>{n.time}</div>
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <div style={{ flex: 1, background: 'var(--paper-card)', borderRadius: 50, padding: '11px 16px', border: '1px solid rgba(74,63,53,0.08)', fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Mensagem da equipa…' : 'Team note…'}</div>
        <button style={{ width: 42, height: 42, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="send" size={19} color="#FBF7F0" stroke={1.8} />
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { ReservaScreen });
