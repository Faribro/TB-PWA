-- Check if kobo_uuid unique constraint exists
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
    AND tc.table_name = 'patients'
    AND kcu.column_name = 'kobo_uuid';

-- If constraint exists, test it works by checking for duplicates
SELECT kobo_uuid, COUNT(*) as count
FROM patients
WHERE kobo_uuid IS NOT NULL
GROUP BY kobo_uuid
HAVING COUNT(*) > 1;

-- Current record count
SELECT COUNT(*) as total_records FROM patients;
