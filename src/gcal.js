import ICAL from 'ical.js'

const pad = (n) => String(n).padStart(2, '0')
const ymdOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hmOf = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

// Busca e expande os eventos do Google Calendar numa janela de -3 a +13 meses.
// Devolve [{date:'yyyy-mm-dd', time:'HH:MM'|null, title, location}] ordenado.
export async function fetchGoogleEvents(icsUrl) {
  const res = await fetch(`/api/gcal?url=${encodeURIComponent(icsUrl)}`)
  if (!res.ok) {
    let msg = `erro ${res.status}`
    try { msg = (await res.json()).error || msg } catch { /* corpo não-JSON */ }
    throw new Error(msg)
  }
  return parseGoogleIcs(await res.text())
}

export function parseGoogleIcs(text) {
  const comp = new ICAL.Component(ICAL.parse(text))
  for (const tz of comp.getAllSubcomponents('vtimezone')) {
    try { ICAL.TimezoneService.register(tz) } catch { /* já registado */ }
  }

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 13, 1)
  const out = []
  const push = (jsDate, ev, isDate) => {
    if (jsDate < start || jsDate >= end) return
    out.push({
      date: ymdOf(jsDate),
      time: isDate ? null : hmOf(jsDate),
      title: ev.summary || '(sem título)',
      location: ev.location || null,
    })
  }

  for (const v of comp.getAllSubcomponents('vevent')) {
    let ev
    try { ev = new ICAL.Event(v) } catch { continue }
    try {
      if (ev.isRecurring()) {
        const it = ev.iterator()
        let next, guard = 0
        while ((next = it.next()) && guard++ < 1000) {
          const occ = next.toJSDate()
          if (occ >= end) break
          if (occ < start) continue
          try {
            const det = ev.getOccurrenceDetails(next)
            push(det.startDate.toJSDate(), { summary: det.item.summary, location: det.item.location }, det.startDate.isDate)
          } catch {
            push(occ, ev, ev.startDate?.isDate)
          }
        }
      } else if (ev.startDate) {
        push(ev.startDate.toJSDate(), ev, ev.startDate.isDate)
      }
    } catch { /* evento malformado — ignorar */ }
  }

  out.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
  return out
}
