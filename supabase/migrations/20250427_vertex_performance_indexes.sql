-- ============================================================================
-- VERTEX DASHBOARD PERFORMANCE INDEXES
-- ============================================================================
-- Composite indexes for the new scoped detail queries used by Vertex dashboard.
-- These complement the existing indexes in 004_patient_indexes.sql.
-- ============================================================================

-- Composite index for patients-by-date endpoint (most critical for lazy loading)
-- Covers: WHERE screening_date = ? AND screening_state = ? AND screening_district = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_date_state_district
  ON patients(screening_date, screening_state, screening_district);

-- Composite index for geo-summary endpoint
-- Covers: WHERE screening_date = ? ORDER BY screening_state, screening_district
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_date_facility
  ON patients(screening_date, facility_name, screening_state, screening_district);

-- Covering index for daily summary (avoids table lookup)
-- Covers: WHERE screening_date = ? -> SELECT xray_result, tb_diagnosed, referral_date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_date_covering
  ON patients(screening_date) INCLUDE (xray_result, tb_diagnosed, referral_date);

-- Partial index for pending patients (common filter for alerts)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_pending_alerts
  ON patients(screening_date, screening_state, screening_district, facility_name)
  WHERE referral_date IS NULL;
