-- Performance Optimization Indexes for TB Patient Tracking System
-- Run this in your Supabase SQL Editor

-- Index for search queries (name and unique_id)
CREATE INDEX IF NOT EXISTS idx_patients_search 
ON patients USING gin(to_tsvector('english', inmate_name || ' ' || unique_id));

-- Index for filtering by facility
CREATE INDEX IF NOT EXISTS idx_patients_facility 
ON patients(facility_name, facility_type) 
WHERE facility_name != 'Unknown' AND facility_type != 'Unknown';

-- Index for location filtering
CREATE INDEX IF NOT EXISTS idx_patients_location 
ON patients(screening_state, screening_district);

-- Index for date-based sorting and filtering
CREATE INDEX IF NOT EXISTS idx_patients_dates 
ON patients(submitted_on DESC NULLS LAST, screening_date DESC);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_patients_status 
ON patients(tb_diagnosed, hiv_status);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_patients_common_query 
ON patients(facility_type, screening_state, screening_date DESC) 
WHERE facility_name != 'Unknown';

-- Index for referral tracking
CREATE INDEX IF NOT EXISTS idx_patients_referral 
ON patients(referral_date, att_start_date) 
WHERE referral_date IS NOT NULL;

-- Analyze tables to update statistics
ANALYZE patients;

-- Optional: Create materialized view for analytics (refresh every 5 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS patients_analytics AS
SELECT 
  COUNT(*) as total_screened,
  COUNT(*) FILTER (WHERE xray_result ILIKE '%abnormal%' OR xray_result ILIKE '%suspected%' OR xray_result = 'S') as suspected,
  COUNT(*) FILTER (WHERE referral_date IS NOT NULL) as referred,
  COUNT(*) FILTER (WHERE tb_diagnosed IN ('Y', 'Yes')) as confirmed,
  COUNT(*) FILTER (WHERE att_start_date IS NOT NULL) as initiated,
  COUNT(*) FILTER (WHERE att_completion_date IS NOT NULL) as completed,
  COUNT(*) FILTER (WHERE hiv_status IN ('Positive', 'Reactive', 'Y', 'Yes')) as hiv_positive,
  COUNT(*) FILTER (WHERE tb_diagnosed = 'No' AND referral_date IS NULL AND EXTRACT(DAY FROM NOW() - screening_date::timestamp) > 30) as ltfu
FROM patients
WHERE facility_name != 'Unknown' AND facility_type != 'Unknown';

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_analytics_unique ON patients_analytics((1));

-- Refresh function (call this via cron or trigger)
CREATE OR REPLACE FUNCTION refresh_patients_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY patients_analytics;
END;
$$ LANGUAGE plpgsql;
