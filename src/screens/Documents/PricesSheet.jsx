import { useId, useState, useSyncExternalStore } from 'react'
import { Button, EmptyState, IconButton, MoneyInput, Sheet, Skeleton, TextInput, moneyInputValue, parseMoney } from '../../ui'
import { useStore } from '../../store.jsx'
import './Documents.css'

// Tabela de preços (spec §10.15): nome + preço (grava ao sair do campo, "Preço atualizado") +
// lixo com Anular + "Novo serviço · € · [Adicionar]". Vive em Definições (PricesSection) e na folha "precos".

// serviços à espera do Anular
let hiddenServices = new Set()
const subs = new Set()
const hideService = (id, on) => {
  const next = new Set(hiddenServices)
  if (on) next.add(id); else next.delete(id)
  hiddenServices = next
  subs.forEach((fn) => fn())
}
const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn) }

function PriceRow({ s }) {
  const { saveService, deleteService, notify, notifyError, undoable } = useStore()
  const [value, setValue] = useState(() => moneyInputValue(Number(s.price)))

  const commit = async () => {
    const n = parseMoney(value)
    if (n == null || !Number.isFinite(n) || n < 0) { setValue(moneyInputValue(Number(s.price))); return }
    if (Math.abs(n - Number(s.price)) < 0.005) return
    try {
      await saveService({ id: s.id, price: Math.round(n * 100) / 100 })
      notify({ text: <>Preço de <b>{s.name}</b> atualizado</>, icon: 'checkCircle' })
    } catch (ex) {
      setValue(moneyInputValue(Number(s.price)))
      notifyError(ex, commit)
    }
  }

  const remove = () => undoable({
    text: <>Serviço <b>{s.name}</b> apagado</>,
    run: async () => { hideService(s.id, true); return s },
    undo: async () => { hideService(s.id, false) },
    commit: async () => {
      try { await deleteService(s.id) } finally { hideService(s.id, false) }
    },
  })

  return (
    <div className="doc-price">
      <b>{s.name}</b>
      <MoneyInput value={value} onChange={setValue} onBlur={commit} aria-label={`Preço de ${s.name}`}
        className="doc-price-in" enterKeyHint="done"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }} />
      <IconButton icon="trash" label={`Apagar ${s.name}`} onClick={remove} />
    </div>
  )
}

export function PriceList() {
  const { services, saveService, notify, notifyError, loadingPhases } = useStore()
  const hidden = useSyncExternalStore(subscribe, () => hiddenServices)
  const list = services.filter((s) => !hidden.has(s.id))
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const nameId = useId()

  const add = async (e) => {
    e?.preventDefault()
    if (!name.trim() || busy) return
    const n = parseMoney(price)
    setBusy(true)
    try {
      await saveService({
        name: name.trim(),
        price: Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0,
        sort_order: Math.max(0, ...services.map((s) => Number(s.sort_order) || 0)) + 1,
      })
      notify({ text: <>Serviço <b>{name.trim()}</b> adicionado</>, icon: 'checkCircle' })
      setName('')
      setPrice('')
      document.getElementById(nameId)?.focus()
    } catch (ex) {
      notifyError(ex, add)
    } finally {
      setBusy(false)
    }
  }

  if (loadingPhases.phase2) return <Skeleton lines={3} label="A carregar a tabela de preços" />
  return (
    <div className="doc-prices">
      {list.length === 0 && <EmptyState compact icon="euro" title="Ainda não há serviços" text="Junta o primeiro aqui em baixo." />}
      {list.map((s) => <PriceRow key={`${s.id}:${s.price}`} s={s} />)}
      <form className="doc-inline" onSubmit={add} aria-label="Novo serviço">
        <TextInput id={nameId} value={name} onChange={setName} placeholder="Novo serviço" aria-label="Nome do novo serviço"
          autoComplete="off" enterKeyHint="next" />
        <MoneyInput value={price} onChange={setPrice} placeholder="0" aria-label="Preço do novo serviço" className="doc-price-in" />
        <Button type="submit" size="sm" icon="plus" disabled={!name.trim()} loading={busy} loadingLabel="…">Adicionar</Button>
      </form>
    </div>
  )
}

// folha "precos" (grava tudo logo: não há Guardar)
export default function PricesSheet({ onClose }) {
  const titleId = useId()
  return (
    <Sheet variant="detail" labelledBy={titleId} onClose={onClose} className="doc-sheet">
      <h2 className="doc-sheet-title" id={titleId} tabIndex={-1}>Tabela de preços</h2>
      <p className="doc-hint">Os preços gravam-se ao sair do campo e entram nos orçamentos novos.</p>
      <PriceList />
    </Sheet>
  )
}
