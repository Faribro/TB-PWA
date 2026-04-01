-- Migration: 002_fix_rls_policies.sql
-- Purpose: Fix broken RLS. Old policies used wrong column names
--          (assigned_state, assigned_district).
--          New policies use correct names: state, district.
-- Date: 2025-01-21

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SPM_state_access" ON patients;
DROP POLICY IF EXISTS "ME_PC_district_access" ON patients;
DROP POLICY IF EXISTS "PM_full_access" ON patients;
DROP POLICY IF EXISTS "SPM_insert" ON patients;
DROP POLICY IF EXISTS "SPM_update" ON patients;
DROP POLICY IF EXISTS "ME_insert" ON patients;
DROP POLICY IF EXISTS "ME_update" ON patients;
DROP POLICY IF EXISTS "PC_select" ON patients;

CREATE POLICY "PM_full_access" ON patients
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = auth.email()
    AND profiles.role = 'PM'
  )
);

CREATE POLICY "SPM_select" ON patients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = auth.email()
    AND profiles.role = 'SPM'
    AND profiles.state = patients.screening_state
  )
);

CREATE POLICY "SPM_insert" ON patients
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = auth.email()
    AND profiles.role = 'SPM'
    AND profiles.state = patients.screening_state
  )
);

CREATE POLICY "SPM_update" ON patients
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = auth.email()
    AND profiles.role = 'SPM'
    AND profiles.state = patients.screening_state
  )
);

CREATE POLICY "ME_select" ON patients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = auth.email()
    AND profiles.role = 'ME'
    AND profiles.state = patients.screening_state
    AND profiles.district = patients.screening_district
  )
);

CREATE POLICY "ME_insert" ON patients
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = auth.email()
    AND profiles.role = 'ME'
    AND profiles.state = patients.screening_state
    AND profiles.district = patients.screening_district
  )
);

CREATE POLICY "ME_update" ON patients
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = auth.email()
    AND profiles.role = 'ME'
    AND profiles.state = patients.screening_state
    AND profiles.district = patients.screening_district
  )
);

CREATE POLICY "PC_select" ON patients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = auth.email()
    AND profiles.role = 'PC'
    AND profiles.state = patients.screening_state
    AND profiles.district = patients.screening_district
  )
);

COMMENT ON TABLE patients IS 'RLS policies updated 2025-01-21: Fixed column name mismatch';
