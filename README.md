# Joana — Agenda & Finanças

App de gestão do calendário e das finanças da Joana, cobrindo os dois trabalhos:
**Cabelos/penteados** e **Música** (Banda do Algarve, Oitentamente, Noventamente,
Tune Up, Gospel e Outros).

Stack: **React + Vite** · **Supabase** (Postgres + Auth) · **Recharts** (gráficos).

## Funcionalidades

- **Agenda** — calendário mensal próprio com os eventos coloridos por projeto
- **Eventos** — cada concerto ou serviço de cabelo com valor, pago/por pagar
  (+ data de pagamento) e recibo emitido/em falta; filtros de "por receber" e
  "recibo em falta"
- **Despesas** — custos por projeto ou gerais, com categoria
- **Painel** — receita do ano, comparação mês a mês com o ano anterior
  (ex.: maio vs maio), receita por projeto, receita vs despesa e resumo em tabela
- **Importar** — carregar o histórico a partir de um CSV (Excel / Google Sheets)

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

## Importação de histórico (CSV)

Separador `;` ou `,`, com cabeçalho. Para eventos:

```csv
data;projeto;titulo;valor;pago;recibo;local
03/05/2025;Tune Up;Concerto em Faro;350;sim;sim;Faro
10/05/2025;Cabelos;Casamento M. João;120;sim;nao;Loulé
```

Para despesas: colunas `data;descricao;valor` (+ `projeto` e `categoria` opcionais).

## Próximos passos (v2)

- Integração com o Google Calendar (sincronização dos eventos)
