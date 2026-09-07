import { useMemo, useState } from 'react'
import { useStore } from '../store'
import Attachments from '../Attachments'
import { MONTHS, fmtDate, fmtMoney, todayYMD, ymdParts } from '../util'

function ExpenseForm({ initial, onClose }) {
  const { projects, saveExpense, deleteExpense } = useStore()
  const [f, setF] = useState(() => ({
    project_id: initial?.project_id || '',
    expense_date: initial?.expense_date || todayYMD(),
    description: initial?.description || '',
    amount: initial?.amount ?? '',
    category: initial?.category || '',
  }))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      await saveExpense({
        ...(initial?.id ? { id: initial.id } : {}),
        project_id: f.project_id || null,
        expense_date: f.expense_date,
        description: f.description.trim(),
        amount: Number(String(f.amount).replace(',', '.')) || 0,
        category: f.category.trim() || null,
      })
      onClose()
    } catch (ex) { setErr(ex.message || String(ex)); setBusy(false) }
  }

  const remove = () => {
    deleteExpense(initial) // com Anular durante uns segundos
    onClose()
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{initial?.id ? 'Editar despesa' : 'Nova despesa'}</h2>
        <div className="field">
          <label>Descrição</label>
          <input value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Ex.: Cordas, gasolina, material…" required />
        </div>
        <div className="row2">
          <div className="field">
            <label>Data</label>
            <input type="date" value={f.expense_date} onChange={(e) => set('expense_date', e.target.value)} required />
          </div>
          <div className="field">
            <label>Valor (€)</label>
            <input inputMode="decimal" value={f.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0,00" required />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label>Projeto</label>
            <select value={f.project_id} onChange={(e) => set('project_id', e.target.value)}>
              <option value="">Geral</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Categoria</label>
            <input value={f.category} onChange={(e) => set('category', e.target.value)} placeholder="Ex.: Material" />
          </div>
        </div>
        {initial?.id && <Attachments kind="expense" id={initial.id} />}
        {err && <div className="err">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? 'A guardar…' : 'Guardar'}</button>
        {initial?.id && (
          <button type="button" className="btn danger" style={{ marginTop: 8 }} onClick={remove} disabled={busy}>Apagar</button>
        )}
      </form>
    </div>
  )
}

export default function Expenses() {
  const { expenses, projectById } = useStore()
  const [form, setForm] = useState(null)

  const groups = useMemo(() => {
    const out = []
    let cur = null
    for (const ex of expenses) {
      const { year, month } = ymdParts(ex.expense_date)
      const key = `${year}-${month}`
      if (!cur || cur.key !== key) {
        cur = { key, year, month, items: [], total: 0 }
        out.push(cur)
      }
      cur.items.push(ex)
      cur.total += Number(ex.amount)
    }
    return out
  }, [expenses])

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Despesas</h1>
          <div className="sub">Custos de material, deslocações, etc.</div>
        </div>
      </div>

      {groups.length === 0 && <div className="empty">Sem despesas registadas.</div>}

      {groups.map((g) => (
        <div key={g.key}>
          <div className="month-head">{MONTHS[g.month]} {g.year} <small>· {fmtMoney(g.total)}</small></div>
          <div className="card">
            {g.items.map((ex) => {
              const p = ex.project_id ? projectById(ex.project_id) : null
              return (
                <div key={ex.id} className="list-item" onClick={() => setForm(ex)}>
                  <div className="main">
                    <div className="title">{ex.description}</div>
                    <div className="meta">{fmtDate(ex.expense_date)} · {p ? p.name : 'Geral'}{ex.category ? ` · ${ex.category}` : ''}</div>
                  </div>
                  <div className="amount">−{fmtMoney(ex.amount)}</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <button className="fab" onClick={() => setForm({})} aria-label="Nova despesa">+</button>
      {form && <ExpenseForm initial={form.id ? form : null} onClose={() => setForm(null)} />}
    </>
  )
}
