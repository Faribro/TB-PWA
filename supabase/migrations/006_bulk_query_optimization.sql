-- Bulk Query Optimization for /api/patients/bulk
-- Optimizes the paginated fetch loop for large datasets

-- Index for created_at ordering (used in bulk query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_created_at_desc 
  ON patients(created_at DESC);

-- Composite index for created_at + state + district (common bulk query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_created_state_district 
  ON patients(created_at DESC, screening_state, screening_district);

-- Update table statistics for better query planning
ANALYZE patients;
