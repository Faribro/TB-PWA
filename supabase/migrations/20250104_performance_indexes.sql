-- ═══════════════════════════════════════════════════════════════════════════
-- PERFORMANCE INDEXES FOR SAMADHAAN
-- Optimizes common query patterns (10-100× faster)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Cursor-based pagination (created_at, id)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_cursor 
ON patients(created_at DESC, id DESC);

-- 2. Date range queries (screening_date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_screening_date 
ON patients(screening_date) 
WHERE screening_date IS NOT NULL;

-- 3. State filtering (RBAC)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_state 
ON patients(screening_state);

-- 4. District filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_district 
ON patients(screening_district);

-- 5. Composite index for state + date queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_state_date 
ON patients(screening_state, screening_date DESC);

-- 6. Composite index for district + date queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_district_date 
ON patients(screening_district, screening_date DESC);

-- 7. Staff name filtering (Prison Coordinators)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_staff_name 
ON patients(staff_name);

-- 8. X-ray result filtering (suspected cases)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_xray_result 
ON patients(xray_result);

-- 9. TB diagnosis filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_tb_diagnosed 
ON patients(tb_diagnosed);

-- 10. Unique ID lookup (exact match)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_unique_id 
ON patients(unique_id);

-- 11. Full-text search on patient names (GIN index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_name_search 
ON patients USING gin(to_tsvector('english', inmate_name));

-- Analyze tables to update statistics
ANALYZE patients;
ANALYZE daily_metrics;

-- Verify indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('patients', 'daily_metrics')
ORDER BY tablename, indexname;
