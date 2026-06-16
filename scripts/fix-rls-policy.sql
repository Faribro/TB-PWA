-- ═══════════════════════════════════════════════════════════════════════════
-- SUPABASE RLS VERIFICATION & FIX
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Check current RLS status
SELECT 
  tablename, 
  rowsecurity as "RLS Enabled",
  CASE 
    WHEN rowsecurity THEN '⚠️ RLS is ON - service role needs bypass policy'
    ELSE '✅ RLS is OFF - service role has full access'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'patients';

-- 2. Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd as "Command",
  qual as "USING clause",
  with_check as "WITH CHECK clause"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'patients'
ORDER BY policyname;

-- 3. Add service role bypass policy (if RLS is enabled)
-- This allows the webhook to insert records using SUPABASE_SERVICE_ROLE_KEY
DO $$ 
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Service role bypass" ON public.patients;
  
  -- Create new bypass policy for service_role
  CREATE POLICY "Service role bypass" 
  ON public.patients
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);
  
  RAISE NOTICE '✅ Service role bypass policy created successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating policy: %', SQLERRM;
END $$;

-- 4. Verify the policy was created
SELECT 
  policyname,
  roles,
  cmd,
  'Policy allows service_role to bypass RLS' as description
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'patients'
  AND policyname = 'Service role bypass';

-- 5. Test insert with service role (optional - run from application)
-- This should succeed if policy is correct:
-- INSERT INTO public.patients (kobo_uuid, inmate_name, screening_state)
-- VALUES ('test-uuid-' || gen_random_uuid(), 'Test Patient', 'Test State')
-- RETURNING id, kobo_uuid, inmate_name;

-- 6. Alternative: Disable RLS entirely (NOT RECOMMENDED for production)
-- Only use this if you want to remove all RLS protection:
-- ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- EXPECTED OUTPUT
-- ═══════════════════════════════════════════════════════════════════════════
-- If successful, you should see:
-- ✅ Service role bypass policy created successfully
-- 
-- And the verification query should return:
-- policyname: "Service role bypass"
-- roles: {service_role}
-- cmd: *
-- description: Policy allows service_role to bypass RLS
-- ═══════════════════════════════════════════════════════════════════════════
