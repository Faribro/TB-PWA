-- Migration: Daily Vertex Metrics Materialized View
-- Purpose: Precompute daily registration summaries for vertex metrics
-- Created: 2026-06-05

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS public.mv_daily_vertex_metrics CASCADE;

-- Create materialized view
CREATE MATERIALIZED VIEW public.mv_daily_vertex_metrics AS
SELECT
  created_at::date AS registration_date,
  COALESCE(screening_state, '') AS screening_state,
  COALESCE(screening_district, '') AS screening_district,
  COUNT(*)::integer AS screened_count,
  COUNT(*) FILTER (WHERE LOWER(xray_result) LIKE '%suspected%' OR LOWER(xray_result) LIKE '%abnormal%' OR xray_result = 'Suspected TB Case')::integer AS suspected_count,
  COUNT(*) FILTER (WHERE LOWER(tb_diagnosed) IN ('y', 'yes'))::integer AS diagnosed_count,
  COUNT(*) FILTER (WHERE att_start_date IS NOT NULL)::integer AS att_started_count,
  COUNT(*) FILTER (WHERE referral_date IS NOT NULL)::integer AS referred_count
FROM public.patients
GROUP BY created_at::date, COALESCE(screening_state, ''), COALESCE(screening_district, '')
WITH DATA;

-- Create unique index for concurrent refreshes and fast lookups
CREATE UNIQUE INDEX idx_mv_daily_vertex_metrics_unique 
ON public.mv_daily_vertex_metrics (registration_date, screening_state, screening_district);

-- Create function to refresh materialized view concurrently
CREATE OR REPLACE FUNCTION public.refresh_mv_daily_vertex_metrics()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_daily_vertex_metrics;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to refresh view on write operations
DROP TRIGGER IF EXISTS trigger_refresh_mv_daily_vertex_metrics ON public.patients;
CREATE TRIGGER trigger_refresh_mv_daily_vertex_metrics
AFTER INSERT OR UPDATE OR DELETE ON public.patients
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_mv_daily_vertex_metrics();

-- Grant permissions
GRANT SELECT ON public.mv_daily_vertex_metrics TO authenticated;
GRANT SELECT ON public.mv_daily_vertex_metrics TO anon;
