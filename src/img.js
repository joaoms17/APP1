// Comprime fotos antes do upload (máx 1600px, JPEG ~82%) para poupar
// espaço no Storage; PDFs e ficheiros pequenos seguem como estão.
export async function compressImage(file, maxDim = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/')) return file
  let bmp
  try { bmp = await createImageBitmap(file) } catch { return file }
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality))
  return blob || file
}
