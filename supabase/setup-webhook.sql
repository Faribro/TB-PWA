-- ═══════════════════════════════════════════════════════════════════════════
-- SUPABASE DATABASE WEBHOOK SETUP (SQL)
-- Run this in Supabase SQL Editor after deploying to Vercel
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Add sheets_synced_at column
ALTER TABLE patients ADD COLUMN IF NOT EXISTS sheets_synced_at TIMESTAMPTZ;

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_patients_unsynced 
ON patients (synced_to_sheets, sheets_sync_attempts) 
WHERE synced_to_sheets = false;

CREATE INDEX IF NOT EXISTS idx_patients_sheets_synced_at 
ON patients (sheets_synced_at);

-- Step 3: Enable pg_net extension (required for webhooks)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;

-- Step 4: Create webhook function
CREATE OR REPLACE FUNCTION notify_sheets_sync()
RETURNS TRIGGER AS $$
DECLARE
  -- IMPORTANT: Replace the URL below with your Google Apps Script Web App URL before running
  webhook_url TEXT := 'REPLACE_WITH_GOOGLE_SCRIPT_WEBHOOK_URL';
  webhook_secret TEXT := 'samadhaan_sheets_sync_secure_2026';
  payload JSONB;
  request_id BIGINT;
BEGIN
  -- Only trigger if not synced and attempts < 3
  IF (NEW.synced_to_sheets = false OR NEW.synced_to_sheets IS NULL) 
     AND (NEW.sheets_sync_attempts IS NULL OR NEW.sheets_sync_attempts < 3) THEN
    
    payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    );
    
    SELECT INTO request_id net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', webhook_secret
      ),
      body := payload
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger
DROP TRIGGER IF EXISTS trigger_sheets_sync ON patients;
CREATE TRIGGER trigger_sheets_sync
  AFTER INSERT OR UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION notify_sheets_sync();

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_sheets_sync';

-- Check unsynced patients
SELECT COUNT(*) FROM patients WHERE synced_to_sheets = false OR synced_to_sheets IS NULL;

-- Test trigger (insert test record)
-- INSERT INTO patients (inmate_name, synced_to_sheets) VALUES ('Test Webhook', false);
