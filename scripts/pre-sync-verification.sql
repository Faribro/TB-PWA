-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 PRE-SYNC VERIFICATION - Ensure upsert will work correctly
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Check current record count
SELECT COUNT(*) as current_records FROM patients;

-- 2. Verify kobo_uuid unique constraint exists
SELECT 
    constraint_name,
    constraint_type
FROM 
    information_schema.table_constraints
WHERE 
    table_schema = 'public'
    AND table_name = 'patients'
    AND constraint_name = 'patients_kobo_uuid_key';

-- 3. Check for any duplicate kobo_uuids (should be 0)
SELECT kobo_uuid, COUNT(*) as count
FROM patients
WHERE kobo_uuid IS NOT NULL
GROUP BY kobo_uuid
HAVING COUNT(*) > 1;

-- 4. Sample existing records (to verify they'll be updated, not duplicated)
SELECT id, kobo_uuid, unique_id, inmate_name, updated_at
FROM patients
ORDER BY created_at DESC
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🎯 EXPECTED RESULTS AFTER SYNC:
-- ═══════════════════════════════════════════════════════════════════════════
-- Current: 5,500 records
-- After sync: 20,216 records (5,500 updated + 14,716 inserted)
-- Duplicates: 0
-- ═══════════════════════════════════════════════════════════════════════════

-- 5. Test upsert behavior (OPTIONAL - run this to see how it works)
-- This will update an existing record without creating a duplicate
/*
DO $$
DECLARE
  test_uuid TEXT := (SELECT kobo_uuid FROM patients LIMIT 1);
BEGIN
  -- Try to insert with existing kobo_uuid
  INSERT INTO patients (kobo_uuid, inmate_name, unique_id, screening_state)
  VALUES (test_uuid, 'TEST UPDATE', 'TEST001', 'Test State')
  ON CONFLICT (kobo_uuid) 
  DO UPDATE SET 
    inmate_name = EXCLUDED.inmate_name,
    updated_at = NOW();
  
  -- Verify it updated (not inserted)
  RAISE NOTICE 'Record count after upsert: %', (SELECT COUNT(*) FROM patients);
END $$;
*/
