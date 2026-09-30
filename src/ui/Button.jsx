import { forwardRef, useLayoutEffect, useRef } from 'react'
import Icon from './Icon.jsx'
import { mergeRefs } from './refs.js'
import './components.css'

const VARIANT = { row: 'row-act', 'danger-solid': 'danger solid' }

// <Button variant="primary|secondary|tonal|ghost|quiet|danger|danger-solid|row" size="sm|md|lg"
//         icon iconTone="ok|add" block loading loadingLabel href>…</Button>
// loading: spinner + "A guardar…" (loadingLabel="…" troca o texto; loadingLabel={true} mantém o children),
// a largura mantém-se e os toques são ignorados.
const Button = forwardRef(function Button({
  variant = 'secondary', size = 'md', icon, iconTone, block, loading = false, loadingLabel,
  type = 'button', className = '', href, onClick, children, ...rest
}, ref) {
  const own = useRef(null)
  useLayoutEffect(() => {
    const el = own.current
    if (!el) return
    if (loading) el.style.minWidth = `${el.offsetWidth}px`
    else el.style.minWidth = ''
  }, [loading])

  const cls = ['btn', VARIANT[variant] || variant, size !== 'md' && size, block && 'block', loading && 'is-loading', className]
    .filter(Boolean).join(' ')
  const body = loading
    ? <><span className="spin" aria-hidden="true" />{loadingLabel === true ? children : loadingLabel || 'A guardar…'}</>
    : <>{icon && <Icon name={icon} className={iconTone || ''} />}{children}</>
  const click = (e) => { if (loading) { e.preventDefault(); return } onClick?.(e) }

  if (href) {
    return <a ref={mergeRefs(ref, own)} className={cls} href={href} onClick={click} aria-busy={loading || undefined} {...rest}>{body}</a>
  }
  return (
    <button ref={mergeRefs(ref, own)} type={type} className={cls} onClick={click} aria-busy={loading || undefined} {...rest}>
      {body}
    </button>
  )
})

export default Button
