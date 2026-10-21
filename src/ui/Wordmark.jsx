// Logótipo "Gestão Financeira": o ícone da app (o caderninho com o visto, public/icon.svg) e o nome em letra
// arredondada. O ícone é o mesmo ficheiro do separador e do ecrã principal, com os cantos arredondados.
// stacked: o ícone por cima do nome (ecrã Entrar). Para leitores de ecrã é uma imagem com o nome.
export default function Wordmark({ className = '', stacked = false }) {
  return (
    <span className={['wordmark', stacked && 'stacked', className].filter(Boolean).join(' ')} role="img" aria-label="Gestão Financeira">
      <img className="wordmark-mark" src="/icon.svg" width="64" height="64" alt="" aria-hidden="true" draggable="false" />
      <span className="wordmark-text" aria-hidden="true">Gestão Financeira</span>
    </span>
  )
}
