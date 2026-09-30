import { ICONS } from './icons.js'

// Ícone SVG (24×24, traço 1,8, currentColor). Sempre decorativo: o nome acessível
// vem do botão/ligação que o contém.
export default function Icon({ name, size = 'md', className = '' }) {
  if (import.meta.env?.DEV && !ICONS[name]) console.warn(`Icon: ícone desconhecido "${name}"`)
  const cls = ['i', size !== 'md' && size, className].filter(Boolean).join(' ')
  return (
    <svg className={cls} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      dangerouslySetInnerHTML={{ __html: ICONS[name] || '' }} />
  )
}
