-- ============================================================
-- Migration 003: GaaS Ledger
-- Paste this entire file into the Supabase SQL Editor and click Run.
-- All statements are idempotent (safe to re-run).
-- ============================================================

-- Bootstrap helper so the cross-check script can verify afterwards
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json;
BEGIN
  EXECUTE query;
  RETURN '{"ok":true}'::json;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok',false,'error',SQLERRM,'state',SQLSTATE);
END;
$$;

CREATE OR REPLACE FUNCTION exec_sql_rows(query text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json;
BEGIN
  EXECUTE format('SELECT json_agg(t) FROM (%s) t', query) INTO result;
  RETURN COALESCE(result, '[]'::json);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error',SQLERRM);
END;
$$;

-- ── 1. Enums ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE ai_task_status AS ENUM (
    'pending_ai',
    'analyzing',
    'gemini_scoring',
    'auto_reconciled',
    'requires_human_review',
    'approved_by_human',
    'rejected_by_human',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ai_link_status AS ENUM (
    'unlinked',
    'ai_linked',
    'human_verified'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. patients.ai_link_status ────────────────────────────────────────────────

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS ai_link_status ai_link_status NOT NULL DEFAULT 'unlinked';

CREATE INDEX IF NOT EXISTS idx_patients_ai_link_status
  ON patients(ai_link_status);

-- ── 3. gemini_key_usage ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gemini_key_usage (
  key_index            SMALLINT    PRIMARY KEY,
  requests_today       INTEGER     NOT NULL DEFAULT 0,
  requests_this_minute INTEGER     NOT NULL DEFAULT 0,
  cooldown_until       TIMESTAMPTZ,
  last_reset_day       DATE        NOT NULL DEFAULT CURRENT_DATE,
  last_reset_minute    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO gemini_key_usage (key_index)
SELECT generate_series(0, 10)
ON CONFLICT (key_index) DO NOTHING;

-- ── 4. ai_reconciliation_tasks ────────────────────────────────────────────────
-- NOTE: patients.id is BIGINT on this project

CREATE TABLE IF NOT EXISTS ai_reconciliation_tasks (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  blob_name           TEXT           NOT NULL,
  blob_url            TEXT           NOT NULL,
  status              ai_task_status NOT NULL DEFAULT 'pending_ai',
  confidence_score    NUMERIC(5,4)   CHECK (confidence_score BETWEEN 0 AND 1),
  gemini_reasoning    TEXT,
  proposed_patient_id BIGINT         REFERENCES patients(id) ON DELETE SET NULL,
  evidence_flags      TEXT[]         DEFAULT '{}',
  reviewed_by         TEXT,
  reviewed_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_art_status
  ON ai_reconciliation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_art_proposed_patient
  ON ai_reconciliation_tasks(proposed_patient_id);
CREATE INDEX IF NOT EXISTS idx_art_created_at
  ON ai_reconciliation_tasks(created_at DESC);

-- ── 5. updated_at trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_art_updated_at ON ai_reconciliation_tasks;
CREATE TRIGGER trg_art_updated_at
  BEFORE UPDATE ON ai_reconciliation_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_gku_updated_at ON gemini_key_usage;
CREATE TRIGGER trg_gku_updated_at
  BEFORE UPDATE ON gemini_key_usage
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE ai_reconciliation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemini_key_usage        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PM_SPM_full_art_access" ON ai_reconciliation_tasks;
CREATE POLICY "PM_SPM_full_art_access" ON ai_reconciliation_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE email = auth.email() AND role IN ('PM','SPM')
    )
  );

DROP POLICY IF EXISTS "ME_PC_art_read" ON ai_reconciliation_tasks;
CREATE POLICY "ME_PC_art_read" ON ai_reconciliation_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN patients pt ON pt.id = ai_reconciliation_tasks.proposed_patient_id
      WHERE p.email = auth.email()
        AND p.role IN ('ME','PC')
        AND p.district = pt.screening_district
    )
  );

DROP POLICY IF EXISTS "service_role_only_gku" ON gemini_key_usage;
CREATE POLICY "service_role_only_gku" ON gemini_key_usage
  FOR ALL USING (auth.role() = 'service_role');

-- ── 7. increment_gemini_key_usage RPC ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_gemini_key_usage(p_key_index SMALLINT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_now   TIMESTAMPTZ := NOW();
  v_today DATE        := CURRENT_DATE;
BEGIN
  UPDATE gemini_key_usage SET
    requests_this_minute = CASE
      WHEN EXTRACT(EPOCH FROM (v_now - last_reset_minute)) >= 60 THEN 1
      ELSE requests_this_minute + 1
    END,
    last_reset_minute = CASE
      WHEN EXTRACT(EPOCH FROM (v_now - last_reset_minute)) >= 60 THEN v_now
      ELSE last_reset_minute
    END,
    requests_today = CASE
      WHEN last_reset_day < v_today THEN 1
      ELSE requests_today + 1
    END,
    last_reset_day = v_today
  WHERE key_index = p_key_index;
END;
$$;

-- ── 8. Quick self-check (results appear in the SQL Editor output) ─────────────

SELECT 'enums' AS check,
  (SELECT typname FROM pg_type WHERE typname = 'ai_task_status') AS ai_task_status,
  (SELECT typname FROM pg_type WHERE typname = 'ai_link_status') AS ai_link_status;

SELECT 'patients.ai_link_status' AS check, column_name, udt_name, column_default
FROM information_schema.columns
WHERE table_name = 'patients' AND column_name = 'ai_link_status';

SELECT 'gemini_key_usage rows' AS check, COUNT(*)::int AS row_count
FROM gemini_key_usage;

SELECT 'ai_reconciliation_tasks columns' AS check, column_name, udt_name
FROM information_schema.columns
WHERE table_name = 'ai_reconciliation_tasks'
ORDER BY ordinal_position;

SELECT 'indexes' AS check, indexname
FROM pg_indexes
WHERE tablename IN ('ai_reconciliation_tasks','gemini_key_usage','patients')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

SELECT 'rls_policies' AS check, tablename, policyname
FROM pg_policies
WHERE tablename IN ('ai_reconciliation_tasks','gemini_key_usage')
ORDER BY tablename, policyname;

SELECT 'functions' AS check, proname, prosecdef
FROM pg_proc
WHERE proname IN ('exec_sql','exec_sql_rows','increment_gemini_key_usage','set_updated_at');

SELECT 'triggers' AS check, trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('trg_art_updated_at','trg_gku_updated_at');
