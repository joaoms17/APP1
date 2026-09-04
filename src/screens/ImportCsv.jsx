import { useState } from 'react'
import { useStore } from '../store'
import { fmtMoney } from '../util'

const norm = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const parseDate = (s) => {
  s = String(s || '').trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

const parseNum = (s) => {
  s = String(s || '').trim().replace(/[€\s]/g, '')
  if (!s) return 0
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

const parseBool = (s) => ['sim', 's', 'yes', 'true', '1', 'x', 'pago', 'emitido'].includes(norm(s))

const splitCsv = (text) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return []
  const head = lines[0]
  const sep = [';', '\t', ','].reduce((a, b) => (head.split(b).length > head.split(a).length ? b : a))
  return lines.map((line) => {
    const cells = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ } else inQ = !inQ
      } else if (c === sep && !inQ) { cells.push(cur); cur = '' }
      else cur += c
    }
    cells.push(cur)
    return cells.map((c) => c.trim())
  })
}

const COL_ALIASES = {
  date: ['data', 'dia', 'date'],
  project: ['projeto', 'projecto', 'grupo', 'banda', 'project'],
  title: ['titulo', 'evento', 'nome', 'concerto', 'servico', 'title'],
  value: ['valor', 'preco', 'montante', 'value', 'amount'],
  paid: ['pago', 'paga', 'paid'],
  receipt: ['recibo', 'fatura', 'receipt'],
  location: ['local', 'localizacao', 'sitio', 'location'],
  time: ['hora', 'horas', 'time'],
  notes: ['notas', 'obs', 'observacoes', 'notes'],
  description: ['descricao', 'despesa', 'description'],
  category: ['categoria', 'tipo', 'category'],
}

const findCol = (headers, key) => headers.findIndex((h) => COL_ALIASES[key].includes(norm(h)))

export default function ImportCsv() {
  const { projects, importRows } = useStore()
  const [kind, setKind] = useState('events')
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const matchProject = (name) => {
    const n = norm(name)
    return projects.find((p) => norm(p.name) === n)
      || projects.find((p) => n && norm(p.name).includes(n))
      || null
  }

  const analyse = (raw) => {
    setResult(null)
    const rows = splitCsv(raw)
    if (rows.length < 2) { setPreview({ error: 'Preciso de uma linha de cabeçalho e pelo menos uma linha de dados.' }); return }
    const headers = rows[0]
    const col = Object.fromEntries(Object.keys(COL_ALIASES).map((k) => [k, findCol(headers, k)]))
    const need = kind === 'events' ? ['date', 'value'] : ['date', 'value', 'description']
    const missing = need.filter((k) => col[k] < 0)
    if (missing.length) {
      setPreview({ error: `Colunas em falta no cabeçalho: ${missing.join(', ')}. Cabeçalhos encontrados: ${headers.join(', ')}` })
      return
    }
    const good = [], bad = []
    rows.slice(1).forEach((cells, i) => {
      const get = (k) => (col[k] >= 0 ? cells[col[k]] : '')
      const date = parseDate(get('date'))
      const value = parseNum(get('value'))
      if (!date || value === null) { bad.push({ line: i + 2, reason: !date ? 'data inválida' : 'valor inválido', cells }); return }
      if (kind === 'events') {
        const proj = matchProject(get('project')) || projects.find((p) => norm(p.name) === 'outros')
        if (!proj) { bad.push({ line: i + 2, reason: `projeto desconhecido: "${get('project')}"`, cells }); return }
        const paid = parseBool(get('paid'))
        good.push({
          project_id: proj.id, _projName: proj.name,
          title: get('title') || `${proj.name} ${date}`,
          event_date: date, start_time: get('time') || null,
          location: get('location') || null, value, paid,
          paid_at: paid ? date : null,
          receipt_issued: parseBool(get('receipt')),
          notes: get('notes') || null,
        })
      } else {
        const proj = get('project') ? matchProject(get('project')) : null
        good.push({
          project_id: proj?.id || null, _projName: proj?.name || 'Geral',
          expense_date: date, description: get('description') || 'Despesa',
          amount: value, category: get('category') || null,
        })
      }
    })
    setPreview({ good, bad })
  }

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setText(reader.result); analyse(reader.result) }
    reader.readAsText(file)
  }

  const doImport = async () => {
    setBusy(true)
    try {
      const rows = preview.good.map(({ _projName, ...r }) => r)
      await importRows(kind, rows)
      setResult(`✅ Importados ${rows.length} registos.`)
      setPreview(null); setText('')
    } catch (ex) {
      setResult(`Erro na importação: ${ex.message || ex}`)
    } finally { setBusy(false) }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Importar histórico</h1>
          <div className="sub">CSV exportado do Excel / Google Sheets</div>
        </div>
      </div>

      <div className="card">
        <div className="field">
          <label>O que vais importar?</label>
          <select value={kind} onChange={(e) => { setKind(e.target.value); setPreview(null) }}>
            <option value="events">Eventos (concertos / cabelos)</option>
            <option value="expenses">Despesas</option>
          </select>
        </div>
        <div className="note">
          {kind === 'events'
            ? <>O ficheiro precisa de cabeçalho com as colunas <b>data</b> e <b>valor</b>; opcionais: projeto, título, pago, recibo, local, hora, notas. Datas em <b>dd/mm/aaaa</b>. Projetos sem correspondência vão para "Outros".</>
            : <>O ficheiro precisa de cabeçalho com as colunas <b>data</b>, <b>descrição</b> e <b>valor</b>; opcionais: projeto, categoria.</>}
        </div>
        <div className="field">
          <label>Ficheiro CSV</label>
          <input type="file" accept=".csv,.txt,text/csv" onChange={onFile} />
        </div>
        <div className="field">
          <label>…ou cola aqui o conteúdo</label>
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'data;projeto;titulo;valor;pago;recibo\n03/05/2025;Tune Up;Concerto em Faro;350;sim;sim'}
          />
        </div>
        <button className="btn secondary" onClick={() => analyse(text)} disabled={!text.trim()}>Pré-visualizar</button>
        {result && <div className="note" style={{ marginTop: 10 }}>{result}</div>}
      </div>

      {preview?.error && <div className="card"><div className="err">{preview.error}</div></div>}

      {preview?.good && (
        <div className="card">
          <h2>{preview.good.length} registos prontos · {preview.bad.length} com erro</h2>
          {preview.bad.length > 0 && (
            <div className="err">
              Linhas ignoradas: {preview.bad.map((b) => `${b.line} (${b.reason})`).join('; ')}
            </div>
          )}
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Data</th><th>Projeto</th><th>{kind === 'events' ? 'Título' : 'Descrição'}</th><th className="num">Valor</th>
                </tr>
              </thead>
              <tbody>
                {preview.good.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    <td>{r.event_date || r.expense_date}</td>
                    <td>{r._projName}</td>
                    <td>{r.title || r.description}</td>
                    <td className="num">{fmtMoney(r.value ?? r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.good.length > 20 && <div className="chart-note">A mostrar as primeiras 20 de {preview.good.length} linhas.</div>}
          <button className="btn" style={{ marginTop: 12 }} onClick={doImport} disabled={busy || !preview.good.length}>
            {busy ? 'A importar…' : `Importar ${preview.good.length} registos`}
          </button>
        </div>
      )}
    </>
  )
}
