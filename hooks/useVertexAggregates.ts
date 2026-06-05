/**
 * SWR Hooks for Vertex Aggregates
 * 
 * Production-grade hooks with:
 * - Stable cache keys
 * - Scoped by role/state/district
 * - Precise mutation support
 * - Realtime-compatible
 * - Prefetching for instant UX
 */

import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface HeatmapDay {
  date: string;
  screenedCount: number;
  breachCount: number;
}

interface MonthSummary {
  screened: number;
  suspected: number;
  diagnosed: number;
  attStarted: number;
  referred: number;
}

interface DailySummary {
  totalScreened: number;
  pendingSputum: number;
  diagnosed: number;
  onTrack: number;
}

/**
 * Fetch yearly heatmap data
 * Prefetches adjacent months for instant navigation
 */
export function useVertexHeatmap(
  year: number,
  state?: string,
  district?: string
) {
  const { data: session } = useSession();
  
  const url = session
    ? `/api/vertex/aggregates?type=heatmap&year=${year}&state=${state || 'all'}&district=${district || 'all'}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{
    heatmap: HeatmapDay[];
    meta: { cached: boolean; durationMs: number; cacheKey: string };
  }>(url, fetcher, {
    dedupingInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true,
  });

  // Prefetch adjacent years for instant navigation
  useEffect(() => {
    if (!session) return;
    const prevYear = year - 1;
    const nextYear = year + 1;
    const stateParam = state || 'all';
    const districtParam = district || 'all';
    
    // Prefetch previous year
    fetch(`/api/vertex/aggregates?type=heatmap&year=${prevYear}&state=${stateParam}&district=${districtParam}`).catch(() => {});
    // Prefetch next year
    fetch(`/api/vertex/aggregates?type=heatmap&year=${nextYear}&state=${stateParam}&district=${districtParam}`).catch(() => {});
  }, [year, state, district, session]);

  return {
    heatmap: data?.heatmap || [],
    meta: data?.meta,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Fetch monthly summary data
 * Prefetches adjacent months for instant navigation
 */
export function useVertexMonthSummary(
  year: number,
  month: number,
  state?: string,
  district?: string
) {
  const { data: session } = useSession();
  
  const url = session
    ? `/api/vertex/aggregates?type=month&year=${year}&month=${month}&state=${state || 'all'}&district=${district || 'all'}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{
    monthSummary: MonthSummary;
    meta: { cached: boolean; durationMs: number; cacheKey: string };
  }>(url, fetcher, {
    dedupingInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true,
  });

  // Prefetch adjacent months for instant navigation
  useEffect(() => {
    if (!session) return;
    const stateParam = state || 'all';
    const districtParam = district || 'all';
    
    // Calculate previous month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    
    // Calculate next month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    
    // Prefetch previous month
    fetch(`/api/vertex/aggregates?type=month&year=${prevYear}&month=${prevMonth}&state=${stateParam}&district=${districtParam}`).catch(() => {});
    // Prefetch next month
    fetch(`/api/vertex/aggregates?type=month&year=${nextYear}&month=${nextMonth}&state=${stateParam}&district=${districtParam}`).catch(() => {});
  }, [year, month, state, district, session]);

  return {
    monthSummary: data?.monthSummary,
    meta: data?.meta,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Fetch daily summary data
 */
export function useVertexDaily(
  date: string | null,
  state?: string,
  district?: string
) {
  const { data: session } = useSession();
  
  const url = session && date
    ? `/api/vertex/aggregates?type=daily&date=${date}&state=${state || 'all'}&district=${district || 'all'}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{
    dailySummary: DailySummary;
    meta: { cached: boolean; durationMs: number; cacheKey: string };
  }>(url, fetcher, {
    dedupingInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true,
  });

  return {
    dailySummary: data?.dailySummary,
    meta: data?.meta,
    isLoading,
    error,
    mutate,
  };
}
