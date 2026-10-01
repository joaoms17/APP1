import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button, StatusBadge, STATE_PHRASE, useTapSettle } from '../../ui'
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

// Cartão de um evento de hoje — "bilhete leve" (spec §9.10): canhoto com a hora, faixa e lavagem
// da cor do projeto, estado sempre visível e "Recebi X €" só depois de o evento começar.
// Com ação, o cartão é um <div> com um botão esticado por baixo (nunca botões dentro de botões).
export default function TodayCard({ ev, compact = false, now, flash = false, className = '' }) {
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

  // o "Recebi" sai quando fica tudo recebido e o cartão inteiro passa a abrir o Detalhe: o 2.º toque de um
  // toque duplo no "Recebi" não o abre (R1-35)
  const recv = useTapSettle()
  const open = () => { if (!recv.settling()) openSheet('evento', ev.id) }

  // "Recebi" com o foco no botão (teclado, ou rato/toque quando o browser foca o botão): o botão sai quando o evento
  // fica pago e a raiz do cartão passa de <div> a <button> — o foco passa para o próprio cartão em vez de
  // cair no <body>, longe de tudo (R1-31). Se a gravação falhar ou for anulada (o "Recebi" volta), o foco
  // volta ao "Recebi". Só quando o foco se perdeu: nunca o tira de onde a pessoa entretanto o pôs.
  const root = useRef(null)
  const recebi = useRef(null)
  const keep = useRef(null) // { done } enquanto o cartão segura o foco do "Recebi"
  useLayoutEffect(() => {
    const k = keep.current
    if (!k) return
    if (k.done) keep.current = null
    const a = document.activeElement
    if (a && a !== document.body) return
    const target = canReceive ? recebi.current : root.current
    target?.focus({ preventScroll: true })
  }, [canReceive])
  const receive = async (e) => {
    recv.mark()
    const k = e.currentTarget === document.activeElement ? { done: false } : null
    keep.current = k
    try { await receiveRemaining(ev) } catch (ex) { notifyError(ex) }
    if (k) k.done = true
  }
  const pv = { 'data-p': '', style: projectVars(p?.color || '#929292') }
  const cls = ['today-card', compact && 'compact', flash && 'flash', className].filter(Boolean).join(' ')
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
            <Button ref={recebi} variant="row" icon="check" iconTone="ok" onClick={receive}
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
      <div ref={root} className={cls} {...pv}>
        <button type="button" className="row-open" aria-label={label} onClick={open} />
        {content}
      </div>
    )
  }
  return (
    <button ref={root} type="button" className={cls} {...pv} aria-label={label} onClick={open}>
      {content}
    </button>
  )
}
