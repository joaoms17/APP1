# Joana — Agenda & Finanças

App de gestão do calendário e das finanças da Joana, cobrindo os dois trabalhos:
**Cabelos/penteados** e **Música** (Banda do Algarve, Oitentamente, Noventamente,
Tune Up, Gospel e Outros).

Stack: **React + Vite** · **Supabase** (Postgres + Auth) · **Recharts** (gráficos).

## Funcionalidades

- **Agenda** — calendário mensal próprio com os eventos coloridos por projeto
- **Eventos** — cada concerto ou serviço de cabelo com valor bruto e valor final
  (o recebido, depois de recibo/descontos), pago/por pagar (+ data de pagamento)
  e recibo emitido/em falta; filtros de "por receber" e "recibo em falta"
- **Despesas** — custos por projeto ou gerais, com categoria
- **Painel** — receita do ano, comparação mês a mês com o ano anterior
  (ex.: maio vs maio), receita por projeto, receita vs despesa, Bruto−Final
  por mês/ano e resumo em tabela

## Arrancar

```bash
npm install
npm run dev
```

Abre **http://localhost:5173**

## Configurar a base de dados (uma vez)

1. No Supabase → **SQL Editor → New query**, cola e corre `supabase/schema.sql`
   (⚠️ apaga as tabelas da app antiga "Ramo" e cria as novas, já com os projetos).
2. Em **Authentication → Users → Add user**, cria as duas contas (Joana e João).
3. Em **Authentication → Sign In / Up**, desativa **Enable sign ups** para mais
   ninguém se poder registar.

As credenciais do projeto Supabase estão em `src/supabase.js`.

## Histórico

O histórico de 2024–2026 (Extras_Joana.xlsx) foi convertido para
`supabase/import_historico.sql` — corre-o uma vez no SQL Editor, depois do
`schema.sql`.

## Próximos passos (v2)

- Integração com o Google Calendar (sincronização dos eventos)
