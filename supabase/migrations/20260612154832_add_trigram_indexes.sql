-- GIN trigram index on inmate_name for fuzzy matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS 
  idx_patients_inmate_name_trgm
  ON patients 
  USING GIN (inmate_name gin_trgm_ops);

-- GIN trigram index on father_husband_name
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_patients_father_name_trgm
  ON patients
  USING GIN (father_husband_name gin_trgm_ops);

-- Composite B-tree index on (facility_name, screening_date)
-- Used to scope all queries before fuzzy matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_patients_facility_date
  ON patients (facility_name, screening_date);

COMMENT ON INDEX idx_patients_inmate_name_trgm IS 
  'GIN trigram index for pg_trgm fuzzy name matching in OCR ingestion pipeline';

-- FIX 4B — serial_number column migration
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS serial_number INTEGER;

COMMENT ON COLUMN patients.serial_number IS
  'Register serial number from physical intake register. 
   Scoped to facility + screening_date. Restarts from 1 per batch. 
   NULL for records entered before OCR pipeline implementation.
   Composite dedup key: facility_name + screening_date + serial_number.';

-- Partial unique index: unique only when serial_number is NOT NULL
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  idx_patients_facility_date_serial
  ON patients (facility_name, screening_date, serial_number)
  WHERE serial_number IS NOT NULL;
