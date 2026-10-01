import { Component, lazy } from 'react'
import { Button, Callout, Icon } from '../ui'

// React.lazy com preload() (adianta o download do código, ex.: quando a app fica parada).
// O preload e o React.lazy partilham o mesmo import() (o código pedido no arranque serve à 1.ª abertura).
export function lazyWithPreload(load) {
  let promise = null
  const get = () => (promise ||= load().catch((e) => { promise = null; throw e }))
  const Comp = lazy(get)
  Comp.preload = () => get().catch(() => {})
  return Comp
}

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

// Painel de erro: Callout + "Tentar de novo" + "Detalhes para o João" (spec §10.2, §10.16)
export function ErrorPanel({ title, text, detail, onRetry, retryLabel = 'Tentar de novo' }) {
  return (
    <div className="sh-error">
      <Callout tone="error" title={title}>{text}</Callout>
      {onRetry && <Button variant="primary" icon="refresh" onClick={onRetry}>{retryLabel}</Button>}
      {detail && (
        <details className="sh-details">
          <summary>Detalhes para o João<Icon name="chevD" size="sm" /></summary>
          <code>{detail}</code>
        </details>
      )}
    </div>
  )
}

// falha a descarregar código (sem rede, ou versão nova publicada e o ficheiro antigo já não existe);
// o browser guarda a falha do import(), por isso só recarregar a página resolve
export const isChunkError = (e) => e?.name === 'ChunkLoadError'
  || /dynamically imported module|importing a module script failed|error loading dynamically imported module|unable to preload css/i
    .test(String(e?.message || e))

// texto do erro de um ecrã/folha: sem rede, diz isso (o código deste ecrã ainda não tinha descido)
export const screenErrorText = (error) => (isChunkError(error) && isOffline()
  ? 'Sem ligação. Este ecrã abre quando voltares a ter internet.'
  : 'Verifica a ligação e tenta de novo.')

// Fronteira de erro (os hooks do React não apanham erros de render, daí a classe).
// Um ecrã ou folha que rebente mostra o fallback em vez de deixar a app em branco.
//   <Boundary fallback={(error, retry) => …} resetKey={…}>…</Boundary>
// Mudar resetKey (outro ecrã/folha) limpa o erro; "Tentar de novo" desenha outra vez. Se o que falhou
// foi o download do código, o browser guarda a falha do import() e só recarregar resolve — mas nunca
// sem rede (a página de erro do browser deitava a app abaixo e perdia o que está em memória): aí
// fica no aviso "Sem ligação", que se atualiza quando a rede volta.
export class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, online: !isOffline() }
    this.retry = () => {
      if (isChunkError(this.state.error)) {
        if (!isOffline()) location.reload()
        else this.setState({ online: false })
        return
      }
      this.setState({ error: null })
    }
    this.onNet = () => this.setState({ online: !isOffline() })
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidMount() {
    window.addEventListener('online', this.onNet)
    window.addEventListener('offline', this.onNet)
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.onNet)
    window.removeEventListener('offline', this.onNet)
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  componentDidCatch(error, info) {
    console.error('Erro num ecrã:', error, info?.componentStack || '')
  }

  render() {
    if (!this.state.error) return this.props.children
    return this.props.fallback(this.state.error, this.retry)
  }
}

// texto técnico de um erro apanhado (para "Detalhes para o João")
export const errorDetail = (error) => [error?.name, error?.message || String(error)].filter(Boolean).join(': ')
