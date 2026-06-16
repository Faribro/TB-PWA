-- Create patients table in new Supabase project
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_id TEXT,
  kobo_uuid TEXT UNIQUE,
  inmate_name TEXT,
  age INTEGER,
  sex TEXT,
  date_of_birth DATE,
  contact_number TEXT,
  address TEXT,
  father_husband_name TEXT,
  
  -- Facility info
  facility_name TEXT,
  facility_type TEXT,
  screening_state TEXT,
  screening_district TEXT,
  staff_name TEXT,
  inmate_type TEXT,
  
  -- Screening
  screening_date DATE,
  submitted_on TIMESTAMPTZ,
  symptoms_10s TEXT,
  symptoms_present TEXT,
  tb_past_history TEXT,
  xray_result TEXT,
  chest_x_ray_result TEXT,
  
  -- Clinical pathway
  referral_date DATE,
  referred_facility TEXT,
  tb_diagnosed TEXT,
  tb_diagnosis_date DATE,
  tb_type TEXT,
  
  -- Treatment
  att_start_date DATE,
  att_completion_date DATE,
  hiv_status TEXT,
  art_status TEXT,
  art_number TEXT,
  nikshay_abha_id TEXT,
  registration_date DATE,
  
  -- Loop closure
  closure_reason TEXT,
  remarks TEXT,
  
  -- AI/Sync
  ai_link_status TEXT,
  synced_to_sheets BOOLEAN DEFAULT false,
  sheets_sync_attempts INTEGER DEFAULT 0,
  sheets_synced_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_state ON patients(screening_state);
CREATE INDEX IF NOT EXISTS idx_patients_district ON patients(screening_district);
CREATE INDEX IF NOT EXISTS idx_patients_screening_date ON patients(screening_date DESC);
CREATE INDEX IF NOT EXISTS idx_patients_kobo_uuid ON patients(kobo_uuid);
CREATE INDEX IF NOT EXISTS idx_patients_unique_id ON patients(unique_id);
CREATE INDEX IF NOT EXISTS idx_patients_tb_diagnosed ON patients(tb_diagnosed);
CREATE INDEX IF NOT EXISTS idx_patients_updated_at ON patients(updated_at DESC);

-- Enable RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your auth setup)
CREATE POLICY "Enable read access for authenticated users" ON patients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON patients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON patients
  FOR UPDATE USING (auth.role() = 'authenticated');
