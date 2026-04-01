-- Migration: 003_add_authenticated_policy.sql
-- Purpose: Add policy for authenticated users to bypass RLS temporarily
--          This allows the anon key with valid JWT to read data
-- Date: 2025-01-21

-- Add policy for any authenticated user (temporary fix)
CREATE POLICY "authenticated_users_read_all" ON patients
FOR SELECT
USING (auth.role() = 'authenticated');

COMMENT ON POLICY "authenticated_users_read_all" ON patients IS 'Temporary: Allow any authenticated user to read all patients';
