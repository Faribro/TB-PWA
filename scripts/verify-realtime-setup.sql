-- Verify realtime publication setup for patients table
-- Run this in Supabase SQL Editor

-- Simple check: Is patients table in supabase_realtime publication?
SELECT 
  'patients' as table_name,
  CASE 
    WHEN tablename = 'patients' THEN 'ENABLED'
    ELSE 'DISABLED'
  END as realtime_status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'patients'

UNION ALL

SELECT 
  'patients' as table_name,
  'DISABLED' as realtime_status
WHERE NOT EXISTS (
  SELECT 1 FROM pg_publication_tables 
  WHERE pubname = 'supabase_realtime' AND tablename = 'patients'
);

-- Alternative: Check all tables in supabase_realtime publication
SELECT 
  tablename,
  'ENABLED' as realtime_status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Check if patients table exists
SELECT 
  tablename,
  schemaname,
  'EXISTS' as status
FROM pg_tables 
WHERE tablename = 'patients' AND schemaname = 'public';
