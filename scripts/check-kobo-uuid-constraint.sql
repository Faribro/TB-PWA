-- Check if kobo_uuid has a unique constraint
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

-- Check for duplicate kobo_uuids in the table
SELECT kobo_uuid, COUNT(*) as count
FROM patients
WHERE kobo_uuid IS NOT NULL
GROUP BY kobo_uuid
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 10;

-- Check total records
SELECT COUNT(*) as total_records FROM patients;

-- Check records with kobo_uuid
SELECT COUNT(*) as records_with_uuid FROM patients WHERE kobo_uuid IS NOT NULL;
