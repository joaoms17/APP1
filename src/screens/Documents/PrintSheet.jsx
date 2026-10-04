import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../ui'
import { useStore } from '../../store.jsx'
import './Documents.css'

// Folha de impressão/partilha (orçamento, cronograma): ecrã inteiro com o documento;
// "Guardar PDF / Imprimir" usa a impressão nativa (no iPhone: Partilhar → Guardar como PDF).
// Cores claras fixas (.print-sheet tem tokens claros locais): o PDF sai claro mesmo no modo escuro.
// Quem a mostra troca a sua folha por esta (a folha fecha-se enquanto o documento está aberto).
export default function PrintSheet({ title, onClose, children }) {
  const backRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const root = document.getElementById('root')
    if (root) root.inert = true
    backRef.current?.focus({ preventScroll: true })
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); closeRef.current?.() } }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (root) root.inert = false
    }
  }, [])

  return createPortal(
    <div className="print-sheet doc-print" role="dialog" aria-modal="true" aria-label={title}>
      <div className="doc-actions">
        <Button ref={backRef} variant="quiet" icon="chevL" onClick={onClose}>Voltar</Button>
        <Button variant="primary" icon="share" onClick={() => window.print()}>Guardar PDF / Imprimir</Button>
      </div>
      <article className="doc-page">{children}</article>
    </div>,
    document.body,
  )
}

// logotipo do projeto (aparece nos documentos), se houver
function useLogo(project) {
  const { logoUrl } = useStore()
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let alive = true
    setUrl(null)
    if (project?.logo_path) logoUrl(project).then((u) => { if (alive) setUrl(u) }).catch(() => {})
    return () => { alive = false }
  }, [project?.logo_path]) // eslint-disable-line react-hooks/exhaustive-deps
  return url
}

// cabeçalho: logotipo (se houver) + nome (display 600) + filete magenta + lema
export function DocHead({ project, sub }) {
  const logo = useLogo(project)
  return (
    <header className="doc-head">
      {logo && <img className="doc-logo" src={logo} alt={`Logotipo de ${project.name}`} />}
      <div className="doc-brand">Joana</div>
      <div className="doc-hairline" aria-hidden="true" />
      {sub && <div className="doc-sub">{sub}</div>}
    </header>
  )
}

// ornamento magenta (filete com losango) — substitui o emoji da v1
export function Ornament() {
  return (
    <svg className="doc-orn" viewBox="0 0 120 12" aria-hidden="true" focusable="false">
      <path d="M6 6h44M70 6h44" />
      <path className="fill" d="M60 1.5 64.5 6 60 10.5 55.5 6z" />
    </svg>
  )
}
