import { useEffect, useMemo, useRef, useState } from 'react'
import { IconButton, Sheet } from '../../ui'
import { useStore } from '../../store.jsx'
import { openSheet } from '../../router.js'
import { cap, fmtDM, MONTHS_LONG } from '../../format.js'
import { hasCoords } from '../../geo.js'
import './Agenda.css'

const pad = (n) => String(n).padStart(2, '0')
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const ALGARVE = [37.1, -8.2]

// Mapa do mês (Agenda › Mês): um ponto por local, na cor do projeto; tocar mostra os eventos desse sítio.
// Os locais em falta são procurados pelo varrimento da app (geoSweep.js); o mapa vai-se enchendo.
export default function MapSheet({ year, month, onClose }) {
  const { today, eventsAsc, projectById, geoReady, geoSweep } = useStore()
  const [ym, setYm] = useState(() => (Number.isFinite(year) && Number.isFinite(month)
    ? { y: year, m: month } : { y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }))
  const prefix = `${ym.y}-${pad(ym.m)}`
  const evs = useMemo(() => eventsAsc.filter((e) => e.event_date.startsWith(prefix)), [eventsAsc, prefix])
  const placed = evs.filter(hasCoords)
  const missing = evs.length - placed.length

  const shift = (d) => setYm(({ y, m }) => { const i = y * 12 + (m - 1) + d; return { y: Math.floor(i / 12), m: (i % 12) + 1 } })

  // ---- Leaflet (carregado só aqui) ----
  const box = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const L = useRef(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let dead = false
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(([mod]) => {
      if (dead || !box.current) return
      L.current = mod.default || mod
      map.current = L.current.map(box.current, { zoomControl: true, attributionControl: true }).setView(ALGARVE, 9)
      L.current.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '&copy; OpenStreetMap',
      }).addTo(map.current)
      layer.current = L.current.layerGroup().addTo(map.current)
      setReady(true)
      // a folha anima ao abrir: o mapa mede-se outra vez quando já tem o tamanho final
      setTimeout(() => map.current?.invalidateSize(), 350)
    })
    return () => { dead = true; map.current?.remove(); map.current = null }
  }, [])

  const key = placed.map((e) => `${e.id}:${e.lat},${e.lng}`).join('|')
  useEffect(() => {
    if (!ready) return
    const Lf = L.current
    layer.current.clearLayers()
    const groups = new Map()
    for (const e of placed) {
      const k = `${Number(e.lat).toFixed(4)},${Number(e.lng).toFixed(4)}`
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k).push(e)
    }
    const pts = []
    for (const list of groups.values()) {
      const e0 = list[0]
      const ll = [Number(e0.lat), Number(e0.lng)]
      pts.push(ll)
      const color = projectById(e0.project_id)?.color || '#888'
      const m = Lf.circleMarker(ll, { radius: list.length > 1 ? 11 : 8, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95 })
      const html = `<b>${esc(e0.location)}</b><ul class="ag-map-pop">${list.map((e) =>
        `<li><a href="#" data-ev="${esc(e.id)}">${esc(fmtDM(e.event_date))} · ${esc(e.title)}</a> <small>${esc(projectById(e.project_id)?.name || '')}</small></li>`).join('')}</ul>`
      m.bindPopup(html)
      m.on('popupopen', (ev) => {
        ev.popup.getElement()?.querySelectorAll('a[data-ev]').forEach((a) => {
          a.onclick = (x) => { x.preventDefault(); openSheet('evento', a.dataset.ev) }
        })
      })
      if (list.length > 1) m.bindTooltip(String(list.length), { permanent: true, direction: 'center', className: 'ag-map-n' })
      m.addTo(layer.current)
    }
    if (pts.length === 1) map.current.setView(pts[0], 12)
    else if (pts.length) map.current.fitBounds(pts, { padding: [30, 30], maxZoom: 13 })
  }, [ready, key]) // eslint-disable-line react-hooks/exhaustive-deps

  const title = `${cap(MONTHS_LONG[ym.m - 1])} ${ym.y}`
  const note = [
    `${placed.length} de ${evs.length} ${evs.length === 1 ? 'evento' : 'eventos'} no mapa`,
    geoSweep.running ? `a procurar locais (${geoSweep.done} de ${geoSweep.total})…`
      : missing ? `${missing} sem local encontrado (edita e escolhe uma sugestão)` : null,
    !geoReady ? 'falta correr o SQL do mapa (supabase/events_geo.sql)' : null,
  ].filter(Boolean).join(' · ')

  return (
    <Sheet variant="detail" title="Mapa do mês" onClose={onClose} className="ag-map-sheet">
      <div className="ag-map-head">
        <IconButton icon="chevL" label="Mês anterior" onClick={() => shift(-1)} />
        <b aria-live="polite">{title}</b>
        <IconButton icon="chevR" label="Mês seguinte" onClick={() => shift(1)} />
      </div>
      <div ref={box} className="ag-map" role="region" aria-label={`Mapa dos eventos de ${title}`} />
      <p className="ag-map-note">{evs.length ? note : 'Nada marcado neste mês.'}</p>
    </Sheet>
  )
}
