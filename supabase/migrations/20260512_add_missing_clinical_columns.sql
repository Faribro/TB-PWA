-- Add missing clinical & treatment columns to patients table
-- Date: 2026-05-12

-- Add Other Facility Name
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS other_facility_name TEXT;

-- Add Treatment Regimen
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS treatment_regimen TEXT;

-- Add Closure Reason (if not already present)
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS closure_reason TEXT;

-- Verify the migration
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'patients' 
AND column_name IN (
    'other_facility_name', 
    'treatment_regimen', 
    'closure_reason'
)
ORDER BY column_name;
