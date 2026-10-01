import { useState } from 'react'
import Icon from './Icon.jsx'
import Button from './Button.jsx'
import IconButton from './IconButton.jsx'
import { useStore } from '../store.jsx'
import { fmtDM, toYMD } from '../format.js'
import './components.css'

// "às 09:12" (hoje) · "a 12 set, 09:12" (outro dia)
export function syncTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const day = toYMD(d)
  return day === toYMD(new Date()) ? `às ${t}` : `a ${fmtDM(day)}, ${t}`
}

const names = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`)

// Faixa de aviso quando o Google Calendar falha (lê gcalStatus). Pode fechar-se até à próxima falha.
export default function SyncBanner({ className = '' }) {
  const store = useStore()
  const status = store?.gcalStatus
  const failures = status?.failures || []
  const signature = failures.map((f) => f.calendar_id).sort().join(',')
  const [closed, setClosed] = useState(null)
  if (!failures.length || closed === signature) return null

  const who = [...new Set(failures.map((f) => store.projectById(f.project_id)?.name).filter(Boolean))]
  const lastOk = failures.map((f) => status.byCalendar?.[f.calendar_id]?.lastOkAt).filter(Boolean).sort()[0]
  const last = syncTime(lastOk)
  return (
    <div className={`banner ${className}`.trim()} role="status">
      <Icon name="alert" />
      <span>
        <b>Não foi possível atualizar</b> o Google Calendar{who.length ? ` (${names(who)})` : ''}
        {last ? ` · última ${last}` : ''}
      </span>
      <Button variant="ghost" size="sm" loading={status.refreshing} loadingLabel="A atualizar…"
        onClick={() => store.refreshGcal()}>
        Tentar de novo
      </Button>
      <IconButton icon="x" size="sm" label="Fechar aviso" onClick={() => setClosed(signature)} />
    </div>
  )
}

// Linha discreta "● Google atualizado às 09:12" (fim de Receber › Por registar; a sidebar tem a sua).
export function SyncLine({ className = '' }) {
  const store = useStore()
  const status = store?.gcalStatus
  if (!store?.gcalCalendars?.length || !status) return null
  const warn = status.failures.length > 0
  const text = status.refreshing && !status.lastOkAt ? 'A atualizar o Google…'
    : warn ? 'O Google não atualizou'
    : status.lastOkAt ? `Google atualizado ${syncTime(status.lastOkAt)}` : 'Google por atualizar'
  return <p className={`sync-note${warn ? ' warn' : ''} ${className}`.trim()}><i aria-hidden="true" />{text}</p>
}
