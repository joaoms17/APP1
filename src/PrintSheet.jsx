// Folha de impressão/partilha: mostra conteúdo elegante em ecrã inteiro;
// "Guardar PDF" usa a impressão nativa do telemóvel (Partilhar → Guardar como PDF).
export default function PrintSheet({ onClose, children }) {
  return (
    <div className="print-sheet">
      <div className="print-actions">
        <button className="btn secondary" style={{ width: 'auto', padding: '9px 16px' }} onClick={onClose}>‹ Voltar</button>
        <button className="btn" style={{ width: 'auto', padding: '9px 16px' }} onClick={() => window.print()}>
          Guardar PDF / Imprimir
        </button>
      </div>
      <div className="print-page">{children}</div>
    </div>
  )
}
