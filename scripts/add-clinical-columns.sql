-- Migration: Ensure all clinical columns exist in patients table
-- Run this in Supabase SQL Editor

-- Add missing clinical columns if they don't exist
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS referral_date DATE,
ADD COLUMN IF NOT EXISTS referred_facility TEXT,
ADD COLUMN IF NOT EXISTS tb_diagnosed TEXT,
ADD COLUMN IF NOT EXISTS tb_diagnosis_date DATE,
ADD COLUMN IF NOT EXISTS tb_type TEXT,
ADD COLUMN IF NOT EXISTS att_start_date DATE,
ADD COLUMN IF NOT EXISTS att_completion_date DATE,
ADD COLUMN IF NOT EXISTS hiv_status TEXT,
ADD COLUMN IF NOT EXISTS art_status TEXT,
ADD COLUMN IF NOT EXISTS art_number TEXT,
ADD COLUMN IF NOT EXISTS nikshay_abha_id TEXT,
ADD COLUMN IF NOT EXISTS registration_date DATE,
ADD COLUMN IF NOT EXISTS remarks TEXT,
ADD COLUMN IF NOT EXISTS other_facility_name TEXT,
ADD COLUMN IF NOT EXISTS treatment_regimen TEXT,
ADD COLUMN IF NOT EXISTS closure_reason TEXT;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' 
  AND column_name IN (
    'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
    'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status',
    'art_status', 'art_number', 'nikshay_abha_id', 'registration_date',
    'remarks', 'other_facility_name', 'treatment_regimen', 'closure_reason'
  )
ORDER BY column_name;
