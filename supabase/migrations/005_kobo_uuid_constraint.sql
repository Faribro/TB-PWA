-- ═══════════════════════════════════════════════════════════════════════════
-- KOBO UUID UNIQUE CONSTRAINT & PERFORMANCE INDEXES
-- ═══════════════════════════════════════════════════════════════════════════
-- Ensures data integrity and prevents duplicate Kobo submissions
-- ═══════════════════════════════════════════════════════════════════════════

-- Ensure kobo_uuid is always unique
-- Safe to run even if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patients_kobo_uuid_unique'
  ) THEN
    ALTER TABLE patients
    ADD CONSTRAINT patients_kobo_uuid_unique UNIQUE (kobo_uuid);
    
    RAISE NOTICE '✅ Added unique constraint on kobo_uuid';
  ELSE
    RAISE NOTICE '⏭️  Unique constraint on kobo_uuid already exists';
  END IF;
END $$;

-- Add index for fast lookup by kobo_uuid
CREATE INDEX IF NOT EXISTS idx_patients_kobo_uuid
  ON patients(kobo_uuid)
  WHERE kobo_uuid IS NOT NULL;

COMMENT ON INDEX idx_patients_kobo_uuid IS 'Fast lookup for Kobo webhook deduplication';

-- Add index for sync status queries (unsynced records)
CREATE INDEX IF NOT EXISTS idx_patients_sync_status
  ON patients(synced_to_sheets, sheets_sync_attempts)
  WHERE synced_to_sheets = false;

COMMENT ON INDEX idx_patients_sync_status IS 'Fast lookup for unsynced patients in PATH 2';

-- Add index for stuck records (failed sync attempts)
CREATE INDEX IF NOT EXISTS idx_patients_stuck_sync
  ON patients(sheets_sync_attempts, created_at)
  WHERE sheets_sync_attempts >= 3;

COMMENT ON INDEX idx_patients_stuck_sync IS 'Fast lookup for stuck sync records needing manual intervention';

-- Add index for recent webhook activity (monitoring)
CREATE INDEX IF NOT EXISTS idx_patients_webhook_received
  ON patients(webhook_received_at DESC)
  WHERE webhook_received_at IS NOT NULL;

COMMENT ON INDEX idx_patients_webhook_received IS 'Fast lookup for recent Kobo webhook activity';

-- Verify indexes were created
DO $$
DECLARE
  idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE tablename = 'patients'
    AND indexname IN (
      'patients_kobo_uuid_unique',
      'idx_patients_kobo_uuid',
      'idx_patients_sync_status',
      'idx_patients_stuck_sync',
      'idx_patients_webhook_received'
    );
  
  RAISE NOTICE '✅ Created/verified % indexes on patients table', idx_count;
END $$;
