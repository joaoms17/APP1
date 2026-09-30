// Destinos da navegação principal (tabbar no telemóvel, sidebar no computador).
import { getRoute, navigate, tabHref } from '../router.js'

export const NAV = [
  { id: 'agenda', label: 'Agenda', icon: 'calendar' },
  { id: 'receber', label: 'Receber', icon: 'inbox' },
  { id: 'despesas', label: 'Despesas', icon: 'wallet' },
  { id: 'painel', label: 'Painel', icon: 'chart' },
]

// tocar num separador volta ao último URL dele (vista, filtros); no separador ativo, sobe ao topo
export function goTab(e, id) {
  if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  if (getRoute().tab !== id) { navigate(tabHref(id)); return }
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}
