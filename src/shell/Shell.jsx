import { Suspense, useEffect, useState } from 'react'
import { TAB_LABELS, useRoute } from '../router.js'
import { useStore } from '../store.jsx'
import { Skeleton, useScrollRestore } from '../ui'
import Agenda from '../screens/Agenda/Agenda.jsx'
import Receber from '../screens/Receber/Receber.jsx'
import Expenses from '../screens/Expenses/Expenses.jsx'
import Settings from '../screens/Settings/Settings.jsx'
import Sidebar from './Sidebar.jsx'
import Tabbar from './Tabbar.jsx'
import SheetHost from './SheetHost.jsx'
import { Boundary, ErrorPanel, errorDetail, lazyWithPreload } from './lazy.jsx'
import './shell.css'

// O Painel (Recharts) só é descarregado quando se abre o separador.
const Dashboard = lazyWithPreload(() => import('../screens/Dashboard/Dashboard.jsx'))

const SCREENS = [
  ['agenda', Agenda],
  ['receber', Receber],
  ['despesas', Expenses],
  ['painel', Dashboard],
]

const LOADING = {
  agenda: 'A carregar a agenda',
  receber: 'A carregar as cobranças',
  despesas: 'A carregar as despesas',
  painel: 'A carregar o painel',
  definicoes: 'A carregar as definições',
}

// scroll guardado por vista: Agenda (lista · procurar · mês), Receber (atraso · recibos · google)
function scrollKey(route) {
  const { tab, path, params } = route
  if (tab === 'agenda') return `agenda/${'q' in params ? 'procurar' : path[1] || 'lista'}`
  if (tab === 'receber') return `receber/${path[1] || 'atraso'}`
  return tab
}

// esqueleto de ecrã (TopBar + linhas) — nunca um ecrã em branco (spec §10.2)
function ScreenSkeleton({ label }) {
  return (
    <div className="sh-skeleton" aria-busy="true">
      <div className="topbar" aria-hidden="true">
        <div>
          <span className="sh-sk kicker" />
          <span className="sh-sk title" />
        </div>
      </div>
      <Skeleton lines={3} label={label} />
    </div>
  )
}

function ScreenError({ error, retry }) {
  return (
    <ErrorPanel title="Não foi possível abrir este ecrã." text="Verifica a ligação e tenta de novo."
      detail={errorDetail(error)} onRetry={retry} />
  )
}

// erro fatal ao carregar os dados (spec §10.2 · 4)
function FatalError({ info, onRetry }) {
  const setup = info?.text === 'Esta funcionalidade ainda não está configurada.'
  return (
    <div className="sh-fatal">
      <header className="topbar"><div><div className="kicker">Joana</div><h1>Algo correu mal</h1></div></header>
      <ErrorPanel title="Não foi possível carregar os teus dados."
        text={setup ? 'A base de dados ainda não está pronta. Mostra os detalhes ao João.' : 'Verifica a ligação e tenta de novo.'}
        detail={info?.detail} onRetry={onRetry} />
    </div>
  )
}

// Separadores montados à medida que são visitados e depois só escondidos (hidden):
// pesquisa, filtros e scroll sobrevivem à troca.
function TabScreens({ tab }) {
  const [visited, setVisited] = useState(() => new Set([tab]))
  if (!visited.has(tab) && SCREENS.some(([id]) => id === tab)) setVisited(new Set(visited).add(tab))
  return SCREENS.map(([id, Screen]) => visited.has(id) && (
    <div key={id} className="sh-tab" data-tab={id} hidden={tab !== id}>
      <Boundary resetKey={id} fallback={(error, retry) => <ScreenError error={error} retry={retry} />}>
        <Suspense fallback={<ScreenSkeleton label={LOADING[id]} />}>
          <Screen />
        </Suspense>
      </Boundary>
    </div>
  ))
}

// Shell (spec §3.1–3.2, plano §F.6): sidebar ≥ 1024 px · separadores · Definições · tabbar · folhas.
// booting = sessão ainda por saber: só a moldura com esqueletos (sem store).
export default function Shell({ booting = false }) {
  const route = useRoute()
  const store = useStore()
  const tab = route.tab
  const ready = !booting && !!store && !store.loading && !store.error
  const news = ready && store.receberHasNews && tab !== 'receber'

  useScrollRestore(ready ? scrollKey(route) : null)

  // título da janela por ecrã (também é o que os leitores de ecrã anunciam)
  useEffect(() => { document.title = `${TAB_LABELS[tab] || 'Agenda'} · Joana` }, [tab])

  // abrir Receber apaga o ponto de novidades (e sair também conta como visto)
  const markSeen = store?.markReceberSeen
  const inReceber = ready && tab === 'receber'
  useEffect(() => {
    if (!inReceber || !markSeen) return
    markSeen()
    return () => markSeen()
  }, [inReceber, markSeen])

  let main
  if (!booting && store?.error) main = <FatalError info={store.errorInfo} onRetry={store.reload} />
  else if (!ready) main = <ScreenSkeleton label={LOADING[tab] || LOADING.agenda} />
  else {
    main = (
      <>
        <TabScreens tab={tab} />
        {tab === 'definicoes' && (
          <Boundary resetKey="definicoes" fallback={(error, retry) => <ScreenError error={error} retry={retry} />}>
            <Settings />
          </Boundary>
        )}
      </>
    )
  }

  return (
    <div className="shell">
      <Sidebar tab={tab} news={news} />
      <main className="content" id="conteudo">{main}</main>
      <Tabbar tab={tab} news={news} />
      {ready && <SheetHost />}
    </div>
  )
}
