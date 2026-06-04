import jsPDF from 'jspdf'

// Brand colors (RGB)
const C = {
  terracotta: [169, 116, 79], sage: [147, 160, 126], ink: [74, 63, 53],
  near: [46, 40, 32], soft: [110, 97, 85], line: [225, 218, 203], gold: [200, 168, 107],
}
const eur = (n) => `${Number(n || 0).toLocaleString('pt-PT')} €`

// ── Brand fonts (Cormorant Garamond + Jost), embedded once ────
let FONTS = null
function ab2b64(buf) {
  let bin = ''; const b = new Uint8Array(buf)
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i])
  return btoa(bin)
}
function isFont(buf) {
  if (!buf || buf.byteLength < 4) return false
  const h = new Uint8Array(buf.slice(0, 4))
  const sig = String.fromCharCode(h[0], h[1], h[2], h[3])
  return (h[0] === 0 && h[1] === 1 && h[2] === 0 && h[3] === 0) || sig === 'OTTO' || sig === 'true' || sig === 'ttcf'
}
async function loadFonts() {
  if (FONTS) return FONTS
  const files = {
    corN: '/brand/fonts/CormorantGaramond-Regular.ttf',
    corB: '/brand/fonts/CormorantGaramond-SemiBold.ttf',
    jostN: '/brand/fonts/Jost-Regular.ttf',
    jostB: '/brand/fonts/Jost-Medium.ttf',
  }
  const out = {}
  await Promise.all(Object.entries(files).map(async ([k, u]) => {
    try {
      const r = await fetch(u)
      if (!r.ok) { out[k] = null; return }
      const buf = await r.arrayBuffer()
      out[k] = isFont(buf) ? ab2b64(buf) : null   // ignore HTML/404 fallbacks
    } catch (_) { out[k] = null }
  }))
  FONTS = out
  return out
}
function setupFonts(doc, f) {
  const reg = (b64, file, fam, style) => {
    try { if (b64) { doc.addFileToVFS(file, b64); doc.addFont(file, fam, style); return true } } catch (_) {}
    return false
  }
  const cor = reg(f.corN, 'Cor-N.ttf', 'Cormorant', 'normal') && reg(f.corB, 'Cor-B.ttf', 'Cormorant', 'bold')
  const jost = reg(f.jostN, 'Jost-N.ttf', 'Jost', 'normal') && reg(f.jostB, 'Jost-B.ttf', 'Jost', 'bold')
  return { SERIF: cor ? 'Cormorant' : 'times', SANS: jost ? 'Jost' : 'helvetica' }
}

async function addLogo(doc, dataUrl, pageW, y) {
  if (!dataUrl) return y
  try {
    const props = doc.getImageProperties(dataUrl)
    const maxH = 20, maxW = 55
    const ratio = props.width / props.height
    let h = maxH, w = h * ratio
    if (w > maxW) { w = maxW; h = w / ratio }
    doc.addImage(dataUrl, (props.fileType || 'PNG'), (pageW - w) / 2, y, w, h)
    return y + h + 5
  } catch (_) { return y }
}

// centered text that correctly accounts for letter-spacing (jsPDF align:center ignores charSpace)
function centerTracked(doc, text, y, pageW, charSpace) {
  const w = doc.getTextWidth(text) + charSpace * Math.max(0, text.length - 1)
  doc.text(text, (pageW - w) / 2, y, { charSpace })
}

function goldRule(doc, pageW, M, y) {
  doc.setDrawColor(...C.gold); doc.setLineWidth(0.4)
  const cx = pageW / 2, gap = 4
  doc.line(M + 8, y, cx - gap, y)
  doc.line(cx + gap, y, pageW - M - 8, y)
  doc.setFillColor(...C.gold); doc.circle(cx, y, 0.7, 'F')
}

// ── Proposta comercial ────────────────────────────────────────
export async function proposalPdfBlob(c) {
  const f = await loadFonts()
  const doc = new jsPDF('p', 'mm', 'a4')
  const { SERIF, SANS } = setupFonts(doc, f)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 20, cw = pageW - 2 * M
  let y = M + 2

  const ensure = (need) => { if (y + need > pageH - M) { doc.addPage(); y = M } }
  const section = (title) => {
    ensure(16); y += 5
    doc.setFont(SANS, 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C.sage)
    doc.text(title.toUpperCase(), M, y, { charSpace: 1.4 }); y += 5.5
  }
  const para = (t, size = 9.5, color = C.ink) => {
    doc.setFont(SANS, 'normal'); doc.setFontSize(size); doc.setTextColor(...color)
    doc.splitTextToSize(String(t || ''), cw).forEach(ln => { ensure(size * 0.6); doc.text(ln, M, y); y += size * 0.55 })
    y += 1.5
  }
  const item = (it) => {
    ensure(12)
    doc.setFont(SANS, 'bold'); doc.setFontSize(11); doc.setTextColor(...C.near)
    doc.text(it.title || '', M, y)
    doc.setFont(SERIF, 'bold'); doc.setFontSize(13); doc.setTextColor(...C.terracotta)
    doc.text(`${eur(it.price)}${it.unit ? ` /${it.unit}` : ''}`, pageW - M, y, { align: 'right' })
    y += 5
    if (it.description) {
      doc.setFont(SANS, 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.soft)
      doc.splitTextToSize(it.description, cw).forEach(ln => { ensure(4); doc.text(ln, M, y); y += 3.8 })
    }
    doc.setDrawColor(...C.line); doc.setLineWidth(0.2); doc.line(M, y + 1.5, pageW - M, y + 1.5); y += 5.5
  }

  // letterhead
  y = await addLogo(doc, c.logo_url, pageW, y)
  doc.setFont(SERIF, 'bold'); doc.setFontSize(26); doc.setTextColor(...C.near)
  doc.text(c.company || 'Ramo Eventos', pageW / 2, y + 5, { align: 'center' }); y += 11
  doc.setFont(SANS, 'normal'); doc.setFontSize(8); doc.setTextColor(...C.sage)
  centerTracked(doc, (c.location || '').toUpperCase(), y, pageW, 2); y += 6
  goldRule(doc, pageW, M, y); y += 4

  if (c.about) { section('Sobre'); para(c.about) }
  if (c.packages?.length) { section('Noivas'); c.packages.forEach(item) }
  if (c.convidadas?.length) { section('Convidadas'); c.convidadas.forEach(item) }
  if (c.extras?.length) { section('Outros serviços'); c.extras.forEach(item) }
  section('Deslocação'); para(`Calculada a ${c.deslocacao_rate} € por quilómetro.`)
  if (c.payment) { section('Pagamento'); para(c.payment) }
  if (c.terms) { section('Termos e condições'); para(c.terms, 7.6, C.soft) }

  return doc.output('blob')
}

// ── Cronograma do dia ─────────────────────────────────────────
export async function schedulePdfBlob(c) {
  const f = await loadFonts()
  const doc = new jsPDF('p', 'mm', 'a4')
  const { SERIF, SANS } = setupFonts(doc, f)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 20, cw = pageW - 2 * M
  let y = M + 2
  const ensure = (need) => { if (y + need > pageH - M) { doc.addPage(); y = M } }
  const section = (title) => {
    ensure(16); y += 6
    doc.setFont(SANS, 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C.sage)
    doc.text(title.toUpperCase(), M, y, { charSpace: 1.4 }); y += 2
    doc.setDrawColor(...C.line); doc.setLineWidth(0.2); doc.line(M, y, pageW - M, y); y += 5.5
  }
  const slot = (time, person, note) => {
    ensure(9)
    doc.setFont(SERIF, 'bold'); doc.setFontSize(13); doc.setTextColor(...C.terracotta)
    doc.text(time || '—', M, y)
    doc.setFont(SANS, 'bold'); doc.setFontSize(10.5); doc.setTextColor(...C.near)
    doc.text(person || '', M + 24, y)
    let adv = 5.5
    if (note) {
      doc.setFont(SANS, 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.soft)
      const ls = doc.splitTextToSize(note, cw - 24)
      ls.forEach((ln, i) => doc.text(ln, M + 24, y + 4 + i * 3.7))
      adv = 4 + ls.length * 3.7 + 2.5
    }
    doc.setDrawColor(...C.line); doc.setLineWidth(0.15); doc.line(M, y + adv - 2, pageW - M, y + adv - 2)
    y += adv + 1.5
  }

  y = await addLogo(doc, c.logo_url, pageW, y)
  doc.setFont(SERIF, 'bold'); doc.setFontSize(24); doc.setTextColor(...C.near)
  doc.text(c.client || 'Evento', pageW / 2, y + 4, { align: 'center' }); y += 9
  doc.setFont(SANS, 'normal'); doc.setFontSize(9); doc.setTextColor(...C.sage)
  centerTracked(doc, `${c.date || ''}${c.location ? `   ·   ${c.location}` : ''}`.toUpperCase(), y, pageW, 1.5); y += 6
  goldRule(doc, pageW, M, y); y += 2

  if (c.kind === 'music') {
    section('Música')
    ;(c.moments || []).forEach(m => slot(m.time, m.label, ''))
  } else {
    ;[['cabelo', 'Cabelo'], ['maquilhagem', 'Maquilhagem']].forEach(([k, label]) => {
      const rows = (c.slots || []).filter(s => s.service === k)
      if (!rows.length) return
      section(label)
      rows.forEach(s => slot(s.time, s.person, s.note))
    })
  }

  if (c.notes) {
    y += 4; ensure(20)
    doc.setFont(SANS, 'normal'); doc.setFontSize(8.6); doc.setTextColor(...C.ink)
    doc.splitTextToSize(c.notes, cw).forEach(ln => { ensure(4.5); doc.text(ln, M, y); y += 4.2 })
  }

  return doc.output('blob')
}

// Download a Blob (mobile-friendly)
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url) }, 4000)
}
