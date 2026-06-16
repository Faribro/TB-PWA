-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK AND INITIALIZE SYNC COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Check if columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
  AND column_name IN ('synced_to_sheets', 'sheets_sync_attempts', 'sheets_sync_error', 'sheets_synced_at', 'webhook_received_at')
ORDER BY column_name;

-- Step 2: Add missing columns
ALTER TABLE patients ADD COLUMN IF NOT EXISTS synced_to_sheets BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS sheets_sync_attempts INTEGER DEFAULT 0;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS sheets_sync_error TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS sheets_synced_at TIMESTAMPTZ;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMPTZ;

-- Step 3: Check current sync status
SELECT 
  synced_to_sheets,
  COUNT(*) as count
FROM patients
GROUP BY synced_to_sheets;

-- Step 4: Initialize all existing records to unsynced (ONLY RUN ONCE)
UPDATE patients
SET 
  synced_to_sheets = false,
  sheets_sync_attempts = 0,
  sheets_sync_error = NULL
WHERE synced_to_sheets IS NULL OR synced_to_sheets = true;

-- Step 5: Verify unsynced count
SELECT COUNT(*) as unsynced_count
FROM patients
WHERE synced_to_sheets = false;

-- Step 6: Sample unsynced records
SELECT 
  id,
  inmate_name,
  kobo_uuid,
  unique_id,
  synced_to_sheets,
  sheets_sync_attempts,
  created_at
FROM patients
WHERE synced_to_sheets = false
ORDER BY created_at DESC
LIMIT 10;
