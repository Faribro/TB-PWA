-- ============================================================
-- Migration 003: GaaS Ledger — AI Reconciliation Infrastructure
-- ============================================================

-- 1. Enum: task lifecycle states
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

-- 2. Enum: patient AI link state
DO $$ BEGIN
  CREATE TYPE ai_link_status AS ENUM (
    'unlinked',
    'ai_linked',
    'human_verified'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add ai_link_status to patients
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS ai_link_status ai_link_status NOT NULL DEFAULT 'unlinked';

CREATE INDEX IF NOT EXISTS idx_patients_ai_link_status
  ON patients(ai_link_status);

-- 4. Gemini key usage table (serverless-safe persistence)
CREATE TABLE IF NOT EXISTS gemini_key_usage (
  key_index     SMALLINT PRIMARY KEY,          -- 0-10
  requests_today INTEGER NOT NULL DEFAULT 0,
  requests_this_minute INTEGER NOT NULL DEFAULT 0,
  cooldown_until TIMESTAMPTZ,                  -- NULL = available
  last_reset_day DATE NOT NULL DEFAULT CURRENT_DATE,
  last_reset_minute TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed one row per key so upserts always hit an existing row
INSERT INTO gemini_key_usage (key_index)
SELECT generate_series(0, 10)
ON CONFLICT (key_index) DO NOTHING;

-- 5. AI Reconciliation Tasks ledger
CREATE TABLE IF NOT EXISTS ai_reconciliation_tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blob_name           TEXT NOT NULL,
  blob_url            TEXT NOT NULL,
  status              ai_task_status NOT NULL DEFAULT 'pending_ai',
  confidence_score    NUMERIC(5,4) CHECK (confidence_score BETWEEN 0 AND 1),
  gemini_reasoning    TEXT,
  proposed_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  -- Evidence chain (array of plain-language flags from Gemini)
  evidence_flags      TEXT[] DEFAULT '{}',
  -- Human review metadata
  reviewed_by         TEXT,                    -- email of reviewer
  reviewed_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_art_status
  ON ai_reconciliation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_art_proposed_patient
  ON ai_reconciliation_tasks(proposed_patient_id);
CREATE INDEX IF NOT EXISTS idx_art_created_at
  ON ai_reconciliation_tasks(created_at DESC);

-- 6. Auto-update updated_at
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

-- 7. RLS
ALTER TABLE ai_reconciliation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemini_key_usage ENABLE ROW LEVEL SECURITY;

-- PM/SPM can see all tasks; ME/PC see only their district's patients
CREATE POLICY "PM_SPM_full_art_access" ON ai_reconciliation_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE email = auth.email() AND role IN ('PM', 'SPM')
    )
  );

CREATE POLICY "ME_PC_art_read" ON ai_reconciliation_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN patients pt ON pt.id = ai_reconciliation_tasks.proposed_patient_id
      WHERE p.email = auth.email()
        AND p.role IN ('ME', 'PC')
        AND p.assigned_district = pt.screening_district
    )
  );

-- gemini_key_usage is server-only (service role only)
CREATE POLICY "service_role_only_gku" ON gemini_key_usage
  FOR ALL USING (auth.role() = 'service_role');

-- 8. RPC helper for KeyPool.persistIncrement (atomic, avoids read-modify-write)
CREATE OR REPLACE FUNCTION increment_gemini_key_usage(p_key_index SMALLINT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_today DATE := CURRENT_DATE;
BEGIN
  UPDATE gemini_key_usage
  SET
    requests_this_minute = CASE
      WHEN EXTRACT(EPOCH FROM (v_now - last_reset_minute)) >= 60
        THEN 1
      ELSE requests_this_minute + 1
    END,
    last_reset_minute = CASE
      WHEN EXTRACT(EPOCH FROM (v_now - last_reset_minute)) >= 60
        THEN v_now
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
