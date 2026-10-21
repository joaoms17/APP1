// Logótipo "Gestão Financeira": a página da agenda com o euro (o mesmo desenho do ícone da app, public/icon.svg)
// e o nome em letra arredondada. As cores vêm dos tokens (página = --accent, cabeçalho = --accent-2, argolas =
// cor do texto da marca, moeda em papel), por isso funciona em claro e em escuro.
// stacked: o desenho por cima do nome (ecrã Entrar). Para leitores de ecrã é uma imagem com o nome.
export default function Wordmark({ className = '', stacked = false }) {
  return (
    <span className={['wordmark', stacked && 'stacked', className].filter(Boolean).join(' ')} role="img" aria-label="Gestão Financeira">
      <svg className="wordmark-mark" viewBox="191 178 642 661" aria-hidden="true" focusable="false">
        <rect className="wm-page" x="197" y="243" width="630" height="590" rx="115" />
        <path className="wm-head" d="M197 392V358A115 115 0 0 1 312 243H712A115 115 0 0 1 827 358V392Z" />
        <rect className="wm-paper" x="197" y="388" width="630" height="8" />
        <rect className="wm-ring" x="363" y="184" width="58" height="146" rx="29" />
        <rect className="wm-ring" x="603" y="184" width="58" height="146" rx="29" />
        <circle className="wm-paper" cx="512" cy="612" r="186" />
        <g className="wm-euro" fill="none" strokeLinecap="round">
          <path d="M577.8 546.2 A93 93 0 1 0 577.8 677.8" strokeWidth="46" />
          <path d="M379 586.5 H540 M379 637.5 H540" strokeWidth="36" />
        </g>
      </svg>
      <span className="wordmark-text" aria-hidden="true">Gestão Financeira</span>
    </span>
  )
}
