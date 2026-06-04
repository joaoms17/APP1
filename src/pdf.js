import jsPDF from 'jspdf'

// Brand colors (RGB)
const C = {
  terracotta: [169, 116, 79], sage: [147, 160, 126], ink: [74, 63, 53],
  near: [46, 40, 32], soft: [110, 97, 85], line: [225, 218, 203],
}

function eur(n) { return `${Number(n || 0).toLocaleString('pt-PT')} €` }

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

// ── Proposta comercial ────────────────────────────────────────
export async function proposalPdfBlob(c) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 18, cw = pageW - 2 * M
  let y = M + 2

  const ensure = (need) => { if (y + need > pageH - M) { doc.addPage(); y = M } }
  const section = (title) => {
    ensure(14); y += 4
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C.sage)
    doc.text(title.toUpperCase(), M, y); y += 5
  }
  const para = (t, size = 9.5, color = C.ink) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(...color)
    doc.splitTextToSize(String(t || ''), cw).forEach(ln => { ensure(size * 0.55); doc.text(ln, M, y); y += size * 0.52 })
    y += 1.5
  }
  const item = (it) => {
    ensure(11)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...C.near)
    doc.text(it.title || '', M, y)
    doc.setTextColor(...C.terracotta)
    doc.text(`${eur(it.price)}${it.unit ? ` /${it.unit}` : ''}`, pageW - M, y, { align: 'right' })
    y += 4.6
    if (it.description) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3); doc.setTextColor(...C.soft)
      doc.splitTextToSize(it.description, cw).forEach(ln => { ensure(4); doc.text(ln, M, y); y += 3.7 })
    }
    doc.setDrawColor(...C.line); doc.setLineWidth(0.2); doc.line(M, y + 1.5, pageW - M, y + 1.5); y += 5
  }

  // letterhead
  y = await addLogo(doc, c.logo_url, pageW, y)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.setTextColor(...C.near)
  doc.text(c.company || 'Ramo Eventos', pageW / 2, y + 4, { align: 'center' }); y += 9
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C.sage)
  doc.text((c.location || '').toUpperCase(), pageW / 2, y, { align: 'center' }); y += 5
  doc.setDrawColor(...C.line); doc.setLineWidth(0.3); doc.line(M, y, pageW - M, y); y += 3

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
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 18, cw = pageW - 2 * M
  let y = M + 2
  const ensure = (need) => { if (y + need > pageH - M) { doc.addPage(); y = M } }
  const section = (title) => {
    ensure(14); y += 5
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C.sage)
    doc.text(title.toUpperCase(), M, y); y += 2
    doc.setDrawColor(...C.line); doc.setLineWidth(0.2); doc.line(M, y, pageW - M, y); y += 5
  }
  const slot = (time, person, note) => {
    ensure(8)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C.terracotta)
    doc.text(time || '—', M, y)
    doc.setFontSize(10.5); doc.setTextColor(...C.near)
    doc.text(person || '', M + 22, y)
    let adv = 5
    if (note) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3); doc.setTextColor(...C.soft)
      doc.splitTextToSize(note, cw - 22).forEach((ln, i) => { doc.text(ln, M + 22, y + 4 + i * 3.6) })
      adv = 4 + doc.splitTextToSize(note, cw - 22).length * 3.6 + 2
    }
    doc.setDrawColor(...C.line); doc.setLineWidth(0.15); doc.line(M, y + adv - 1.5, pageW - M, y + adv - 1.5)
    y += adv + 1.5
  }

  // letterhead
  y = await addLogo(doc, c.logo_url, pageW, y)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...C.near)
  doc.text(c.client || 'Evento', pageW / 2, y + 4, { align: 'center' }); y += 8
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.sage)
  doc.text(`${c.date || ''}${c.location ? `  ·  ${c.location}` : ''}`.toUpperCase(), pageW / 2, y, { align: 'center' }); y += 5
  doc.setDrawColor(...C.line); doc.setLineWidth(0.3); doc.line(M, y, pageW - M, y); y += 2

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
    y += 3; ensure(20)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.6); doc.setTextColor(...C.ink)
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
