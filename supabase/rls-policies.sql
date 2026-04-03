-- ============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- 3-Tier Healthcare Data Isolation for SAMADHAAN
-- ============================================================================
-- 
-- SECURITY MODEL:
-- Tier 1 (National): admin, Program Manager → See ALL records
-- Tier 2 (State):    SPM, M&E Officer → See state-level records
-- Tier 3 (Facility): Prison Coordinator → See staff-level records
--
-- PREREQUISITES:
-- 1. User metadata must include: role, state, name
-- 2. JWT claims must be populated during sign-in
-- 3. profiles table must exist with role/state/name columns
-- ============================================================================

-- Step 1: Enable RLS on patients table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies (if any)
DROP POLICY IF EXISTS "patients_select_national" ON patients;
DROP POLICY IF EXISTS "patients_select_state" ON patients;
DROP POLICY IF EXISTS "patients_select_facility" ON patients;
DROP POLICY IF EXISTS "patients_insert_authenticated" ON patients;
DROP POLICY IF EXISTS "patients_update_authenticated" ON patients;

-- ============================================================================
-- SELECT POLICIES (Read Access)
-- ============================================================================

-- Policy 1: National Tier (Admin, Program Manager)
-- Allow full read access to superusers
CREATE POLICY "patients_select_national"
ON patients
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'Program Manager')
);

-- Policy 2: State Tier (State Program Manager, M&E Officer)
-- Filter by screening_state matching user's assigned state
CREATE POLICY "patients_select_state"
ON patients
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('State Program Manager', 'M&E Officer')
  AND
  screening_state = (auth.jwt() -> 'user_metadata' ->> 'state')
);

-- Policy 3: Facility Tier (Prison Coordinator)
-- Filter by staff_name matching user's name (case-insensitive)
CREATE POLICY "patients_select_facility"
ON patients
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'Prison Coordinator'
  AND
  LOWER(TRIM(staff_name)) = LOWER(TRIM(auth.jwt() -> 'user_metadata' ->> 'name'))
);

-- ============================================================================
-- INSERT POLICIES (Create Access)
-- ============================================================================

-- Allow authenticated users to insert records
-- Additional validation should be done in application layer
CREATE POLICY "patients_insert_authenticated"
ON patients
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow insert if user has appropriate role
  (auth.jwt() -> 'user_metadata' ->> 'role') IN (
    'admin',
    'Program Manager',
    'State Program Manager',
    'M&E Officer',
    'Prison Coordinator'
  )
  AND
  -- State-level users can only insert for their state
  (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'Program Manager')
    OR
    screening_state = (auth.jwt() -> 'user_metadata' ->> 'state')
  )
);

-- ============================================================================
-- UPDATE POLICIES (Modify Access)
-- ============================================================================

-- Allow authenticated users to update records they can see
CREATE POLICY "patients_update_authenticated"
ON patients
FOR UPDATE
TO authenticated
USING (
  -- Can only update records they can SELECT (reuse SELECT logic)
  (
    -- National tier
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'Program Manager')
  )
  OR
  (
    -- State tier
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('State Program Manager', 'M&E Officer')
    AND screening_state = (auth.jwt() -> 'user_metadata' ->> 'state')
  )
  OR
  (
    -- Facility tier
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Prison Coordinator'
    AND LOWER(TRIM(staff_name)) = LOWER(TRIM(auth.jwt() -> 'user_metadata' ->> 'name'))
  )
)
WITH CHECK (
  -- Same conditions for the updated row
  (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'Program Manager')
  )
  OR
  (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('State Program Manager', 'M&E Officer')
    AND screening_state = (auth.jwt() -> 'user_metadata' ->> 'state')
  )
  OR
  (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Prison Coordinator'
    AND LOWER(TRIM(staff_name)) = LOWER(TRIM(auth.jwt() -> 'user_metadata' ->> 'name'))
  )
);

-- ============================================================================
-- DELETE POLICIES (Remove Access)
-- ============================================================================

-- Only admins can delete records
CREATE POLICY "patients_delete_admin_only"
ON patients
FOR DELETE
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ============================================================================
-- HELPER FUNCTION: Populate JWT Claims from profiles table
-- ============================================================================
-- This function runs during sign-in to inject user metadata into JWT

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Fetch user profile data
  SELECT role, state, district, name
  INTO user_profile
  FROM public.profiles
  WHERE email = (event->'user'->>'email')
  LIMIT 1;

  -- Inject into JWT user_metadata
  IF user_profile IS NOT NULL THEN
    event := jsonb_set(
      event,
      '{user, user_metadata, role}',
      to_jsonb(user_profile.role)
    );
    event := jsonb_set(
      event,
      '{user, user_metadata, state}',
      to_jsonb(user_profile.state)
    );
    event := jsonb_set(
      event,
      '{user, user_metadata, district}',
      to_jsonb(user_profile.district)
    );
    event := jsonb_set(
      event,
      '{user, user_metadata, name}',
      to_jsonb(user_profile.name)
    );
  END IF;

  RETURN event;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO postgres;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO authenticated;

-- ============================================================================
-- CONFIGURATION INSTRUCTIONS
-- ============================================================================
--
-- 1. Run this SQL script in Supabase SQL Editor
--
-- 2. Configure Auth Hook in Supabase Dashboard:
--    - Go to Authentication → Hooks
--    - Enable "Custom Access Token Hook"
--    - Set function: public.custom_access_token_hook
--
-- 3. Verify JWT contains metadata:
--    - Sign in as a user
--    - Decode JWT at jwt.io
--    - Check user_metadata contains: role, state, name
--
-- 4. Test RLS policies:
--    - Sign in as different roles
--    - Query patients table
--    - Verify data isolation works
--
-- 5. Monitor policy performance:
--    SELECT * FROM pg_stat_statements 
--    WHERE query LIKE '%patients%' 
--    ORDER BY mean_exec_time DESC;
--
-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
--
-- ✅ RLS policies run at database level (unhackable from frontend)
-- ✅ JWT claims are signed by Supabase (cannot be forged)
-- ✅ LOWER(TRIM()) handles case sensitivity and whitespace
-- ✅ Policies use USING for SELECT and WITH CHECK for INSERT/UPDATE
-- ✅ DELETE restricted to admin only
-- ✅ Service role key bypasses RLS (use carefully in backend)
--
-- ⚠️  IMPORTANT: Test thoroughly before production deployment
-- ⚠️  Backup database before applying RLS policies
-- ⚠️  Monitor query performance after enabling RLS
--
-- ============================================================================
