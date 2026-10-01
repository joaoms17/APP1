import { Icon } from '../ui'
import { openNew, tabHref } from '../router.js'
import { NAV, goTab } from './nav.js'

// Tabbar do telemóvel (spec §3.1): Agenda · Receber · [Novo] · Despesas · Painel.
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
  const [agenda, receber, despesas, painel] = NAV
  return (
    <nav className="tabbar" aria-label="Principal">
      <Tab item={agenda} active={tab === 'agenda'} />
      <Tab item={receber} active={tab === 'receber'} news={news} />
      <button type="button" className="tab-new" aria-label="Novo evento ou despesa" onClick={openNew}>
        <span className="plus"><Icon name="plus" /></span>
        Novo
      </button>
      <Tab item={despesas} active={tab === 'despesas'} />
      <Tab item={painel} active={tab === 'painel'} />
    </nav>
  )
}
