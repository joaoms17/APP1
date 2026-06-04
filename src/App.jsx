import React, { useState, useEffect } from 'react'
import { db } from './supabase'
import { makeT, PALETTE, hexToRgba, defaultData, loadFromSupabase, insertRow, updateRow, deleteRow, genId, initialsOf, colorFor, generateProposalContent, buildScheduleContent } from './data'
import { Icon, Eucalyptus } from './ui'
import { EntityForm, PaymentModal, WhatsAppModal } from './forms'
import Auth from './Auth'
import SettingsScreen from './screens/SettingsScreen'
import ProposalScreen from './screens/ProposalScreen'
import ScheduleScreen from './screens/ScheduleScreen'
import EquipaScreen from './screens/EquipaScreen'
import HomeScreen     from './screens/HomeScreen'
import NegociosScreen  from './screens/NegociosScreen'
import LeadScreen      from './screens/LeadScreen'
import ReservaScreen   from './screens/ReservaScreen'
import AgendaScreen    from './screens/AgendaScreen'
import FinanceiroScreen from './screens/FinanceiroScreen'
import DocScreen       from './screens/DocScreen'

const TWEAK_DEFAULTS = { accent: '#A9744F', lang: 'pt' }

const TABS = [
  { id: 'inicio',     icon: 'home',     key: 'tab_inicio' },
  { id: 'negocios',   icon: 'deals',    key: 'tab_negocios' },
  { id: 'agenda',     icon: 'calendar', key: 'tab_agenda' },
  { id: 'equipa',     icon: 'users',    key: 'tab_equipa' },
  { id: 'financeiro', icon: 'wallet',   key: 'tab_financeiro' },
]

function useIsDesktop() {
  const [d, setD] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 900)
  useEffect(() => {
    const f = () => setD(window.innerWidth >= 900)
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  return d
}

function LoadingScreen() {
  return (
    <div style={{ height: '100%', minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <Eucalyptus size={32} stem={PALETTE.terracotta} leaf={PALETTE.sage} />
      <div style={{ display: 'flex', gap: 8 }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: PALETTE.terracotta, animation: `loadPulse 1.2s ${i*0.2}s ease-in-out infinite` }} />)}
      </div>
    </div>
  )
}

// ─── Desktop sidebar ──────────────────────────────────────────
function Sidebar({ active, onChange, t, accent, tw, setTw, userName, signOut }) {
  return (
    <div style={{ width: 248, flexShrink: 0, background: 'var(--paper-card)', borderRight: '1px solid rgba(74,63,53,0.08)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '26px 22px 22px' }}>
        <Eucalyptus size={26} stem={accent} leaf={PALETTE.sage} />
        <div>
          <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 24, color: PALETTE.nearBlack, lineHeight: 1 }}>Ramo</div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: PALETTE.inkSoft, marginTop: 3 }}>{t('appTagline')}</div>
        </div>
      </div>
      <div style={{ flex: 1, padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {TABS.map((tb) => {
          const on = active === tb.id
          return (
            <button key={tb.id} onClick={() => onChange(tb.id)} style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: on ? hexToRgba(accent, 0.12) : 'transparent', textAlign: 'left',
              fontFamily: 'var(--sans)', fontSize: 14.5, fontWeight: on ? 500 : 400, color: on ? accent : PALETTE.ink,
            }}>
              <Icon name={tb.icon} size={20} color={on ? accent : PALETTE.inkSoft} stroke={on ? 1.9 : 1.6} />
              {t(tb.key)}
            </button>
          )
        })}
      </div>
      <div style={{ padding: '4px 14px 0' }}>
        <button onClick={() => onChange('definicoes')} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: active === 'definicoes' ? hexToRgba(accent, 0.12) : 'transparent', textAlign: 'left', width: '100%', fontFamily: 'var(--sans)', fontSize: 14.5, fontWeight: active === 'definicoes' ? 500 : 400, color: active === 'definicoes' ? accent : PALETTE.ink }}>
          <Icon name="file" size={20} color={active === 'definicoes' ? accent : PALETTE.inkSoft} stroke={1.6} />
          {tw.lang === 'pt' ? 'Definições' : 'Settings'}
        </button>
      </div>
      <div style={{ padding: '14px 18px 22px', borderTop: '1px solid rgba(74,63,53,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: hexToRgba(accent, 0.16), color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 14 }}>
            {(userName || '?').slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, color: PALETTE.nearBlack, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
          </div>
          <button onClick={signOut} title={tw.lang === 'pt' ? 'Sair' : 'Sign out'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <Icon name="arrowR" size={18} color={PALETTE.inkSoft} stroke={1.6} />
          </button>
        </div>
        <TweakControls tw={tw} setTw={setTw} compact />
      </div>
    </div>
  )
}

// ─── Mobile bottom tabs ───────────────────────────────────────
function TabBar({ active, onChange, t, accent }) {
  return (
    <div style={{ flexShrink: 0, background: 'var(--paper-card)', borderTop: '1px solid rgba(74,63,53,0.08)', boxShadow: '0 -4px 20px rgba(74,63,53,0.05)', display: 'flex', padding: '9px 6px max(14px, env(safe-area-inset-bottom))' }}>
      {TABS.map((tb) => {
        const on = active === tb.id
        return (
          <button key={tb.id} onClick={() => onChange(tb.id)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '5px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <Icon name={tb.icon} size={23} color={on ? accent : PALETTE.inkSoft} stroke={on ? 1.9 : 1.5} />
            <span style={{ fontFamily: 'var(--sans)', fontSize: 9.5, letterSpacing: '0.04em', fontWeight: on ? 500 : 400, color: on ? accent : PALETTE.inkSoft }}>{t(tb.key)}</span>
          </button>
        )
      })}
    </div>
  )
}

function TweakControls({ tw, setTw, compact }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: PALETTE.inkSoft, marginBottom: 10 }}>
        {tw.lang === 'pt' ? 'Preferências' : 'Preferences'}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['#A9744F','#B25B43','#8C5C3C','#93A07E'].map(c => (
          <button key={c} onClick={() => setTw(p => ({...p, accent: c}))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: tw.accent === c ? '2px solid #29261b' : '2px solid transparent', cursor: 'pointer' }} />
        ))}
      </div>
      <div style={{ display: 'flex', background: 'rgba(0,0,0,.06)', borderRadius: 8, padding: 2, gap: 2 }}>
        {['pt','en'].map(l => (
          <button key={l} onClick={() => setTw(p => ({...p, lang: l}))} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: tw.lang === l ? 'rgba(255,255,255,.9)' : 'transparent', fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: tw.lang === l ? PALETTE.nearBlack : PALETTE.inkSoft }}>{l.toUpperCase()}</button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const isDesktop = useIsDesktop()
  const [tw, setTw] = useState(TWEAK_DEFAULTS)
  const lang   = tw.lang === 'en' ? 'en' : 'pt'
  const accent = tw.accent || PALETTE.terracotta
  const t = makeT(lang)

  // ── Auth session ──
  const [session, setSession] = useState(undefined)   // undefined = loading
  useEffect(() => {
    db.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const [data, setData] = useState(defaultData)
  const [ready, setReady] = useState(false)

  const reload = async () => {
    try { setData(await loadFromSupabase()) }
    catch (e) { console.error('[Ramo] reload error:', e) }
  }
  useEffect(() => { if (session) reload().finally(() => setReady(true)) }, [session])

  // NOTE: all hooks must run on every render — keep them above any early return.
  const [tab, setTab]        = useState('inicio')
  const [stack, setStack]    = useState([])
  const [tabParams, setTabP] = useState({})
  const [form, setForm]      = useState(null)     // { type, initial, onComplete }
  const [payFor, setPayFor]  = useState(null)     // reserva object
  const [pasteChat, setPasteChat] = useState(false)

  const user = session?.user
  const userName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : '')
  const signOut = () => db.auth.signOut()

  // While checking session
  if (session === undefined) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}><LoadingScreen /></div>
  }
  // Not logged in → login screen
  if (!session) return <Auth />

  const teamById    = (id) => data.team.find(m => m.id === id)
  const reservaById = (id) => data.reservas.find(r => r.id === id)

  const persist = async (table, row) => { await insertRow(table, row); await reload() }
  const update  = async (table, id, patch) => { await updateRow(table, id, patch); await reload() }
  const remove  = async (table, id) => { await deleteRow(table, id); await reload() }

  const saveSettings = async (patch) => { await db.from('settings').upsert({ id: 'default', ...patch }); await reload() }

  // Generate a proposal from a lead's selected services + price table
  const generateProposal = async (lead) => {
    const content = generateProposalContent(lead, data.settings, data.priceItems)
    const id = genId()
    await insertRow('proposals', { id, lead_id: lead.id, client_name: lead.name, status: 'rascunho', content })
    await reload()
    return id
  }

  // Generate a day schedule (cronograma) for a booking
  const generateSchedule = async (booking, kind) => {
    const content = buildScheduleContent(booking, kind, data.settings)
    const id = genId()
    await insertRow('schedules', { id, booking_id: booking.id, kind, title: kind === 'music' ? 'Cronograma · Música' : 'Cronograma · Cabelo e Maquilhagem', event_date: booking.data || null, location: booking.local || null, status: 'rascunho', content })
    await reload()
    return id
  }

  const assignTeam = async (bookingId, teamId, add) => {
    if (add) await db.from('booking_team').insert({ booking_id: bookingId, team_id: teamId })
    else await db.from('booking_team').delete().eq('booking_id', bookingId).eq('team_id', teamId)
    await reload()
  }

  const sendMessage = async (convId, text) => {
    const body = (text || '').trim()
    if (!body) return
    await insertRow('messages', { conversation_id: convId, from_type: 'me', content: body, time: 'agora' })
    await updateRow('conversations', convId, { last_message: body, time: 'agora', unread_count: 0 })
    await reload()
  }

  // Paste WhatsApp text → conversation + messages + AI extract + lead
  const createLeadFromChat = async ({ name, phone, text, fields }) => {
    const convId = genId()
    const initials = initialsOf(name), color = colorFor(name)
    const lines = (text || '').split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 40)
    await insertRow('conversations', { id: convId, name, initials, color, last_message: lines[lines.length - 1] || '', time: 'agora', unread_count: 0, ai_ready: true, phone: phone || null })
    if (lines.length) await db.from('messages').insert(lines.map(ln => ({ conversation_id: convId, from_type: 'them', content: ln, time: '' })))
    await insertRow('extract_data', { conversation_id: convId, nome: name, tipo_evento: fields.tipo, data_evento: fields.data || null, local: fields.local || null, servicos: fields.servicos || [], convidados: fields.convidados, obs: 'Criado a partir de mensagem colada' })
    await insertRow('leads', { id: genId(), name, initials, color, estado: 'novo', tipo: fields.tipo, data_evento: fields.data || null, local: fields.local || null, servicos: fields.servicos || [], convidados: fields.convidados, valor: null, origem: 'WhatsApp', phone: phone || null, email: null })
    await reload()
  }

  const ctx = {
    t, lang, accent, isDesktop, userName, signOut, tw, setTw,
    push:  (screen, params = {}) => setStack(s => [...s, { screen, params }]),
    pop:   ()                    => setStack(s => s.slice(0, -1)),
    goTab: (id, params = {})     => { setStack([]); setTabP(params); setTab(id) },
    params: tabParams,
    team: data.team, conversas: data.conversas, leads: data.leads,
    reservas: data.reservas, agendaEvents: data.agendaEvents,
    settings: data.settings, priceItems: data.priceItems, proposals: data.proposals, schedules: data.schedules,
    teamById, reservaById,
    saveSettings, generateProposal, generateSchedule, assignTeam,
    create: persist,
    // CRUD
    openCreate: (type, opts = {}) => setForm({ type, ...opts }),
    openPayment: (reserva, preset) => setPayFor({ reserva, preset }),
    openPasteChat: () => setPasteChat(true),
    sendMessage,
    update, remove, reload,
  }

  const TAB_SCREENS = { inicio: HomeScreen, negocios: NegociosScreen, agenda: AgendaScreen, equipa: EquipaScreen, financeiro: FinanceiroScreen, definicoes: SettingsScreen }
  const STACK_SCREENS = { lead: LeadScreen, reserva: ReservaScreen, doc: DocScreen, proposta: ProposalScreen, cronograma: ScheduleScreen }
  const TabScreen = TAB_SCREENS[tab]
  const top       = stack[stack.length - 1]
  const TopScreen = top ? STACK_SCREENS[top.screen] : null

  // Detail screens render full-screen on mobile, as a centered panel on desktop
  const detailOverlay = TopScreen && (
    <div
      onClick={isDesktop ? () => ctx.pop() : undefined}
      style={isDesktop
        ? { position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(46,40,32,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }
        : { position: 'fixed', inset: 0, zIndex: 1500, background: 'var(--paper)', animation: 'slideIn .28s cubic-bezier(.33,0,.2,1)' }}>
      <div
        onClick={isDesktop ? (e) => e.stopPropagation() : undefined}
        style={isDesktop
          ? { width: 460, height: '88vh', maxHeight: 880, background: 'var(--paper)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 24px 60px rgba(46,40,32,.3)' }
          : { width: '100%', height: '100%' }}>
        <TopScreen ctx={ctx} params={top.params} />
      </div>
    </div>
  )

  const content = !ready ? <LoadingScreen /> : <TabScreen ctx={ctx} />

  return (
    <>
      <style>{`@keyframes loadPulse{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`}</style>

      {isDesktop ? (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--paper)' }}>
          <Sidebar active={tab} onChange={ctx.goTab} t={t} accent={accent} tw={tw} setTw={setTw} userName={userName} signOut={signOut} />
          <div style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', minHeight: '100%' }} key={tab}>
              {content}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--paper)' }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} key={tab}>{content}</div>
          <TabBar active={tab} onChange={ctx.goTab} t={t} accent={accent} />
        </div>
      )}

      {detailOverlay}

      {form && (
        <EntityForm
          type={form.type} initial={form.initial} lang={lang} t={t} accent={accent} isDesktop={isDesktop}
          persist={persist} onClose={() => setForm(null)}
          onComplete={form.onComplete ? (row) => form.onComplete(row, { update, reload }) : undefined}
        />
      )}

      {payFor && (
        <PaymentModal
          reserva={payFor.reserva} preset={payFor.preset} lang={lang} t={t} accent={accent} isDesktop={isDesktop}
          onClose={() => setPayFor(null)}
          onSave={(patch) => update('bookings', payFor.reserva.id, patch)}
        />
      )}

      {pasteChat && (
        <WhatsAppModal
          lang={lang} t={t} accent={accent} isDesktop={isDesktop}
          onClose={() => setPasteChat(false)}
          onSubmit={createLeadFromChat}
        />
      )}
    </>
  )
}
