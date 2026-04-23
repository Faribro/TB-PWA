/**
 * SWR Hooks for Vertex Aggregates
 * 
 * Production-grade hooks with:
 * - Stable cache keys
 * - Scoped by role/state/district
 * - Precise mutation support
 * - Realtime-compatible
 */

import useSWR from 'swr';
import { useSession } from 'next-auth/react';

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
