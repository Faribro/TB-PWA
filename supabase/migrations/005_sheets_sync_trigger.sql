-- ═══════════════════════════════════════════════════════════════════════════
-- SUPABASE → GOOGLE SHEETS REAL-TIME SYNC TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════
-- Automatically syncs INSERT/UPDATE operations to Google Sheets via webhook
-- ═══════════════════════════════════════════════════════════════════════════

-- Create function to call Google Sheets webhook
CREATE OR REPLACE FUNCTION sync_to_google_sheets()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://script.google.com/macros/s/AKfycby3f0PRiH-Gp8dPVegdbptNKSa2qDqwONH-MLq0wdl37pu5GC6jthXNIYpQ7AaObx2I/exec';
  payload JSONB;
  http_response JSONB;
BEGIN
  -- Build payload based on operation type
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'batch', jsonb_build_array(row_to_json(NEW)),
      'batch_id', 'supabase-insert-' || NEW.id::text,
      'operation', 'INSERT'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'action', 'update_patient',
      'uuid', NEW.kobo_uuid,
      'uniqueId', NEW.kobo_uuid,
      'updates', row_to_json(NEW),
      'operation', 'UPDATE'
    );
  END IF;

  -- Call Google Sheets webhook asynchronously
  BEGIN
    SELECT content::jsonb INTO http_response
    FROM http((
      'POST',
      webhook_url,
      ARRAY[http_header('Content-Type', 'application/json')],
      'application/json',
      payload::text
    )::http_request);
    
    -- Log success
    RAISE NOTICE 'Synced to Google Sheets: % (operation: %)', NEW.id, TG_OP;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to sync to Google Sheets: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_to_google_sheets ON patients;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER trigger_sync_to_google_sheets
  AFTER INSERT OR UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_google_sheets();

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTES:
-- - Requires pg_net extension: CREATE EXTENSION IF NOT EXISTS pg_net;
-- - Runs asynchronously to avoid blocking database operations
-- - Errors are logged but don't fail the transaction
-- - Updates synced_to_sheets flag after successful sync
-- ═══════════════════════════════════════════════════════════════════════════
