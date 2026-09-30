import { useMemo } from 'react'
import { Button, Card, Chip, ChipRow, EmptyState, GroupHeader, SearchInput, eventsSummary } from '../../ui'
import { useStore } from '../../store.jsx'
import { setParams } from '../../router.js'
import { fmtMoney } from '../../format.js'
import { eventMatches, googleMatches, isProjectActive } from '../../selectors.js'
import { ItemRows, mergeItems, monthName, useProgressive } from './AgendaList.jsx'

// Procurar e filtrar — modo da Lista (spec §10.4). Estado na rota:
//   #/agenda/lista?q=<texto>&quando=anteriores|proximos&estado=atraso|sinal|semrecibo|porreceber|recebidos&p=<projeto>
// Pesquisa sem acentos em título, local e notas, em todas as datas, e também nos pendentes do Google.

const QUANDO = { anteriores: 'anteriores', passados: 'anteriores', proximos: 'proximos', 'próximos': 'proximos', futuros: 'proximos' }
const ESTADO = {
  atraso: 'atraso', 'em-atraso': 'atraso', sinal: 'sinal', semrecibo: 'semrecibo', 'sem-recibo': 'semrecibo',
  porreceber: 'porreceber', 'por-receber': 'porreceber', recebidos: 'recebidos', recebido: 'recebidos',
}
const ESTADO_WORD = { atraso: 'em atraso', sinal: 'com sinal', semrecibo: 'sem recibo', porreceber: 'por receber', recebidos: 'recebidos' }
const WHEN_TEXT = { anteriores: 'antes de hoje', proximos: 'de hoje em diante' }

const money = (n, cents = 'auto') => fmtMoney(n, { cents })

export default function SearchMode({ params, onExit }) {
  const {
    today, events, googleMatch, projects, projectById, eventState, missing, needsReceipt,
    receivables, receiptsToIssue, summary,
  } = useStore()
  const q = params.q || ''
  const term = q.trim()
  const quando = QUANDO[params.quando] || null
  const estado = ESTADO[params.estado] || null
  const proj = params.p ? projectById(params.p) || null : null
  const year = Number(today.slice(0, 4))

  // projetos: ativos primeiro (pela ordem), inativos no fim
  const projList = useMemo(() => projects.slice().sort((a, b) =>
    (isProjectActive(b, year) - isProjectActive(a, year)) || (a.sort_order ?? 0) - (b.sort_order ?? 0)), [projects, year])

  const result = useMemo(() => {
    const tests = {
      atraso: (ev) => ['overdue', 'partial-overdue'].includes(eventState(ev)),
      sinal: (ev) => ['partial', 'partial-overdue'].includes(eventState(ev)),
      semrecibo: (ev) => needsReceipt(ev),
      porreceber: (ev) => eventState(ev) !== 'paid',
      recebidos: (ev) => eventState(ev) === 'paid',
    }
    const when = (d) => (quando === 'anteriores' ? d < today : quando === 'proximos' ? d >= today : true)
    const evs = events.filter((ev) => when(ev.event_date) && (!proj || ev.project_id === proj.id)
      && (!estado || tests[estado](ev)) && eventMatches(ev, term))
    // o Google não tem estado de pagamento: só entra sem filtro de estado
    const gs = estado ? [] : googleMatch.pending.filter((g) => when(g.date) && (!proj || g.project_id === proj.id) && googleMatches(g, term))
    const items = mergeItems(evs, gs, quando !== 'proximos') // mais recentes primeiro; "Próximos" por ordem
    const groups = []
    for (const it of items) {
      const key = it.date.slice(0, 7)
      let g = groups[groups.length - 1]
      if (!g || g.key !== key) groups.push(g = { key, items: [], evs: [], gs: 0 })
      g.items.push(it)
      if (it.ev) g.evs.push(it.ev); else g.gs++
    }
    return { evs, gs, groups }
  }, [events, googleMatch, today, term, quando, estado, proj, eventState, needsReceipt])

  const filtered = !!(term || quando || estado || proj)
  const resetKey = [term, quando, estado, proj?.id].join('|')
  const [shown, sentinel] = useProgressive(result.groups.length, 6, resetKey)
  const s = summary(result.evs)
  const n = result.evs.length
  const found = n + result.gs.length > 0
  const whenText = WHEN_TEXT[quando] || 'em todas as datas'

  const toggle = (key, value, cur) => setParams({ [key]: cur === value ? null : value })
  const clearAll = () => setParams({ q: '', quando: null, estado: null, p: null })
  // Esc: no campo com texto limpa o texto; de resto (campo vazio, chips, resultados) sai do Procurar
  const onKeyDown = (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return
    e.preventDefault()
    if (q && e.target.type === 'search') setParams({ q: '' }); else onExit()
  }

  return (
    <div className="ag-search" onKeyDown={onKeyDown}>
      <h1 className="sr-only">Procurar eventos</h1>
      <div className="ag-search-bar">
        <SearchInput value={q} onChange={(v) => setParams({ q: v })} label="Pesquisar eventos" autoFocus />
        <Button variant="quiet" onClick={onExit}>Cancelar</Button>
      </div>

      <div className="ag-filters">
        <ChipRow label="Filtrar por data e estado">
          <Chip selected={quando === 'anteriores'} onClick={() => toggle('quando', 'anteriores', quando)}>Anteriores</Chip>
          <Chip selected={quando === 'proximos'} onClick={() => toggle('quando', 'proximos', quando)}>Próximos</Chip>
          <span className="chip-sep" aria-hidden="true" />
          <Chip selected={estado === 'atraso'} count={receivables.overdue.length} onClick={() => toggle('estado', 'atraso', estado)}>Em atraso</Chip>
          <Chip selected={estado === 'sinal'} onClick={() => toggle('estado', 'sinal', estado)}>Sinal</Chip>
          <Chip selected={estado === 'semrecibo'} count={receiptsToIssue.length} onClick={() => toggle('estado', 'semrecibo', estado)}>Sem recibo</Chip>
          <Chip selected={estado === 'porreceber'} onClick={() => toggle('estado', 'porreceber', estado)}>Por receber</Chip>
          <Chip selected={estado === 'recebidos'} onClick={() => toggle('estado', 'recebidos', estado)}>Recebidos</Chip>
        </ChipRow>
        <ChipRow label="Filtrar por projeto">
          {projList.map((p) => (
            <Chip key={p.id} project={p} selected={proj?.id === p.id} onClick={() => toggle('p', p.id, proj?.id)}>{p.name}</Chip>
          ))}
        </ChipRow>
      </div>

      {filtered && found && (
        <Card className="ag-result">
          <p className="t" aria-live="polite">
            <b>{n ? `${n} ${n === 1 ? 'evento' : 'eventos'}` : 'Nenhum evento'}</b>
            {estado ? ` ${ESTADO_WORD[estado]}` : ''}
            {term ? <> com “{term}”</> : null}
            {proj ? ` de ${proj.name}` : ''}
            {` ${whenText}`}
            {n > 0 && <>{' · '}{money(s.total, 'never')}{' · '}
              {s.missing > 0.005 ? <span className="late">falta {money(s.missing)}</span> : 'tudo recebido'}</>}
            {result.gs.length > 0 && ` · ${result.gs.length} por registar`}
          </p>
          <Button variant="ghost" size="sm" onClick={clearAll}>Limpar</Button>
        </Card>
      )}

      {!found && (
        <EmptyState icon="search"
          title={term ? `Nada encontrado para “${term}”` : 'Nada encontrado com estes filtros'}
          text={term
            ? `Procurei no título, local e notas, ${whenText}${estado || proj ? ', com os filtros escolhidos' : ''}.`
            : 'Experimenta tirar um dos filtros.'}
          action={<Button variant="secondary" onClick={clearAll}>{term ? 'Limpar pesquisa' : 'Limpar filtros'}</Button>} />
      )}

      {result.groups.slice(0, shown).map((g, i) => (
        <div key={g.key} className="ag-group">
          <GroupHeader title={monthName(g.key)} small={g.key.slice(0, 4)} first={i === 0}
            summary={eventsSummary(g.evs, missing, g.gs)} />
          <div className="list"><ItemRows items={g.items} hideProject={!!proj} /></div>
        </div>
      ))}
      {shown < result.groups.length && <div ref={sentinel} className="ag-more" aria-hidden="true" />}
    </div>
  )
}
