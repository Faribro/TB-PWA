-- ═══════════════════════════════════════════════════════════════════════════
-- SAMADHAAN TB ENGINE - CONSOLIDATED SUPABASE ACTIVATION SCRIPT
-- Run this entire file in Supabase SQL Editor
-- Safe to run multiple times (all commands use IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. ENABLE PG_NET EXTENSION (Required for webhooks)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE EXTENSION IF NOT EXISTS pg_net;

COMMENT ON EXTENSION pg_net IS 'Async HTTP requests for Supabase webhooks';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. SET WEBHOOK SECRET CONFIGURATION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Set the webhook secret (used by notify_sheets_sync function)
-- Change this value to your actual secret if different
ALTER DATABASE postgres SET "app.sheets_sync_secret" TO 'samadhaan_sheets_sync_secure_2026';

-- Verify the setting
SELECT current_setting('app.sheets_sync_secret', true) AS webhook_secret;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. SHEETS SYNC WEBHOOK SETUP (from 004_sheets_sync_webhook.sql)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Add sheets_synced_at column if not exists
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS sheets_synced_at TIMESTAMPTZ;

-- Create index for faster queries on unsynced records
CREATE INDEX IF NOT EXISTS idx_patients_unsynced 
ON patients (synced_to_sheets, sheets_sync_attempts) 
WHERE synced_to_sheets = false;

-- Create index for sheets_synced_at
CREATE INDEX IF NOT EXISTS idx_patients_sheets_synced_at 
ON patients (sheets_synced_at);

-- Create webhook function with double-write prevention
CREATE OR REPLACE FUNCTION notify_sheets_sync()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://hhxr-tb-engine.vercel.app/api/sync-to-sheets';
  webhook_secret TEXT := current_setting('app.sheets_sync_secret', true);
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
      'x-webhook-secret', COALESCE(
        webhook_secret,
        'samadhaan_sheets_sync_secure_2026'
      )
    ),
    body    := payload::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_sheets_sync ON patients;

-- Re-create: INSERT ONLY (not UPDATE — PATH 3 handles updates)
CREATE TRIGGER trigger_sheets_sync
  AFTER INSERT ON patients
  FOR EACH ROW
  EXECUTE FUNCTION notify_sheets_sync();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. KOBO UUID CONSTRAINT & INDEXES (from 005_kobo_uuid_constraint.sql)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Ensure kobo_uuid is always unique
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

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES - Run these to confirm all components are active
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Check pg_net extension is installed
SELECT
  extname,
  extversion
FROM pg_extension
WHERE extname = 'pg_net';

-- 2. Verify notify_sheets_sync function exists
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'notify_sheets_sync';

-- 3. Verify kobo_uuid unique constraint exists
SELECT
  conname,
  contype
FROM pg_constraint
WHERE conname = 'patients_kobo_uuid_unique';

-- 4. Verify trigger is active
SELECT
  tgname,
  tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_sheets_sync';

-- 5. Summary of all indexes on patients table
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'patients'
ORDER BY indexname;
