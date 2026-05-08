-- Migration: Add Clinical Workflow Fields to Patients Table
-- Purpose: Add missing clinical track fields for step indicators functionality
-- Date: 2026-05-07

-- Add Sputum & Referral fields
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS referral_date TEXT,
ADD COLUMN IF NOT EXISTS referred_facility TEXT;

-- Add Diagnosis fields  
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS tb_diagnosed TEXT,
ADD COLUMN IF NOT EXISTS tb_diagnosis_date TEXT,
ADD COLUMN IF NOT EXISTS tb_type TEXT;

-- Add Treatment fields
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS att_start_date TEXT,
ADD COLUMN IF NOT EXISTS att_completion_date TEXT;

-- Add HIV & ART Status fields
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS hiv_status TEXT,
ADD COLUMN IF NOT EXISTS art_status TEXT,
ADD COLUMN IF NOT EXISTS art_number TEXT;

-- Add Nikshay & Registration fields
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS nikshay_abha_id TEXT,
ADD COLUMN IF NOT EXISTS registration_date TEXT,
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_clinical_fields ON patients (
    referral_date, 
    tb_diagnosed, 
    att_start_date, 
    hiv_status, 
    nikshay_abha_id
);

-- Add comments for documentation
COMMENT ON COLUMN patients.referral_date IS 'Date of referral for TB Examination (sputum) (dd/mm/yy)';
COMMENT ON COLUMN patients.referred_facility IS 'Name of facility where referred to (Give code/name of all facilities)';
COMMENT ON COLUMN patients.tb_diagnosed IS 'TB diagnosed (Y/N)';
COMMENT ON COLUMN patients.tb_diagnosis_date IS 'Date of TB Diagnosed (dd/mm/yy)';
COMMENT ON COLUMN patients.tb_type IS 'Type of TB Diagnosed (P/EP)';
COMMENT ON COLUMN patients.att_start_date IS 'Date of starting ATT (dd/mm/yyyy)';
COMMENT ON COLUMN patients.att_completion_date IS 'Date of Treatment Completion (dd/mm/yyyy)';
COMMENT ON COLUMN patients.hiv_status IS 'HIV Status (Positive/Negative/Unknown)';
COMMENT ON COLUMN patients.art_status IS 'Status at the time of referral (Pre ART/On ART)';
COMMENT ON COLUMN patients.art_number IS 'ART Number (if on ART at the time of referral)';
COMMENT ON COLUMN patients.nikshay_abha_id IS 'NIKSHAY/ABHA ID';
COMMENT ON COLUMN patients.registration_date IS 'Date of registration (dd/mm/yyyy)';
COMMENT ON COLUMN patients.remarks IS 'Remarks';

-- Verify the migration
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'patients' 
AND column_name IN (
    'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date', 
    'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status', 
    'art_status', 'art_number', 'nikshay_abha_id', 'registration_date', 'remarks'
)
ORDER BY column_name;
