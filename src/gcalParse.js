import ICAL from 'ical.js'

const pad = (n) => String(n).padStart(2, '0')
const ymdOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hmOf = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

// Expande um feed iCal do Google Calendar numa janela de -3 a +13 meses à volta de `now`.
// Devolve [{uid, date:'yyyy-mm-dd', time:'HH:MM'|null, title, location}] ordenado.
// Carregado só por import() dinâmico a partir de gcal.js (ical.js fica fora do chunk inicial).
export function parseGoogleIcs(text, now = new Date()) {
  const comp = new ICAL.Component(ICAL.parse(text))
  for (const tz of comp.getAllSubcomponents('vtimezone')) {
    try { ICAL.TimezoneService.register(tz) } catch { /* já registado */ }
  }

  const start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 13, 1)
  const out = []
  const push = (jsDate, ev, isDate) => {
    if (jsDate < start || jsDate >= end) return
    out.push({
      uid: ev.uid || null,
      date: ymdOf(jsDate),
      time: isDate ? null : hmOf(jsDate),
      title: ev.summary || '(sem título)',
      location: ev.location || null,
    })
  }

  // ocorrência alterada de uma série (RECURRENCE-ID): o iterador do mestre já a aplica (data, hora e
  // título novos) — se o mestre está no feed, não se acrescenta outra vez como evento solto
  const vevents = comp.getAllSubcomponents('vevent')
  const masters = new Set(vevents
    .filter((v) => v.hasProperty('rrule') && !v.hasProperty('recurrence-id'))
    .map((v) => v.getFirstPropertyValue('uid')))
  for (const v of vevents) {
    if (v.hasProperty('recurrence-id') && masters.has(v.getFirstPropertyValue('uid'))) continue
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
            push(det.startDate.toJSDate(), { uid: ev.uid, summary: det.item.summary, location: det.item.location }, det.startDate.isDate)
          } catch {
            push(occ, ev, ev.startDate?.isDate)
          }
        }
      } else if (ev.startDate) {
        push(ev.startDate.toJSDate(), ev, ev.startDate.isDate)
      }
    } catch { /* evento malformado — ignorar */ }
  }

  // nunca a mesma ocorrência duas vezes (uid + dia + hora)
  const seen = new Set()
  const unique = out.filter((e) => { const k = `${e.uid || e.title}|${e.date}|${e.time || ''}`; return !seen.has(k) && seen.add(k) })
  unique.sort((a, b) => (a.date + (a.time || '99:99')).localeCompare(b.date + (b.time || '99:99')))
  return unique
}
