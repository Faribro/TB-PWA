-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 PROFILES TABLE - COLUMN INSPECTOR
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
    AND table_name = 'profiles'
ORDER BY 
    ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════

-- Method 2: Simple list of column names only
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════

-- Method 3: Get column names as comma-separated list
SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) AS all_columns
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles';

-- ═══════════════════════════════════════════════════════════════════════════

-- Method 4: Count total columns
SELECT COUNT(*) AS total_columns
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles';

-- ═══════════════════════════════════════════════════════════════════════════

-- Method 5: Check primary key and unique constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM 
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
WHERE 
    tc.table_schema = 'public'
    AND tc.table_name = 'profiles'
ORDER BY 
    tc.constraint_type, kcu.column_name;

-- ═══════════════════════════════════════════════════════════════════════════

-- Method 6: Check current record count
SELECT COUNT(*) as total_records FROM profiles;

-- ═══════════════════════════════════════════════════════════════════════════

-- Method 7: Sample data from first row
SELECT * FROM profiles LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🎯 EXPECTED COLUMNS (typical profiles table):
-- ═══════════════════════════════════════════════════════════════════════════
/*
Common columns in profiles table:
- id (uuid, primary key)
- email (text)
- full_name (text)
- role (text)
- state (text)
- district (text)
- created_at (timestamp)
- updated_at (timestamp)
- etc.
*/
