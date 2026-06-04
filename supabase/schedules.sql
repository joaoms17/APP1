-- ============================================================
-- RAMO — Cronograma do dia (cabelo/maquilhagem + música)
-- Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================
CREATE TABLE IF NOT EXISTS schedules (
  id           TEXT PRIMARY KEY,
  booking_id   TEXT,
  kind         TEXT NOT NULL,          -- 'beauty' | 'music'
  title        TEXT,
  event_date   TEXT,
  location     TEXT,
  content      JSONB,
  status       TEXT DEFAULT 'rascunho',
  sent_content JSONB,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_select" ON schedules FOR SELECT USING (true);
CREATE POLICY "all_insert" ON schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON schedules FOR UPDATE USING (true);
CREATE POLICY "all_delete" ON schedules FOR DELETE USING (true);
