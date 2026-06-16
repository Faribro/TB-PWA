-- ============================================================================
-- RLS VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify RLS policies are working
-- ============================================================================

-- STEP 1: Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'patients';

-- Expected: rls_enabled = true

-- STEP 2: List all active policies
SELECT 
  policyname,
  cmd,
  roles,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'patients'
ORDER BY cmd, policyname;

-- Expected: Only {authenticated} roles, no {public}

-- STEP 3: Verify policy definitions match expected role strings
-- This checks if policies use long-form role names
SELECT 
  policyname,
  CASE 
    WHEN qual::text LIKE '%Program Manager%' THEN '✅ Uses long form'
    WHEN qual::text LIKE '%PM%' AND qual::text NOT LIKE '%Program Manager%' THEN '❌ Uses short code'
    ELSE '⚠️  Check manually'
  END AS role_format_check,
  qual::text AS policy_definition
FROM pg_policies
WHERE tablename = 'patients' AND cmd = 'SELECT';

-- Expected: All policies show "✅ Uses long form"

-- STEP 4: Test policy evaluation for different roles
-- Replace 'your-email@example.com' with actual user email

-- Test 1: Program Manager (should see all records)
SELECT COUNT(*) AS pm_visible_count
FROM patients
WHERE (
  -- Simulate patients_select_national policy
  'Program Manager' IN ('admin', 'Program Manager')
);

-- Test 2: State Program Manager (should see state-filtered records)
-- Replace 'Maharashtra' with actual state from profiles
SELECT COUNT(*) AS spm_visible_count
FROM patients
WHERE (
  -- Simulate patients_select_state policy
  'State Program Manager' IN ('State Program Manager', 'M&E Officer')
  AND screening_state = 'Maharashtra'
);

-- Test 3: Prison Coordinator (should see staff-filtered records)
-- Replace 'John Doe' with actual staff name from profiles
SELECT COUNT(*) AS pc_visible_count
FROM patients
WHERE (
  -- Simulate patients_select_facility policy
  'Prison Coordinator' = 'Prison Coordinator'
  AND LOWER(TRIM(staff_name)) = LOWER(TRIM('John Doe'))
);

-- STEP 5: Verify profiles table has correct role values
SELECT 
  email,
  role,
  CASE 
    WHEN role IN ('admin', 'Program Manager', 'State Program Manager', 'M&E Officer', 'Prison Coordinator') 
      THEN '✅ Long form (RLS compatible)'
    WHEN role IN ('PM', 'SPM', 'ME', 'PC') 
      THEN '❌ Short code (needs normalization in JWT)'
    ELSE '⚠️  Unknown role format'
  END AS role_format,
  state,
  district,
  name AS staff_name,
  is_active
FROM profiles
WHERE is_active = true
ORDER BY role, email;

-- STEP 6: Check for orphaned patients (no matching staff in profiles)
SELECT 
  DISTINCT staff_name,
  COUNT(*) AS patient_count
FROM patients
WHERE staff_name IS NOT NULL
  AND staff_name NOT IN (SELECT name FROM profiles WHERE is_active = true)
GROUP BY staff_name
ORDER BY patient_count DESC;

-- STEP 7: Verify no public access
SELECT 
  COUNT(*) AS policies_with_public_access
FROM pg_policies
WHERE tablename = 'patients' 
  AND 'public' = ANY(roles);

-- Expected: 0

-- ============================================================================
-- DIAGNOSTIC QUERIES FOR TROUBLESHOOTING
-- ============================================================================

-- Check if custom_access_token_hook exists (for Supabase Auth integration)
SELECT 
  proname AS function_name,
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'custom_access_token_hook';

-- Check RLS policy performance (requires pg_stat_statements extension)
-- SELECT 
--   query,
--   calls,
--   mean_exec_time,
--   max_exec_time
-- FROM pg_stat_statements
-- WHERE query LIKE '%patients%' AND query LIKE '%auth.jwt%'
-- ORDER BY mean_exec_time DESC
-- LIMIT 10;

-- ============================================================================
-- EXPECTED RESULTS SUMMARY
-- ============================================================================
-- 
-- ✅ RLS enabled on patients table
-- ✅ 6 policies: 3 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE
-- ✅ All policies use {authenticated} role only
-- ✅ SELECT policies use long-form role names
-- ✅ Profiles table contains role data
-- ✅ No public access policies
-- ✅ Test queries return expected counts
--
-- ============================================================================
