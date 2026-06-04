import React from 'react'
import { PALETTE, hexToRgba, svc, reservaTone, RESERVA_LABEL, PAY_LABEL, SERVICE_LABEL, ROLE_LABEL } from '../data'
import { Icon, Avatar, Chip, Card, ServiceChip, Rule, Btn, AvatarStack, Label, Eucalyptus, AIBadge } from '../ui'

function DetailHeader({ ctx, title, chip, sub }) {
  return (
    <div style={{ paddingTop: 50, paddingBottom: 14, paddingInline: 14, background: 'var(--paper-card)', borderBottom: '1px solid rgba(74,63,53,0.07)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={ctx.pop} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <Icon name="chevL" size={24} color={ctx.accent} stroke={2} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 21, color: PALETTE.nearBlack, lineHeight: 1.1 }}>{title}</div>
          {sub && <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>{sub}</div>}
        </div>
        {chip}
      </div>
    </div>
  )
}

function FieldRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0', borderBottom: '1px solid rgba(74,63,53,0.07)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: hexToRgba(PALETTE.sage, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={17} color={PALETTE.sage} stroke={1.6} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: PALETTE.inkSoft }}>{label}</div>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 14.5, color: PALETTE.nearBlack, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
}

export default function ReservaScreen({ ctx, params }) {
  const { t, lang, accent, reservas, reservaById, teamById } = ctx
  const r = reservaById(params.id) || (reservas || [])[0]
  const [tab, setTab] = React.useState('detalhes')

  if (!r) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
      <div style={{ fontFamily: 'var(--sans)', color: PALETTE.inkSoft }}>Reserva não encontrada</div>
    </div>
  )

  const tone = reservaTone(r.estado)
  const tabs = [
    { id: 'detalhes', label: t('detalhes') },
    { id: 'equipa',   label: t('equipa') },
    { id: 'pagamentos', label: t('pagamentos') },
    { id: 'docs',     label: t('documentos') },
    { id: 'notas',    label: t('interno') },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      <DetailHeader ctx={ctx} title={r.name} sub={[r.data, r.hora].filter(Boolean).join(' · ')} chip={<Chip tone={tone}>{RESERVA_LABEL[lang][r.estado]}</Chip>} />
      <div style={{ flexShrink: 0, background: 'var(--paper-card)', borderBottom: '1px solid rgba(74,63,53,0.07)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 4, padding: '4px 12px 0', minWidth: 'min-content' }}>
          {tabs.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 12px 12px', whiteSpace: 'nowrap', fontFamily: 'var(--sans)', fontWeight: tab === tb.id ? 500 : 400, fontSize: 13, color: tab === tb.id ? accent : PALETTE.inkSoft, borderBottom: `2px solid ${tab === tb.id ? accent : 'transparent'}` }}>
              {tb.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 28px' }}>
        {tab === 'detalhes'   && <DetalhesTab t={t} lang={lang} r={r} />}
        {tab === 'equipa'     && <EquipaTab ctx={ctx} t={t} lang={lang} accent={accent} r={r} teamById={teamById} />}
        {tab === 'pagamentos' && <PagamentosTab ctx={ctx} t={t} lang={lang} accent={accent} r={r} />}
        {tab === 'docs'       && <DocsTab ctx={ctx} t={t} lang={lang} accent={accent} r={r} />}
        {tab === 'notas'      && <NotasTab t={t} lang={lang} accent={accent} r={r} teamById={teamById} />}
      </div>
    </div>
  )
}

function DetalhesTab({ t, lang, r }) {
  return (
    <div>
      <Card style={{ marginBottom: 18, padding: '4px 16px' }}>
        <FieldRow icon="calendar" label={t('data')} value={[r.data, r.hora].filter(Boolean).join(' · ')} />
        <FieldRow icon="pin" label={t('local')} value={r.local} />
        <FieldRow icon="users" label={t('convidados')} value={`${r.convidados} ${t('convidados_n')}`} />
        <div style={{ padding: '12px 0' }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: PALETTE.inkSoft, marginBottom: 8 }}>{t('servicos')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{(r.servicos || []).map((s) => <ServiceChip key={s} k={s} lang={lang} SERVICE_LABEL={SERVICE_LABEL} />)}</div>
        </div>
      </Card>
      <Label size={10.5} style={{ marginBottom: 8 }}>{t('observacoes')}</Label>
      <Card sage><div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13.5, color: PALETTE.ink, lineHeight: 1.6 }}>{r.notes || '—'}</div></Card>
    </div>
  )
}

function EquipaTab({ ctx, t, lang, accent, r, teamById }) {
  const [picking, setPicking] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const team = ctx.team || []
  const assigned = r.team || []

  const toggle = async (id, isOn) => {
    setBusy(true)
    try { await ctx.assignTeam(r.id, id, !isOn) } finally { setBusy(false) }
  }

  return (
    <div>
      {assigned.length === 0
        ? <div style={{ border: '1px dashed rgba(74,63,53,0.18)', borderRadius: 16, padding: '28px 16px', textAlign: 'center', marginBottom: 12 }}>
            <Eucalyptus size={22} stem={PALETTE.terracotta} leaf={PALETTE.sage} style={{ margin: '0 auto 10px' }} />
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Sem equipa atribuída' : 'No team assigned'}</div>
          </div>
        : assigned.map((id) => {
            const m = teamById(id)
            if (!m) return null
            return (
              <Card key={id} style={{ marginBottom: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar initials={m.initials} color={m.color} size={42} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16, color: PALETTE.nearBlack }}>{m.name}</div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.inkSoft }}>{ROLE_LABEL[lang][m.role] || m.role}</div>
                  </div>
                  <button onClick={() => toggle(id, true)} disabled={busy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.clay, fontFamily: 'var(--sans)', fontSize: 12 }}>{lang === 'pt' ? 'Remover' : 'Remove'}</button>
                </div>
              </Card>
            )
          })
      }

      {!picking
        ? <Btn variant="soft" accent={accent} size="md" full icon="plus" style={{ marginTop: 6 }} onClick={() => setPicking(true)}>{lang === 'pt' ? 'Atribuir colaborador' : 'Assign collaborator'}</Btn>
        : (
          <Card style={{ marginTop: 8, padding: '14px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Label size={10.5}>{lang === 'pt' ? 'Escolher colaborador' : 'Choose'}</Label>
              <button onClick={() => setPicking(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, fontFamily: 'var(--sans)', fontSize: 12.5 }}>{lang === 'pt' ? 'Fechar' : 'Close'}</button>
            </div>
            {team.length === 0 && <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12.5, color: PALETTE.inkSoft, padding: '8px 0' }}>{lang === 'pt' ? 'Sem colaboradores. Crie na tab Equipa.' : 'No team. Create in the Team tab.'}</div>}
            {team.map((m) => {
              const on = assigned.includes(m.id)
              return (
                <div key={m.id} onClick={() => toggle(m.id, on)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 4px', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                  <Avatar initials={m.initials} color={m.color} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 15, color: PALETTE.nearBlack }}>{m.name}</div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: PALETTE.inkSoft }}>{ROLE_LABEL[lang][m.role] || m.role}</div>
                  </div>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${on ? PALETTE.sage : 'rgba(74,63,53,0.2)'}`, background: on ? PALETTE.sage : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {on && <Icon name="check" size={14} color="#FBF7F0" stroke={2.4} />}
                  </div>
                </div>
              )
            })}
          </Card>
        )
      }
    </div>
  )
}

function PagamentosTab({ ctx, t, lang, accent, r }) {
  const divida = (r.total || 0) - (r.pago || 0)
  const pct = r.total > 0 ? Math.round(((r.pago || 0) / r.total) * 100) : 0
  const payTone = { pago: PALETTE.sage, parcial: PALETTE.gold, nao_pago: PALETTE.clay }[r.pay] || PALETTE.clay
  const sinalPago = (r.sinal || 0) > 0 && (r.pago || 0) >= (r.sinal || 0)
  const [editSinal, setEditSinal] = React.useState(false)
  const [sv, setSv] = React.useState(r.sinal || 0)
  const saveSinal = async () => { await ctx.update('bookings', r.id, { sinal: Number(sv) || 0 }); setEditSinal(false) }

  return (
    <div>
      <Card style={{ marginBottom: 16, padding: '20px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <Label size={10}>{t('total')}</Label>
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 38, color: PALETTE.nearBlack, lineHeight: 1.05, marginTop: 3 }}>€ {(r.total || 0).toLocaleString('pt-PT')}</div>
          </div>
          <Chip tone={{ bg: hexToRgba(payTone, 0.16), fg: payTone, dot: payTone }}>{PAY_LABEL[lang][r.pay]}</Chip>
        </div>
        <div style={{ height: 8, borderRadius: 50, background: hexToRgba(PALETTE.ink, 0.08), overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 50, background: accent }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <PayCell label={t('sinal')} value={r.sinal || 0} sub={(r.sinal || 0) > 0 ? (sinalPago ? (lang === 'pt' ? 'Pago' : 'Paid') : (lang === 'pt' ? 'Por pagar' : 'Due')) : null} subColor={sinalPago ? PALETTE.sage : PALETTE.clay} />
          <div style={{ width: 1, background: 'rgba(74,63,53,0.1)' }} />
          <PayCell label={t('pago')} value={r.pago || 0} accent={PALETTE.sage} />
          <div style={{ width: 1, background: 'rgba(74,63,53,0.1)' }} />
          <PayCell label={t('em_divida')} value={divida} accent={divida > 0 ? PALETTE.clay : PALETTE.sage} />
        </div>
      </Card>

      {/* Definir sinal (depósito) */}
      <Card style={{ marginBottom: 16, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Sinal / depósito acordado' : 'Agreed deposit'}</div>
            {editSinal
              ? <input type="number" value={sv} autoFocus onChange={e => setSv(e.target.value)} style={{ marginTop: 4, width: 120, boxSizing: 'border-box', padding: '7px 9px', borderRadius: 8, border: '1px solid rgba(74,63,53,0.2)', background: 'var(--paper)', fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 18, color: PALETTE.nearBlack, outline: 'none' }} />
              : <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 20, color: PALETTE.nearBlack, marginTop: 2 }}>€ {(r.sinal || 0).toLocaleString('pt-PT')}</div>}
          </div>
          {editSinal
            ? <Btn variant="solid" accent={accent} size="sm" icon="check" onClick={saveSinal}>{lang === 'pt' ? 'Guardar' : 'Save'}</Btn>
            : <Btn variant="ghost" accent={accent} size="sm" icon="edit" onClick={() => { setSv(r.sinal || 0); setEditSinal(true) }}>{lang === 'pt' ? 'Definir' : 'Set'}</Btn>}
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(r.sinal || 0) > 0 && !sinalPago && (
          <Btn variant="soft" accent={accent} size="md" full icon="check" onClick={() => ctx.openPayment(r, { amount: (r.sinal || 0) - (r.pago || 0), label: lang === 'pt' ? 'sinal' : 'deposit' })}>
            {lang === 'pt' ? `Registar sinal pago (€ ${((r.sinal||0)-(r.pago||0)).toLocaleString('pt-PT')})` : 'Mark deposit paid'}
          </Btn>
        )}
        <Btn variant="solid" accent={accent} size="md" full icon="plus" onClick={() => ctx.openPayment(r)}>{t('registar')}</Btn>
      </div>
    </div>
  )
}

function PayCell({ label, value, accent = PALETTE.nearBlack, sub, subColor }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: PALETTE.inkSoft }}>{label}</div>
      <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 19, color: accent, marginTop: 3, whiteSpace: 'nowrap' }}>€ {(value || 0).toLocaleString('pt-PT')}</div>
      {sub && <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: subColor || PALETTE.inkSoft, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function DocRow({ icon, title, status, onOpen, onDelete, accent, lang }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(74,63,53,0.1)', background: 'var(--paper-card)' }}>
      <Icon name={icon} size={18} color={accent} stroke={1.6} />
      <button onClick={onOpen} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13, color: PALETTE.ink }}>{title}{status ? ` · ${status}` : ''}</button>
      <button onClick={onDelete} title={lang === 'pt' ? 'Apagar' : 'Delete'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}><Icon name="x" size={15} color={PALETTE.inkSoft} stroke={2} /></button>
      <button onClick={onOpen} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><Icon name="chevR" size={16} color={PALETTE.inkSoft} stroke={1.8} /></button>
    </div>
  )
}

function DocsTab({ ctx, t, lang, accent, r }) {
  const proposals = (ctx.proposals || []).filter(p => p.lead_id === r.id)
  const schedules = (ctx.schedules || []).filter(s => s.booking_id === r.id)
  const beautySch = schedules.find(s => s.kind === 'beauty')
  const musicSch = schedules.find(s => s.kind === 'music')
  const hasBeauty = (r.servicos || []).some(s => s === 'makeup' || s === 'hair')
  const hasMusic = (r.servicos || []).includes('music')

  const openOrGenBeauty = async () => { if (beautySch) ctx.push('cronograma', { id: beautySch.id }); else { const id = await ctx.generateSchedule(r, 'beauty'); ctx.push('cronograma', { id }) } }
  const openOrGenMusic = async () => { if (musicSch) ctx.push('cronograma', { id: musicSch.id }); else { const id = await ctx.generateSchedule(r, 'music'); ctx.push('cronograma', { id }) } }

  return (
    <div>
      {/* ORÇAMENTO */}
      <Label size={10.5} style={{ marginBottom: 10 }}>{t('orcamento')}</Label>
      {proposals.length > 0
        ? proposals.map(p => (
            <DocRow key={p.id} icon="file" accent={accent} lang={lang}
              title={t('orcamento')} status={p.status}
              onOpen={() => ctx.push('proposta', { id: p.id })}
              onDelete={() => ctx.remove('proposals', p.id)} />
          ))
        : <Card style={{ marginBottom: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12.5, color: PALETTE.ink, marginBottom: 12, lineHeight: 1.5 }}>
              {lang === 'pt' ? 'Orçamento com a sua marca, adaptado aos serviços.' : 'Branded quote adapted to the services.'}
            </div>
            <Btn variant="solid" accent={accent} size="md" full icon="file" onClick={async () => { const id = await ctx.generateProposal(r); ctx.push('proposta', { id }) }}>
              {lang === 'pt' ? 'Gerar orçamento' : 'Generate quote'}
            </Btn>
          </Card>}

      {/* CRONOGRAMA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 10px' }}>
        <Eucalyptus size={16} stem={PALETTE.terracottaDark} leaf={PALETTE.sage} />
        <Label size={10.5}>{lang === 'pt' ? 'Cronograma do dia' : 'Day schedule'}</Label>
      </div>
      {schedules.length > 0 && schedules.map(s => (
        <DocRow key={s.id} icon="calendar" accent={accent} lang={lang}
          title={s.kind === 'music' ? (lang === 'pt' ? 'Música' : 'Music') : (lang === 'pt' ? 'Cabelo e Maquilhagem' : 'Hair & Makeup')} status={s.status}
          onOpen={() => ctx.push('cronograma', { id: s.id })}
          onDelete={() => ctx.remove('schedules', s.id)} />
      ))}
      {((hasBeauty && !beautySch) || (hasMusic && !musicSch)) && (
        <Card style={{ padding: '14px 16px' }}>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12.5, color: PALETTE.ink, marginBottom: 12, lineHeight: 1.5 }}>
            {lang === 'pt' ? 'Horário para enviar ao cliente, por pessoa.' : 'Timetable to send the client, per person.'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {hasBeauty && !beautySch && <button onClick={openOrGenBeauty} style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.terracottaDark, background: 'var(--paper-card)', border: `1px solid ${hexToRgba(PALETTE.terracotta, 0.3)}`, borderRadius: 50, padding: '8px 14px', cursor: 'pointer' }}>+ {lang === 'pt' ? 'Cabelo e Maquilhagem' : 'Hair & Makeup'}</button>}
            {hasMusic && !musicSch && <button onClick={openOrGenMusic} style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.terracottaDark, background: 'var(--paper-card)', border: `1px solid ${hexToRgba(PALETTE.terracotta, 0.3)}`, borderRadius: 50, padding: '8px 14px', cursor: 'pointer' }}>+ {lang === 'pt' ? 'Música' : 'Music'}</button>}
          </div>
        </Card>
      )}
    </div>
  )
}

function NotasTab({ t, lang, accent, r, teamById }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Espaço interno desta reserva' : 'Internal space for this booking'}</span>
      </div>
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Eucalyptus size={22} stem={PALETTE.terracotta} leaf={PALETTE.sage} style={{ margin: '0 auto 10px' }} />
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Sem notas ainda' : 'No notes yet'}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <div style={{ flex: 1, background: 'var(--paper-card)', borderRadius: 50, padding: '11px 16px', border: '1px solid rgba(74,63,53,0.08)', fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Mensagem da equipa…' : 'Team note…'}</div>
        <button style={{ width: 42, height: 42, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="send" size={19} color="#FBF7F0" stroke={1.8} />
        </button>
      </div>
    </div>
  )
}
