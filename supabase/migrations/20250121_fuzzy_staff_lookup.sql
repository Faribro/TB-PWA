-- ============================================================================
-- SAMADHAAN: Advanced Fuzzy Staff Name Lookup
-- ============================================================================
-- This migration enables PostgreSQL trigram similarity for fuzzy matching
-- on the staff_name column in the patients table.
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: Create trigram index on staff_name for fast fuzzy search
CREATE INDEX IF NOT EXISTS idx_patients_staff_name_trgm 
ON public.patients USING gin(staff_name gin_trgm_ops);

COMMENT ON INDEX idx_patients_staff_name_trgm IS 'Trigram index for fuzzy staff name matching';

-- Step 3: Create RPC function for advanced fuzzy lookup
CREATE OR REPLACE FUNCTION find_patient_submissions(
  p_staff_name TEXT,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  id BIGINT,
  kobo_uuid UUID,
  unique_id TEXT,
  inmate_name TEXT,
  screening_date DATE,
  screening_district TEXT,
  created_at TIMESTAMPTZ,
  staff_name TEXT,
  similarity_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pat.id,
    pat.kobo_uuid,
    pat.unique_id,
    pat.inmate_name,
    pat.screening_date,
    pat.screening_district,
    pat.created_at,
    pat.staff_name,
    similarity(pat.staff_name, p_staff_name) as similarity_score
  FROM patients pat
  WHERE 
    pat.staff_name ILIKE p_staff_name
    OR similarity(pat.staff_name, p_staff_name) > 0.4
    OR EXISTS (
      SELECT 1 
      FROM unnest(string_to_array(p_staff_name, ' ')) AS word
      WHERE length(word) > 2 
        AND pat.staff_name ILIKE '%' || word || '%'
    )
  ORDER BY 
    similarity(pat.staff_name, p_staff_name) DESC,
    pat.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION find_patient_submissions IS 'Advanced fuzzy lookup for PC staff submissions using trigram similarity';

-- Step 4: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_patient_submissions TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test fuzzy matching with actual staff names
SELECT staff_name, similarity(staff_name, 'Arun Waghmare') as sim
FROM patients
WHERE staff_name IS NOT NULL
  AND (
    staff_name ILIKE '%Arun%' 
    OR similarity(staff_name, 'Arun Waghmare') > 0.3
  )
ORDER BY sim DESC
LIMIT 10;

-- Test RPC function
SELECT * FROM find_patient_submissions('Arun Waghmare', 10);

-- Check distinct staff names
SELECT staff_name, COUNT(*) as submission_count
FROM patients 
WHERE staff_name IS NOT NULL
GROUP BY staff_name
ORDER BY submission_count DESC
LIMIT 20;

-- ============================================================================
-- PROFILE UPDATES FOR PC USERS
-- ============================================================================
-- Update PC user profiles with their staff names
-- The name MUST match what they write in KoboToolbox forms
--
-- Examples based on actual data:
-- UPDATE profiles SET name = 'Faribro21' WHERE email = 'faribro@example.com' AND role = 'PC';
-- UPDATE profiles SET name = 'Keshav Jha' WHERE email = 'keshav@example.com' AND role = 'PC';
-- UPDATE profiles SET name = 'Dheerendra Kumar Verma' WHERE email = 'dheerendra@example.com' AND role = 'PC';
-- UPDATE profiles SET name = 'Arun Waghmare' WHERE email = 'arun@example.com' AND role = 'PC';
--
-- Run this for each PC user in your system
-- ============================================================================
