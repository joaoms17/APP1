import { Card, Segmented, TEXT_SCALES, TopBar, useLocalPref } from '../../ui'
import { useStore } from '../../store.jsx'
import { projectVars } from '../../color.js'
import { fmtMoney, WEEKDAYS_ABBR, weekdayOf } from '../../format.js'

// Definições › Tamanho do texto (rota #/definicoes/texto): Normal · Grande · Muito grande.
// Compensa o bloqueio do zoom (spec §5): escreve --text-scale em :root e fica guardado
// (useLocalPref('texto') → localStorage joana.v2.texto), por isso sobrevive a recarregar.

export const TEXT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'grande', label: 'Grande' },
  { value: 'muito-grande', label: 'Muito grande' },
]

// valor guardado → chave (versões antigas podiam guardar um número)
export function textKey(value) {
  if (typeof value !== 'number') return TEXT_SCALES[value] ? value : 'normal'
  return Object.keys(TEXT_SCALES).reduce((a, k) => (Math.abs(TEXT_SCALES[k] - value) < Math.abs(TEXT_SCALES[a] - value) ? k : a), 'normal')
}
export const textLabel = (value) => TEXT_OPTIONS.find((o) => o.value === textKey(value)).label

// linha de evento de exemplo (o próximo evento da agenda), só para ver o tamanho
function PreviewRow() {
  const { eventsAsc, today, projectById } = useStore()
  const ev = eventsAsc.find((e) => e.event_date >= today)
  const p = ev ? projectById(ev.project_id) : null
  const sample = ev
    ? { date: ev.event_date, title: ev.title, time: ev.start_time ? String(ev.start_time).slice(0, 5) : '', where: [p?.name, ev.location], value: ev.value, color: p?.color }
    : { date: today, title: 'Noiva Madalena Reis', time: '09:00', where: ['Cabelos', 'Silves'], value: 480, color: '#d46a8f' }
  const meta = [sample.time && <b key="t">{sample.time}</b>, ...sample.where].filter(Boolean)
    .reduce((acc, x, i) => (i ? [...acc, ' · ', x] : [x]), [])
  return (
    <div className="row st-preview-row" data-p="" style={projectVars(sample.color)}>
      <span className="bar" />
      <span className="lead">
        <span className="d">{Number(sample.date.slice(8, 10))}</span>
        <span className="w">{WEEKDAYS_ABBR[weekdayOf(sample.date)]}</span>
      </span>
      <span className="main">
        <span className="title">{sample.title}</span>
        <span className="meta">{meta}</span>
      </span>
      <span className="end"><span className="money">{fmtMoney(sample.value, { cents: 'auto' })}</span></span>
    </div>
  )
}

export default function TextSize() {
  const [value, setValue] = useLocalPref('texto', 'normal')
  return (
    <div className="st-screen">
      <TopBar kicker="Preferências" title="Tamanho do texto" avatar={false} back={{ label: 'Definições', to: '#/definicoes' }} />
      <div className="st-body">
        <Card pad className="st-text">
          <Segmented label="Tamanho do texto" value={textKey(value)} onChange={setValue} options={TEXT_OPTIONS} />
          <p className="st-help">Muda o texto de toda a app e fica guardado neste aparelho. No iPhone, soma-se ao tamanho de texto escolhido nas definições do sistema.</p>
        </Card>
        <section className="st-sec" aria-labelledby="st-prev">
          <header><h2 id="st-prev">Pré-visualização</h2></header>
          <div className="card st-preview">
            <PreviewRow />
          </div>
        </section>
      </div>
    </div>
  )
}
