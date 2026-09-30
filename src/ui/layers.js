// Pilha das folhas abertas (<dialog> modais). O toast vai para dentro da folha do topo:
// com showModal() tudo o que está fora do diálogo fica inerte e o "Anular" não se podia tocar.
import { useSyncExternalStore } from 'react'

const stack = []
const subs = new Set()
const emit = () => { for (const fn of subs) fn() }

export function pushLayer(el) {
  stack.push(el)
  emit()
}

export function removeLayer(el) {
  const i = stack.lastIndexOf(el)
  if (i >= 0) stack.splice(i, 1)
  emit()
}

export const topLayer = () => stack[stack.length - 1] || null

const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn) }
export const useTopLayer = () => useSyncExternalStore(subscribe, topLayer, () => null)
