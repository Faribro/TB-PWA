-- ═══════════════════════════════════════════════════════════════════════════
-- SHEETS SYNC QUEUE TABLE - RESILIENT SYNC RETRIES
-- ═══════════════════════════════════════════════════════════════════════════
-- Durable queue for tracking failed patient clinical Google Sheets sync attempts.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sheets_sync_queue (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  fields      jsonb NOT NULL,  -- the diff payload
  attempts    int DEFAULT 0,
  last_error  text,
  source      text DEFAULT 'drawer_clinical_update',
  created_at  timestamptz DEFAULT now(),
  synced_at   timestamptz  -- null until successfully synced
);

CREATE INDEX IF NOT EXISTS idx_sheets_sync_queue_synced ON sheets_sync_queue (synced_at, attempts);
CREATE INDEX IF NOT EXISTS idx_sheets_sync_queue_patient ON sheets_sync_queue (patient_id);

-- Enable RLS
ALTER TABLE sheets_sync_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access sheets_sync_queue" ON sheets_sync_queue;
CREATE POLICY "Service role full access sheets_sync_queue" ON sheets_sync_queue
  FOR ALL
  USING (true); -- Server actions bypass or satisfy policies via service_role

-- Comment
COMMENT ON TABLE sheets_sync_queue IS 'Queue for resilient clinical Google Sheets sync retries';
