-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 SUPABASE PATIENTS TABLE - COLUMN INSPECTOR
-- Run this in Supabase SQL Editor to see all column names and types
-- ═══════════════════════════════════════════════════════════════════════════

-- Method 1: Get all columns with data types (RECOMMENDED)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'patients'
ORDER BY 
    ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════

-- Method 2: Simple list of column names only
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'patients'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════

-- Method 3: Get column names as comma-separated list (for copy-paste)
SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) AS all_columns
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'patients';

-- ═══════════════════════════════════════════════════════════════════════════

-- Method 4: Get column names as JSON array (for API testing)
SELECT json_agg(column_name ORDER BY ordinal_position) AS columns_json
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'patients';

-- ═══════════════════════════════════════════════════════════════════════════

-- Method 5: Count total columns
SELECT COUNT(*) AS total_columns
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'patients';

-- ═══════════════════════════════════════════════════════════════════════════

-- Method 6: Get table constraints (primary keys, unique constraints)
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM 
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
WHERE 
    tc.table_schema = 'public'
    AND tc.table_name = 'patients'
ORDER BY 
    tc.constraint_type, kcu.column_name;

-- ═══════════════════════════════════════════════════════════════════════════

-- Method 7: Check if specific columns exist (validation)
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'patients' 
          AND column_name = 'id'
    ) THEN '✅ id exists' ELSE '❌ id missing' END AS id_check,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'patients' 
          AND column_name = 'kobo_uuid'
    ) THEN '✅ kobo_uuid exists' ELSE '❌ kobo_uuid missing' END AS kobo_uuid_check,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'patients' 
          AND column_name = 'diagnosis_date'
    ) THEN '✅ diagnosis_date exists' ELSE '❌ diagnosis_date missing' END AS diagnosis_date_check,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'patients' 
          AND column_name = 'tb_diagnosis_date'
    ) THEN '✅ tb_diagnosis_date exists' ELSE '❌ tb_diagnosis_date missing' END AS tb_diagnosis_date_check;

-- ═══════════════════════════════════════════════════════════════════════════

-- Method 8: Sample data from first row (to see actual column names in use)
SELECT * FROM patients LIMIT 1;

-- ═══════════════════════════════════════════════════════════════════════════

-- Method 9: Get column names with sample values (non-null only)
SELECT 
    column_name,
    (SELECT COUNT(*) FROM patients WHERE (patients.*)::text LIKE '%' || column_name || '%') AS non_null_count
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'patients'
ORDER BY 
    ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🎯 QUICK REFERENCE: Expected columns based on your schema
-- ═══════════════════════════════════════════════════════════════════════════
/*
Expected columns (from hardcoded schema in route.ts):

Core IDs:
- id (primary key)
- kobo_uuid
- kobo_id
- unique_id
- serial_number

Demographics:
- inmate_name
- age
- sex
- date_of_birth
- father_husband_name
- inmate_type

Facility:
- facility_name
- facility_type
- screening_state
- screening_district
- staff_name

Dates:
- screening_date
- submitted_on
- referral_date
- att_start_date
- att_completion_date
- tb_diagnosis_date (NOT diagnosis_date!)
- registration_date

Clinical:
- tb_diagnosed
- tb_type
- xray_result
- symptoms_present
- tb_past_history
- referred_facility

HIV/ART:
- hiv_status
- art_status
- art_number

Contact:
- contact_number
- address

Registration:
- nikshay_abha_id

Location:
- latitude
- longitude

Metadata:
- remarks
- is_active
- current_phase
- created_at
- updated_at
*/
