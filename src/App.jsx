import React, { useState, useEffect } from 'react'
import { makeT, PALETTE, hexToRgba, defaultData, loadFromSupabase } from './data'
import { Icon, Eucalyptus } from './ui'
import { IOSDevice } from './ios-frame'
import HomeScreen     from './screens/HomeScreen'
import { ConversasScreen, ConversaScreen } from './screens/ConversasScreen'
import NegociosScreen  from './screens/NegociosScreen'
import LeadScreen      from './screens/LeadScreen'
import ReservaScreen   from './screens/ReservaScreen'
import AgendaScreen    from './screens/AgendaScreen'
import FinanceiroScreen from './screens/FinanceiroScreen'
import DocScreen       from './screens/DocScreen'

const TWEAK_DEFAULTS = { accent: '#A9744F', lang: 'pt' }

const TABS = [
  { id: 'inicio',     icon: 'home',     key: 'tab_inicio' },
  { id: 'conversas',  icon: 'chat',     key: 'tab_conversas' },
  { id: 'negocios',   icon: 'deals',    key: 'tab_negocios' },
  { id: 'agenda',     icon: 'calendar', key: 'tab_agenda' },
  { id: 'financeiro', icon: 'wallet',   key: 'tab_financeiro' },
]

function TabBar({ active, onChange, t, accent }) {
  return (
    <div style={{ flexShrink: 0, background: 'var(--paper-card)', borderTop: '1px solid rgba(74,63,53,0.08)', boxShadow: '0 -4px 20px rgba(74,63,53,0.05)', display: 'flex', padding: '9px 6px 30px' }}>
      {TABS.map((tb) => {
        const on = active === tb.id
        return (
          <button key={tb.id} onClick={() => onChange(tb.id)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '5px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <Icon name={tb.icon} size={23} color={on ? accent : PALETTE.inkSoft} stroke={on ? 1.9 : 1.5} />
            <span style={{ fontFamily: 'var(--sans)', fontSize: 9.5, letterSpacing: '0.04em', fontWeight: on ? 500 : 400, color: on ? accent : PALETTE.inkSoft }}>{t(tb.key)}</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: on ? accent : 'transparent', marginTop: -1 }} />
          </button>
        )
      })}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)', gap: 20 }}>
      <Eucalyptus size={32} stem={PALETTE.terracotta} leaf={PALETTE.sage} />
      <div style={{ display: 'flex', gap: 8 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: PALETTE.terracotta, animation: `loadPulse 1.2s ${i*0.2}s ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [tw, setTw] = useState(TWEAK_DEFAULTS)
  const lang   = tw.lang === 'en' ? 'en' : 'pt'
  const accent = tw.accent || PALETTE.terracotta
  const t = makeT(lang)

  const [data, setData] = useState(defaultData)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadFromSupabase()
      .then(setData)
      .catch(err => console.error('[Ramo] Supabase error:', err))
      .finally(() => setReady(true))
  }, [])

  const [tab, setTab]         = useState('inicio')
  const [stack, setStack]     = useState([])
  const [tabParams, setTabP]  = useState({})

  const teamById   = (id) => data.team.find(m => m.id === id)
  const reservaById = (id) => data.reservas.find(r => r.id === id)

  const ctx = {
    t, lang, accent,
    push:  (screen, params = {}) => setStack(s => [...s, { screen, params }]),
    pop:   ()                     => setStack(s => s.slice(0, -1)),
    goTab: (id, params = {})     => { setStack([]); setTabP(params); setTab(id) },
    params: tabParams,
    // data
    team:         data.team,
    conversas:    data.conversas,
    leads:        data.leads,
    reservas:     data.reservas,
    agendaEvents: data.agendaEvents,
    teamById,
    reservaById,
  }

  const TAB_SCREENS = {
    inicio: HomeScreen, conversas: ConversasScreen,
    negocios: NegociosScreen, agenda: AgendaScreen, financeiro: FinanceiroScreen,
  }
  const STACK_SCREENS = {
    conversa: ConversaScreen, lead: LeadScreen,
    reserva: ReservaScreen,   doc:  DocScreen,
  }
  const TabScreen = TAB_SCREENS[tab]
  const top       = stack[stack.length - 1]
  const TopScreen = top ? STACK_SCREENS[top.screen] : null

  return (
    <>
      <style>{`@keyframes loadPulse{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, boxSizing: 'border-box' }}>
        <IOSDevice>
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)', position: 'relative', overflow: 'hidden' }}>
            {!ready
              ? <LoadingScreen />
              : <>
                  <div style={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' }} key={tab}>
                    <TabScreen ctx={ctx} />
                  </div>
                  <TabBar active={tab} onChange={ctx.goTab} t={t} accent={accent} />
                  {TopScreen && (
                    <div key={stack.length + top.screen} style={{ position: 'absolute', inset: 0, zIndex: 100, animation: 'slideIn .28s cubic-bezier(.33,0,.2,1)' }}>
                      <TopScreen ctx={ctx} params={top.params} />
                    </div>
                  )}
                </>
            }
          </div>
        </IOSDevice>

        {/* Tweaks panel — brand colour + language */}
        <div style={{ position: 'fixed', bottom: 16, right: 16, background: 'rgba(250,249,247,.85)', backdropFilter: 'blur(20px)', borderRadius: 14, padding: '14px 16px', boxShadow: '0 12px 40px rgba(0,0,0,.15)', border: '.5px solid rgba(255,255,255,.6)', minWidth: 200, zIndex: 999 }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: PALETTE.inkSoft, marginBottom: 12 }}>Tweaks</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: PALETTE.inkSoft, marginBottom: 6 }}>Cor de marca</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['#A9744F','#B25B43','#8C5C3C','#93A07E'].map(c => (
                <button key={c} onClick={() => setTw(p => ({...p, accent: c}))} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: tw.accent === c ? '2px solid #29261b' : '2px solid transparent', cursor: 'pointer', outline: 'none' }} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: PALETTE.inkSoft, marginBottom: 6 }}>Idioma</div>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,.06)', borderRadius: 8, padding: 2, gap: 2 }}>
              {['pt','en'].map(l => (
                <button key={l} onClick={() => setTw(p => ({...p, lang: l}))} style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: tw.lang === l ? 'rgba(255,255,255,.9)' : 'transparent', fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: tw.lang === l ? PALETTE.nearBlack : PALETTE.inkSoft }}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
