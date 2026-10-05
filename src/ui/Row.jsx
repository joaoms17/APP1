import Icon from './Icon.jsx'
import Button from './Button.jsx'
import StatusBadge, { Badge, ReceiptMark } from './StatusBadge.jsx'
import { categoryIcon } from './icons.js'
import { projectVars } from '../color.js'
import { useStore } from '../store.jsx'
import { openSheet } from '../router.js'
import { fmtMoney, fmtDay, fmtDM, relDay, weekdayOf, WEEKDAYS_ABBR, MONTHS_ABBR } from '../format.js'
import './components.css'

// Linhas "assentes no papel" (spec §9.8). Sem ação de linha: a linha inteira é um <button>.
// Com ação ("Recebi", "Emitido", "Registar"): <div class="row"> com um botão esticado por baixo
// (.row-open, nome acessível completo) e a ação por cima — nunca botões dentro de botões.

const money = (n, cents = 'auto') => fmtMoney(n, { cents })
const hm = (t) => (t ? String(t).slice(0, 5) : '')
const pvOf = (color) => ({ 'data-p': '', style: projectVars(color || '#929292') })
const cx = (...xs) => xs.filter(Boolean).join(' ')

function Lead({ kind, ymd, time, today, hidden }) {
  const h = hidden ? { 'aria-hidden': true } : {}
  if (kind === 'time') {
    return <span className="lead" {...h}>{time ? <span className="t">{time}</span> : <span className="t none">s/ hora</span>}</span>
  }
  const d = Number(ymd.slice(8, 10))
  if (kind === 'month') {
    const y = ymd.slice(0, 4) !== today.slice(0, 4) ? ` ${ymd.slice(2, 4)}` : ''
    return <span className="lead" {...h}><span className="d">{d}</span><span className="w">{MONTHS_ABBR[Number(ymd.slice(5, 7)) - 1]}{y}</span></span>
  }
  return <span className="lead" {...h}><span className="d">{d}</span><span className="w">{WEEKDAYS_ABBR[weekdayOf(ymd)]}</span></span>
}

// "hoje quarta 30 de setembro" · "sábado 3 de outubro" · "12 de julho de 2025"
export function datePhrase(ymd, today) {
  const rel = relDay(ymd, today)
  const y = ymd.slice(0, 4) !== today.slice(0, 4)
  const d = fmtDay(ymd, { weekday: 'day', month: 'long', year: y }).replace(',', '')
  return rel && ['Hoje', 'Amanhã', 'Ontem'].includes(rel) ? `${rel.toLowerCase()} ${d}` : d
}

// estado por extenso para os nomes acessíveis (linhas, cartão de hoje)
export const STATE_PHRASE = {
  novalue: () => 'valor pendente',
  paid: () => 'recebido',
  partial: (m) => `sinal recebido, falta ${m}`,
  'partial-overdue': (m) => `em atraso, falta ${m}`,
  overdue: () => 'em atraso',
  due: () => 'por receber',
}

// ---------- evento ---------------------------------------------------------------
// lead: 'date' | 'time' | 'month' · end: 'value' | 'missing' | 'recebi'
export function EventRow({
  ev, lead = 'date', blank = false, end = 'value', hideProject = false, meta, marks = true,
  flash = false, onOpen, onAction, className = '', ...rest
}) {
  const store = useStore()
  const { today, projectById, eventState, missing, attachmentsFor, receiveRemaining } = store
  const p = projectById(ev.project_id)
  const t = hm(ev.start_time)
  const st = eventState(ev)
  const mis = missing(ev)
  const hasAtt = marks && attachmentsFor('event', ev.id).length > 0

  const metaNode = meta ?? [lead !== 'time' && t ? <b key="t">{t}</b> : null, hideProject ? null : p?.name, ev.location]
    .filter(Boolean).reduce((acc, x, i) => (i ? [...acc, ' · ', x] : [x]), [])

  const showsMissing = end === 'missing' || end === 'recebi'
  const receiptWord = ev.receipt_issued ? 'recibo emitido' : null
  const label = [
    ev.title, datePhrase(ev.event_date, today), t, p?.name, ev.location,
    showsMissing ? null : money(ev.value),
    STATE_PHRASE[st](money(mis)) + (showsMissing && (st === 'overdue' || st === 'due') ? `, falta ${money(mis)}` : ''),
    marks ? receiptWord : null, hasAtt ? 'tem anexo' : null,
    store.gcalGone?.has(ev.id) ? 'já não está no Google' : null,
  ].filter(Boolean).join(', ')

  const open = () => (onOpen ? onOpen(ev) : openSheet('evento', ev.id))
  const act = () => {
    if (onAction) return onAction(ev)
    if (end === 'recebi') return receiveRemaining(ev)
  }

  // a 3.ª linha só existe quando há algo a assinalar (mesmas regras do StatusBadge/ReceiptMark)
  const badgeShown = end === 'value' && (st === 'paid' ? ev.event_date >= today : st !== 'due')
  const receiptShown = marks && !!ev.receipt_issued
  const locPending = marks && !ev.location?.trim()
  const gone = !!store.gcalGone?.has(ev.id) // já não está no Google
  const hasTags = badgeShown || receiptShown || hasAtt || locPending || gone
  const tags = (
    <>
      {badgeShown && <StatusBadge ev={ev} />}
      {gone && <Badge tone="overdue" icon="gcal">Já não está no Google</Badge>}
      {locPending && <Badge tone="neutral">Local pendente</Badge>}
      {receiptShown && <ReceiptMark ev={ev} />}
      {hasAtt && <span className="mark"><Icon name="paperclip" /><span className="sr-only">tem anexo</span></span>}
    </>
  )
  // com ação de linha, o texto visível repete o nome do botão esticado: fica escondido dos leitores de ecrã
  const withAction = end === 'recebi'
  const cls = cx('row', withAction && 'act', ev.event_date === today && lead === 'date' && 'today', blank && 'blank', flash && 'flash', className)
  const content = (
    <>
      <span className="bar" />
      <Lead kind={lead} ymd={ev.event_date} time={t} today={today} hidden={withAction} />
      <span className="main" aria-hidden={withAction || undefined}>
        <span className="title">{ev.title}</span>
        <span className="meta">{metaNode}</span>
        {hasTags && <span className="tags">{tags}</span>}
      </span>
    </>
  )

  if (withAction) {
    return (
      <div className={cls} {...pvOf(p?.color)} {...rest}>
        <button type="button" className="row-open" aria-label={label} onClick={open} />
        {content}
        <span className="end">
          <span className="money" aria-hidden="true">{money(mis)}</span>
          <Button variant="row" icon="check" iconTone="ok" onClick={act} aria-label={`Recebi ${money(mis)} de ${ev.title}`}>
            Recebi
          </Button>
        </span>
      </div>
    )
  }
  return (
    <button type="button" className={cls} {...pvOf(p?.color)} {...rest} aria-label={label} onClick={open}>
      {content}
      <span className="end"><span className="money">{st === 'novalue' ? '—' : money(end === 'missing' ? mis : ev.value)}</span></span>
    </button>
  )
}

// ---------- evento do Google por registar ----------------------------------------------
export function GoogleRow({ g, lead = 'date', blank = false, onRegister, className = '', ...rest }) {
  const { today, projectById, ignoreGoogle } = useStore()
  const p = projectById(g.project_id)
  const meta = [lead !== 'time' && g.time ? <b key="t">{g.time}</b> : null, p?.name, g.location]
    .filter(Boolean).reduce((acc, x, i) => (i ? [...acc, ' · ', x] : [x]), [])
  const register = () => (onRegister ? onRegister(g) : openSheet('registar', { key: g.key }))
  return (
    <div className={cx('row g act', blank && 'blank', className)} {...pvOf(p?.color)} {...rest}>
      {/* a linha toda regista (alvo de toque); para o teclado e leitores de ecrã basta o botão "Registar" */}
      <button type="button" className="row-open" tabIndex={-1} aria-hidden="true" onClick={register} />
      <span className="bar" />
      <Lead kind={lead} ymd={g.date} time={g.time} today={today} />
      <span className="main">
        <span className="title">{g.title}</span>
        <span className="meta">{meta}</span>
        <span className="tags"><span className="mark"><Icon name="gcal" />Google · por registar</span></span>
      </span>
      <span className="end">
        <span className="g-acts">
          <Button variant="row" icon="eyeOff" onClick={() => ignoreGoogle(g)}
            aria-label={`Ignorar ${g.title}, ${datePhrase(g.date, today)} — não é trabalho`}>
            Ignorar
          </Button>
          <Button variant="row" icon="plus" iconTone="add" onClick={register}
            aria-label={`Registar ${g.title}, ${datePhrase(g.date, today)}${g.time ? `, ${g.time}` : ''}`}>
            Registar
          </Button>
        </span>
      </span>
    </div>
  )
}

// ---------- despesa ---------------------------------------------------------------------
export function ExpenseRow({ ex, onOpen, className = '' }) {
  const { projectById, attachmentsFor } = useStore()
  const p = ex.project_id ? projectById(ex.project_id) : null
  const hasAtt = attachmentsFor('expense', ex.id).length > 0
  const value = money(ex.amount, 'always')
  const minus = Number(ex.amount) ? '−' : '' // 0 € sem sinal (só pode vir da v1)
  const label = [ex.description, fmtDay(ex.expense_date, { weekday: null, month: 'long' }), p ? p.name : 'Geral',
    ex.category, minus ? `menos ${value}` : value, hasAtt ? 'talão anexado' : null].filter(Boolean).join(', ')
  return (
    <button type="button" className={cx('row x', className)} {...(p ? pvOf(p.color) : {})} aria-label={label}
      onClick={() => (onOpen ? onOpen(ex) : openSheet('despesa', ex.id))}>
      <span className="bar" />
      <span className="lead"><span className="ico"><Icon name={categoryIcon(ex.category)} /></span></span>
      <span className="main">
        <span className="title">{ex.description}</span>
        <span className="meta">
          <b>{fmtDM(ex.expense_date)}</b> · {p ? <><span className="dot" aria-hidden="true" />{p.name}</> : 'Geral'}
          {ex.category ? ` · ${ex.category}` : ''}
        </span>
      </span>
      <span className="end">
        <span className="money">{minus}{value}</span>
        {hasAtt && <span className="mark"><Icon name="paperclip" /><span className="sr-only">talão anexado</span></span>}
      </span>
    </button>
  )
}

// ---------- definições ---------------------------------------------------------------------
// avatar: nó (ex.: <ProjectAvatar/>); value: texto ou nó (ex.: IconButton — então sem onClick/href)
export function SettingsRow({ icon, avatar, title, sub, value, chevron, danger, onClick, href, className = '', ...rest }) {
  const Tag = href ? 'a' : onClick ? 'button' : 'div'
  const showChev = chevron ?? !!(href || onClick)
  return (
    <Tag className={cx('srow', danger && 'danger', className)} href={href} type={Tag === 'button' ? 'button' : undefined}
      onClick={onClick} {...rest}>
      {avatar ?? (icon ? <span className="s-ic"><Icon name={icon} /></span> : <span />)}
      <span><b>{title}</b>{sub && <small>{sub}</small>}</span>
      {value != null ? <span className="v">{value}</span> : <span />}
      {showChev ? <Icon name="chevR" className="chev" /> : <span />}
    </Tag>
  )
}

// ---------- "A tratar" -------------------------------------------------------------------------
// tone: late | gcal | rcpt · value (texto, vermelho em late) ou count (pílula)
export function TaskRow({ tone, icon, title, sub, value, count, onClick, href, className = '' }) {
  const Tag = href ? 'a' : 'button'
  return (
    <Tag className={cx('task', className)} href={href} type={Tag === 'button' ? 'button' : undefined} onClick={onClick}>
      <span className={cx('ic', tone)}><Icon name={icon} /></span>
      <span><b>{title}</b>{sub && <small>{sub}</small>}</span>
      {value != null ? <span className={cx('val', tone === 'late' && 'late')}>{value}</span>
        : count != null ? <span className="count">{count}</span> : <span />}
      <Icon name="chevR" className="chev" />
    </Tag>
  )
}

export default EventRow
