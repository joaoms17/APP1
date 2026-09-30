import { Card, Icon, Skeleton, TaskRow } from '../../ui'
import { useStore } from '../../store.jsx'
import { navigate, routeHref } from '../../router.js'
import { fmtMoney, MONTHS_ABBR } from '../../format.js'

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`

// "A tratar" (spec §9.10): Em atraso · Por registar do Google · Recibos por emitir.
// Cada linha esconde-se a 0 e abre Receber no separador certo; tudo a 0 → "Tudo em dia".
export default function TasksBlock() {
  const { receivables, googlePending, receiptsToIssue, loadingPhases, gcalStatus } = useStore()
  const late = receivables.overdue.length
  const gPast = googlePending.past.length
  const gNext = googlePending.upcoming.length
  const rcpt = receiptsToIssue.length

  const link = (to) => ({
    href: routeHref(to),
    onClick: (e) => { e.preventDefault(); navigate(to) },
  })

  if (!late && !gPast && !gNext && !rcpt) {
    // o Google e os anexos chegam na 2.ª fase: não dizer "Tudo em dia" antes do tempo
    const waiting = loadingPhases.phase2 || gcalStatus.refreshing
    return (
      <Card className="tasks">
        {waiting
          ? <Skeleton lines={2} label="A ver o que há a tratar" className="ag-tasks-wait" />
          : <p className="all-clear"><Icon name="check" />Tudo em dia</p>}
      </Card>
    )
  }

  const oldest = receivables.oldestDate
  const since = oldest ? ` · desde ${MONTHS_ABBR[Number(oldest.slice(5, 7)) - 1]} ${oldest.slice(0, 4)}` : ''
  const gSub = [
    gPast ? `${gPast} já ${gPast === 1 ? 'aconteceu' : 'aconteceram'}` : null,
    gNext ? count(gNext, 'próximo', 'próximos') : null,
  ].filter(Boolean).join(' · ')

  return (
    <Card className="tasks">
      {late > 0 && (
        <TaskRow tone="late" icon="alert" title="Em atraso" sub={`${count(late, 'evento', 'eventos')}${since}`}
          value={fmtMoney(receivables.overdueTotal, { cents: 'auto' })} {...link('#/receber/atraso')} />
      )}
      {gPast + gNext > 0 && (
        <TaskRow tone="gcal" icon="gcal" title="Por registar do Google" sub={gSub} count={gPast + gNext}
          {...link('#/receber/google')} />
      )}
      {rcpt > 0 && (
        <TaskRow tone="rcpt" icon="receipt" title="Recibos por emitir" sub="Recebidos e sem recibo" count={rcpt}
          {...link('#/receber/recibos')} />
      )}
    </Card>
  )
}
