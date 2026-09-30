import { useEffect, useState } from 'react'
import { Button, StatusBadge } from '../../ui'
import { useStore } from '../../store.jsx'
import { openSheet } from '../../router.js'
import { projectVars } from '../../color.js'
import { fmtMoney } from '../../format.js'

const money = (n) => fmtMoney(n, { cents: 'auto' })
const hm = (t) => (t ? String(t).slice(0, 5) : '')
const pad = (n) => String(n).padStart(2, '0')
const clock = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }

// hora atual (HH:MM), revista a cada 30 s: o "Recebi" aparece quando o evento começa
export function useClock() {
  const [now, setNow] = useState(clock)
  useEffect(() => {
    const id = setInterval(() => setNow(clock()), 30 * 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

const STATE_PHRASE = {
  paid: () => 'recebido',
  partial: (m) => `sinal recebido, falta ${m}`,
  'partial-overdue': (m) => `em atraso, falta ${m}`,
  overdue: () => 'em atraso',
  due: () => 'por receber',
}

// Cartão de um evento de hoje — "bilhete leve" (spec §9.10): canhoto com a hora, faixa e lavagem
// da cor do projeto, estado sempre visível e "Recebi X €" só depois de o evento começar.
// Com ação, o cartão é um <div> com um botão esticado por baixo (nunca botões dentro de botões).
export default function TodayCard({ ev, compact = false, now }) {
  const { today, projectById, eventState, missing, receiveRemaining, notifyError } = useStore()
  const p = projectById(ev.project_id)
  const t = hm(ev.start_time)
  const st = eventState(ev)
  const mis = missing(ev)
  const started = ev.event_date < today || !t || t <= now
  const canReceive = mis > 0.005 && started
  const note = !compact && ev.notes ? String(ev.notes).split('\n')[0].trim() : ''
  const where = [p?.name, ev.location, note].filter(Boolean).join(' · ')
  const label = [ev.title, 'hoje', t || 'sem hora', p?.name, ev.location, money(ev.value), STATE_PHRASE[st](money(mis))]
    .filter(Boolean).join(', ')

  const open = () => openSheet('evento', ev.id)
  const receive = async () => {
    try { await receiveRemaining(ev) } catch (ex) { notifyError(ex) }
  }
  const pv = { 'data-p': '', style: projectVars(p?.color || '#929292') }
  const cls = ['today-card', compact && 'compact'].filter(Boolean).join(' ')
  const hide = canReceive ? { 'aria-hidden': true } : {}

  const content = (
    <>
      <span className={`time${t ? '' : ' none'}`} {...hide}>{t || 's/ hora'}</span>
      <span className="body">
        <span className="top" {...hide}>
          <span className="name">{ev.title}</span>
          <span className="money">{money(ev.value)}</span>
        </span>
        {where && <span className="where" {...hide}>{where}</span>}
        <span className="foot">
          <span className="ag-tc-state" {...hide}><StatusBadge ev={ev} always /></span>
          {canReceive && (
            <Button variant="row" icon="check" iconTone="ok" onClick={receive}
              aria-label={`Recebi ${money(mis)} de ${ev.title}`}>
              Recebi {money(mis)}
            </Button>
          )}
        </span>
      </span>
    </>
  )

  if (canReceive) {
    return (
      <div className={cls} {...pv}>
        <button type="button" className="ag-tc-open" aria-label={label} onClick={open} />
        {content}
      </div>
    )
  }
  return (
    <button type="button" className={cls} {...pv} aria-label={label} onClick={open}>
      {content}
    </button>
  )
}
