-- ═══════════════════════════════════════════════════════════════════════════
-- PERFORMANCE INDEXES FOR CURSOR PAGINATION
-- ═══════════════════════════════════════════════════════════════════════════
-- Optimizes keyset pagination queries using (screening_date DESC, id DESC)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable pg_trgm extension if not already enabled (for ILIKE optimization)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Primary composite index for cursor pagination
-- Supports: ORDER BY screening_date DESC, id DESC with WHERE clauses
CREATE INDEX IF NOT EXISTS idx_patients_cursor_pagination
  ON patients (screening_date DESC NULLS LAST, id DESC);

-- Index for state filtering (most common RBAC filter)
CREATE INDEX IF NOT EXISTS idx_patients_screening_state
  ON patients (screening_state)
  WHERE screening_state IS NOT NULL;

-- Composite index for state + cursor pagination
CREATE INDEX IF NOT EXISTS idx_patients_state_cursor
  ON patients (screening_state, screening_date DESC NULLS LAST, id DESC)
  WHERE screening_state IS NOT NULL;

-- Index for district filtering
CREATE INDEX IF NOT EXISTS idx_patients_district
  ON patients (screening_district)
  WHERE screening_district IS NOT NULL;

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_patients_screening_date_range
  ON patients (screening_date)
  WHERE screening_date IS NOT NULL;

-- Index for staff name filtering (Prison Coordinator role)
CREATE INDEX IF NOT EXISTS idx_patients_staff_name
  ON patients (staff_name)
  WHERE staff_name IS NOT NULL;

-- Index for search queries (name + unique_id)
CREATE INDEX IF NOT EXISTS idx_patients_search_name
  ON patients USING gin (inmate_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_search_id
  ON patients USING gin (unique_id gin_trgm_ops);

-- Analyze table to update statistics for query planner
ANALYZE patients;
