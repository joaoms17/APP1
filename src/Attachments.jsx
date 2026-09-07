import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'

// Secção "Anexos" para eventos e despesas já guardados:
// miniaturas das fotos (recibos/faturas), adicionar e remover.
export default function Attachments({ kind, id }) {
  const { attachmentsFor, addAttachment, deleteAttachment, attachmentUrl } = useStore()
  const atts = attachmentsFor(kind, id)
  const [urls, setUrls] = useState({}) // att.id -> signed url
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    let alive = true
    for (const a of atts) {
      if (urls[a.id] || !/\.(jpg|jpeg|png|webp|gif)$/i.test(a.path)) continue
      attachmentUrl(a)
        .then((u) => { if (alive) setUrls((m) => ({ ...m, [a.id]: u })) })
        .catch(() => { /* miniatura fica sem imagem */ })
    }
    return () => { alive = false }
  }, [atts]) // eslint-disable-line react-hooks/exhaustive-deps

  const onPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); setErr(null)
    try { await addAttachment(kind, id, file) }
    catch (ex) {
      setErr(/bucket|42P01|attachments/i.test(String(ex.message))
        ? 'Falta configurar os anexos no Supabase — corre o supabase/attachments.sql no SQL Editor.'
        : (ex.message || String(ex)))
    } finally { setBusy(false) }
  }

  const open = async (a) => {
    try { window.open(await attachmentUrl(a), '_blank') }
    catch (ex) { setErr(String(ex.message || ex)) }
  }

  return (
    <div className="field" style={{ marginTop: 4 }}>
      <label>Anexos (recibos, faturas)</label>
      <div className="attach-grid">
        {atts.map((a) => (
          <div key={a.id} className="attach-item">
            {urls[a.id]
              ? <img src={urls[a.id]} alt={a.name || 'anexo'} onClick={() => open(a)} />
              : <button type="button" className="attach-doc" onClick={() => open(a)}>📄</button>}
            <button type="button" className="attach-del" disabled={busy} aria-label="Remover anexo"
              onClick={async () => { setBusy(true); setErr(null); try { await deleteAttachment(a) } catch (ex) { setErr(String(ex.message || ex)) } finally { setBusy(false) } }}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="attach-add" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? '…' : '+ 📷'}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={onPick} />
      {err && <div className="err">{err}</div>}
    </div>
  )
}
