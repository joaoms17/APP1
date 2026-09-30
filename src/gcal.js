// Google Calendar (só leitura): busca o feed iCal de UM calendário pelo proxy /api/gcal
// (o browser não o pode ir buscar diretamente por CORS) e expande-o numa janela de -3 a +13 meses.
// Devolve [{uid, date, time, title, location}] ordenado; lança erro se ESTE calendário falhar
// (o store guarda o estado por calendário — spec §14.4).
const gcalError = (message, extra) => Object.assign(new Error(message), { name: 'GcalError' }, extra)

export async function fetchGoogleEvents(icsUrl) {
  let res
  try {
    res = await fetch(`/api/gcal?url=${encodeURIComponent(icsUrl)}`)
  } catch (e) {
    throw gcalError('Sem ligação. Verifica a internet e tenta de novo.', { network: true, cause: e })
  }
  if (!res.ok) {
    let msg = `erro ${res.status}`
    try { msg = (await res.json()).error || msg } catch { /* corpo não-JSON */ }
    throw gcalError(msg, { status: res.status })
  }
  const text = await res.text()
  // ical.js só é carregado quando há calendários ligados (fora do chunk inicial)
  const { parseGoogleIcs } = await import('./gcalParse.js')
  try {
    return parseGoogleIcs(text)
  } catch (e) {
    throw gcalError('O endereço não devolveu um calendário iCal válido.', { cause: e })
  }
}
