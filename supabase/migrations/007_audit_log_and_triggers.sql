-- Migration: Add updated_at trigger and audit log
-- Run this in Supabase SQL Editor

-- 1. Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Add trigger to patients table
DROP TRIGGER IF EXISTS patients_update_updated_at ON patients;
CREATE TRIGGER patients_update_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 3. Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- 4. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_action ON audit_log(table_name, action);

-- 5. Enable RLS on audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 6. Policy: Only admins can read audit logs
CREATE POLICY "admins_read_audit_log"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.email = current_setting('request.jwt.claims', true)::json->>'email'
      AND profiles.role IN ('admin', 'PM')
    )
  );

-- 7. Policy: Service role can insert audit logs
CREATE POLICY "service_role_insert_audit_log"
  ON audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON TABLE audit_log IS 'Audit trail for all patient data changes';
COMMENT ON TRIGGER patients_update_updated_at ON patients IS 'Auto-update updated_at timestamp on patient updates';
