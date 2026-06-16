-- =====================================================
-- Migration: Fix RLS Policies for NextAuth Integration
-- =====================================================
-- This migration updates RLS policies to work with the
-- temporary authenticated_read_all policy until proper
-- NextAuth <-> Supabase auth sync is implemented.
--
-- SECURITY NOTE: This relies on the authenticated_read_all
-- policy from migration 003 which allows any authenticated
-- user to read all patients. This is acceptable because:
-- 1. Users must pass NextAuth authentication first
-- 2. Frontend enforces RBAC via useEntityStore scope locking
-- 3. Backend API routes validate roles and scopes
-- 4. This is a temporary solution until proper auth sync
-- =====================================================

-- Drop existing role-based policies (they require auth.jwt() which NextAuth doesn't provide)
DROP POLICY IF EXISTS "pm_full_access" ON patients;
DROP POLICY IF EXISTS "spm_state_select" ON patients;
DROP POLICY IF EXISTS "spm_state_insert" ON patients;
DROP POLICY IF EXISTS "spm_state_update" ON patients;
DROP POLICY IF EXISTS "me_district_select" ON patients;
DROP POLICY IF EXISTS "me_district_insert" ON patients;
DROP POLICY IF EXISTS "pc_district_select" ON patients;
DROP POLICY IF EXISTS "pc_district_update" ON patients;

-- Keep the authenticated_read_all policy from migration 003
-- This allows any authenticated user to read all patients
-- RBAC enforcement happens at the application layer

-- Add authenticated policies for write operations
-- These are permissive for now, relying on application-layer RBAC
CREATE POLICY "authenticated_insert_all"
  ON patients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_all"
  ON patients
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Note: DELETE is intentionally not allowed for any role
-- Data retention is critical for audit trails

-- =====================================================
-- FUTURE WORK: Proper NextAuth <-> Supabase Auth Sync
-- =====================================================
-- To implement proper RLS with role-based access:
-- 1. Create a Supabase auth user for each NextAuth user
-- 2. Store the Supabase access_token in NextAuth JWT
-- 3. Pass the access_token to Supabase client on each request
-- 4. Re-enable role-based RLS policies using auth.jwt()
-- =====================================================
