import { EmptyState, TopBar } from '../../ui'

// Painel (pacote E4) — carregado a pedido (React.lazy na shell).
// Esqueleto da Fundação: o E4 substitui este ficheiro.
export default function Dashboard() {
  return (
    <>
      <TopBar kicker="Finanças" title="Painel" />
      <EmptyState icon="chart" title="Em construção" text="O Painel novo está a ser preparado." />
    </>
  )
}
