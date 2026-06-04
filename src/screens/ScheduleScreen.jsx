import React from 'react'
import { PALETTE, hexToRgba } from '../data'
import { Icon, Label, Btn, Eucalyptus, Chip } from '../ui'

const inp = { boxSizing: 'border-box', padding: '7px 9px', borderRadius: 8, border: '1px solid rgba(74,63,53,0.2)', background: 'var(--paper)', fontFamily: 'var(--sans)', fontSize: 13, color: PALETTE.nearBlack, outline: 'none' }

function buildScheduleHTML(c, lang) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const logo = c.logo_url ? `<img src="${c.logo_url}" style="max-height:70px;max-width:200px;object-fit:contain;margin:0 auto 10px;display:block"/>` : ''
  let body = ''
  if (c.kind === 'music') {
    body = `<table><thead><tr><th>Hora</th><th>Momento</th></tr></thead><tbody>${(c.moments || []).map(m => `<tr><td class="t">${esc(m.time) || '—'}</td><td>${esc(m.label)}</td></tr>`).join('')}</tbody></table>`
  } else {
    const col = (svc, title) => {
      const rows = (c.slots || []).filter(s => s.service === svc)
      if (!rows.length) return ''
      return `<div class="col"><div class="col-h">${title}</div>${rows.map(s => `<div class="slot"><span class="t">${esc(s.time) || '—'}</span><div><div class="p">${esc(s.person)}</div>${s.note ? `<div class="n">${esc(s.note)}</div>` : ''}</div></div>`).join('')}</div>`
    }
    body = `<div class="cols">${col('cabelo', 'Cabelo')}${col('maquilhagem', 'Maquilhagem')}</div>`
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>Cronograma — ${esc(c.client)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 16mm; } * { box-sizing: border-box; }
  body { font-family: 'Jost', sans-serif; color: #4A3F35; margin: 0; }
  .head { text-align: center; padding-bottom: 16px; border-bottom: 1px solid #e3dccd; margin-bottom: 18px; }
  .ev { font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: 26px; color: #2E2820; }
  .meta { font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: #93A07E; margin-top: 6px; }
  .cols { display: flex; gap: 26px; }
  .col { flex: 1; } .col-h { font-size: 12px; letter-spacing: .2em; text-transform: uppercase; color: #93A07E; font-weight: 500; margin-bottom: 8px; border-bottom: 1px solid #efe9dd; padding-bottom: 6px; }
  .slot { display: flex; gap: 12px; padding: 7px 0; border-bottom: 1px solid #f1ece1; }
  .t { font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: 15px; color: #A9744F; min-width: 44px; }
  .p { font-weight: 500; font-size: 13px; color: #2E2820; } .n { font-weight: 300; font-size: 11px; color: #6E6155; }
  table { width: 100%; border-collapse: collapse; } th { text-align: left; font-size: 11px; letter-spacing: .15em; text-transform: uppercase; color: #93A07E; padding: 6px 0; border-bottom: 1px solid #e3dccd; }
  td { padding: 9px 0; border-bottom: 1px solid #f1ece1; font-size: 13px; } td.t { width: 70px; }
  .notes { margin-top: 20px; padding: 12px 14px; background: #f3f0e7; border-radius: 8px; font-weight: 300; font-size: 12px; line-height: 1.6; white-space: pre-wrap; }
</style></head><body>
  <div class="head">${logo}<div class="ev">${esc(c.client)}</div><div class="meta">${esc(c.date)}${c.location ? ` · ${esc(c.location)}` : ''}</div></div>
  ${body}
  ${c.notes ? `<div class="notes">${esc(c.notes)}</div>` : ''}
</body></html>`
}

function downloadSchedule(content, lang) {
  const html = buildScheduleHTML(content, lang)
  const f = document.createElement('iframe')
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(f)
  const d = f.contentWindow.document; d.open(); d.write(html); d.close()
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => document.body.removeChild(f), 1500) }, 400)
}

export default function ScheduleScreen({ ctx, params }) {
  const { lang, accent, schedules } = ctx
  const sch = (schedules || []).find(s => s.id === params.id)
  const [c, setC] = React.useState(sch ? sch.content : null)
  const [editing, setEditing] = React.useState(true)
  const [status, setStatus] = React.useState(sch ? sch.status : 'rascunho')
  const [msg, setMsg] = React.useState(null)

  if (!sch || !c) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
      <div style={{ fontFamily: 'var(--sans)', color: PALETTE.inkSoft }}>Cronograma não encontrado</div>
    </div>
  )
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(null), 2000) }
  const setField = (k, v) => setC(p => ({ ...p, [k]: v }))
  const save = async () => { await ctx.update('schedules', sch.id, { content: c }); setEditing(false); flash(lang === 'pt' ? 'Guardado ✓' : 'Saved ✓') }
  const send = async () => {
    try { await ctx.update('schedules', sch.id, { content: c, status: 'enviada', sent_content: c, sent_at: new Date().toISOString() }) }
    catch (_) { await ctx.update('schedules', sch.id, { content: c, status: 'enviada' }) }
    setStatus('enviada'); flash(lang === 'pt' ? 'Marcado como enviado' : 'Marked as sent')
  }

  // beauty helpers
  const setSlot = (i, k, v) => setC(p => ({ ...p, slots: p.slots.map((s, idx) => idx === i ? { ...s, [k]: v } : s) }))
  const addSlot = (service) => setC(p => ({ ...p, slots: [...(p.slots || []), { service, time: '', person: '', note: '' }] }))
  const removeSlot = (i) => setC(p => ({ ...p, slots: p.slots.filter((_, idx) => idx !== i) }))
  // music helpers
  const setMoment = (i, k, v) => setC(p => ({ ...p, moments: p.moments.map((m, idx) => idx === i ? { ...m, [k]: v } : m) }))
  const addMoment = () => setC(p => ({ ...p, moments: [...(p.moments || []), { time: '', label: '' }] }))
  const removeMoment = (i) => setC(p => ({ ...p, moments: p.moments.filter((_, idx) => idx !== i) }))

  const statusTone = { rascunho: PALETTE.inkSoft, enviada: PALETTE.gold }[status] || PALETTE.inkSoft
  const statusLabel = { rascunho: lang === 'pt' ? 'Rascunho' : 'Draft', enviada: lang === 'pt' ? 'Enviado' : 'Sent' }[status]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper-warm)' }}>
      <div style={{ paddingTop: 28, paddingBottom: 14, paddingInline: 14, background: 'var(--paper-card)', borderBottom: '1px solid rgba(74,63,53,0.07)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={ctx.pop} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}><Icon name="chevL" size={24} color={accent} stroke={2} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 20, color: PALETTE.nearBlack }}>{lang === 'pt' ? 'Cronograma do dia' : 'Day schedule'}</div>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.inkSoft }}>{c.kind === 'music' ? (lang === 'pt' ? 'Música' : 'Music') : (lang === 'pt' ? 'Cabelo e Maquilhagem' : 'Hair & Makeup')}</div>
        </div>
        <Chip tone={{ bg: hexToRgba(statusTone, 0.16), fg: statusTone, dot: statusTone }} size={11}>{statusLabel}</Chip>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
        {msg && <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: hexToRgba(PALETTE.sage, 0.18), borderRadius: 14, padding: '12px 14px', marginBottom: 16, fontFamily: 'var(--sans)', fontSize: 13, color: PALETTE.nearBlack }}><Icon name="check2" size={18} color={PALETTE.sage} stroke={1.8} />{msg}</div>}

        {/* event meta */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <div style={{ flex: 1 }}><Label size={9.5} style={{ marginBottom: 5 }}>{lang === 'pt' ? 'Data' : 'Date'}</Label><input value={c.date || ''} onChange={e => setField('date', e.target.value)} disabled={!editing} style={{ ...inp, width: '100%' }} /></div>
          <div style={{ flex: 1.4 }}><Label size={9.5} style={{ marginBottom: 5 }}>{lang === 'pt' ? 'Local' : 'Venue'}</Label><input value={c.location || ''} onChange={e => setField('location', e.target.value)} disabled={!editing} style={{ ...inp, width: '100%' }} /></div>
        </div>

        {c.kind === 'music' ? (
          <>
            <Label size={10.5} style={{ marginBottom: 10 }}>{lang === 'pt' ? 'Momentos' : 'Moments'}</Label>
            {(c.moments || []).map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input value={m.time} onChange={e => setMoment(i, 'time', e.target.value)} disabled={!editing} placeholder="00:00" style={{ ...inp, width: 70, fontFamily: 'var(--serif-display)', fontWeight: 600, color: accent }} />
                <input value={m.label} onChange={e => setMoment(i, 'label', e.target.value)} disabled={!editing} style={{ ...inp, flex: 1 }} />
                {editing && <button onClick={() => removeMoment(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.clay, padding: 4, display: 'flex' }}><Icon name="x" size={16} color={PALETTE.clay} stroke={2} /></button>}
              </div>
            ))}
            {editing && <button onClick={addMoment} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, fontFamily: 'var(--sans)', fontSize: 12.5, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="plus" size={14} color={accent} stroke={2} />{lang === 'pt' ? 'Adicionar momento' : 'Add moment'}</button>}
          </>
        ) : (
          <>
            {['cabelo', 'maquilhagem'].map(svc => {
              const rows = (c.slots || []).map((s, i) => ({ s, i })).filter(x => x.s.service === svc)
              return (
                <div key={svc} style={{ marginBottom: 18 }}>
                  <Label size={10.5} style={{ marginBottom: 10 }}>{svc === 'cabelo' ? 'Cabelo' : 'Maquilhagem'}</Label>
                  {rows.map(({ s, i }) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <input value={s.time} onChange={e => setSlot(i, 'time', e.target.value)} disabled={!editing} placeholder="00:00" style={{ ...inp, width: 64, fontFamily: 'var(--serif-display)', fontWeight: 600, color: accent }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input value={s.person} onChange={e => setSlot(i, 'person', e.target.value)} disabled={!editing} placeholder={lang === 'pt' ? 'Pessoa (ex.: Noiva, Madrinha…)' : 'Person'} style={{ ...inp, width: '100%', fontWeight: 500 }} />
                        {(editing || s.note) && <input value={s.note} onChange={e => setSlot(i, 'note', e.target.value)} disabled={!editing} placeholder={lang === 'pt' ? 'Indicação (opcional)' : 'Note (optional)'} style={{ ...inp, width: '100%', fontSize: 12 }} />}
                      </div>
                      {editing && <button onClick={() => removeSlot(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.clay, padding: 4, display: 'flex' }}><Icon name="x" size={16} color={PALETTE.clay} stroke={2} /></button>}
                    </div>
                  ))}
                  {editing && <button onClick={() => addSlot(svc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, fontFamily: 'var(--sans)', fontSize: 12.5, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="plus" size={14} color={accent} stroke={2} />{lang === 'pt' ? 'Adicionar pessoa' : 'Add person'}</button>}
                </div>
              )
            })}
          </>
        )}

        <Label size={10.5} style={{ margin: '8px 0 8px' }}>{lang === 'pt' ? 'Notas' : 'Notes'}</Label>
        <textarea value={c.notes || ''} onChange={e => setField('notes', e.target.value)} disabled={!editing} rows={3} style={{ ...inp, width: '100%', resize: 'vertical', lineHeight: 1.5 }} />
      </div>

      <div style={{ flexShrink: 0, padding: '12px 18px 30px', background: 'var(--paper-card)', borderTop: '1px solid rgba(74,63,53,0.07)', display: 'flex', gap: 12 }}>
        {editing
          ? <Btn variant="solid" accent={accent} size="md" full icon="check" onClick={save}>{lang === 'pt' ? 'Guardar' : 'Save'}</Btn>
          : <>
              <Btn variant="ghost" accent={accent} size="md" icon="edit" onClick={() => setEditing(true)}>{lang === 'pt' ? 'Editar' : 'Edit'}</Btn>
              <Btn variant="ghost" accent={accent} size="md" icon="file" onClick={() => downloadSchedule(c, lang)}>PDF</Btn>
              <Btn variant="solid" accent={accent} size="md" full icon="send" onClick={send}>{lang === 'pt' ? 'Enviar' : 'Send'}</Btn>
            </>}
      </div>
    </div>
  )
}
