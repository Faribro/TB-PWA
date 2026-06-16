-- =====================================================
-- TB-PWA Database Performance Indexes
-- Run these in Supabase SQL Editor
-- =====================================================

-- Enable trigram extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Single column indexes for common filters
CREATE INDEX IF NOT EXISTS idx_patients_district 
  ON patients(screening_district);

CREATE INDEX IF NOT EXISTS idx_patients_state 
  ON patients(screening_state);

CREATE INDEX IF NOT EXISTS idx_patients_facility_type 
  ON patients(facility_type);

CREATE INDEX IF NOT EXISTS idx_patients_created_at 
  ON patients(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patients_screening_date 
  ON patients(screening_date DESC);

CREATE INDEX IF NOT EXISTS idx_patients_submitted_on 
  ON patients(submitted_on DESC);

CREATE INDEX IF NOT EXISTS idx_patients_referral_date 
  ON patients(referral_date) 
  WHERE referral_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_att_start_date 
  ON patients(att_start_date) 
  WHERE att_start_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_tb_diagnosis_date 
  ON patients(tb_diagnosis_date) 
  WHERE tb_diagnosis_date IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_patients_state_district 
  ON patients(screening_state, screening_district);

CREATE INDEX IF NOT EXISTS idx_patients_state_date 
  ON patients(screening_state, screening_date DESC);

CREATE INDEX IF NOT EXISTS idx_patients_district_date 
  ON patients(screening_district, screening_date DESC);

CREATE INDEX IF NOT EXISTS idx_patients_facility_type_district 
  ON patients(facility_type, screening_district);

-- Indexes for TB diagnosis tracking
CREATE INDEX IF NOT EXISTS idx_patients_tb_diagnosed 
  ON patients(tb_diagnosed) 
  WHERE tb_diagnosed IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_hiv_status 
  ON patients(hiv_status) 
  WHERE hiv_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_xray_result 
  ON patients(xray_result);

-- Text search indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_patients_name_trgm 
  ON patients USING gin(inmate_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_unique_id_trgm 
  ON patients USING gin(unique_id gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_kobo_uuid 
  ON patients(kobo_uuid) 
  WHERE kobo_uuid IS NOT NULL;

-- Analyze tables to update statistics
ANALYZE patients;

-- =====================================================
-- Expected Performance Improvements:
-- - 70-80% reduction in query time for filtered views
-- - Faster district/state filtering
-- - Improved search performance
-- - Better pagination performance
-- =====================================================
