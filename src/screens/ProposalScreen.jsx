import React from 'react'
import { PALETTE, hexToRgba } from '../data'
import { Icon, Label, Rule, Btn, AIBadge, Eucalyptus, Chip } from '../ui'
import { proposalPdfBlob, downloadBlob } from '../pdf'

const inp = { boxSizing: 'border-box', padding: '7px 9px', borderRadius: 8, border: '1px solid rgba(74,63,53,0.2)', background: 'var(--paper)', fontFamily: 'var(--sans)', fontSize: 13, color: PALETTE.nearBlack, outline: 'none' }

// Build a printable A4 HTML document from the proposal content
function buildProposalHTML(c, lang) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const eur = (n) => `${Number(n || 0).toLocaleString('pt-PT')} €`
  const line = (it) => `<div class="line"><div class="ln-head"><span class="ln-title">${esc(it.title)}</span><span class="ln-price">${eur(it.price)}${it.unit ? ` <small>/${esc(it.unit)}</small>` : ''}</span></div>${it.description ? `<div class="ln-desc">${esc(it.description)}</div>` : ''}</div>`
  const section = (title, body) => body ? `<div class="sec">${esc(title)}</div>${body}` : ''
  const T = lang === 'pt'
    ? { sobre: 'Sobre', noivas: 'Noivas', conv: 'Convidadas', outros: 'Outros serviços', desl: 'Deslocação', pag: 'Pagamento', termos: 'Termos e condições', deslTxt: (r) => `Calculada a ${r} € por quilómetro.` }
    : { sobre: 'About', noivas: 'Bride', conv: 'Guests', outros: 'Extras', desl: 'Travel', pag: 'Payment', termos: 'Terms & conditions', deslTxt: (r) => `Charged at ${r} € per km.` }
  const logo = c.logo_url
    ? `<img src="${c.logo_url}" style="max-height:80px;max-width:220px;object-fit:contain;margin:0 auto 10px;display:block"/>`
    : `<svg width="34" height="53" viewBox="0 0 40 62" style="display:block;margin:0 auto 10px"><circle cx="20" cy="5" r="3.4" fill="#A9744F"/><path d="M20 8 V58" stroke="#A9744F" stroke-width="2.2" stroke-linecap="round"/><g fill="#93A07E"><ellipse cx="11" cy="20" rx="8" ry="5" transform="rotate(-28 11 20)"/><ellipse cx="29" cy="27" rx="8" ry="5" transform="rotate(28 29 27)"/><ellipse cx="11" cy="34" rx="7.5" ry="4.6" transform="rotate(-28 11 34)"/><ellipse cx="28" cy="41" rx="7" ry="4.4" transform="rotate(28 28 41)"/><ellipse cx="13" cy="48" rx="6" ry="3.8" transform="rotate(-28 13 48)"/></g></svg>`
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(c.company)} — ${T.noivas}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Jost', sans-serif; color: #4A3F35; margin: 0; }
  .head { text-align: center; padding-bottom: 18px; border-bottom: 1px solid #e3dccd; margin-bottom: 20px; }
  .company { font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: 30px; color: #2E2820; }
  .loc { font-size: 11px; letter-spacing: .28em; text-transform: uppercase; color: #93A07E; margin-top: 6px; }
  .sec { font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: #93A07E; font-weight: 500; margin: 20px 0 10px; }
  .about { font-weight: 300; font-size: 13px; line-height: 1.65; }
  .line { padding: 9px 0; border-bottom: 1px solid #efe9dd; }
  .ln-head { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; }
  .ln-title { font-weight: 500; font-size: 14px; color: #2E2820; }
  .ln-price { font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: 16px; color: #A9744F; white-space: nowrap; }
  .ln-price small { color: #6E6155; font-size: 11px; }
  .ln-desc { font-weight: 300; font-size: 12px; color: #6E6155; margin-top: 3px; line-height: 1.5; }
  .txt { font-weight: 300; font-size: 12.5px; line-height: 1.6; white-space: pre-wrap; }
  .terms { font-weight: 300; font-size: 11px; line-height: 1.6; color: #6E6155; white-space: pre-wrap; }
</style></head><body>
  <div class="head">${logo}<div class="company">${esc(c.company)}</div><div class="loc">${esc(c.location)}</div></div>
  ${c.about ? section(T.sobre, `<div class="about">${esc(c.about)}</div>`) : ''}
  ${section(T.noivas, (c.packages || []).map(line).join(''))}
  ${(c.convidadas || []).length ? section(T.conv, c.convidadas.map(line).join('')) : ''}
  ${(c.extras || []).length ? section(T.outros, c.extras.map(line).join('')) : ''}
  ${section(T.desl, `<div class="txt">${T.deslTxt(c.deslocacao_rate)}</div>`)}
  ${c.payment ? section(T.pag, `<div class="txt">${esc(c.payment)}</div>`) : ''}
  ${c.terms ? section(T.termos, `<div class="terms">${esc(c.terms)}</div>`) : ''}
</body></html>`
}


export default function ProposalScreen({ ctx, params }) {
  const { lang, accent, proposals } = ctx
  const prop = (proposals || []).find(p => p.id === params.id)
  const [c, setC] = React.useState(prop ? prop.content : null)
  const [editing, setEditing] = React.useState(false)
  const [status, setStatus] = React.useState(prop ? prop.status : 'rascunho')
  const [savedMsg, setSavedMsg] = React.useState(null)

  if (!prop || !c) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
      <div style={{ fontFamily: 'var(--sans)', color: PALETTE.inkSoft }}>Proposta não encontrada</div>
    </div>
  )

  const setField = (k, v) => setC(p => ({ ...p, [k]: v }))
  const setLine = (group, i, k, v) => setC(p => ({ ...p, [group]: p[group].map((it, idx) => idx === i ? { ...it, [k]: v } : it) }))
  const removeLine = (group, i) => setC(p => ({ ...p, [group]: p[group].filter((_, idx) => idx !== i) }))
  const addExtra = () => setC(p => ({ ...p, extras: [...(p.extras || []), { title: lang === 'pt' ? 'Novo serviço' : 'New service', description: '', price: 0, unit: '' }] }))

  const save = async () => { await ctx.update('proposals', prop.id, { content: c }); setEditing(false); flash(lang === 'pt' ? 'Guardado ✓' : 'Saved ✓') }
  const send = async () => {
    const sentAt = new Date().toISOString()
    try {
      await ctx.update('proposals', prop.id, { content: c, status: 'enviada', sent_content: c, sent_at: sentAt })
      flash(lang === 'pt' ? 'Marcada como enviada — versão guardada' : 'Marked as sent — version saved')
    } catch (e) {
      // Colunas sent_content/sent_at podem não existir ainda — marca na mesma
      console.warn('[Ramo] snapshot indisponível, a marcar só o estado:', e?.message)
      try { await ctx.update('proposals', prop.id, { content: c, status: 'enviada' }) } catch (_) {}
      flash(lang === 'pt' ? 'Marcada como enviada (corra a ALTER para guardar a versão)' : 'Marked as sent (run the ALTER to save the version)')
    }
    setStatus('enviada')
  }
  const sentAt = prop.sent_at ? new Date(prop.sent_at) : null
  const sentLabel = sentAt ? sentAt.toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
  const flash = (m) => { setSavedMsg(m); setTimeout(() => setSavedMsg(null), 2600) }
  const [pdfBusy, setPdfBusy] = React.useState(false)
  const makePdf = async (content) => {
    if (pdfBusy) return
    setPdfBusy(true)
    flash(lang === 'pt' ? 'A gerar PDF…' : 'Generating PDF…')
    try {
      const blob = await proposalPdfBlob(content)
      downloadBlob(blob, `Orcamento-${(prop.client_name || 'cliente').replace(/\s+/g, '_')}.pdf`)
      await ctx.savePdf('proposals', prop.id, blob)
      flash(lang === 'pt' ? 'PDF guardado no histórico ✓' : 'PDF saved ✓')
    } catch (e) { console.error(e); flash(lang === 'pt' ? 'Erro ao gerar PDF' : 'PDF error') }
    finally { setPdfBusy(false) }
  }
  const fmt = (n) => `${Number(n || 0).toLocaleString('pt-PT')} €`

  const statusTone = { rascunho: PALETTE.inkSoft, enviada: PALETTE.gold, aceite: PALETTE.sage }[status] || PALETTE.inkSoft
  const statusLabel = { rascunho: lang === 'pt' ? 'Rascunho' : 'Draft', enviada: lang === 'pt' ? 'Enviada' : 'Sent', aceite: lang === 'pt' ? 'Aceite' : 'Accepted' }[status]

  const Section = ({ children }) => <div style={{ fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: PALETTE.sage, fontWeight: 500, margin: '22px 0 12px' }}>{children}</div>

  const LineBlock = ({ group, it, i }) => (
    <div style={{ padding: '11px 0', borderBottom: '1px solid rgba(74,63,53,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        {editing
          ? <input value={it.title} onChange={e => setLine(group, i, 'title', e.target.value)} style={{ ...inp, flex: 1, fontWeight: 600 }} />
          : <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 14, color: PALETTE.nearBlack, flex: 1 }}>{it.title}</div>}
        {editing
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="number" value={it.price} onChange={e => setLine(group, i, 'price', Number(e.target.value))} style={{ ...inp, width: 74, textAlign: 'right' }} />
              <input value={it.unit} onChange={e => setLine(group, i, 'unit', e.target.value)} placeholder="un." style={{ ...inp, width: 60 }} />
            </div>
          : <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16, color: accent, whiteSpace: 'nowrap' }}>{fmt(it.price)}{it.unit ? <span style={{ fontSize: 11, color: PALETTE.inkSoft }}> /{it.unit}</span> : ''}</div>}
      </div>
      {editing
        ? <textarea value={it.description} onChange={e => setLine(group, i, 'description', e.target.value)} rows={2} placeholder={lang === 'pt' ? 'Descrição' : 'Description'} style={{ ...inp, width: '100%', marginTop: 6, resize: 'vertical', fontSize: 12 }} />
        : it.description ? <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.inkSoft, marginTop: 3, lineHeight: 1.5 }}>{it.description}</div> : null}
      {editing && <button onClick={() => removeLine(group, i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.clay, fontFamily: 'var(--sans)', fontSize: 11.5, marginTop: 4 }}>{lang === 'pt' ? 'Remover' : 'Remove'}</button>}
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper-warm)' }}>
      <div style={{ paddingTop: 28, paddingBottom: 14, paddingInline: 14, background: 'var(--paper-card)', borderBottom: '1px solid rgba(74,63,53,0.07)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={ctx.pop} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}><Icon name="chevL" size={24} color={accent} stroke={2} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 20, color: PALETTE.nearBlack }}>{lang === 'pt' ? 'Proposta comercial' : 'Proposal'}</div>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 12, color: PALETTE.inkSoft }}>{prop.client_name}</div>
        </div>
        <Chip tone={{ bg: hexToRgba(statusTone, 0.16), fg: statusTone, dot: statusTone }} size={11}>{statusLabel}</Chip>
        <button onClick={async () => { if (window.confirm(lang === 'pt' ? 'Apagar esta proposta?' : 'Delete this proposal?')) { await ctx.remove('proposals', prop.id); ctx.pop() } }} title={lang === 'pt' ? 'Apagar' : 'Delete'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <Icon name="x" size={18} color={PALETTE.clay} stroke={2} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 24px' }}>
        {savedMsg && <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: hexToRgba(PALETTE.sage, 0.18), borderRadius: 14, padding: '12px 14px', marginBottom: 16, fontFamily: 'var(--sans)', fontSize: 13, color: PALETTE.nearBlack }}><Icon name="check2" size={18} color={PALETTE.sage} stroke={1.8} />{savedMsg}</div>}

        {sentLabel && prop.sent_content && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: hexToRgba(PALETTE.gold, 0.13), border: `1px solid ${hexToRgba(PALETTE.gold, 0.35)}`, borderRadius: 14, padding: '11px 14px', marginBottom: 16 }}>
            <Icon name="check2" size={18} color={PALETTE.gold} stroke={1.8} />
            <span style={{ flex: 1, fontFamily: 'var(--sans)', fontSize: 12.5, color: PALETTE.ink }}>
              {lang === 'pt' ? `Versão enviada guardada · ${sentLabel}` : `Sent version saved · ${sentLabel}`}
            </span>
            <button onClick={() => makePdf(prop.sent_content)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.terracottaDark, fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
              {lang === 'pt' ? 'Descarregar' : 'Download'}
            </button>
          </div>
        )}

        <div style={{ background: 'var(--paper-card)', borderRadius: 14, boxShadow: '0 14px 40px rgba(74,63,53,0.12)', overflow: 'hidden', border: '1px solid rgba(74,63,53,0.05)' }}>
          {/* letterhead */}
          <div style={{ padding: '28px 26px 20px', textAlign: 'center', borderBottom: '1px solid rgba(74,63,53,0.1)' }}>
            {c.logo_url ? <img src={c.logo_url} alt="logo" style={{ maxHeight: 70, maxWidth: 200, objectFit: 'contain', marginBottom: 10 }} /> : <Eucalyptus size={26} stem={accent} leaf={PALETTE.sage} style={{ margin: '0 auto 10px' }} />}
            {editing && (c.logo_options?.length > 0) && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                {c.logo_options.map(o => (
                  <button key={o.key} onClick={() => setField('logo_url', o.url)} title={o.label} style={{ width: 50, height: 40, borderRadius: 8, background: 'var(--paper)', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${c.logo_url === o.url ? accent : 'rgba(74,63,53,0.16)'}` }}>
                    <img src={o.url} alt={o.label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </button>
                ))}
                <button onClick={() => setField('logo_url', '')} title="Sem logo" style={{ width: 50, height: 40, borderRadius: 8, background: 'var(--paper)', cursor: 'pointer', border: `2px solid ${!c.logo_url ? accent : 'rgba(74,63,53,0.16)'}`, fontFamily: 'var(--sans)', fontSize: 16, color: PALETTE.sage }}>✿</button>
              </div>
            )}
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 25, color: PALETTE.nearBlack }}>{c.company}</div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, letterSpacing: '0.28em', textTransform: 'uppercase', color: PALETTE.sage, marginTop: 6 }}>{c.location}</div>
          </div>

          <div style={{ padding: '20px 26px 28px' }}>
            {/* sobre */}
            {(c.about || editing) && <>
              <Section>{lang === 'pt' ? 'Sobre' : 'About'}</Section>
              {editing
                ? <textarea value={c.about} onChange={e => setField('about', e.target.value)} rows={4} style={{ ...inp, width: '100%', resize: 'vertical' }} />
                : <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.ink, lineHeight: 1.6 }}>{c.about}</div>}
            </>}

            {/* noivas */}
            <Section>{lang === 'pt' ? 'Noivas' : 'Bride'}</Section>
            {c.packages.length ? c.packages.map((it, i) => <LineBlock key={i} group="packages" it={it} i={i} />)
              : <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: PALETTE.inkSoft }}>{lang === 'pt' ? 'Sem pacote para os serviços selecionados.' : 'No package for selected services.'}</div>}

            {c.convidadas.length > 0 && <>
              <Section>{lang === 'pt' ? 'Convidadas' : 'Guests'}</Section>
              {c.convidadas.map((it, i) => <LineBlock key={i} group="convidadas" it={it} i={i} />)}
            </>}

            {(c.extras?.length > 0 || editing) && <>
              <Section>{lang === 'pt' ? 'Outros serviços' : 'Extras'}</Section>
              {(c.extras || []).map((it, i) => <LineBlock key={i} group="extras" it={it} i={i} />)}
              {editing && <button onClick={addExtra} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, fontFamily: 'var(--sans)', fontSize: 12.5, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="plus" size={14} color={accent} stroke={2} />{lang === 'pt' ? 'Adicionar serviço' : 'Add service'}</button>}
            </>}

            <Section>{lang === 'pt' ? 'Deslocação' : 'Travel'}</Section>
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.ink }}>
              {lang === 'pt' ? 'Calculada a ' : 'Charged at '}
              {editing ? <input type="number" step="0.05" value={c.deslocacao_rate} onChange={e => setField('deslocacao_rate', Number(e.target.value))} style={{ ...inp, width: 70 }} /> : <strong>{c.deslocacao_rate} €</strong>}
              {lang === 'pt' ? ' por quilómetro.' : ' per km.'}
            </div>

            {(c.payment || editing) && <>
              <Section>{lang === 'pt' ? 'Pagamento' : 'Payment'}</Section>
              {editing
                ? <textarea value={c.payment} onChange={e => setField('payment', e.target.value)} rows={4} style={{ ...inp, width: '100%', resize: 'vertical' }} />
                : <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.payment}</div>}
            </>}

            {(c.terms || editing) && <>
              <Section>{lang === 'pt' ? 'Termos e condições' : 'Terms'}</Section>
              {editing
                ? <textarea value={c.terms} onChange={e => setField('terms', e.target.value)} rows={7} style={{ ...inp, width: '100%', resize: 'vertical' }} />
                : <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 11.5, color: PALETTE.inkSoft, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.terms}</div>}
            </>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, padding: '0 4px' }}>
          <Eucalyptus size={15} stem={PALETTE.terracottaDark} leaf={PALETTE.sage} />
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 11.5, color: PALETTE.inkSoft, lineHeight: 1.4 }}>
            {lang === 'pt' ? 'Gerada a partir da tabela de preços e dos serviços da lead. Edite antes de enviar.' : 'Generated from the price table and the lead services. Edit before sending.'}
          </span>
        </div>
      </div>

      <div style={{ flexShrink: 0, padding: '12px 18px 30px', background: 'var(--paper-card)', borderTop: '1px solid rgba(74,63,53,0.07)', display: 'flex', gap: 12 }}>
        {editing
          ? <Btn variant="solid" accent={accent} size="md" full icon="check" onClick={save}>{lang === 'pt' ? 'Guardar alterações' : 'Save changes'}</Btn>
          : <>
              <Btn variant="ghost" accent={accent} size="md" icon="edit" onClick={() => setEditing(true)}>{lang === 'pt' ? 'Editar' : 'Edit'}</Btn>
              <Btn variant="ghost" accent={accent} size="md" icon="file" onClick={() => makePdf(c)}>{pdfBusy ? '…' : 'PDF'}</Btn>
              <Btn variant="solid" accent={accent} size="md" full icon="check" onClick={send}>{lang === 'pt' ? 'Marcar como enviada' : 'Mark as sent'}</Btn>
            </>}
      </div>
    </div>
  )
}
