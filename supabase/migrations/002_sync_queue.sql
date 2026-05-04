-- ═══════════════════════════════════════════════════════════════════════════
-- SYNC QUEUE TABLE - DB-BACKED FALLBACK FOR SHEETS SYNC
-- ═══════════════════════════════════════════════════════════════════════════
-- Durable job queue when QStash is unavailable
-- Processed by cron or manual trigger
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  INDEX idx_sync_queue_status (status, created_at),
  INDEX idx_sync_queue_patient (patient_id)
);

-- RLS policies
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON sync_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comment
COMMENT ON TABLE sync_queue IS 'Fallback queue for Google Sheets sync when QStash unavailable';
