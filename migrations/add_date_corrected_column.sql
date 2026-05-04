-- Add date_corrected column to patients table
-- This flags records where screening_date was backfilled from submitted_on
-- Used for visual highlighting in Neural Timeline

ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS date_corrected BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN patients.date_corrected IS 'True if screening_date was corrected from submitted_on due to invalid original date';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_patients_date_corrected 
  ON patients(date_corrected) 
  WHERE date_corrected = true;
