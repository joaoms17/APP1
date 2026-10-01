// junta um ref local com o ref que vem de fora (forwardRef)
export const mergeRefs = (...refs) => (el) => {
  for (const r of refs) {
    if (typeof r === 'function') r(el)
    else if (r) r.current = el
  }
}
