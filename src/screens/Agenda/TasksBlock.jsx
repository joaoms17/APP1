import { Card, Icon, Skeleton, TaskRow } from '../../ui'
import { useStore } from '../../store.jsx'
import { navigate, routeHref } from '../../router.js'
import { fmtMoney, MONTHS_ABBR } from '../../format.js'

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`

// "A tratar" (spec §9.10): Em atraso · Por registar do Google. Os recibos não entram: por omissão
// os eventos não levam recibo.
// Cada linha esconde-se a 0 e abre Receber no separador certo; tudo a 0 → "Tudo em dia".
export default function TasksBlock() {
  const { receivables, googlePending, valuePending, gcalGone, loadingPhases, gcalStatus } = useStore()
  const late = receivables.overdue.length
  const gPast = googlePending.past.length
  const gNext = googlePending.upcoming.length
  const vPast = valuePending.past.filter((e) => !gcalGone.has(e.id)).length
  const gone = gcalGone.size

  const link = (to) => ({
    href: routeHref(to),
    onClick: (e) => { e.preventDefault(); navigate(to) },
  })

  if (!late && !gPast && !gNext && !vPast && !gone) {
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
  // "desde jul 2025" nunca se parte ao meio (com pouca largura passa inteiro para a linha de baixo)
  const since = oldest ? ` · desde\u00a0${MONTHS_ABBR[Number(oldest.slice(5, 7)) - 1]}\u00a0${oldest.slice(0, 4)}` : ''
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
      {gone > 0 && (
        <TaskRow tone="late" icon="gcal" title="Já não estão no Google" sub="apagados no Google · Apagar ou Manter"
          count={gone} {...link('#/receber/google')} />
      )}
      {vPast > 0 && (
        <TaskRow tone="gcal" icon="euro" title="Valor pendente" sub={`${count(vPast, 'evento já realizado', 'eventos já realizados')} sem valor`}
          count={vPast} {...link('#/receber/google')} />
      )}
      {gPast + gNext > 0 && (
        <TaskRow tone="gcal" icon="gcal" title="Por registar do Google" sub={gSub} count={gPast + gNext}
          {...link('#/receber/google')} />
      )}
    </Card>
  )
}
