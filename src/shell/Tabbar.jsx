import { Icon } from '../ui'
import { openNew, tabHref } from '../router.js'
import { NAV, NEW_LABEL, goTab } from './nav.js'

// Tabbar do telemóvel (spec §3.1): Agenda · Receber · [Novo] · Despesas · Painel
// (sem Despesas enquanto FEATURES.expenses estiver desligado: Agenda · Receber · [Novo] · Painel).
// Receber mostra um ponto quando há novidades desde a última visita.
function Tab({ item, active, news }) {
  return (
    <a className="tab" href={tabHref(item.id)} aria-current={active ? 'page' : undefined}
      onClick={(e) => goTab(e, item.id)}>
      <span className="pill">
        <Icon name={item.icon} />
        {news && <span className="new-dot" aria-hidden="true" />}
      </span>
      {item.label}
      {news && <span className="sr-only">, há novidades</span>}
    </a>
  )
}

export default function Tabbar({ tab, news = false }) {
  const tabOf = (item) => <Tab key={item.id} item={item} active={tab === item.id} news={item.id === 'receber' && news} />
  return (
    <nav className={NAV.length === 3 ? 'tabbar four' : 'tabbar'} aria-label="Principal">
      {NAV.slice(0, 2).map(tabOf)}
      <button type="button" className="tab-new" aria-label={NEW_LABEL} onClick={openNew}>
        <span className="plus"><Icon name="plus" /></span>
        Novo
      </button>
      {NAV.slice(2).map(tabOf)}
    </nav>
  )
}
