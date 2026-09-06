// Proxy do feed iCal do Google Calendar (o browser não o pode ir buscar
// diretamente por CORS). Só aceita URLs do próprio Google Calendar.
export default async function handler(req, res) {
  const url = req.query.url
  if (!url || !/^https:\/\/calendar\.google\.com\/calendar\/ical\//.test(url)) {
    res.status(400).json({ error: 'URL inválido — usa o endereço secreto iCal do Google Calendar' })
    return
  }
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'joana-agenda/1.0' } })
    if (!r.ok) {
      res.status(502).json({ error: `O Google respondeu ${r.status}` })
      return
    }
    const text = await r.text()
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600')
    res.status(200).send(text)
  } catch (e) {
    res.status(502).json({ error: 'Falha ao contactar o Google Calendar' })
  }
}
