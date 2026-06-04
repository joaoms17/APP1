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
  return (
    <div>
      {(!r.team || r.team.length === 0)
        ? <div style={{ border: '1px dashed rgba(74,63,53,0.18)', borderRadius: 16, padding: '28px 16px', textAlign: 'center', marginBottom: 12 }}>
            <Eucalyptus size={22} stem={PALETTE.terracotta} leaf={PALETTE.sage} style={{ margin: '0 auto 10px' }} />
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Sem equipa atribuída' : 'No team assigned'}</div>
          </div>
        : r.team.map((id) => {
            const m = teamById(id)
            if (!m) return null
            return (
              <Card key={id} style={{ marginBottom: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar initials={m.initials} color={m.color} size={42} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16, color: PALETTE.nearBlack }}>{m.name}</div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.inkSoft }}>{ROLE_LABEL[lang][m.role]}</div>
                  </div>
                  <Icon name="check2" size={20} color={PALETTE.sage} stroke={1.8} />
                </div>
              </Card>
            )
          })
      }
      <Btn variant="soft" accent={accent} size="md" full icon="plus" style={{ marginTop: 6 }}>{lang === 'pt' ? 'Atribuir colaborador' : 'Assign collaborator'}</Btn>
    </div>
  )
}

function PagamentosTab({ ctx, t, lang, accent, r }) {
  const divida = (r.total || 0) - (r.pago || 0)
  const pct = r.total > 0 ? Math.round(((r.pago || 0) / r.total) * 100) : 0
  const payTone = { pago: PALETTE.sage, parcial: PALETTE.gold, nao_pago: PALETTE.clay }[r.pay] || PALETTE.clay
  return (
    <div>
      <Card style={{ marginBottom: 18, padding: '20px 18px' }}>
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
          <PayCell label={t('sinal')} value={r.sinal || 0} />
          <div style={{ width: 1, background: 'rgba(74,63,53,0.1)' }} />
          <PayCell label={t('pago')} value={r.pago || 0} accent={PALETTE.sage} />
          <div style={{ width: 1, background: 'rgba(74,63,53,0.1)' }} />
          <PayCell label={t('em_divida')} value={divida} accent={divida > 0 ? PALETTE.clay : PALETTE.sage} />
        </div>
      </Card>
      <div style={{ display: 'flex', gap: 12 }}>
        <Btn variant="ghost" accent={accent} size="md" full icon="chat">{t('pedir_pagamento')}</Btn>
        <Btn variant="solid" accent={accent} size="md" full icon="plus" onClick={() => ctx.openPayment(r)}>{t('registar')}</Btn>
      </div>
    </div>
  )
}

function PayCell({ label, value, accent = PALETTE.nearBlack }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: PALETTE.inkSoft }}>{label}</div>
      <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 19, color: accent, marginTop: 3, whiteSpace: 'nowrap' }}>€ {(value || 0).toLocaleString('pt-PT')}</div>
    </div>
  )
}

function DocsTab({ ctx, t, lang, accent, r }) {
  const statusLabel = { sent: lang === 'pt' ? 'Enviado' : 'Sent', signed: lang === 'pt' ? 'Assinado' : 'Signed', draft: lang === 'pt' ? 'Rascunho' : 'Draft' }
  const statusTone = { sent: PALETTE.gold, signed: PALETTE.sage, draft: PALETTE.inkSoft }
  const docs = [
    { id: 'orcamento', label: t('orcamento'), status: 'draft' },
    { id: 'contrato',  label: t('contrato'),  status: 'draft' },
  ]
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

      {/* Cronograma do dia — trabalho adjudicado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 10px' }}>
        <Eucalyptus size={16} stem={PALETTE.terracottaDark} leaf={PALETTE.sage} />
        <Label size={10.5}>{lang === 'pt' ? 'Cronograma do dia' : 'Day schedule'}</Label>
      </div>
      <Card style={{ marginBottom: 10, padding: '14px 16px' }}>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12.5, color: PALETTE.ink, marginBottom: 12, lineHeight: 1.5 }}>
          {lang === 'pt' ? 'Horário para enviar ao cliente, por pessoa.' : 'Timetable to send the client, per person.'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(r.servicos || []).some(s => s === 'makeup' || s === 'hair') && (
            <button onClick={async () => { const id = await ctx.generateSchedule(r, 'beauty'); ctx.push('cronograma', { id }) }} style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.terracottaDark, background: 'var(--paper-card)', border: `1px solid ${hexToRgba(PALETTE.terracotta, 0.3)}`, borderRadius: 50, padding: '8px 14px', cursor: 'pointer' }}>+ {lang === 'pt' ? 'Cabelo e Maquilhagem' : 'Hair & Makeup'}</button>
          )}
          {(r.servicos || []).includes('music') && (
            <button onClick={async () => { const id = await ctx.generateSchedule(r, 'music'); ctx.push('cronograma', { id }) }} style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.terracottaDark, background: 'var(--paper-card)', border: `1px solid ${hexToRgba(PALETTE.terracotta, 0.3)}`, borderRadius: 50, padding: '8px 14px', cursor: 'pointer' }}>+ {lang === 'pt' ? 'Música' : 'Music'}</button>
          )}
        </div>
        {(ctx.schedules || []).filter(s => s.booking_id === r.id).map(s => (
          <button key={s.id} onClick={() => ctx.push('cronograma', { id: s.id })} style={{ width: '100%', marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(74,63,53,0.12)', background: 'var(--paper)', cursor: 'pointer' }}>
            <Icon name="calendar" size={16} color={accent} stroke={1.6} />
            <span style={{ flex: 1, textAlign: 'left', fontFamily: 'var(--sans)', fontSize: 12.5, color: PALETTE.ink }}>{s.kind === 'music' ? (lang === 'pt' ? 'Música' : 'Music') : (lang === 'pt' ? 'Cabelo e Maquilhagem' : 'Hair & Makeup')} · {s.status}</span>
            <Icon name="chevR" size={16} color={PALETTE.inkSoft} stroke={1.8} />
          </button>
        ))}
      </Card>

      <Card sage style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Eucalyptus size={18} stem={PALETTE.terracottaDark} leaf={PALETTE.sage} />
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 14, color: PALETTE.nearBlack }}>{lang === 'pt' ? 'Gerar documento' : 'Generate document'}</span>
          <AIBadge />
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12.5, color: PALETTE.ink, marginBottom: 14, lineHeight: 1.5 }}>
          {lang === 'pt' ? 'A IA prepara o documento com os dados da reserva.' : 'AI prepares the document from booking data.'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[t('proposta'), t('contrato'), t('brochura')].map((x) => (
            <button key={x} onClick={() => ctx.push('doc', { reservaId: r.id, type: 'orcamento' })} style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.terracottaDark, background: 'var(--paper-card)', border: `1px solid ${hexToRgba(PALETTE.terracotta, 0.3)}`, borderRadius: 50, padding: '8px 14px', cursor: 'pointer' }}>+ {x}</button>
          ))}
        </div>
      </Card>
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
