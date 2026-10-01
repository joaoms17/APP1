import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import IconButton from './IconButton.jsx'
import './components.css'

// Menu "…": IconButton + popover role="menu" ancorado ao botão. Itens de 48 px;
// os destrutivos vão para o fim, depois de um separador, em vermelho.
// items: [{ label, icon, onSelect, danger, hidden }]
export default function Menu({ label = 'Mais ações', items = [], icon = 'more', className = '' }) {
  const [open, setOpen] = useState(false)
  const btn = useRef(null)
  const pop = useRef(null)
  const id = useId()
  const list = items.filter((i) => i && !i.hidden)
  const normal = list.filter((i) => !i.danger)
  const danger = list.filter((i) => i.danger)

  // posição: por baixo do botão, alinhado à direita; se não couber, por cima
  useLayoutEffect(() => {
    if (!open) return
    const b = btn.current.getBoundingClientRect()
    const p = pop.current
    const h = p.offsetHeight
    const below = b.bottom + 4 + h <= window.innerHeight - 8
    p.style.top = `${below ? b.bottom + 4 : Math.max(8, b.top - 4 - h)}px`
    p.style.right = `${Math.max(8, window.innerWidth - b.right)}px`
    p.querySelector('[role="menuitem"]')?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!pop.current?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false)
    }
    const onResize = () => setOpen(false)
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) btn.current?.focus()
  }

  const onKeyDown = (e) => {
    const els = [...pop.current.querySelectorAll('[role="menuitem"]')]
    const i = els.indexOf(document.activeElement)
    const go = (n) => { e.preventDefault(); els[(n + els.length) % els.length]?.focus() }
    if (e.key === 'ArrowDown') go(i + 1)
    else if (e.key === 'ArrowUp') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(els.length - 1)
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
    else if (e.key === 'Tab') close(false)
  }

  const item = (it) => (
    <button key={it.label} type="button" role="menuitem" tabIndex={-1}
      className={`menu-item${it.danger ? ' danger' : ''}`}
      onClick={() => { close(); it.onSelect?.() }}>
      {it.icon && <Icon name={it.icon} />}{it.label}
    </button>
  )

  if (!list.length) return null
  return (
    <span className={`menu ${className}`.trim()}>
      <IconButton ref={btn} icon={icon} label={label} aria-haspopup="menu" aria-expanded={open}
        aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)} />
      {open && (
        <div ref={pop} id={id} className="menu-pop" role="menu" aria-label={label} onKeyDown={onKeyDown}>
          {normal.map(item)}
          {normal.length > 0 && danger.length > 0 && <div className="menu-sep" role="separator" />}
          {danger.map(item)}
        </div>
      )}
    </span>
  )
}
