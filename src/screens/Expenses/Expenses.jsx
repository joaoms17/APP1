import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button, Card, Chip, ChipRow, EmptyState, ExpenseRow, GroupHeader, HeroNumber, IconButton, SearchInput,
  Skeleton, TopBar, categoryIcon,
} from '../../ui'
import { useStore } from '../../store.jsx'
import { openSheet, setParams, useRoute } from '../../router.js'
import { MONTHS_LONG, cap, fmtMoney, foldText } from '../../format.js'
import './Expenses.css'

// Despesas (spec §10.12): total do ano, chips de categoria (?cat=), pesquisa por descrição e
// categoria (?q=), grupos por mês com "−X €". Câmara no topo → folha Nova despesa com o talão.

export const DEFAULT_CATEGORIES = ['Deslocações', 'Material', 'Equipamento', 'Formação', 'Imagem']

const neg = (n, cents = 'always') => fmtMoney(-Math.abs(Number(n) || 0), { cents })
const sum = (xs) => Math.round(xs.reduce((a, x) => a + (Number(x.amount) || 0), 0) * 100) / 100
const byDateDesc = (a, b) => (a.expense_date < b.expense_date ? 1 : a.expense_date > b.expense_date ? -1 : 0)

// linhas novas, editadas ou repostas pelo Anular piscam 1,2 s (spec §12)
const signature = (x) => [x.description, x.amount, x.expense_date, x.project_id, x.category].join('|')
function useFlashChanged(rows, ready) {
  const seen = useRef(null) // id → assinatura da última lista vista
  const [flash, setFlash] = useState(() => new Set())
  useEffect(() => {
    if (!ready) return
    const prev = seen.current
    seen.current = new Map(rows.map((x) => [x.id, signature(x)]))
    if (!prev) return
    const fresh = rows.filter((x) => prev.get(x.id) !== signature(x)).map((x) => x.id)
    if (!fresh.length) return
    setFlash((s) => new Set([...s, ...fresh]))
    setTimeout(() => setFlash((s) => {
      const n = new Set(s)
      fresh.forEach((id) => n.delete(id))
      return n
    }), 1300)
  }, [rows, ready])
  return flash
}

export default function Expenses() {
  const route = useRoute()
  const { expenses, expenseCategories, today, loadingPhases } = useStore()
  const cam = useRef(null)
  // separador escondido: mantém os filtros da última visita
  const paramsRef = useRef({})
  if (route.tab === 'despesas') paramsRef.current = route.params
  const params = paramsRef.current
  const searching = 'q' in params
  const q = params.q || ''
  const cat = params.cat || null
  const loading = loadingPhases.phase2
  const flash = useFlashChanged(expenses, !loading)

  const year = Number(today.slice(0, 4))
  const term = foldText(q).trim()
  const catKey = cat ? foldText(cat) : null

  const cats = useMemo(() => {
    const out = [...DEFAULT_CATEGORIES]
    const has = (c) => out.some((x) => foldText(x) === foldText(c))
    for (const c of expenseCategories) if (!has(c)) out.push(c)
    if (cat && !has(cat)) out.push(cat)
    return out
  }, [expenseCategories, cat])

  const { rows, groups } = useMemo(() => {
    const rows = expenses
      .filter((x) => (!catKey || foldText(x.category) === catKey)
        && (!term || foldText(x.description).includes(term) || foldText(x.category).includes(term)))
      .sort(byDateDesc)
    const groups = []
    for (const x of rows) {
      const k = x.expense_date.slice(0, 7)
      let g = groups[groups.length - 1]
      if (!g || g.key !== k) groups.push(g = { key: k, items: [] })
      g.items.push(x)
    }
    return { rows, groups }
  }, [expenses, catKey, term])

  const filtered = !!(catKey || term)
  const inYear = (y) => rows.filter((x) => Number(x.expense_date.slice(0, 4)) === y)
  // com filtro, a lista mostra todas as datas: se nada é deste ano, a capa mostra o ano mais recente encontrado
  const latest = rows.length ? Number(rows[0].expense_date.slice(0, 4)) : year
  const shown = filtered && latest < year ? latest : year
  const total = sum(inYear(shown))
  const prev = sum(inYear(shown - 1))
  // meses do ano até hoje (o atual conta: as despesas dele estão no total); anos anteriores: 12
  const months = shown === year ? Number(today.slice(5, 7)) : 12
  const noneThisYear = !filtered && !expenses.some((x) => Number(x.expense_date.slice(0, 4)) === year)

  const takePhoto = () => cam.current?.click()
  const onPhoto = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) openSheet('novo', { kind: 'despesa', files: [file] })
  }
  const newExpense = () => openSheet('novo', { kind: 'despesa' })
  const exitSearch = () => setParams({ q: null })
  const clearAll = () => setParams({ q: searching ? '' : null, cat: null })

  const label = filtered
    ? `${[cat, term ? `“${q.trim()}”` : null].filter(Boolean).join(' · ')} em ${shown}`
    : `Total de ${year}`

  const head = searching ? (
    <div className="ex-search-bar">
      <h1 className="sr-only">Procurar despesas</h1>
      <SearchInput value={q} onChange={(v) => setParams({ q: v })} label="Pesquisar despesas" autoFocus
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); if (q) setParams({ q: '' }); else exitSearch() } }} />
      <Button variant="quiet" onClick={exitSearch}>Cancelar</Button>
    </div>
  ) : (
    <TopBar kicker="Custos do trabalho" title="Despesas" actions={
      <>
        <IconButton icon="camera" label="Nova despesa com foto do talão" onClick={takePhoto} />
        <IconButton icon="search" label="Procurar despesas" onClick={() => setParams({ q: '' })} />
      </>
    } />
  )

  return (
    <div className="ex-screen">
      {head}
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />

      {loading ? <Skeleton lines={4} label="A carregar as despesas" /> : (
        <>
          {noneThisYear ? (
            <EmptyState icon="wallet" title={`Ainda não há despesas em ${year}`}
              text="Gasolina, material, formação… fica tudo aqui, com o talão."
              action={(
                <div className="ex-empty-acts">
                  <Button variant="primary" icon="camera" onClick={takePhoto}>Fotografar talão</Button>
                  <Button variant="secondary" icon="plus" onClick={newExpense}>Nova despesa</Button>
                </div>
              )} />
          ) : rows.length > 0 && (
            <Card as="section" className="hero ex-hero" aria-label={label}>
              <div>
                <div className="label">{label}</div>
                <HeroNumber value={total} negative />
              </div>
              {(total > 0 || prev > 0) && (
                <div className="side">
                  {total > 0 && <span>média <b>{neg(total / months, 'never')}</b>/mês</span>}
                  {prev > 0 && <span>{shown - 1}: {neg(prev, 'never')}</span>}
                </div>
              )}
            </Card>
          )}

          {expenses.length > 0 && (
            <ChipRow label="Filtrar por categoria" className="ex-cats">
              <Chip selected={!cat} onClick={() => setParams({ cat: null })}>Todas</Chip>
              {cats.map((c) => (
                <Chip key={c} icon={categoryIcon(c)} selected={catKey === foldText(c)}
                  onClick={() => setParams({ cat: catKey === foldText(c) ? null : c })}>{c}</Chip>
              ))}
            </ChipRow>
          )}

          {filtered && !rows.length && (
            <EmptyState icon="search"
              title={term ? `Nada encontrado para “${q.trim()}”` : `Sem despesas de ${cat}`}
              text={term ? `Procurei na descrição e na categoria${cat ? `, só em ${cat}` : ''}, em todas as datas.`
                : 'Ainda não registaste nenhuma despesa nesta categoria.'}
              action={<Button variant="secondary" onClick={clearAll}>{term ? 'Limpar pesquisa' : 'Ver todas'}</Button>} />
          )}

          {groups.map((g, i) => {
            const y = g.key.slice(0, 4)
            return (
              <section key={g.key} className="ex-group" aria-labelledby={`ex-${g.key}`}>
                <GroupHeader id={`ex-${g.key}`} first={i === 0} title={cap(MONTHS_LONG[Number(g.key.slice(5, 7)) - 1])}
                  small={Number(y) !== year ? y : undefined} summary={<b>{neg(sum(g.items))}</b>} />
                <div className="list">
                  {g.items.map((x) => <ExpenseRow key={x.id} ex={x} className={flash.has(x.id) ? 'flash' : ''} />)}
                </div>
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}
