-- ============================================================
-- RAMO — Supabase Schema
-- Supabase Dashboard → SQL Editor → New query → Run
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

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE team            ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE extract_data    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_team    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_events   ENABLE ROW LEVEL SECURITY;

-- Leitura anónima (a app usa a anon key)
CREATE POLICY "allow_anon_select" ON team           FOR SELECT USING (true);
CREATE POLICY "allow_anon_select" ON conversations   FOR SELECT USING (true);
CREATE POLICY "allow_anon_select" ON messages        FOR SELECT USING (true);
CREATE POLICY "allow_anon_select" ON extract_data    FOR SELECT USING (true);
CREATE POLICY "allow_anon_select" ON leads           FOR SELECT USING (true);
CREATE POLICY "allow_anon_select" ON bookings        FOR SELECT USING (true);
CREATE POLICY "allow_anon_select" ON booking_team    FOR SELECT USING (true);
CREATE POLICY "allow_anon_select" ON agenda_events   FOR SELECT USING (true);

-- Escrita autenticada (service role ou auth futura)
CREATE POLICY "allow_anon_insert" ON team           FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_insert" ON conversations   FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_insert" ON messages        FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_insert" ON extract_data    FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_insert" ON leads           FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_insert" ON bookings        FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_insert" ON booking_team    FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_anon_insert" ON agenda_events   FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_anon_update" ON team           FOR UPDATE USING (true);
CREATE POLICY "allow_anon_update" ON conversations   FOR UPDATE USING (true);
CREATE POLICY "allow_anon_update" ON messages        FOR UPDATE USING (true);
CREATE POLICY "allow_anon_update" ON extract_data    FOR UPDATE USING (true);
CREATE POLICY "allow_anon_update" ON leads           FOR UPDATE USING (true);
CREATE POLICY "allow_anon_update" ON bookings        FOR UPDATE USING (true);
CREATE POLICY "allow_anon_update" ON booking_team    FOR UPDATE USING (true);
CREATE POLICY "allow_anon_update" ON agenda_events   FOR UPDATE USING (true);

CREATE POLICY "allow_anon_delete" ON team           FOR DELETE USING (true);
CREATE POLICY "allow_anon_delete" ON conversations   FOR DELETE USING (true);
CREATE POLICY "allow_anon_delete" ON messages        FOR DELETE USING (true);
CREATE POLICY "allow_anon_delete" ON extract_data    FOR DELETE USING (true);
CREATE POLICY "allow_anon_delete" ON leads           FOR DELETE USING (true);
CREATE POLICY "allow_anon_delete" ON bookings        FOR DELETE USING (true);
CREATE POLICY "allow_anon_delete" ON booking_team    FOR DELETE USING (true);
CREATE POLICY "allow_anon_delete" ON agenda_events   FOR DELETE USING (true);
