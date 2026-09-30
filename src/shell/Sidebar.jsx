import { Avatar, Button, Icon, syncTime } from '../ui'
import { openNew, tabHref } from '../router.js'
import { useStore } from '../store.jsx'
import { NAV, goTab } from './nav.js'
import { accountOf, useSession } from './session.js'

// Estado do Google no fundo da sidebar: "● Google atualizado às 09:12" ou aviso com "Tentar de novo".
function GoogleState() {
  const store = useStore()
  const status = store?.gcalStatus
  if (!store?.gcalCalendars?.length || !status) return null
  if (status.failures.length) {
    return (
      <button type="button" className="sync warn" onClick={() => store.refreshGcal()} disabled={status.refreshing}>
        <i aria-hidden="true" />
        {status.refreshing ? 'A atualizar o Google…' : 'O Google não atualizou · Tentar de novo'}
      </button>
    )
  }
  const text = status.lastOkAt ? `Google atualizado ${syncTime(status.lastOkAt)}`
    : status.refreshing ? 'A atualizar o Google…' : 'Google por atualizar'
  return <div className="sync"><i aria-hidden="true" />{text}</div>
}

// Sidebar do computador (≥ 1024 px, spec §3.2): wordmark, "+ Novo", navegação, Google, Definições e conta.
export default function Sidebar({ tab, news = false }) {
  const { name, email } = accountOf(useSession())
  const link = (id, label, icon, extra = null) => (
    <a key={id} className="nav-item" href={tabHref(id)} aria-current={tab === id ? 'page' : undefined}
      onClick={(e) => goTab(e, id)}>
      <Icon name={icon} />
      {label}
      {extra}
    </a>
  )
  return (
    <aside className="sidebar" aria-label="Navegação">
      <div className="brand"><b>Joana</b><i aria-hidden="true" /><small>Concertos, noivas e contas.</small></div>
      <Button variant="primary" block icon="plus" className="new" aria-label="Novo evento ou despesa" onClick={openNew}>
        Novo
      </Button>
      <nav aria-label="Principal">
        {NAV.map((item) => link(item.id, item.label, item.icon, item.id === 'receber' && news
          ? <><span className="new-dot" aria-hidden="true" /><span className="sr-only">, há novidades</span></>
          : null))}
      </nav>
      <div className="spacer" />
      <GoogleState />
      {link('definicoes', 'Definições', 'settings')}
      <div className="account">
        <Avatar />
        <div><b>{name}</b>{email && <small>{email}</small>}</div>
      </div>
    </aside>
  )
}
