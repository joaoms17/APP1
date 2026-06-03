-- ============================================================
-- RAMO — Supabase Schema + Seed
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── TEAM ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,   -- maquilhadora | cabeleireira | fotografo | dj | musico | planner | assistente
  initials    TEXT NOT NULL,
  color       TEXT NOT NULL,
  load_count  INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'disp'   -- disp | ferias | indisp
);

-- ── CONVERSATIONS (WhatsApp) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  initials     TEXT NOT NULL,
  color        TEXT NOT NULL,
  last_message TEXT,
  time         TEXT,
  unread_count INTEGER DEFAULT 0,
  ai_ready     BOOLEAN DEFAULT FALSE,
  phone        TEXT
);

-- ── MESSAGES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              SERIAL PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  from_type       TEXT NOT NULL,   -- 'them' | 'me'
  content         TEXT NOT NULL,
  time            TEXT
);

-- ── AI EXTRACT DATA ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS extract_data (
  id              SERIAL PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE UNIQUE,
  nome            TEXT,
  tipo_evento     TEXT,
  data_evento     TEXT,
  local           TEXT,
  servicos        TEXT[],
  convidados      INTEGER,
  obs             TEXT
);

-- ── LEADS (CRM pipeline) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  initials    TEXT NOT NULL,
  color       TEXT NOT NULL,
  estado      TEXT NOT NULL,   -- novo | contactado | qualificacao | proposta | negociacao | ganho | perdido
  tipo        TEXT,
  data_evento TEXT,
  local       TEXT,
  servicos    TEXT[],
  convidados  INTEGER,
  valor       TEXT,
  origem      TEXT,
  phone       TEXT,
  email       TEXT
);

-- ── BOOKINGS (Reservas) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  initials    TEXT NOT NULL,
  color       TEXT NOT NULL,
  estado      TEXT NOT NULL,   -- pre | disp | proposta | sinal | confirmada | concluida | cancelada
  data_evento TEXT NOT NULL,
  hora        TEXT,
  local       TEXT,
  tipo        TEXT,
  servicos    TEXT[],
  total       INTEGER DEFAULT 0,
  sinal       INTEGER DEFAULT 0,
  pago        INTEGER DEFAULT 0,
  pay_status  TEXT DEFAULT 'nao_pago',   -- pago | parcial | nao_pago
  convidados  INTEGER DEFAULT 0,
  notes       TEXT
);

-- ── BOOKING ↔ TEAM (many-to-many) ───────────────────────────
CREATE TABLE IF NOT EXISTS booking_team (
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  team_id    TEXT REFERENCES team(id) ON DELETE CASCADE,
  PRIMARY KEY (booking_id, team_id)
);

-- ── AGENDA EVENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agenda_events (
  id           TEXT PRIMARY KEY,
  booking_id   TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  day          INTEGER,
  name         TEXT,
  local        TEXT,
  team_ids     TEXT[],
  servicos     TEXT[],
  has_conflict BOOLEAN DEFAULT FALSE
);

-- ── ROW LEVEL SECURITY (basic — enable + allow all for now) ──
ALTER TABLE team            ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE extract_data    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_team    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_events   ENABLE ROW LEVEL SECURITY;

-- Allow anon read (the app uses the anon key)
CREATE POLICY "allow_anon_select" ON team          FOR SELECT USING (true);
CREATE POLICY "allow_anon_select" ON conversations  FOR SELECT USING (true);
CREATE POLICY "allow_anon_select" ON messages       FOR SELECT USING (true);
CREATE POLICY "allow_anon_select" ON extract_data   FOR SELECT USING (true);
CREATE POLICY "allow_anon_select" ON leads          FOR SELECT USING (true);
CREATE POLICY "allow_anon_select" ON bookings       FOR SELECT USING (true);
CREATE POLICY "allow_anon_select" ON booking_team   FOR SELECT USING (true);
CREATE POLICY "allow_anon_select" ON agenda_events  FOR SELECT USING (true);

-- ============================================================
-- SEED DATA — matches the prototype mock data
-- ============================================================

-- Team
INSERT INTO team (id, name, role, initials, color, load_count, status) VALUES
  ('ines',    'Inês Carvalho',  'maquilhadora', 'IC', '#A9744F', 4, 'disp'),
  ('sofia',   'Sofia Nunes',    'cabeleireira',  'SN', '#93A07E', 5, 'disp'),
  ('miguel',  'Miguel Torres',  'fotografo',     'MT', '#C8A86B', 3, 'disp'),
  ('rui',     'Rui Almeida',    'dj',            'RA', '#B25B43', 2, 'ferias'),
  ('bruno',   'Bruno Lima',     'musico',        'BL', '#6E6155', 2, 'disp'),
  ('carla',   'Carla Mendes',   'planner',       'CM', '#8C5C3C', 3, 'indisp'),
  ('helena',  'Helena Dias',    'assistente',    'HD', '#93A07E', 1, 'disp')
ON CONFLICT (id) DO NOTHING;

-- Conversations
INSERT INTO conversations (id, name, initials, color, last_message, time, unread_count, ai_ready, phone) VALUES
  ('ana',      'Ana Pereira',    'AP', '#A9744F', 'Queria maquilhagem e cabelo para mim e as minhas 4 damas…', '14:32', 2, TRUE,  '+351 912 345 678'),
  ('rita',     'Rita Fonseca',   'RF', '#93A07E', 'Perfeito, muito obrigada! Fico a aguardar.',                '11:08', 0, FALSE, '+351 933 221 100'),
  ('beatriz',  'Beatriz Costa',  'BC', '#C8A86B', 'Conseguem mesmo no dia 20 de junho?',                      'Ontem', 1, FALSE, '+351 961 887 220'),
  ('catarina', 'Catarina Lopes', 'CL', '#B25B43', '🎙️ Mensagem de voz · 0:18',                               'Ontem', 0, FALSE, '+351 915 552 010'),
  ('mariana',  'Mariana Reis',   'MR', '#8C5C3C', 'Combinado para a reunião de quinta.',                       'Seg',   0, FALSE, '+351 938 010 455')
ON CONFLICT (id) DO NOTHING;

-- Messages for Ana's conversation
INSERT INTO messages (conversation_id, from_type, content, time) VALUES
  ('ana', 'them', 'Boa tarde 🙂 Vi o vosso trabalho no Instagram e adorei!', '14:21'),
  ('ana', 'them', 'Vou casar no dia 12 de setembro, na Quinta dos Sonhos, em Sintra. Seremos cerca de 120 convidados.', '14:22'),
  ('ana', 'them', 'Queria maquilhagem e cabelo para mim e as minhas 4 damas. É possível?', '14:32');

-- AI extract for Ana
INSERT INTO extract_data (conversation_id, nome, tipo_evento, data_evento, local, servicos, convidados, obs) VALUES
  ('ana', 'Ana Pereira', 'Casamento', '12 Set 2026', 'Quinta dos Sonhos, Sintra', ARRAY['makeup','hair'], 120, 'Noiva + 4 damas · Veio do Instagram')
ON CONFLICT (conversation_id) DO NOTHING;

-- Leads
INSERT INTO leads (id, name, initials, color, estado, tipo, data_evento, local, servicos, convidados, valor, origem, phone, email) VALUES
  ('ana',      'Ana & Pedro',      'AP', '#A9744F', 'novo',        'Casamento',  '12 Set 2026', 'Sintra',  ARRAY['makeup','hair'],           120, '€ 1.250', 'WhatsApp',  '+351 912 345 678', 'ana.pereira@email.pt'),
  ('catarina', 'Catarina Lopes',   'CL', '#B25B43', 'contactado',  'Aniversário','28 Jun 2026', 'Lisboa',  ARRAY['music'],                    60, '€ 600',   'WhatsApp',  '+351 915 552 010', 'catarina@email.pt'),
  ('mariana',  'Mariana Reis',     'MR', '#8C5C3C', 'qualificacao','Casamento',  '3 Out 2026',  'Óbidos',  ARRAY['planning'],                  90, '€ 3.500', 'Instagram', '+351 938 010 455', 'mariana.reis@email.pt'),
  ('rita',     'Rita Fonseca',     'RF', '#93A07E', 'proposta',    'Convidada',  '5 Jul 2026',  'Cascais', ARRAY['makeup'],                     1, '€ 95',    'WhatsApp',  '+351 933 221 100', 'rita.f@email.pt'),
  ('beatriz',  'Beatriz & João',   'BJ', '#C8A86B', 'negociacao',  'Casamento',  '20 Jun 2026', 'Cascais', ARRAY['dj','photo'],                140, '€ 2.100', 'Referência','+351 961 887 220', 'beatriz.costa@email.pt'),
  ('teresa',   'Teresa & Nuno',    'TN', '#6E6155', 'ganho',       'Casamento',  '16 Mai 2026', 'Mafra',   ARRAY['makeup','hair','photo'],     110, '€ 2.900', 'Instagram', '+351 910 000 111', 'teresa@email.pt')
ON CONFLICT (id) DO NOTHING;

-- Bookings
INSERT INTO bookings (id, name, initials, color, estado, data_evento, hora, local, tipo, servicos, total, sinal, pago, pay_status, convidados, notes) VALUES
  ('sara',     'Sara & Tiago',      'ST', '#A9744F', 'confirmada', '20 Jun 2026', '09:00', 'Quinta da Boavista, Cascais',       'Casamento',  ARRAY['makeup','hair','photo'],    2400, 720, 720,  'parcial',   130, 'Prova de penteado feita a 2 Jun. Noiva quer apanhado baixo com flores naturais.'),
  ('filipa',   'Filipa & André',    'FA', '#C8A86B', 'sinal',      '27 Jun 2026', '16:00', 'Palácio dos Marqueses, Oeiras',     'Casamento',  ARRAY['dj','music'],               1800, 540,   0,  'nao_pago',  160, 'Confirmar lista de músicas até 15 Jun. Som para cerimónia ao ar livre.'),
  ('mafalda',  'Mafalda Reis',      'MA', '#93A07E', 'proposta',   '5 Jul 2026',  '08:30', 'Hotel Tivoli, Lisboa',              'Convidada',  ARRAY['makeup'],                     95,   0,   0,  'nao_pago',    1, 'Convidada de casamento. Maquilhagem natural, tons quentes.'),
  ('carolina', 'Carolina & Hugo',   'CH', '#8C5C3C', 'disp',       '12 Set 2026', '08:00', 'Quinta dos Sonhos, Sintra',         'Casamento',  ARRAY['makeup','hair'],            1250,   0,   0,  'nao_pago',  120, 'A verificar disponibilidade da equipa para a data.'),
  ('teresa',   'Teresa & Nuno',     'TN', '#6E6155', 'concluida',  '16 Mai 2026', '09:00', 'Palácio de Mafra',                 'Casamento',  ARRAY['makeup','hair','photo'],    2900, 870, 2900, 'pago',      110, 'Evento concluído. Testemunho recebido — 5 estrelas.')
ON CONFLICT (id) DO NOTHING;

-- Booking ↔ Team links
INSERT INTO booking_team (booking_id, team_id) VALUES
  ('sara',    'ines'),
  ('sara',    'sofia'),
  ('sara',    'miguel'),
  ('filipa',  'rui'),
  ('filipa',  'bruno'),
  ('mafalda', 'ines'),
  ('teresa',  'ines'),
  ('teresa',  'sofia'),
  ('teresa',  'miguel')
ON CONFLICT DO NOTHING;

-- Agenda events
INSERT INTO agenda_events (id, booking_id, day, name, local, team_ids, servicos, has_conflict) VALUES
  ('beatriz_ev', 'sara',     20, 'Beatriz & João', 'Cascais', ARRAY['rui','miguel'],        ARRAY['dj','photo'],         FALSE),
  ('sara_ev',    'sara',     20, 'Sara & Tiago',   'Cascais', ARRAY['ines','sofia','miguel'],ARRAY['makeup','hair','photo'],TRUE),
  ('filipa_ev',  'filipa',   27, 'Filipa & André', 'Oeiras',  ARRAY['rui','bruno'],          ARRAY['dj','music'],         FALSE)
ON CONFLICT (id) DO NOTHING;
