-- ═══════════════════════════════════════════════════════════════════════════
-- FIX KOBO_UUID COLUMN TYPE - Change from UUID to TEXT
-- ═══════════════════════════════════════════════════════════════════════════
-- Kobo sends UUIDs as TEXT strings, not PostgreSQL UUID type
-- This migration fixes the type mismatch causing silent insert failures
-- ═══════════════════════════════════════════════════════════════════════════

-- Change kobo_uuid from UUID to TEXT
ALTER TABLE patients 
  ALTER COLUMN kobo_uuid TYPE TEXT USING kobo_uuid::TEXT;

-- Ensure unique constraint still exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patients_kobo_uuid_unique'
  ) THEN
    ALTER TABLE patients
    ADD CONSTRAINT patients_kobo_uuid_unique UNIQUE (kobo_uuid);
  END IF;
END $$;

-- Recreate index for fast lookup
DROP INDEX IF EXISTS idx_patients_kobo_uuid;
CREATE INDEX idx_patients_kobo_uuid
  ON patients(kobo_uuid)
  WHERE kobo_uuid IS NOT NULL;

COMMENT ON COLUMN patients.kobo_uuid IS 'Kobo submission UUID (TEXT format, not PostgreSQL UUID)';
