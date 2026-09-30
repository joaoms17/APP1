import { useId, useMemo, useRef, useState } from 'react'
import {
  Attachments, Button, Chip, ChipGroup, DateInput, EmptyState, Field, Icon, MoneyInput, NewKindSwitch,
  PendingAttachments, ProjectChips, Sheet, Skeleton, TextInput, categoryIcon, moneyInputValue, parseMoney,
} from '../../ui'
import { useStore } from '../../store.jsx'
import { openSheet } from '../../router.js'
import { fmtDM, fmtDMY, fmtDayShort, fmtMoney, foldText } from '../../format.js'
import { DEFAULT_CATEGORIES } from './Expenses.jsx'
import './Expenses.css'

// Folha da despesa (spec §10.12): mode 'new' (Novo › Despesa, com o talão em 1.º) | 'edit'.
// Só grava em Guardar; os anexos de uma despesa existente gravam logo (Attachments).
// preset (novo): { files, data } — o talão fotografado no topo de Despesas, o dia do Mês.

const EPS = 0.005
const BAD_MONEY = 'Escreve um valor válido, por exemplo 48,20.'
const money = (n) => fmtMoney(n, { cents: 'auto' })
const sameText = (a, b) => foldText(a).trim() === foldText(b).trim()

// "hoje, 30 set" · "ontem, 29 set" · "sáb, 12 set" · "sáb, 17 out 2025"
const dayFormat = (today) => (v) => {
  if (v === today) return `hoje, ${fmtDM(v)}`
  return fmtDayShort(v, { year: true }).replace(` ${today.slice(0, 4)}`, '')
}

function initialOf(mode, ex, preset, today) {
  if (mode === 'edit') {
    return {
      description: ex.description || '', amount: moneyInputValue(Number(ex.amount)), expense_date: ex.expense_date,
      project_id: ex.project_id || null, category: ex.category || '', files: [],
    }
  }
  const p = preset || {}
  return {
    description: p.description || '', amount: p.amount != null ? moneyInputValue(Number(p.amount)) : '',
    expense_date: p.data || p.expense_date || today, project_id: p.project_id || null, category: p.category || '',
    files: Array.isArray(p.files) ? p.files : [],
  }
}

// ---------- frase do "Descartar alterações?" (spec §10.9) ---------------------------------
const joinPt = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`)
const quoted = (s) => `“${s}”`
function change(label, from, to, fmt = (x) => x) {
  if (!from) return `Preencheste ${label} (${fmt(to)}).`
  if (!to) return `Apagaste ${label} (${fmt(from)}).`
  return `Mudaste ${label} de ${fmt(from)} para ${fmt(to)}.`
}

function changesOf(f, init, { projectName, today }) {
  const out = [] // [nome curto, frase]
  const day = (v) => (v.slice(0, 4) === today.slice(0, 4) ? fmtDM(v) : fmtDMY(v))
  const eur = (v) => (Number.isFinite(parseMoney(v)) ? money(parseMoney(v)) : v)
  const a = parseMoney(f.amount)
  const b = parseMoney(init.amount)
  const sameMoney = a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < EPS) || f.amount === init.amount
  if (f.description.trim() !== init.description.trim()) {
    out.push(['descrição', change('a descrição', init.description.trim(), f.description.trim(), quoted)])
  }
  if (!sameMoney) out.push(['valor', change('o valor', init.amount, f.amount, eur)])
  if (f.expense_date !== init.expense_date) out.push(['data', change('a data', init.expense_date, f.expense_date, day)])
  if ((f.project_id || null) !== (init.project_id || null)) {
    out.push(['projeto', `Mudaste o projeto de ${projectName(init.project_id)} para ${projectName(f.project_id)}.`])
  }
  if (f.category.trim() !== init.category.trim()) out.push(['categoria', change('a categoria', init.category.trim(), f.category.trim())])
  if (f.files.length !== init.files.length) {
    const n = f.files.length - init.files.length
    out.push(['anexos', n > 0 ? (n === 1 ? 'Juntaste um anexo.' : `Juntaste ${n} anexos.`) : 'Tiraste um anexo.'])
  }
  return out
}

function dirtyText(changes, mode) {
  if (!changes.length) return false
  if (changes.length === 1) return changes[0][1]
  const verb = mode === 'edit' ? 'Mudaste' : 'Preencheste'
  return `${verb} ${changes.length} campos (${joinPt(changes.map((c) => c[0]))}).`
}

// ---------- formulário ------------------------------------------------------------------
function ExpenseForm({ mode, ex, preset, onClose }) {
  const {
    today, projectById, projectOptions, expenseCategories, createExpense, saveExpense, deleteExpense,
    notify, notifyError,
  } = useStore()
  const formId = useId()
  const listId = useId()
  const [start] = useState(() => initialOf(mode, ex, preset, today))
  // o talão que chega com a folha (câmara do topo) também conta como alteração: nada se perde em silêncio
  const init = useMemo(() => ({ ...start, files: [] }), [start])
  const [f, setF] = useState(start)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  // projetos: ativos (+ o atual), pela ordem dos projetos — numa despesa a ordem fixa ajuda mais do que o uso
  const options = useMemo(() => projectOptions(start.project_id).slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [projectOptions, start.project_id])

  // categorias: as habituais, as outras mais usadas (até 4) e a atual
  const cats = useMemo(() => {
    const out = []
    const add = (c) => { if (c && !out.some((x) => sameText(x, c))) out.push(c) }
    DEFAULT_CATEGORIES.forEach(add)
    expenseCategories.filter((c) => !DEFAULT_CATEGORIES.some((d) => sameText(d, c))).slice(0, 4).forEach(add)
    add(start.category)
    return out
  }, [expenseCategories, start.category])
  const [other, setOther] = useState(() => !!start.category && !cats.some((c) => sameText(c, start.category)))
  const [otherFocus, setOtherFocus] = useState(false) // "Outra" tocada agora: o campo abre já com o foco

  const refs = {
    description: useRef(null), amount: useRef(null), expense_date: useRef(null),
    camera: useRef(null), files: useRef(null),
  }
  const set = (k) => (v) => {
    setF((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }))
  }

  const projectName = (pid) => (pid ? projectById(pid)?.name || 'outro projeto' : 'Geral')
  const changes = changesOf(f, init, { projectName, today })
  const dirty = dirtyText(changes, mode)
  const amount = parseMoney(f.amount)

  const pickCategory = (c) => {
    setOther(false)
    set('category')(sameText(f.category, c) && !other ? '' : c)
  }
  const openOther = () => {
    if (!other) set('category')('')
    setOther(true)
    setOtherFocus(true)
  }

  const addFiles = (e) => {
    const fs = [...(e.target.files || [])]
    e.target.value = ''
    if (fs.length) set('files')([...f.files, ...fs])
  }

  function validate() {
    const e = {}
    if (!f.description.trim()) e.description = 'Escreve a descrição.'
    if (amount == null) e.amount = 'Escreve o valor.'
    else if (Number.isNaN(amount)) e.amount = BAD_MONEY
    else if (!(amount > 0)) e.amount = 'O valor tem de ser maior do que 0 €.'
    if (!f.expense_date) e.expense_date = 'Escolhe a data.'
    return e
  }

  const submitRef = useRef(null)
  const submit = async (e) => {
    e?.preventDefault()
    if (busy) return
    const errs = validate()
    const first = ['description', 'amount', 'expense_date'].find((k) => errs[k])
    if (first) {
      setErrors(errs)
      refs[first].current?.focus()
      return
    }
    // categoria escrita à mão com a grafia de uma que já existe ("material" → "Material")
    const typed = f.category.trim()
    const category = typed ? [...expenseCategories, ...DEFAULT_CATEGORIES].find((c) => sameText(c, typed)) || typed : null
    const fields = {
      description: f.description.trim(),
      amount: Math.round(amount * 100) / 100,
      expense_date: f.expense_date,
      project_id: f.project_id || null,
      category,
    }
    setBusy(true)
    try {
      if (mode === 'edit') {
        await saveExpense({ id: ex.id, ...fields })
        notify({ text: 'Despesa guardada', action: { label: 'Ver', run: () => openSheet('despesa', ex.id) } })
      } else {
        await createExpense(fields, { files: f.files })
      }
    } catch (err) {
      setBusy(false)
      notifyError(err, () => submitRef.current?.())
      return
    }
    onClose()
  }
  submitRef.current = submit

  const remove = () => {
    deleteExpense(ex) // "Despesa apagada · Anular"
    onClose()
  }

  // "seguinte" no teclado passa ao campo seguinte em vez de gravar a meio
  const onKeyDown = (e) => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.target.getAttribute('enterkeyhint') !== 'next') return
    e.preventDefault()
    const els = [...e.currentTarget.querySelectorAll('input:not([type=file]):not([type=date]):not([disabled])')]
    const next = els[els.indexOf(e.target) + 1]
    if (next) next.focus(); else e.target.blur()
  }

  const menu = mode === 'edit' ? [{ label: 'Apagar despesa', icon: 'trash', danger: true, onSelect: remove }] : null

  return (
    <Sheet variant="form" title={mode === 'edit' ? 'Editar despesa' : 'Novo'} dirty={busy ? false : dirty} onClose={onClose}
      menu={menu} className="ex-sheet" initialFocusRef={mode === 'new' ? refs.description : undefined}
      footer={(
        <Button type="submit" form={formId} variant="primary" size="lg" block loading={busy}>
          {mode === 'edit' ? 'Guardar alterações' : 'Guardar despesa'}
        </Button>
      )}>
      <form id={formId} className="ex-form" onSubmit={submit} onKeyDown={onKeyDown} noValidate>
        {mode === 'new' && <NewKindSwitch value="despesa" />}

        {mode === 'new' && (f.files.length === 0 ? (
          <>
            <button type="button" className="ex-shot" onClick={() => refs.camera.current?.click()}>
              <span className="ic"><Icon name="camera" size="lg" /></span>
              <span><b>Fotografar talão</b><small>Fica anexado ao guardar.</small></span>
            </button>
            <Button variant="ghost" size="sm" icon="paperclip" className="ex-shot-alt" onClick={() => refs.files.current?.click()}>
              Escolher ficheiro
            </Button>
          </>
        ) : (
          <div className="ex-att" role="group" aria-labelledby={`${formId}-att`}>
            <span className="label" id={`${formId}-att`}>Anexos</span>
            <PendingAttachments files={f.files} onChange={set('files')} />
          </div>
        ))}
        <input ref={refs.camera} type="file" accept="image/*" capture="environment" hidden onChange={addFiles} />
        <input ref={refs.files} type="file" accept="image/*,application/pdf" multiple hidden onChange={addFiles} />

        <Field label="Descrição" error={errors.description}>
          <TextInput ref={refs.description} value={f.description} onChange={set('description')}
            placeholder="Ex.: Gasolina, cordas, material…" autoCapitalize="sentences" autoComplete="off" />
        </Field>

        <div className="row2">
          <Field label="Valor" error={errors.amount}>
            <MoneyInput ref={refs.amount} value={f.amount} onChange={set('amount')} placeholder="0,00" />
          </Field>
          <Field label="Data" error={errors.expense_date}>
            <DateInput ref={refs.expense_date} value={f.expense_date} onChange={set('expense_date')} format={dayFormat(today)} />
          </Field>
        </div>

        <Field label="Projeto">
          <ProjectChips value={f.project_id} onChange={set('project_id')} projects={options} includeGeneral includeInactiveToggle />
        </Field>

        <Field label="Categoria">
          <ChipGroup>
            {cats.map((c) => (
              <Chip key={c} icon={categoryIcon(c)} selected={!other && sameText(f.category, c)} onClick={() => pickCategory(c)}>{c}</Chip>
            ))}
            <Chip icon="plus" selected={other} onClick={openOther}>Outra</Chip>
          </ChipGroup>
        </Field>
        {other && (
          <Field label="Outra categoria" help="Escreve uma nova ou escolhe uma das sugestões.">
            <TextInput value={f.category} onChange={set('category')} list={listId} autoFocus={otherFocus}
              placeholder="Ex.: Alojamento" autoCapitalize="sentences" autoComplete="off" enterKeyHint="done" />
          </Field>
        )}
        <datalist id={listId}>
          {expenseCategories.map((c) => <option key={c} value={c} />)}
        </datalist>

        {mode === 'edit' && (
          <>
            <div className="ex-att" role="group" aria-labelledby={`${formId}-att`}>
              <span className="label" id={`${formId}-att`}>Anexos</span>
              <Attachments kind="expense" id={ex.id} />
            </div>
            <Button variant="danger" icon="trash" className="ex-delete" onClick={remove}>Apagar despesa</Button>
          </>
        )}
      </form>
    </Sheet>
  )
}

export default function ExpenseSheet({ mode = 'edit', id, preset, onClose }) {
  const { expenseById, loadingPhases } = useStore()
  const found = mode === 'edit' ? expenseById(id) : null
  // ao apagar, a despesa sai da lista antes de a folha fechar: fica a última versão vista
  const keep = useRef(null)
  if (found) keep.current = found
  const ex = found || keep.current

  if (mode !== 'edit') return <ExpenseForm mode="new" preset={preset} onClose={onClose} />
  if (!ex) {
    return (
      <Sheet variant="form" title="Editar despesa" onClose={onClose}>
        {loadingPhases.phase2
          ? <Skeleton lines={4} label="A abrir a despesa" />
          : <EmptyState icon="wallet" title="Esta despesa já não existe" text="Pode ter sido apagada."
              action={<Button variant="secondary" onClick={onClose}>Fechar</Button>} />}
      </Sheet>
    )
  }
  return <ExpenseForm key={ex.id} mode="edit" ex={ex} onClose={onClose} />
}
