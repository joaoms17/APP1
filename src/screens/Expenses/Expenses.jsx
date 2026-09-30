import { EmptyState, TopBar } from '../../ui'

// Despesas (pacote E3). Esqueleto da Fundação: o E3 substitui este ficheiro.
export default function Expenses() {
  return (
    <>
      <TopBar kicker="Custos do trabalho" title="Despesas" />
      <EmptyState icon="wallet" title="Em construção" text="A lista de despesas está a ser preparada." />
    </>
  )
}
