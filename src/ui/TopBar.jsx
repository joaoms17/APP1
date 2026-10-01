import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { useStore } from '../store.jsx'
import { navigate } from '../router.js'
import './components.css'

// Monograma "J" (36 px, anel dourado).
export function Avatar({ size = 'md', className = '' }) {
  return <span className={['avatar', size === 'lg' && 'lg', className].filter(Boolean).join(' ')} aria-hidden="true">J</span>
}

// "J" no topo dos separadores → Definições; ponto de aviso quando o Google falha.
export function AvatarButton({ onClick }) {
  const store = useStore()
  const warn = (store?.gcalStatus?.failures?.length || 0) > 0
  return (
    <button type="button" className="avatar-btn" onClick={onClick || (() => navigate('#/definicoes'))}
      aria-label={`Definições e conta${warn ? ' — o Google não atualizou' : ''}`}>
      <Avatar />
      {warn && <span className="warn-dot" aria-hidden="true" />}
    </button>
  )
}

// Barra de topo do ecrã: kicker dourado + h1 Fraunces + ações + "J".
// back={{ label: 'Agenda', to: '#/agenda' }} (ou { label, onClick }) mostra "‹ Agenda" por cima.
// Ao passar o título, aparece uma barra compacta com o título e as mesmas ações (spec §9.15: a câmara
// e a lupa continuam a 1 toque com a lista em scroll). Escondida, fica inerte (fora do Tab).
export default function TopBar({ kicker, title, actions, back, avatar = true, className = '' }) {
  const h1 = useRef(null)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const el = h1.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <>
      {back && (back.to
        ? <a className="btn quiet back" href={back.to} onClick={back.onClick}><Icon name="chevL" />{back.label}</a>
        : <button type="button" className="btn quiet back" onClick={back.onClick}><Icon name="chevL" />{back.label}</button>)}
      <header className={`topbar ${className}`.trim()}>
        <div>
          {kicker && <div className="kicker">{kicker}</div>}
          <h1 ref={h1}>{title}</h1>
        </div>
        {(actions || avatar) && <div className="actions">{actions}{avatar && <AvatarButton />}</div>}
      </header>
      <div className={`topbar-compact${compact ? ' on' : ''}`} inert={compact ? undefined : ''}>
        <span className="t" aria-hidden="true">{title}</span>
        {/* só existem enquanto a barra está à vista (o cabeçalho tem as originais; sem duplicados no topo) */}
        {compact && (actions || avatar) && <div className="actions">{actions}{avatar && <AvatarButton />}</div>}
      </div>
    </>
  )
}
