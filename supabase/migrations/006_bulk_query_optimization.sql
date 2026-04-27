-- Bulk Query Optimization for /api/patients/bulk
-- Optimizes the paginated fetch loop for large datasets

-- Drop old composite index if exists
DROP INDEX CONCURRENTLY IF EXISTS idx_patients_created_state_district;

-- Perfect composite index for the actual query pattern
-- Covers: ORDER BY created_at DESC + WHERE screening_state + screening_district + screening_date
CREATE INDEX CONCURRENTLY idx_patients_bulk_query
  ON patients(created_at DESC, screening_state, screening_district, screening_date);

-- Covering index to avoid table lookup (includes all selected columns)
-- This eliminates the need to fetch from the heap after index scan
CREATE INDEX CONCURRENTLY idx_patients_bulk_covering
  ON patients(created_at DESC, screening_state, screening_district)
  INCLUDE (id, unique_id, inmate_name, screening_date, submitted_on, 
           facility_name, facility_type, xray_result, tb_diagnosed, 
           att_start_date, sex, age);

-- Update table statistics for better query planning
ANALYZE patients;
