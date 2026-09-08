import { useState } from 'react'
import { useStore } from '../store'
import PrintSheet from '../PrintSheet'
import ScheduleModal from '../Schedule'
import { fmtDate, fmtMoney, todayYMD } from '../util'

const STATUS = {
  draft: { label: 'Rascunho', cls: 'mid' },
  sent: { label: 'Enviado', cls: 'mid' },
  accepted: { label: 'Aceite ✓', cls: 'ok' },
  rejected: { label: 'Recusado', cls: 'pend' },
}

function PricesModal({ onClose }) {
  const { services, saveService, deleteService } = useStore()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const run = async (fn) => {
    setBusy(true); setErr(null)
    try { await fn() }
    catch (ex) { setErr(ex.code === '42P01' ? 'Corre o supabase/orcamentos.sql no SQL Editor.' : (ex.message || String(ex))) }
    finally { setBusy(false) }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>Tabela de preços</h2><button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button></div>
        {services.map((s) => (
          <div key={s.id} className="list-item" style={{ cursor: 'default' }}>
            <div className="main"><div className="title" style={{ fontWeight: 600 }}>{s.name}</div></div>
            <input style={{ width: 84, padding: '7px 8px', fontSize: 15, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)', textAlign: 'right' }}
              inputMode="decimal" defaultValue={String(s.price).replace('.', ',')}
              onBlur={(e) => {
                const v = Number(String(e.target.value).replace(',', '.'))
                if (Number.isFinite(v) && v !== Number(s.price)) run(() => saveService({ id: s.id, price: v }))
              }} />
            <button className="btn danger" style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }} disabled={busy}
              onClick={() => run(() => deleteService(s.id))}>×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input style={{ flex: 2, minWidth: 0 }} className="bare-input" placeholder="Novo serviço" value={name} onChange={(e) => setName(e.target.value)} />
          <input style={{ flex: 1, minWidth: 0 }} className="bare-input" placeholder="€" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          <button className="btn secondary" style={{ width: 'auto', padding: '8px 12px' }} disabled={busy || !name.trim()}
            onClick={() => run(async () => {
              await saveService({ name: name.trim(), price: Number(String(price).replace(',', '.')) || 0, sort_order: services.length + 1 })
              setName(''); setPrice('')
            })}>+</button>
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn" style={{ marginTop: 14 }} onClick={onClose}>Fechar</button>
      </div>
    </div>
  )
}

function QuoteForm({ initial, onClose, onPrint }) {
  const { services, itemsForQuote, saveQuote, deleteQuote, acceptQuote, projects } = useStore()
  const [f, setF] = useState(() => ({
    project_id: initial?.project_id || projects.find((p) => p.kind === 'hair')?.id || projects[0]?.id || null,
    client_name: initial?.client_name || '',
    event_date: initial?.event_date || '',
    location: initial?.location || '',
    discount: initial?.discount ?? '',
    notes: initial?.notes || '',
    status: initial?.status || 'draft',
  }))
  const [items, setItems] = useState(() => (initial?.id ? itemsForQuote(initial.id).map((i) => ({ ...i })) : []))
  const [custom, setCustom] = useState({ name: '', price: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const qtyOf = (name) => items.find((i) => i.service_name === name)?.qty || 0
  const bump = (svc, delta) => setItems((its) => {
    const cur = its.find((i) => i.service_name === svc.name)
    if (!cur && delta > 0) return [...its, { service_name: svc.name, unit_price: Number(svc.price), qty: 1 }]
    if (!cur) return its
    const q = cur.qty + delta
    return q <= 0 ? its.filter((i) => i !== cur) : its.map((i) => (i === cur ? { ...i, qty: q } : i))
  })

  const subtotal = items.reduce((a, i) => a + Number(i.unit_price) * i.qty, 0)
  const total = subtotal - (Number(String(f.discount).replace(',', '.')) || 0)

  const run = async (fn) => {
    setBusy(true); setErr(null)
    try { await fn() }
    catch (ex) { setErr(ex.code === '42P01' ? 'Corre o supabase/orcamentos.sql no SQL Editor.' : (ex.message || String(ex))); setBusy(false); return false }
    return true
  }

  const buildRow = () => ({
    ...(initial?.id ? { id: initial.id } : {}),
    project_id: f.project_id || null,
    client_name: f.client_name.trim(),
    event_date: f.event_date || null,
    location: f.location.trim() || null,
    discount: Number(String(f.discount).replace(',', '.')) || 0,
    notes: f.notes.trim() || null,
    status: f.status,
  })

  const save = async (status) => {
    const row = buildRow()
    if (status) row.status = status
    if (await run(() => saveQuote(row, items))) onClose()
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{initial?.id ? 'Editar orçamento' : 'Novo orçamento'}</h2><button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button></div>
        <div className="row2">
          <div className="field">
            <label>Cliente</label>
            <input value={f.client_name} onChange={(e) => set('client_name', e.target.value)} placeholder="Ex.: Maria Silva" />
          </div>
          <div className="field">
            <label>Projeto</label>
            <select value={f.project_id || ''} onChange={(e) => set('project_id', e.target.value)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label>Data do evento</label>
            <input type="date" value={f.event_date || ''} onChange={(e) => set('event_date', e.target.value)} />
          </div>
          <div className="field">
            <label>Local</label>
            <input value={f.location} onChange={(e) => set('location', e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Serviços</label>
          {services.filter((s) => s.active !== false).map((s) => (
            <div key={s.id} className="list-item" style={{ cursor: 'default', padding: '7px 2px' }}>
              <div className="main">
                <div className="title" style={{ fontWeight: 600 }}>{s.name}</div>
                <div className="meta">{fmtMoney(s.price)}</div>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => bump(s, -1)} disabled={busy || qtyOf(s.name) === 0}>−</button>
                <b>{qtyOf(s.name)}</b>
                <button type="button" onClick={() => bump(s, 1)} disabled={busy}>+</button>
              </div>
            </div>
          ))}
          {items.filter((i) => !services.some((s) => s.name === i.service_name)).map((i, n) => (
            <div key={`c${n}`} className="list-item" style={{ cursor: 'default', padding: '7px 2px' }}>
              <div className="main">
                <div className="title" style={{ fontWeight: 600 }}>{i.service_name}</div>
                <div className="meta">{fmtMoney(i.unit_price)} × {i.qty}</div>
              </div>
              <button type="button" className="btn danger" style={{ width: 'auto', padding: '4px 9px', fontSize: 12 }}
                onClick={() => setItems((its) => its.filter((x) => x !== i))}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input style={{ flex: 2, minWidth: 0 }} placeholder="Outro serviço…" value={custom.name}
              onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))} />
            <input style={{ flex: 1, minWidth: 0 }} placeholder="€" inputMode="decimal" value={custom.price}
              onChange={(e) => setCustom((c) => ({ ...c, price: e.target.value }))} />
            <button type="button" className="btn secondary" style={{ width: 'auto', padding: '8px 12px' }}
              disabled={!custom.name.trim()}
              onClick={() => {
                setItems((its) => [...its, { service_name: custom.name.trim(), unit_price: Number(String(custom.price).replace(',', '.')) || 0, qty: 1 }])
                setCustom({ name: '', price: '' })
              }}>+</button>
          </div>
        </div>

        <div className="row2">
          <div className="field">
            <label>Desconto (€)</label>
            <input inputMode="decimal" value={f.discount} onChange={(e) => set('discount', e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label>Total</label>
            <div className="tile" style={{ padding: '10px 12px' }}><div className="value" style={{ fontSize: 19, margin: 0 }}>{fmtMoney(total)}</div></div>
          </div>
        </div>
        <div className="field">
          <label>Notas (aparecem no orçamento)</label>
          <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Ex.: inclui prova; deslocação até 30 km" />
        </div>

        {err && <div className="err">{err}</div>}
        <button className="btn" disabled={busy || !f.client_name.trim()} onClick={() => save()}>Guardar</button>
        {initial?.id && (
          <>
            <button className="btn secondary" style={{ marginTop: 8 }} disabled={busy}
              onClick={async () => { const row = buildRow(); if (await run(() => saveQuote(row, items))) onPrint({ ...initial, ...row }, items) }}>
              👁 Ver / Partilhar PDF
            </button>
            {f.status !== 'accepted' && (
              <button className="btn secondary" style={{ marginTop: 8 }} disabled={busy}
                onClick={async () => {
                  const row = buildRow()
                  if (!(await run(() => saveQuote(row, items)))) return
                  if (await run(() => acceptQuote({ ...initial, ...row }))) onClose()
                }}>
                ✓ Aceite — criar evento no calendário
              </button>
            )}
            {f.status === 'draft' && (
              <button className="btn secondary" style={{ marginTop: 8 }} disabled={busy} onClick={() => save('sent')}>
                Marcar como enviado
              </button>
            )}
            <button className="btn danger" style={{ marginTop: 8 }} disabled={busy}
              onClick={async () => { if (confirm('Apagar este orçamento?') && await run(() => deleteQuote(initial.id))) onClose() }}>
              Apagar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function QuotePrint({ quote, items, onClose }) {
  const subtotal = items.reduce((a, i) => a + Number(i.unit_price) * i.qty, 0)
  const total = subtotal - Number(quote.discount || 0)
  return (
    <PrintSheet onClose={onClose}>
      <div className="doc-head">
        <div className="doc-brand">Joana</div>
        <div className="doc-hairline" />
        <div className="doc-sub">Hairstyling · Penteados de noiva e eventos</div>
      </div>
      <h1 className="doc-title">Orçamento</h1>
      <div className="doc-meta">
        <div><b>{quote.client_name}</b></div>
        {quote.event_date && <div>Data do evento: {fmtDate(quote.event_date)}</div>}
        {quote.location && <div>Local: {quote.location}</div>}
        <div>Orçamento emitido a {fmtDate(todayYMD())}</div>
      </div>
      <table className="doc-table">
        <thead><tr><th>Serviço</th><th className="num">Qtd</th><th className="num">Preço</th><th className="num">Total</th></tr></thead>
        <tbody>
          {items.map((i, n) => (
            <tr key={n}>
              <td>{i.service_name}</td>
              <td className="num">{i.qty}</td>
              <td className="num">{fmtMoney(i.unit_price)}</td>
              <td className="num">{fmtMoney(Number(i.unit_price) * i.qty)}</td>
            </tr>
          ))}
          {Number(quote.discount) > 0 && (
            <tr><td colSpan="3">Desconto</td><td className="num">−{fmtMoney(quote.discount)}</td></tr>
          )}
          <tr className="doc-total"><td colSpan="3">Total</td><td className="num">{fmtMoney(total)}</td></tr>
        </tbody>
      </table>
      {quote.notes && <p className="doc-notes">{quote.notes}</p>}
      <p className="doc-foot">Orçamento válido por 30 dias. Obrigada pela preferência! 🌹</p>
    </PrintSheet>
  )
}

export default function Quotes() {
  const { quotes, quoteTotal, projectById, events, scheduleItems } = useStore()
  const [form, setForm] = useState(null)
  const [prices, setPrices] = useState(false)
  const [printing, setPrinting] = useState(null) // {quote, items}
  const [scheduleEv, setScheduleEv] = useState(null)
  const [pickEvent, setPickEvent] = useState(false)

  // eventos que já têm cronograma
  const withSchedule = events.filter((ev) => scheduleItems.some((s) => s.event_id === ev.id))

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Documentos</h1>
          <div className="sub">Orçamentos e cronogramas</div>
        </div>
        <button className="btn secondary" style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }} onClick={() => setPrices(true)}>Preços</button>
      </div>

      <div className="card">
        <h2>Orçamentos</h2>
        {quotes.length === 0 && <div className="empty">Sem orçamentos. Toca em + para criar o primeiro.</div>}
        {quotes.map((q) => {
          const st = STATUS[q.status] || STATUS.draft
          const p = q.project_id ? projectById(q.project_id) : null
          return (
            <div key={q.id} className="list-item" onClick={() => setForm(q)}>
              {p && <span className="chip"><span className="dot" style={{ background: p.color }} /></span>}
              <div className="main">
                <div className="title">{q.client_name}</div>
                <div className="meta">{q.event_date ? fmtDate(q.event_date) : 'sem data'}{q.location ? ` · ${q.location}` : ''}</div>
              </div>
              <div>
                <div className="amount">{fmtMoney(quoteTotal(q))}</div>
                <div className="badges"><span className={`badge ${st.cls}`}>{st.label}</span></div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <h2>Cronogramas do dia</h2>
        {withSchedule.length === 0 && <div className="empty">Sem cronogramas ainda.</div>}
        {withSchedule.map((ev) => {
          const p = projectById(ev.project_id)
          return (
            <div key={ev.id} className="list-item" onClick={() => setScheduleEv(ev)}>
              <span className="chip"><span className="dot" style={{ background: p?.color }} /></span>
              <div className="main">
                <div className="title">{ev.title}</div>
                <div className="meta">{fmtDate(ev.event_date)}{ev.location ? ` · ${ev.location}` : ''}</div>
              </div>
            </div>
          )
        })}
        <button className="btn secondary" style={{ marginTop: 10 }} onClick={() => setPickEvent(true)}>
          + Novo cronograma
        </button>
      </div>

      <button className="fab" onClick={() => setForm({})} aria-label="Novo orçamento">+</button>
      {form && (
        <QuoteForm initial={form.id ? form : null}
          onClose={() => setForm(null)}
          onPrint={(q, items) => { setForm(null); setPrinting({ quote: q, items }) }} />
      )}
      {prices && <PricesModal onClose={() => setPrices(false)} />}
      {printing && <QuotePrint quote={printing.quote} items={printing.items} onClose={() => setPrinting(null)} />}
      {scheduleEv && <ScheduleModal ev={scheduleEv} onClose={() => setScheduleEv(null)} />}
      {pickEvent && (
        <EventPicker events={events} projectById={projectById}
          onClose={() => setPickEvent(false)}
          onPick={(ev) => { setPickEvent(false); setScheduleEv(ev) }} />
      )}
    </>
  )
}

function EventPicker({ events, projectById, onClose, onPick }) {
  const today = todayYMD()
  // próximos eventos primeiro, depois os passados recentes
  const upcoming = events.filter((e) => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date))
  const past = events.filter((e) => e.event_date < today).slice(0, 10)
  const list = [...upcoming, ...past]
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>Cronograma para que evento?</h2><button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button></div>
        {list.length === 0 && <div className="empty">Sem eventos — cria primeiro o evento na Agenda.</div>}
        {list.map((ev) => {
          const p = projectById(ev.project_id)
          return (
            <div key={ev.id} className="list-item" onClick={() => onPick(ev)}>
              <span className="chip"><span className="dot" style={{ background: p?.color }} /></span>
              <div className="main">
                <div className="title">{ev.title}</div>
                <div className="meta">{fmtDate(ev.event_date)} · {p?.name}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
