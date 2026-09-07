import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { fmtMoney } from '../util'

function LogoField({ project }) {
  const { setProjectLogo, removeProjectLogo, logoUrl, projects } = useStore()
  const current = projects.find((p) => p.id === project.id) || project
  const [url, setUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    let alive = true
    if (current.logo_path) logoUrl(current).then((u) => { if (alive) setUrl(u) }).catch(() => {})
    else setUrl(null)
    return () => { alive = false }
  }, [current.logo_path]) // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn) => {
    setBusy(true); setErr(null)
    try { await fn() }
    catch (ex) {
      setErr(ex.code === '42703'
        ? 'Falta a coluna logo_path — corre o supabase/docs_prep.sql no SQL Editor.'
        : (ex.message || String(ex)))
    } finally { setBusy(false) }
  }

  return (
    <div className="field">
      <label>Logotipo (aparece nos documentos)</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {url
          ? <img src={url} alt="logotipo" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--line)', background: '#fff' }} />
          : <div className="attach-add" style={{ cursor: 'default' }}>—</div>}
        <button type="button" className="btn secondary" style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }}
          disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? '…' : (url ? 'Substituir' : 'Carregar')}
        </button>
        {url && (
          <button type="button" className="btn danger" style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }}
            disabled={busy} onClick={() => run(() => removeProjectLogo(current))}>
            Remover
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) run(() => setProjectLogo(current, file)) }} />
      {err && <div className="err">{err}</div>}
    </div>
  )
}

// paleta pastel validada para daltonismo (mesma ordem do seed)
const PRESET_COLORS = ['#d46a8f', '#cf9c3f', '#12a89e', '#cd7c5a', '#9c7ed4', '#4f9f68', '#6d8ed6', '#a49b3f', '#c263ac']

function ProjectForm({ initial, onClose }) {
  const { saveProject, deleteProject, projects, events, gcalCalendars, addGcalCalendar, removeGcalCalendar } = useStore()
  const [calUrl, setCalUrl] = useState('')
  const [calErr, setCalErr] = useState(null)
  const [calBusy, setCalBusy] = useState(false)
  const myCals = initial?.id ? gcalCalendars.filter((c) => c.project_id === initial.id) : []

  const addCal = async () => {
    setCalBusy(true); setCalErr(null)
    try { await addGcalCalendar(calUrl, initial.id); setCalUrl('') }
    catch (ex) {
      setCalErr(ex.code === '42P01'
        ? 'Falta criar a tabela gcal_calendars — corre o supabase/gcal_calendars.sql.'
        : ex.code === '23505' ? 'Esse calendário já está adicionado.'
        : (ex.message || String(ex)))
    } finally { setCalBusy(false) }
  }
  const [f, setF] = useState(() => ({
    name: initial?.name || '',
    kind: initial?.kind || 'music',
    color: initial?.color || PRESET_COLORS[projects.length % PRESET_COLORS.length],
    sort_order: initial?.sort_order ?? (Math.max(0, ...projects.map((p) => p.sort_order)) + 1),
    active: initial?.active !== false,
    active_from: initial?.active_from ?? '',
    active_to: initial?.active_to ?? '',
  }))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const nEvents = initial?.id ? events.filter((e) => e.project_id === initial.id).length : 0

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      await saveProject({
        ...(initial?.id ? { id: initial.id } : {}),
        name: f.name.trim(),
        kind: f.kind,
        color: f.color,
        sort_order: Number(f.sort_order) || 0,
        active: f.active,
        active_from: f.active_from === '' ? null : Number(f.active_from),
        active_to: f.active_to === '' ? null : Number(f.active_to),
      })
      onClose()
    } catch (ex) {
      setErr(ex.code === '42703'
        ? 'Faltam as colunas active_from/active_to — corre o supabase/projects_admin.sql no SQL Editor.'
        : (ex.message || String(ex)))
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm(`Apagar o projeto "${initial.name}"?`)) return
    setBusy(true); setErr(null)
    try { await deleteProject(initial.id); onClose() }
    catch (ex) {
      setErr(ex.code === '23503'
        ? `Este projeto tem ${nEvents} evento(s) associados — não pode ser apagado. Desativa-o em vez disso.`
        : (ex.message || String(ex)))
      setBusy(false)
    }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head"><h2>{initial?.id ? 'Editar projeto' : 'Novo projeto'}</h2><button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button></div>
        <div className="field">
          <label>Nome</label>
          <input value={f.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div className="row2">
          <div className="field">
            <label>Tipo</label>
            <select value={f.kind} onChange={(e) => set('kind', e.target.value)}>
              <option value="music">Música</option>
              <option value="hair">Cabelos</option>
            </select>
          </div>
          <div className="field">
            <label>Ordem</label>
            <input inputMode="numeric" value={f.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Cor</label>
          <div className="swatches">
            {PRESET_COLORS.map((c) => (
              <button key={c} type="button"
                className={`swatch${f.color === c ? ' sel' : ''}`}
                style={{ background: c }}
                onClick={() => set('color', c)}
                aria-label={c} />
            ))}
            <input type="color" value={f.color} onChange={(e) => set('color', e.target.value)} title="Cor personalizada" />
          </div>
          <div className="chart-note">As cores da lista foram validadas para se distinguirem bem nos gráficos (incl. daltonismo).</div>
        </div>
        <div className="row2">
          <div className="field">
            <label>Ativo desde (ano)</label>
            <input inputMode="numeric" placeholder="sempre" value={f.active_from} onChange={(e) => set('active_from', e.target.value)} />
          </div>
          <div className="field">
            <label>Ativo até (ano)</label>
            <input inputMode="numeric" placeholder="ainda ativo" value={f.active_to} onChange={(e) => set('active_to', e.target.value)} />
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} />
          Ativo (aparece ao criar eventos novos)
        </label>

        {initial?.id && <LogoField project={initial} />}

        {initial?.id && (
          <div className="field" style={{ marginTop: 4 }}>
            <label>Calendários Google ligados a este projeto</label>
            {myCals.map((cal) => (
              <div key={cal.id} className="list-item" style={{ cursor: 'default', padding: '8px 2px' }}>
                <div className="main"><div className="meta">…{cal.url.slice(-34)}</div></div>
                <button type="button" className="btn danger" style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}
                  disabled={calBusy}
                  onClick={async () => { setCalBusy(true); setCalErr(null); try { await removeGcalCalendar(cal.id) } catch (ex) { setCalErr(String(ex.message || ex)) } finally { setCalBusy(false) } }}>
                  Remover
                </button>
              </div>
            ))}
            {myCals.length === 0 && <div className="chart-note">Nenhum calendário ligado.</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input style={{ flex: 1 }} value={calUrl} onChange={(e) => setCalUrl(e.target.value)} inputMode="url"
                placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" />
              <button type="button" className="btn secondary" style={{ width: 'auto', padding: '8px 14px' }}
                onClick={addCal} disabled={calBusy || !calUrl.trim()}>
                {calBusy ? '…' : 'Ligar'}
              </button>
            </div>
            {calErr && <div className="err">{calErr}</div>}
          </div>
        )}

        {err && <div className="err">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? 'A guardar…' : 'Guardar'}</button>
        {initial?.id && (
          <button type="button" className="btn danger" style={{ marginTop: 8 }} onClick={remove} disabled={busy}>
            Apagar projeto
          </button>
        )}
      </form>
    </div>
  )
}

export default function Projects() {
  const { projects, events, gcalCalendars } = useStore()
  const [form, setForm] = useState(null)
  const nowYear = new Date().getFullYear()

  const stats = (p) => {
    const evs = events.filter((e) => e.project_id === p.id)
    return { n: evs.length, total: evs.reduce((a, e) => a + Number(e.value), 0) }
  }
  const period = (p) => {
    if (p.active === false) return 'Inativo'
    const from = p.active_from ?? null
    const to = p.active_to ?? null
    if (from == null && to == null) return 'Sempre ativo'
    if (to == null) return `Desde ${from}`
    if (from == null) return `Até ${to}`
    return `${from}–${to}`
  }
  const inactiveNow = (p) => p.active === false || (p.active_to != null && p.active_to < nowYear)

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Projetos</h1>
          <div className="sub">Cores, períodos de atividade e ordem</div>
        </div>
      </div>

      <div className="card">
        {projects.map((p) => {
          const s = stats(p)
          return (
            <div key={p.id} className="list-item" onClick={() => setForm(p)} style={inactiveNow(p) ? { opacity: 0.55 } : undefined}>
              <span className="chip"><span className="dot" style={{ background: p.color, width: 14, height: 14, borderRadius: 7 }} /></span>
              <div className="main">
                <div className="title">{p.name}</div>
                <div className="meta">
                  {p.kind === 'hair' ? 'Cabelos' : 'Música'} · {period(p)} · {s.n} evento{s.n === 1 ? '' : 's'}
                  {gcalCalendars.some((c) => c.project_id === p.id) && ' · 📆 Google'}
                </div>
              </div>
              <div className="amount">{fmtMoney(s.total)}</div>
            </div>
          )
        })}
      </div>

      <button className="fab" onClick={() => setForm({})} aria-label="Novo projeto">+</button>
      {form && <ProjectForm initial={form.id ? form : null} onClose={() => setForm(null)} />}
    </>
  )
}
