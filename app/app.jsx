// app.jsx — main shell: tab bar + stack router + tweaks
const { useState } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#A9744F",
  "lang": "pt"
}/*EDITMODE-END*/;

const TABS = [
  { id: 'inicio', icon: 'home', key: 'tab_inicio' },
  { id: 'conversas', icon: 'chat', key: 'tab_conversas' },
  { id: 'negocios', icon: 'deals', key: 'tab_negocios' },
  { id: 'agenda', icon: 'calendar', key: 'tab_agenda' },
  { id: 'financeiro', icon: 'wallet', key: 'tab_financeiro' },
];

function TabBar({ active, onChange, t, accent }) {
  return (
    <div style={{
      flexShrink: 0, background: 'var(--paper-card)', borderTop: '1px solid rgba(74,63,53,0.08)',
      boxShadow: '0 -4px 20px rgba(74,63,53,0.05)', display: 'flex',
      padding: '9px 6px 30px',
    }}>
      {TABS.map((tb) => {
        const on = active === tb.id;
        return (
          <button key={tb.id} onClick={() => onChange(tb.id)} style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '5px 2px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <Icon name={tb.icon} size={23} color={on ? accent : PALETTE.inkSoft} stroke={on ? 1.9 : 1.5} />
            <span style={{ fontFamily: 'var(--sans)', fontSize: 9.5, letterSpacing: '0.04em', fontWeight: on ? 500 : 400, color: on ? accent : PALETTE.inkSoft }}>{t(tb.key)}</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: on ? accent : 'transparent', marginTop: -1 }} />
          </button>
        );
      })}
    </div>
  );
}

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const lang = tw.lang === 'en' ? 'en' : 'pt';
  const accent = tw.accent || PALETTE.terracotta;
  const t = makeT(lang);

  const [tab, setTab] = useState('inicio');
  const [stack, setStack] = useState([]);    // [{screen, params}]
  const [tabParams, setTabParams] = useState({});

  const ctx = {
    t, lang, accent,
    push: (screen, params = {}) => setStack((s) => [...s, { screen, params }]),
    pop: () => setStack((s) => s.slice(0, -1)),
    goTab: (id, params = {}) => { setStack([]); setTabParams(params); setTab(id); },
    params: tabParams,
  };

  const TAB_SCREENS = {
    inicio: HomeScreen, conversas: ConversasScreen, negocios: NegociosScreen,
    agenda: AgendaScreen, financeiro: FinanceiroScreen,
  };
  const STACK_SCREENS = {
    conversa: ConversaScreen, lead: LeadScreen, reserva: ReservaScreen, doc: DocScreen,
  };
  const TabScreen = TAB_SCREENS[tab];
  const top = stack[stack.length - 1];
  const TopScreen = top ? STACK_SCREENS[top.screen] : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, boxSizing: 'border-box' }}>
      <IOSDevice>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)', position: 'relative', overflow: 'hidden' }}>
          {/* tab content */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' }} key={tab}>
            <TabScreen ctx={ctx} />
          </div>
          <TabBar active={tab} onChange={ctx.goTab} t={t} accent={accent} />

          {/* stack overlay */}
          {TopScreen && (
            <div key={stack.length + top.screen} style={{ position: 'absolute', inset: 0, zIndex: 100, animation: 'slideIn .28s cubic-bezier(.33,0,.2,1)' }}>
              <TopScreen ctx={ctx} params={top.params} />
            </div>
          )}
        </div>
      </IOSDevice>

      <TweaksPanel title="Tweaks">
        <TweakSection label={lang === 'pt' ? 'Marca' : 'Brand'} />
        <TweakColor label={lang === 'pt' ? 'Cor de marca' : 'Brand colour'} value={tw.accent}
          options={['#A9744F', '#B25B43', '#8C5C3C', '#93A07E']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakSection label={lang === 'pt' ? 'Idioma' : 'Language'} />
        <TweakRadio label={lang === 'pt' ? 'Idioma' : 'Language'} value={tw.lang}
          options={['pt', 'en']}
          onChange={(v) => setTweak('lang', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
