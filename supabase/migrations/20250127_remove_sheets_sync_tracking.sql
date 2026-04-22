-- ═══════════════════════════════════════════════════════════════════════════
-- REMOVE GOOGLE SHEETS SYNC TRACKING COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════
-- Supabase is the source of truth. Sheets is a reporting mirror only.
-- Sync tracking is no longer needed as all syncs are fire-and-forget.
-- ═══════════════════════════════════════════════════════════════════════════

-- Remove sync tracking columns from patients table
ALTER TABLE patients 
  DROP COLUMN IF EXISTS synced_to_sheets,
  DROP COLUMN IF EXISTS sheets_sync_attempts,
  DROP COLUMN IF EXISTS sheets_sync_error,
  DROP COLUMN IF EXISTS sheets_synced_at;

-- Drop any existing Sheets sync triggers (if deployed)
DROP TRIGGER IF EXISTS trigger_sync_to_google_sheets ON patients;
DROP FUNCTION IF EXISTS sync_to_google_sheets();

-- Add comment to document architecture decision
COMMENT ON TABLE patients IS 'Source of truth for patient data. Google Sheets is a reporting mirror only (fire-and-forget sync).';
