import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// Render a full HTML document (string) into a real multi-page A4 PDF Blob.
// Works on mobile (no print dialog) — rasterizes via html2canvas + jsPDF.
export async function htmlToPdfBlob(fullHtml) {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:820px;height:1200px;border:0;background:#fff;'
  document.body.appendChild(iframe)
  try {
    const doc = iframe.contentWindow.document
    doc.open(); doc.write(fullHtml); doc.close()
    // give fonts/images a moment to load
    await new Promise(r => setTimeout(r, 700))
    const target = doc.body
    const canvas = await html2canvas(target, { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 820 })
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pw = pdf.internal.pageSize.getWidth()
    const ph = pdf.internal.pageSize.getHeight()
    const imgH = (canvas.height * pw) / canvas.width
    const img = canvas.toDataURL('image/jpeg', 0.92)
    let heightLeft = imgH
    let pos = 0
    pdf.addImage(img, 'JPEG', 0, pos, pw, imgH)
    heightLeft -= ph
    while (heightLeft > 0) {
      pos -= ph
      pdf.addPage()
      pdf.addImage(img, 'JPEG', 0, pos, pw, imgH)
      heightLeft -= ph
    }
    return pdf.output('blob')
  } finally {
    setTimeout(() => { try { document.body.removeChild(iframe) } catch (_) {} }, 100)
  }
}

// Trigger a download of a Blob (mobile-friendly).
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url) }, 4000)
}
