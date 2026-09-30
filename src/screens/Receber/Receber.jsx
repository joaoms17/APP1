import { EmptyState, TopBar } from '../../ui'

// Receber: Em atraso · Recibos · Por registar (pacote E3).
// Esqueleto da Fundação: o E3 substitui este ficheiro.
export default function Receber() {
  return (
    <>
      <TopBar kicker="Cobranças e recibos" title="Receber" />
      <EmptyState icon="inbox" title="Em construção" text="As cobranças e os recibos estão a ser preparados." />
    </>
  )
}
