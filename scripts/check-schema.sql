-- Check patients table schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'patients'
  AND column_name IN (
    'referral_date',
    'referred_facility',
    'tb_diagnosed',
    'tb_diagnosis_date',
    'tb_type',
    'att_start_date',
    'att_completion_date',
    'hiv_status',
    'art_status',
    'art_number',
    'nikshay_abha_id',
    'registration_date',
    'remarks'
  )
ORDER BY column_name;

-- Check if columns exist at all
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'patients'
ORDER BY ordinal_position;
