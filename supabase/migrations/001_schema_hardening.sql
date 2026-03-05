-- Create profiles table for RBAC
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PM', 'SPM', 'ME', 'PC')),
  assigned_state TEXT,
  assigned_district TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.email() = email);
CREATE POLICY "PM can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE email = auth.email() AND role = 'PM')
);

-- Alter patients table for schema alignment
ALTER TABLE patients 
  ALTER COLUMN age TYPE INTEGER USING age::INTEGER,
  ALTER COLUMN screening_date TYPE DATE USING screening_date::DATE,
  ADD CONSTRAINT unique_patient_id UNIQUE (unique_id);

-- Add missing columns to match Kobo schema
ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS treatment_completion DATE,
  ADD COLUMN IF NOT EXISTS follow_up_status TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_date DATE;

-- Remove permissive RLS policy
DROP POLICY IF EXISTS "Allow all" ON patients;

-- Implement District Lock RLS policies
CREATE POLICY "PM_full_access" ON patients FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE email = auth.email() AND role = 'PM')
);

CREATE POLICY "SPM_state_access" ON patients FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = auth.email() 
    AND role = 'SPM' 
    AND assigned_state = patients.screening_state
  )
);

CREATE POLICY "ME_PC_district_access" ON patients FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = auth.email() 
    AND role IN ('ME', 'PC') 
    AND assigned_district = patients.screening_district
  )
);

-- Insert sample profiles
INSERT INTO profiles (email, role, assigned_state, assigned_district) VALUES
('pm@health.gov.in', 'PM', NULL, NULL),
('spm.mp@health.gov.in', 'SPM', 'Madhya Pradesh', NULL),
('me.gwalior@health.gov.in', 'ME', 'Madhya Pradesh', 'Gwalior')
ON CONFLICT (email) DO NOTHING;