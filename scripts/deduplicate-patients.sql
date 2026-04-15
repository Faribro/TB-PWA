-- =====================================================
-- DEDUPLICATE PATIENTS TABLE
-- Keeps the latest row (by created_at or sheets_synced_at) for each unique ID
-- =====================================================

-- Step 1: Identify duplicates (rows with same ID)
-- This query shows which IDs have duplicates
SELECT 
  id,
  COUNT(*) as duplicate_count,
  MAX(COALESCE(sheets_synced_at, created_at)) as latest_timestamp
FROM patients
GROUP BY id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Delete duplicate rows, keeping only the latest
-- WARNING: This will permanently delete duplicate rows!
-- Run Step 1 first to verify which rows will be affected

WITH ranked_patients AS (
  SELECT 
    id,
    kobo_uuid,
    created_at,
    sheets_synced_at,
    ROW_NUMBER() OVER (
      PARTITION BY id 
      ORDER BY 
        COALESCE(sheets_synced_at, created_at) DESC NULLS LAST,
        created_at DESC NULLS LAST
    ) as row_num
  FROM patients
)
DELETE FROM patients
WHERE (id, COALESCE(kobo_uuid, '')) IN (
  SELECT id, COALESCE(kobo_uuid, '')
  FROM ranked_patients
  WHERE row_num > 1
);

-- Step 3: Verify deduplication
-- Should return 0 rows if successful
SELECT 
  id,
  COUNT(*) as duplicate_count
FROM patients
GROUP BY id
HAVING COUNT(*) > 1;

-- Step 4: Add unique constraint to prevent future duplicates (optional)
-- Uncomment if you want to enforce uniqueness at database level
-- Note: This assumes 'id' is already the primary key
-- If not, run: ALTER TABLE patients ADD PRIMARY KEY (id);
