import { EmptyState, TopBar } from '../../ui'
import { backRoute } from '../../router.js'

// Definições (rota #/definicoes, pacote E5). Esqueleto da Fundação: o E5 substitui este ficheiro.
export default function Settings() {
  const back = backRoute()
  return (
    <>
      <TopBar kicker="Conta e configuração" title="Definições" avatar={false} back={{ label: back.label, to: back.href }} />
      <EmptyState icon="settings" title="Em construção" text="Projetos, calendários Google e preferências." />
    </>
  )
}
