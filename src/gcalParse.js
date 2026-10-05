import ICAL from 'ical.js'

const pad = (n) => String(n).padStart(2, '0')
const ymdOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
// dia e hora sempre na hora de Portugal, seja qual for o fuso do telemóvel: a chave do Google
// (calendário|dia|hora|uid) não muda quando a Joana viaja (senão todos os eventos pareciam "mudados")
const LISBON = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
const lisbonOf = (d) => {
  const p = Object.fromEntries(LISBON.formatToParts(d).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }
}

// Expande um feed iCal do Google Calendar numa janela de -3 a +13 meses à volta de `now`.
// Devolve [{uid, date:'yyyy-mm-dd', time:'HH:MM'|null, title, location}] ordenado.
// Carregado só por import() dinâmico a partir de gcal.js (ical.js fica fora do chunk inicial).
export function parseGoogleIcs(text, now = new Date()) {
  const comp = new ICAL.Component(ICAL.parse(text))
  // os fusos de um feed não ficam para o seguinte (o registo do ical.js é global)
  try { ICAL.TimezoneService.reset() } catch { /* versão sem reset */ }
  for (const tz of comp.getAllSubcomponents('vtimezone')) {
    try { ICAL.TimezoneService.register(tz) } catch { /* já registado */ }
  }

  // desde 2023: o histórico só serve para dar o local aos eventos antigos (o store mostra por registar
  // apenas os dos últimos 3 meses)
  const start = new Date(Math.min(new Date(2023, 0, 1), new Date(now.getFullYear(), now.getMonth() - 3, 1)))
  const end = new Date(now.getFullYear(), now.getMonth() + 13, 1)
  const out = []
  // ICAL.Time → { date, time }: dia inteiro e horas "flutuantes" (sem fuso) valem como estão escritas;
  // horas com fuso passam para a hora de Portugal
  const partsOf = (t) => {
    const date = `${t.year}-${pad(t.month)}-${pad(t.day)}`
    if (t.isDate) return { date, time: null }
    if (!t.zone || t.zone.tzid === 'floating') return { date, time: `${pad(t.hour)}:${pad(t.minute)}` }
    return lisbonOf(t.toJSDate())
  }
  // t = início real; recur = início ORIGINAL da ocorrência numa série (RECURRENCE-ID): a data dele
  // identifica a ocorrência mesmo depois de ela mudar de dia ou de hora no Google
  const push = (t, ev, recur = null) => {
    const js = t.toJSDate()
    if (js < start || js >= end) return
    const at = partsOf(t)
    out.push({
      uid: ev.uid || null,
      recur: recur ? partsOf(recur).date : null,
      date: at.date,
      time: at.time,
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
  const cancelled = (c) => String(c?.getFirstPropertyValue?.('status') || '').toUpperCase() === 'CANCELLED'
  for (const v of vevents) {
    const uid = v.getFirstPropertyValue('uid')
    if (v.hasProperty('recurrence-id') && masters.has(uid)) continue
    if (cancelled(v)) continue // cancelado no Google: não está (o evento ligado fica "Já não está no Google")
    let ev
    try {
      // cada série só com as SUAS exceções (sem isto o ical.js junta exceções de outros eventos à mesma hora)
      ev = v.hasProperty('rrule')
        ? new ICAL.Event(v, { exceptions: vevents.filter((x) => x.hasProperty('recurrence-id') && x.getFirstPropertyValue('uid') === uid) })
        : new ICAL.Event(v)
    } catch { continue }
    try {
      if (ev.isRecurring()) {
        const it = ev.iterator()
        let next, guard = 0
        while ((next = it.next()) && guard++ < 1000) {
          const occ = next.toJSDate()
          if (occ >= end) break
          try {
            const det = ev.getOccurrenceDetails(next)
            if (cancelled(det.item.component)) continue // ocorrência cancelada
            push(det.startDate, { uid: ev.uid, summary: det.item.summary, location: det.item.location }, next)
          } catch {
            push(next, ev, next)
          }
        }
      } else if (ev.startDate) {
        // ocorrência solta de uma série cujo mestre não veio no feed: identifica-se pelo RECURRENCE-ID
        const rid = v.getFirstPropertyValue('recurrence-id')
        push(ev.startDate, ev, rid || null)
      }
    } catch { /* evento malformado — ignorar */ }
  }

  // nunca a mesma ocorrência duas vezes (uid + dia + hora)
  const seen = new Set()
  const unique = out.filter((e) => { const k = `${e.uid || e.title}|${e.date}|${e.time || ''}`; return !seen.has(k) && seen.add(k) })
  unique.sort((a, b) => (a.date + (a.time || '99:99')).localeCompare(b.date + (b.time || '99:99')))
  return unique
}
