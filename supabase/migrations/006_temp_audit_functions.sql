-- TEMPORARY AUDIT FUNCTION — DROP AFTER USE
-- Creates an RPC callable via REST API with service role key
-- to read pg_policies (system catalog not accessible via REST directly)

CREATE OR REPLACE FUNCTION public.audit_get_patient_policies()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_agg(row_to_json(t))
  FROM (
    SELECT 
      policyname,
      cmd,
      roles::text,
      permissive,
      qual,
      with_check
    FROM pg_policies
    WHERE tablename = 'patients'
    ORDER BY cmd, policyname
  ) t
$$;

CREATE OR REPLACE FUNCTION public.audit_get_rls_status()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_agg(row_to_json(t))
  FROM (
    SELECT schemaname, tablename, rowsecurity
    FROM pg_tables
    WHERE tablename = 'patients'
  ) t
$$;

CREATE OR REPLACE FUNCTION public.audit_get_hooks()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_agg(row_to_json(t))
  FROM (
    SELECT routine_name, routine_type, routine_schema
    FROM information_schema.routines
    WHERE routine_name LIKE '%hook%' OR routine_name LIKE '%token%'
    ORDER BY routine_name
  ) t
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.audit_get_patient_policies() TO service_role;
GRANT EXECUTE ON FUNCTION public.audit_get_rls_status() TO service_role;
GRANT EXECUTE ON FUNCTION public.audit_get_hooks() TO service_role;
