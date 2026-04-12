-- ═══════════════════════════════════════════════════════════════════════════
-- TRIPLE SYNC FIX - COMPLETE MIGRATION SCRIPT
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- STEP 1: Enable pg_net extension (required for webhooks)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- STEP 2: Add sheets_synced_at column if not exists
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS sheets_synced_at TIMESTAMPTZ;

-- STEP 4: Create indexes for faster queries on unsynced records
CREATE INDEX IF NOT EXISTS idx_patients_unsynced 
ON patients (synced_to_sheets, sheets_sync_attempts) 
WHERE synced_to_sheets = false;

CREATE INDEX IF NOT EXISTS idx_patients_sheets_synced_at 
ON patients (sheets_synced_at);

-- STEP 2: Create webhook function with double-write prevention
CREATE OR REPLACE FUNCTION notify_sheets_sync()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://hhxr-tb-engine.vercel.app/api/sync-to-sheets';
  webhook_secret TEXT := 'samadhaan_sheets_sync_secure_2026';
  payload JSONB;
BEGIN
  -- GUARD: Skip if already synced (prevents double-write from PATH 3)
  IF NEW.synced_to_sheets = true THEN
    RETURN NEW;
  END IF;

  -- GUARD: Skip if too many failed attempts
  IF COALESCE(NEW.sheets_sync_attempts, 0) >= 3 THEN
    RETURN NEW;
  END IF;

  -- Build payload
  payload := jsonb_build_object(
    'type',   TG_OP,
    'table',  TG_TABLE_NAME,
    'record', row_to_json(NEW)::jsonb
  );

  -- Fire webhook (pg_net non-blocking)
  PERFORM net.http_post(
    url     := webhook_url,
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body    := payload::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_sheets_sync ON patients;

-- STEP 7: Re-create trigger (INSERT ONLY - not UPDATE, PATH 3 handles updates)
CREATE TRIGGER trigger_sheets_sync
  AFTER INSERT ON patients
  FOR EACH ROW
  EXECUTE FUNCTION notify_sheets_sync();

-- STEP 8: Add unique constraint on kobo_uuid
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

-- STEP 9: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_patients_kobo_uuid
  ON patients(kobo_uuid)
  WHERE kobo_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_sync_status
  ON patients(synced_to_sheets, sheets_sync_attempts)
  WHERE synced_to_sheets = false;

CREATE INDEX IF NOT EXISTS idx_patients_stuck_sync
  ON patients(sheets_sync_attempts, created_at)
  WHERE sheets_sync_attempts >= 3;

CREATE INDEX IF NOT EXISTS idx_patients_webhook_received
  ON patients(webhook_received_at DESC)
  WHERE webhook_received_at IS NOT NULL;

-- STEP 10: Verify setup
DO $$
DECLARE
  idx_count INTEGER;
  trigger_exists BOOLEAN;
BEGIN
  -- Count indexes
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE tablename = 'patients'
    AND indexname IN (
      'idx_patients_kobo_uuid',
      'idx_patients_sync_status',
      'idx_patients_stuck_sync',
      'idx_patients_webhook_received',
      'idx_patients_unsynced',
      'idx_patients_sheets_synced_at'
    );
  
  -- Check trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_sheets_sync'
  ) INTO trigger_exists;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ TRIPLE SYNC MIGRATION COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Indexes created: %', idx_count;
  RAISE NOTICE 'Trigger active: %', trigger_exists;
  RAISE NOTICE 'Webhook URL: https://hhxr-tb-engine.vercel.app/api/sync-to-sheets';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- STEP 11: Test query - show unsynced records
SELECT 
  COUNT(*) as unsynced_count,
  MIN(created_at) as oldest_unsynced,
  MAX(created_at) as newest_unsynced
FROM patients
WHERE synced_to_sheets = false
  AND sheets_sync_attempts < 3;
