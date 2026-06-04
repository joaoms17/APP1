# Ramo — Operação para equipas de eventos

App de gestão para hairstylist/maquilhadora de casamentos (leads via WhatsApp, pipeline,
reservas, agenda, equipa, financeiro, propostas e cronogramas do dia).

Stack: **React + Vite** · **Supabase** (Postgres + Auth + Storage) · PDF no cliente (jsPDF).

---

## 1. Pré-requisitos

- **Node.js 18+** → https://nodejs.org (ou nvm-windows: https://github.com/coreybutler/nvm-windows)
- **Git** → https://git-scm.com
- **Claude Code** → https://docs.anthropic.com/claude-code  (instalar: `npm install -g @anthropic-ai/claude-code`)

## 2. Clonar e arrancar

```bash
git clone https://github.com/joaoms17/APP1.git
cd APP1
npm install
npm run dev
```

Abre **http://localhost:5173**

> As credenciais do Supabase já estão em `src/supabase.js`, por isso liga à mesma base de dados.
> Para usar OUTRO projeto Supabase, muda `SUPABASE_URL` e `SUPABASE_ANON` nesse ficheiro e corre os SQL abaixo.

## 3. Abrir com Claude Code

```bash
cd APP1
claude
```

## 4. Base de dados (só se for um projeto Supabase NOVO)

No Supabase → **SQL Editor → New query → Run**, pela ordem:

1. `supabase/schema.sql` — tabelas base (team, conversations, messages, leads, bookings, agenda…)
2. `supabase/proposals.sql` — settings, tabela de preços, propostas (+ seed dos exemplos)
3. `supabase/schedules.sql` — cronogramas do dia
4. Colunas e Storage extra:

```sql
-- versão enviada das propostas/cronogramas
alter table proposals add column if not exists sent_content jsonb;
alter table proposals add column if not exists sent_at timestamptz;
-- logótipos por serviço
alter table settings  add column if not exists service_logos jsonb default '{}'::jsonb;
-- histórico de PDFs
alter table proposals add column if not exists pdf_url text;
alter table schedules add column if not exists pdf_url text;
-- Storage para os PDFs
insert into storage.buckets (id, name, public) values ('documents','documents', true) on conflict (id) do nothing;
create policy "documents_read"   on storage.objects for select using (bucket_id = 'documents');
create policy "documents_insert" on storage.objects for insert with check (bucket_id = 'documents');
create policy "documents_update" on storage.objects for update using (bucket_id = 'documents');
```

5. **Auth**: em Authentication → Providers → Email, desativar **"Confirm email"** para entrar logo.

## 5. Build de produção (opcional)

```bash
npm run build      # gera /dist
npm run preview    # serve o build localmente
```

---

## Estrutura

```
src/
  App.jsx              shell + navegação + estado + CRUD Supabase
  supabase.js          credenciais + cliente
  data.jsx             i18n, paleta, loaders, geração de propostas
  ui.jsx               componentes visuais (Icon, Card, Btn, Avatar…)
  forms.jsx            modais (criar lead/reserva/equipa, WhatsApp, pagamento)
  pdf.js               geração de PDF (jsPDF + html2canvas)
  Auth.jsx             login/registo
  screens/             Home, Negócios, Reserva, Lead, Agenda, Equipa,
                       Financeiro, Definições, Proposta, Cronograma
supabase/              SQL (schema, proposals, schedules)
```
