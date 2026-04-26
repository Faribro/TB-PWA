'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import useSWR from 'swr';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ScreeningDay {
  date: string;
  count: number;
  tbPositive: number;
  suspected: number;
  attStarted: number;
  referred: number;
}

interface UseRealtimeCalendarOptions {
  year: number;
  state?: string | null;
  district?: string | null;
  onUpdate?: (date: string) => void;
}

interface UseRealtimeCalendarReturn {
  data: ScreeningDay[];
  isLoading: boolean;
  error: Error | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

// Stable empty array reference — prevents new [] on every render during loading
const EMPTY_DATA: ScreeningDay[] = [];

/**
 * useRealtimeCalendar
 *
 * Architecture:
 * - Server is the single source of truth (via /api/vertex/metrics)
 * - Supabase Realtime is ONLY a trigger to revalidate SWR cache
 * - No local state accumulation (prevents drift from server)
 * - useMemo for merged output (prevents render churn)
 * - Subscription only recreates when scope (year/state/district) changes
 */
export function useRealtimeCalendar({
  year,
  state,
  district,
  onUpdate
}: UseRealtimeCalendarOptions): UseRealtimeCalendarReturn {

  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

  const channelRef = useRef<RealtimeChannel | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const filterParamsRef = useRef({ year, state, district });

  const apiUrl = `/api/vertex/metrics?year=${year}&view=year&state=${state || 'all'}&district=${district || 'all'}`;

  // SWR is the primary data source — server = truth
  const { data: apiData, error, isLoading, mutate } = useSWR(
    apiUrl,
    fetcher,
    {
      dedupingInterval: 5000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true
    }
  );

  // Keep refs in sync without triggering re-subscription
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    filterParamsRef.current = { year, state, district };
  }, [year, state, district]);

  // Check if a realtime event is relevant to current scope (via ref for stable closure)
  const isEventInScopeRef = useRef((payload: any): boolean => {
    const patient = payload.new || payload.old;
    if (!patient) return false;

    const { year: currentYear, state: currentState, district: currentDistrict } = filterParamsRef.current;

    // Check date is in current year
    const date = patient.screening_date?.split('T')[0];
    if (!date || !date.startsWith(`${currentYear}-`)) return false;

    // Check state filter
    if (currentState && currentState !== 'all') {
      const patientState = patient.screening_state;
      if (currentState === 'Maharashtra') {
        if (patientState !== 'Maharashtra' && patientState !== 'Mumbai') return false;
      } else {
        if (patientState !== currentState) return false;
      }
    }

    // Check district filter
    if (currentDistrict && currentDistrict !== 'all') {
      if (patient.screening_district !== currentDistrict) return false;
    }

    return true;
  });

  // Realtime subscription — only re-subscribes when scope changes
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    setStatus('connecting');

    let channelName = `calendar-realtime-${year}`;
    if (state && state !== 'all') channelName += `-${state}`;
    if (district && district !== 'all') channelName += `-${district}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
        },
        (payload) => {
          if (!isEventInScopeRef.current(payload)) return;

          const date = (payload.new || payload.old)?.screening_date?.split('T')[0];

          // Notify parent for visual feedback (sound, animation)
          if (date) onUpdateRef.current?.(date);

          // Revalidate SWR cache — server is truth, not local accumulation
          mutate();
        }
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (s === 'CLOSED') {
          setStatus('disconnected');
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          setStatus('error');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, state, district]); // Only recreate subscription when scope changes

  // Memoized data — stable reference, no new array on every render
  const data = useMemo<ScreeningDay[]>(() => {
    if (!apiData?.dailyBreakdown) return EMPTY_DATA;
    return apiData.dailyBreakdown.map((day: any) => ({
      date: day.date,
      count: day.count,
      tbPositive: day.tbPositive ?? day.tb_positive ?? 0,
      suspected: day.suspected ?? 0,
      attStarted: day.attStarted ?? day.att_started ?? 0,
      referred: day.referred ?? 0
    }));
  }, [apiData?.dailyBreakdown]);

  return {
    data,
    isLoading,
    error,
    status
  };
}
