-- Check the exact data type of the 'id' column
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'patients'
    AND column_name IN ('id', 'unique_id', 'kobo_uuid');
