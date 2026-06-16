-- Migration: Calendar Daily Breakdown Materialized View
-- Purpose: Pre-aggregate daily screening metrics for faster calendar queries
-- Created: 2025-04-22

-- Drop existing view if it exists (for idempotent migration)
DROP MATERIALIZED VIEW IF EXISTS calendar_daily_breakdown CASCADE;

-- Create materialized view for daily screening breakdown
CREATE MATERIALIZED VIEW calendar_daily_breakdown AS
SELECT 
  screening_date as date,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE tb_diagnosed = 'Y' OR tb_diagnosed = 'Yes') as tb_positive,
  COUNT(*) FILTER (WHERE xray_result = 'Suspected TB Case') as suspected,
  COUNT(*) FILTER (WHERE att_start_date IS NOT NULL) as att_started,
  COUNT(*) FILTER (WHERE referral_date IS NOT NULL) as referred
FROM patients
WHERE screening_date IS NOT NULL
GROUP BY screening_date
WITH DATA;

-- Create unique index on date for fast lookups
CREATE UNIQUE INDEX idx_calendar_daily_breakdown_date ON calendar_daily_breakdown(date);

-- Create index on date range queries
CREATE INDEX idx_calendar_daily_breakdown_date_range ON calendar_daily_breakdown(date DESC);

-- Add comment for documentation
COMMENT ON MATERIALIZED VIEW calendar_daily_breakdown IS 'Pre-aggregated daily screening metrics for calendar visualization. Refreshed via trigger on patients table.';

-- Create function to refresh materialized view concurrently (non-blocking)
CREATE OR REPLACE FUNCTION refresh_calendar_breakdown()
RETURNS trigger AS $$
BEGIN
  -- Refresh materialized view concurrently to avoid blocking reads
  REFRESH MATERIALIZED VIEW CONCURRENTLY calendar_daily_breakdown;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh view on INSERT/UPDATE/DELETE to patients
DROP TRIGGER IF EXISTS trigger_refresh_calendar_breakdown ON patients;
CREATE TRIGGER trigger_refresh_calendar_breakdown
AFTER INSERT OR UPDATE OR DELETE ON patients
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_calendar_breakdown();

-- Grant permissions
GRANT SELECT ON calendar_daily_breakdown TO authenticated;
GRANT SELECT ON calendar_daily_breakdown TO anon;
