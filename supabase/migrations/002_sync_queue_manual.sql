-- ═══════════════════════════════════════════════════════════════════════════
-- MANUAL MIGRATION: SYNC QUEUE TABLE
-- ═══════════════════════════════════════════════════════════════════════════
-- Execute this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fgtrkxadiszoyhslwesu/sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Create sync_queue table
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue (status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_patient ON sync_queue (patient_id);

-- Step 3: Enable RLS
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policy
CREATE POLICY "Service role full access" ON sync_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- Step 5: Add comment
COMMENT ON TABLE sync_queue IS 'Fallback queue for Google Sheets sync when QStash unavailable';

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'sync_queue'
);

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'sync_queue';

-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'sync_queue';

-- Check policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'sync_queue';

-- ═══════════════════════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════════════════════
-- If all queries return expected results, migration is complete!
-- Expected results:
-- - Table exists: true
-- - 2 indexes created
-- - RLS enabled: true
-- - 1 policy created
-- ═══════════════════════════════════════════════════════════════════════════
