-- ============================================================
-- RAMO — Propostas: settings + tabela de preços + propostas
-- Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ── DEFINIÇÕES (linha única) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id              TEXT PRIMARY KEY DEFAULT 'default',
  company_name    TEXT,
  location        TEXT,
  about           TEXT,
  phone           TEXT,
  logo_url        TEXT,          -- data URL (base64) ou link
  payment_terms   TEXT,
  terms           TEXT,
  deslocacao_rate NUMERIC DEFAULT 0.5
);

-- ── TABELA DE PREÇOS (catálogo) ──────────────────────────────
-- category: 'noiva' | 'convidadas' | 'extra'
-- services: serviços que ativam este item (subconjunto dos selecionados)
CREATE TABLE IF NOT EXISTS price_items (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  price       NUMERIC DEFAULT 0,
  unit        TEXT,
  services    TEXT[] DEFAULT '{}',
  sort        INTEGER DEFAULT 0
);

-- ── PROPOSTAS GERADAS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposals (
  id          TEXT PRIMARY KEY,
  lead_id     TEXT,
  client_name TEXT,
  status      TEXT DEFAULT 'rascunho',   -- rascunho | enviada | aceite
  content     JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_select" ON settings    FOR SELECT USING (true);
CREATE POLICY "all_insert" ON settings    FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON settings    FOR UPDATE USING (true);
CREATE POLICY "all_select" ON price_items FOR SELECT USING (true);
CREATE POLICY "all_insert" ON price_items FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON price_items FOR UPDATE USING (true);
CREATE POLICY "all_delete" ON price_items FOR DELETE USING (true);
CREATE POLICY "all_select" ON proposals   FOR SELECT USING (true);
CREATE POLICY "all_insert" ON proposals   FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON proposals   FOR UPDATE USING (true);
CREATE POLICY "all_delete" ON proposals   FOR DELETE USING (true);

-- ============================================================
-- SEED — definições + tabela de preços (a partir dos exemplos)
-- ============================================================
INSERT INTO settings (id, company_name, location, about, phone, payment_terms, terms, deslocacao_rate) VALUES (
  'default',
  'Ramo Eventos',
  'Lisboa · Portugal',
  'Olá! Trabalho a beleza de noivas e convidadas há vários anos, com produtos de alta qualidade, vegan e anti-alérgicos. Desde a prova até ao grande dia, cuido de cada detalhe com calma e proximidade.',
  '+351 916 213 644',
  E'O pagamento é realizado em três fases (valor s/IVA):\n• Reserva — sinal por transferência ou MBWay\n• Prova\n• Dia do casamento (numerário ou MBWay)\n\n10€ de reserva por convidada, por serviço.',
  E'O serviço divide-se em duas fases: a prova e a execução no dia do casamento.\nOs valores foram comunicados previamente e não são negociáveis.\nMínimo de 3 convidadas, ou pagamento correspondente.\nDeslocação fora da área de Lisboa pode exigir alojamento na noite anterior.\nA data só é reservada após envio do comprovativo de pagamento.\nEm caso de cancelamento com antecedência inferior a 12 meses, o serviço é pago na totalidade.',
  0.5
) ON CONFLICT (id) DO NOTHING;

INSERT INTO price_items (id, category, title, description, price, unit, services, sort) VALUES
  ('p_mh',        'noiva',      'Maquilhagem e Penteado', 'Prova (estúdio próprio) · preparação de pele e cabelo no dia · massagem facial · execução de maquilhagem e penteado · aplicação de pestanas (opcional) · oferta de kit de retoques', 700, 'look', ARRAY['makeup','hair'], 1),
  ('p_make',      'noiva',      'Maquilhagem de Noiva',   'Prova de maquilhagem (estúdio próprio) · preparação da pele e massagem facial · execução no dia com pestanas (opcional) · oferta de kit de retoques', 350, 'look', ARRAY['makeup'], 2),
  ('p_hair',      'noiva',      'Penteado de Noiva',      'Prova de penteado (estúdio próprio) · execução do penteado no dia do casamento', 380, 'look', ARRAY['hair'], 3),
  ('p_conv_mh',   'convidadas', 'Maquilhagem e Cabelo Convidadas', 'pestanas incluídas', 120, 'cada', ARRAY['makeup','hair'], 1),
  ('p_conv_make', 'convidadas', 'Maquilhagem Convidadas', 'pestanas incluídas', 60, 'pessoa', ARRAY['makeup'], 2),
  ('p_conv_hair', 'convidadas', 'Penteado Convidadas',    '', 60, 'pessoa', ARRAY['hair'], 3),
  ('p_extra_prova','extra',     'Prova extra dos dois serviços', '', 200, '', ARRAY[]::text[], 1),
  ('p_extra_ret', 'extra',      'Retoques no dia do casamento',  'por serviço', 50, 'hora', ARRAY[]::text[], 2),
  ('p_extra_noivo','extra',     'Maquilhagem e Cabelo do Noivo', '', 120, '', ARRAY[]::text[], 3)
ON CONFLICT (id) DO NOTHING;
