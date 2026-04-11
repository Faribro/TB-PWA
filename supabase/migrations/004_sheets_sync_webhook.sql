-- ═══════════════════════════════════════════════════════════════════════════
-- SUPABASE → GOOGLE SHEETS AUTO-SYNC SETUP
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this SQL in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Add sheets_synced_at column if not exists
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS sheets_synced_at TIMESTAMPTZ;

-- Step 2: Create index for faster queries on unsynced records
CREATE INDEX IF NOT EXISTS idx_patients_unsynced 
ON patients (synced_to_sheets, sheets_sync_attempts) 
WHERE synced_to_sheets = false;

-- Step 3: Create index for sheets_synced_at
CREATE INDEX IF NOT EXISTS idx_patients_sheets_synced_at 
ON patients (sheets_synced_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- DATABASE WEBHOOK SETUP (via Supabase Dashboard)
-- ═══════════════════════════════════════════════════════════════════════════
-- Go to: Database → Webhooks → Create a new hook
-- 
-- Configuration:
-- Name: sheets_sync_webhook
-- Table: patients
-- Events: INSERT, UPDATE
-- Type: HTTP Request
-- Method: POST
-- URL: https://your-vercel-domain.vercel.app/api/sync-to-sheets
-- HTTP Headers:
--   x-webhook-secret: your_webhook_secret_here
--   Content-Type: application/json
-- 
-- Conditions (SQL):
-- (synced_to_sheets = false OR synced_to_sheets IS NULL) 
-- AND (sheets_sync_attempts IS NULL OR sheets_sync_attempts < 3)
-- 
-- ═══════════════════════════════════════════════════════════════════════════

-- Alternative: Create webhook via SQL (if pg_net extension is enabled)
-- Note: This requires pg_net extension and proper configuration

-- Enable pg_net extension (run as superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create webhook function
CREATE OR REPLACE FUNCTION notify_sheets_sync()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://your-vercel-domain.vercel.app/api/sync-to-sheets';
  webhook_secret TEXT := 'your_webhook_secret_here';
  payload JSONB;
BEGIN
  -- Only trigger if not synced and attempts < 3
  IF (NEW.synced_to_sheets = false OR NEW.synced_to_sheets IS NULL) 
     AND (NEW.sheets_sync_attempts IS NULL OR NEW.sheets_sync_attempts < 3) THEN
    
    -- Build payload
    payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    );
    
    -- Send webhook (requires pg_net extension)
    -- PERFORM net.http_post(
    --   url := webhook_url,
    --   headers := jsonb_build_object(
    --     'Content-Type', 'application/json',
    --     'x-webhook-secret', webhook_secret
    --   ),
    --   body := payload
    -- );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_sheets_sync ON patients;
CREATE TRIGGER trigger_sheets_sync
  AFTER INSERT OR UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION notify_sheets_sync();

-- ═══════════════════════════════════════════════════════════════════════════
-- MANUAL SYNC QUERY (for backfilling existing records)
-- ═══════════════════════════════════════════════════════════════════════════

-- Find all unsynced patients
SELECT 
  id,
  inmate_name,
  kobo_uuid,
  unique_id,
  synced_to_sheets,
  sheets_sync_attempts,
  sheets_sync_error,
  created_at
FROM patients
WHERE (synced_to_sheets = false OR synced_to_sheets IS NULL)
  AND (sheets_sync_attempts IS NULL OR sheets_sync_attempts < 3)
ORDER BY created_at DESC
LIMIT 100;

-- Reset sync status for failed records (use with caution)
-- UPDATE patients
-- SET 
--   synced_to_sheets = false,
--   sheets_sync_attempts = 0,
--   sheets_sync_error = NULL
-- WHERE sheets_sync_error IS NOT NULL
--   AND sheets_sync_attempts >= 3;

-- ═══════════════════════════════════════════════════════════════════════════
-- MONITORING QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Sync status summary
SELECT 
  synced_to_sheets,
  COUNT(*) as count,
  AVG(sheets_sync_attempts) as avg_attempts,
  MAX(sheets_sync_attempts) as max_attempts
FROM patients
GROUP BY synced_to_sheets;

-- Recent sync failures
SELECT 
  id,
  inmate_name,
  kobo_uuid,
  sheets_sync_attempts,
  sheets_sync_error,
  updated_at
FROM patients
WHERE sheets_sync_error IS NOT NULL
ORDER BY updated_at DESC
LIMIT 20;

-- Sync performance (last 24 hours)
SELECT 
  DATE_TRUNC('hour', sheets_synced_at) as hour,
  COUNT(*) as synced_count
FROM patients
WHERE sheets_synced_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
