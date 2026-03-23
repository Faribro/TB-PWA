-- Add geolocation columns for GPS data from Kobo
ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- Add missing Kobo-mapped columns
ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS contact_number TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS referral_facility_name TEXT,
  ADD COLUMN IF NOT EXISTS tb_diagnosis_date DATE,
  ADD COLUMN IF NOT EXISTS tb_type TEXT,
  ADD COLUMN IF NOT EXISTS hiv_art_status TEXT,
  ADD COLUMN IF NOT EXISTS art_number TEXT,
  ADD COLUMN IF NOT EXISTS nikshay_id TEXT,
  ADD COLUMN IF NOT EXISTS registration_date DATE,
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS closure_reason TEXT;

-- Ensure kobo_uuid has unique constraint for upsert
ALTER TABLE patients 
  ADD CONSTRAINT unique_kobo_uuid UNIQUE (kobo_uuid);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patients_kobo_uuid ON patients(kobo_uuid);
CREATE INDEX IF NOT EXISTS idx_patients_unique_id ON patients(unique_id);
CREATE INDEX IF NOT EXISTS idx_patients_screening_date ON patients(screening_date);

-- Add comment
COMMENT ON COLUMN patients.kobo_uuid IS 'KoboToolbox UUID for ETL deduplication';
COMMENT ON COLUMN patients.latitude IS 'GPS latitude from Kobo _geolocation';
COMMENT ON COLUMN patients.longitude IS 'GPS longitude from Kobo _geolocation';
