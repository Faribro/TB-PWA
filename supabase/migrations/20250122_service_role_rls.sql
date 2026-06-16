-- Service Role RLS Policies for Production Stability
-- Ensures service_role bypasses RLS for API routes

-- Patients table
DROP POLICY IF EXISTS "service_role_all_patients" ON patients;
CREATE POLICY "service_role_all_patients" ON patients
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Profiles table
DROP POLICY IF EXISTS "service_role_all_profiles" ON profiles;
CREATE POLICY "service_role_all_profiles" ON profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_screening_date ON patients(screening_date DESC);
CREATE INDEX IF NOT EXISTS idx_patients_state_district ON patients(screening_state, screening_district);
CREATE INDEX IF NOT EXISTS idx_patients_staff_name ON patients(staff_name);
CREATE INDEX IF NOT EXISTS idx_patients_tb_diagnosed ON patients(tb_diagnosed) WHERE tb_diagnosed = 'Y';

-- Verify policies
SELECT schemaname, tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('patients', 'profiles') 
AND roles @> ARRAY['service_role'];
