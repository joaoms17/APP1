import React from 'react'
import { PALETTE, hexToRgba, svc, SERVICE_LABEL } from '../data'
import { Icon, Avatar, Card, Btn, AIBadge, Label, Eucalyptus } from '../ui'

export function ConversasScreen({ ctx }) {
  const { t, accent, conversas } = ctx
  const lista = conversas || []
  return (
    <div style={{ padding: '30px 0 24px' }}>
      <div style={{ padding: '0 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 500, fontSize: 32, color: PALETTE.nearBlack, lineHeight: 1.1 }}>{t('tab_conversas')}</div>
          <button onClick={() => ctx.openCreate('lead')} style={{ width: 42, height: 42, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(169,116,79,0.3)', marginTop: 4 }}>
            <Icon name="plus" size={22} color="#FBF7F0" stroke={2} />
          </button>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: PALETTE.sage }} />
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.inkSoft }}>{t('wa_connected')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--paper-card)', borderRadius: 50, padding: '11px 16px', marginBottom: 18, border: '1px solid rgba(74,63,53,0.06)' }}>
          <Icon name="search" size={17} color={PALETTE.inkSoft} stroke={1.6} />
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13.5, color: PALETTE.inkSoft }}>{t('pesquisar')}</span>
        </div>
      </div>

      {lista.length === 0
        ? <div style={{ padding: '40px 18px', textAlign: 'center' }}>
            <Eucalyptus size={22} stem={PALETTE.terracotta} leaf={PALETTE.sage} style={{ margin: '0 auto 12px' }} />
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft }}>Sem conversas ainda</div>
          </div>
        : <div style={{ padding: '0 8px' }}>
            {lista.map((c) => (
              <div key={c.id} onClick={() => ctx.push('conversa', { id: c.id })} style={{ display: 'flex', gap: 13, alignItems: 'center', padding: '12px 12px', borderRadius: 16, cursor: 'pointer', background: c.unread ? hexToRgba(PALETTE.sage, 0.07) : 'transparent' }}>
                <div style={{ position: 'relative' }}>
                  <Avatar initials={c.initials} color={c.color} size={50} />
                  {c.aiReady && (
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--paper)' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: hexToRgba(PALETTE.sage, 0.9), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="sparkle" size={11} color="#FBF7F0" stroke={2} />
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 17, color: PALETTE.nearBlack }}>{c.name}</span>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: c.unread ? accent : PALETTE.inkSoft, fontWeight: c.unread ? 500 : 300 }}>{c.time}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3, gap: 8 }}>
                    <span style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12.5, color: PALETTE.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.last}</span>
                    {c.unread > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: accent, color: '#FBF7F0', fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{c.unread}</span>}
                  </div>
                  {c.aiReady && <div style={{ marginTop: 6 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--sans)', fontSize: 11, color: PALETTE.terracottaDark, fontWeight: 500 }}><Eucalyptus size={10} stem={PALETTE.terracottaDark} leaf={PALETTE.sage} /> Lead pronta a criar</span></div>}
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

export function ConversaScreen({ ctx, params }) {
  const { t, lang, accent, conversas } = ctx
  const c = (conversas || []).find((x) => x.id === params.id) || null
  const [showExtract, setShowExtract] = React.useState(false)
  const [sent, setSent] = React.useState([])

  if (!c) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
      <div style={{ fontFamily: 'var(--sans)', color: PALETTE.inkSoft }}>Conversa não encontrada</div>
    </div>
  )

  const suggestedReply = lang === 'pt'
    ? 'Olá! Obrigada pelo contacto. Verificamos a disponibilidade e enviamos uma proposta em breve.'
    : 'Hi! Thanks for reaching out. We will check availability and send a proposal shortly.'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      <div style={{ paddingTop: 50, paddingBottom: 12, paddingInline: 14, background: 'var(--paper-card)', borderBottom: '1px solid rgba(74,63,53,0.07)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={ctx.pop} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <Icon name="chevL" size={24} color={accent} stroke={2} />
        </button>
        <Avatar initials={c.initials} color={c.color} size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 17, color: PALETTE.nearBlack }}>{c.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: PALETTE.sage }} />
            <span style={{ fontFamily: 'var(--sans)', fontSize: 10.5, color: PALETTE.inkSoft }}>WhatsApp Business</span>
          </div>
        </div>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <Icon name="phone" size={20} color={PALETTE.ink} stroke={1.6} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '18px 16px 12px' }}>
        {(c.messages || [{ from: 'them', t: c.last, time: c.time }]).map((m, i) => (
          <Bubble key={i} m={m} accent={accent} />
        ))}
        {sent.map((m, i) => <Bubble key={'s'+i} m={{ from: 'me', t: m, time: 'agora' }} accent={accent} />)}

        {c.aiReady && (
          <div style={{ margin: '18px 0 6px' }}>
            <Card sage style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Eucalyptus size={18} stem={PALETTE.terracottaDark} leaf={PALETTE.sage} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 13.5, color: PALETTE.nearBlack }}>{t('ai_extraiu')}</span>
                    <AIBadge />
                  </div>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 11.5, color: PALETTE.ink, marginTop: 2 }}>{t('aprovacao_humana')}</div>
                </div>
                <button onClick={() => setShowExtract(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', transform: showExtract ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                  <Icon name="chevD" size={20} color={PALETTE.terracottaDark} stroke={1.8} />
                </button>
              </div>
              {showExtract && c.extract && (
                <div style={{ padding: '4px 16px 16px', borderTop: '1px solid rgba(147,160,126,0.4)' }}>
                  <div style={{ paddingTop: 14 }}>
                    <ExtractRow label={t('nome')} value={c.extract.nome} />
                    <ExtractRow label={t('tipo_evento')} value={c.extract.tipo} />
                    <ExtractRow label={t('data')} value={c.extract.data} />
                    <ExtractRow label={t('local')} value={c.extract.local} />
                    <ExtractRow label={t('convidados')} value={`${c.extract.convidados} ${t('convidados_n')}`} />
                    <ExtractRow label={t('servicos')} value={svc(lang, c.extract.servicos)} last />
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <Btn variant="ghost" accent={accent} size="sm" icon="edit" onClick={() => setShowExtract(false)}>{t('editar')}</Btn>
                    <Btn variant="solid" accent={accent} size="sm" full icon="check" onClick={() => ctx.push('lead', { id: c.id, fromAI: true })}>{t('criar_lead')}</Btn>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {c.aiReady && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, paddingLeft: 4 }}>
              <Icon name="sparkle" size={13} color={PALETTE.sage} stroke={1.8} />
              <Label size={10}>{t('sugestao_resposta')}</Label>
            </div>
            <div style={{ background: 'var(--paper-card)', border: `1px dashed ${hexToRgba(PALETTE.sage, 0.6)}`, borderRadius: 16, padding: '13px 15px' }}>
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.ink, lineHeight: 1.55 }}>{suggestedReply}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <Btn variant="soft" accent={accent} size="sm">{t('editar')}</Btn>
                <Btn variant="solid" accent={accent} size="sm" icon="send" onClick={() => setSent(s => [...s, suggestedReply])}>{t('aprovar')}</Btn>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, padding: '10px 14px 30px', background: 'var(--paper-card)', borderTop: '1px solid rgba(74,63,53,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, background: 'var(--paper)', borderRadius: 50, padding: '11px 16px', border: '1px solid rgba(74,63,53,0.08)' }}>
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13.5, color: PALETTE.inkSoft }}>{t('escrever')}</span>
        </div>
        <button style={{ width: 44, height: 44, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="send" size={20} color="#FBF7F0" stroke={1.8} />
        </button>
      </div>
    </div>
  )
}

function Bubble({ m, accent }) {
  const me = m.from === 'me'
  return (
    <div style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: me ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: me ? hexToRgba(accent, 0.14) : 'var(--paper-card)', border: me ? 'none' : '1px solid rgba(74,63,53,0.06)', boxShadow: me ? 'none' : '0 2px 8px rgba(74,63,53,0.04)' }}>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13.5, color: PALETTE.ink, lineHeight: 1.5 }}>{m.t}</div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: PALETTE.inkSoft, textAlign: 'right', marginTop: 3 }}>{m.time}</div>
      </div>
    </div>
  )
}

function ExtractRow({ label, value, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, padding: '7px 0', borderBottom: last ? 'none' : '1px solid rgba(74,63,53,0.08)' }}>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: PALETTE.inkSoft, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 13.5, color: PALETTE.nearBlack, textAlign: 'right' }}>{value}</span>
    </div>
  )
}
