import { useEffect, useId, useRef, useState } from 'react'
import { Icon, TextInput } from '../../ui'
import { searchPlaces } from '../../geo.js'

// Local com sugestões (OpenStreetMap): escolher uma sugestão grava o nome arrumado + coordenadas
// (para o mapa); escrever à mão apaga as coordenadas (ao guardar, o formulário tenta encontrá-las).
// onChange(texto, coords | null)
export default function PlaceInput({ value, coords, onChange }) {
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const typed = useRef(false) // só pesquisa o que a Joana escreve (não o local que já vinha preenchido)
  const listId = useId()

  useEffect(() => {
    if (!typed.current || coords || String(value || '').trim().length < 3) { setList([]); return }
    const ctl = new AbortController()
    const t = setTimeout(async () => {
      const r = await searchPlaces(value, { signal: ctl.signal })
      if (ctl.signal.aborted) return
      setList(r)
      setActive(-1)
      setOpen(r.length > 0)
    }, 300)
    return () => { clearTimeout(t); ctl.abort() }
  }, [value, coords])

  const pick = (r) => {
    typed.current = false
    onChange(r.label, { lat: r.lat, lng: r.lng })
    setOpen(false)
    setList([])
  }

  const onKeyDown = (e) => {
    if (!open || !list.length) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const d = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + d + list.length) % list.length)
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      e.stopPropagation() // não passa ao campo seguinte (onKeyDown do formulário)
      pick(list[active])
    } else if (e.key === 'Escape') {
      e.stopPropagation() // fecha as sugestões, não a folha
      setOpen(false)
    }
  }

  const shown = open && list.length > 0
  return (
    <div className="ev-place">
      <TextInput icon="pin" value={value} placeholder="Ex.: Almancil" autoComplete="off" enterKeyHint="next"
        role="combobox" aria-autocomplete="list" aria-expanded={shown} aria-controls={listId}
        aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(v) => { typed.current = true; onChange(v, null) }}
        onKeyDown={onKeyDown} onBlur={() => setOpen(false)} onFocus={() => list.length && setOpen(true)} />
      {shown && (
        <ul id={listId} role="listbox" className="ev-place-list" aria-label="Sugestões de local">
          {list.map((r, i) => (
            <li key={r.label} id={`${listId}-${i}`} role="option" aria-selected={i === active}
              className={i === active ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(r)}>
              <Icon name="pin" size="sm" />{r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
