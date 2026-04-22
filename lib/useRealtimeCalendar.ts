'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase-browser';
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
}

interface UseRealtimeCalendarReturn {
  data: ScreeningDay[];
  isLoading: boolean;
  error: Error | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useRealtimeCalendar({
  year,
  state,
  district
}: UseRealtimeCalendarOptions): UseRealtimeCalendarReturn {
  
  const [realtimeData, setRealtimeData] = useState<ScreeningDay[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const realtimeMapRef = useRef<Map<string, ScreeningDay>>(new Map());
  
  const apiUrl = `/api/vertex/metrics?year=${year}&view=year&state=${state || 'all'}&district=${district || 'all'}`;
  
  const { data: apiData, error, isLoading } = useSWR(
    apiUrl,
    fetcher,
    {
      dedupingInterval: 30000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  );
  
  const aggregatePatient = useCallback((patient: any) => {
    const date = patient.screening_date?.split('T')[0];
    if (!date) return;
    
    if (!date.startsWith(`${year}-`)) return;
    
    if (state && state !== 'all') {
      const patientState = patient.screening_state;
      if (state === 'Maharashtra') {
        if (patientState !== 'Maharashtra' && patientState !== 'Mumbai') return;
      } else {
        if (patientState !== state) return;
      }
    }
    
    if (district && district !== 'all') {
      if (patient.screening_district !== district) return;
    }
    
    const existing = realtimeMapRef.current.get(date) || {
      date,
      count: 0,
      tbPositive: 0,
      suspected: 0,
      attStarted: 0,
      referred: 0
    };
    
    const isSuspected = patient.xray_result === 'Suspected TB Case';
    const isDiagnosed = patient.tb_diagnosed === 'Y' || patient.tb_diagnosed === 'Yes';
    const isAttStarted = patient.att_start_date !== null;
    const isReferred = patient.referral_date !== null;
    
    existing.count++;
    if (isDiagnosed) existing.tbPositive++;
    if (isSuspected) existing.suspected++;
    if (isAttStarted) existing.attStarted++;
    if (isReferred) existing.referred++;
    
    realtimeMapRef.current.set(date, existing);
    
    const updatedArray = Array.from(realtimeMapRef.current.values())
      .sort((a, b) => a.date.localeCompare(b.date));
    
    setRealtimeData(updatedArray);
  }, [year, state, district]);
  
  const mergedData = useCallback(() => {
    if (!apiData?.dailyBreakdown) return realtimeData;
    
    const mergedMap = new Map<string, ScreeningDay>();
    apiData.dailyBreakdown.forEach((day: ScreeningDay) => {
      mergedMap.set(day.date, { ...day });
    });
    
    realtimeData.forEach(day => {
      mergedMap.set(day.date, day);
    });
    
    return Array.from(mergedMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [apiData?.dailyBreakdown, realtimeData]);
  
  useEffect(() => {
    const supabase = createClient();
    
    setStatus('connecting');
    
    const filters: any = {
      event: '*',
      schema: 'public',
      table: 'patients'
    };
    
    if (state && state !== 'all') {
      if (state === 'Maharashtra') {
        filters.filter = `screening_state=in.(Maharashtra,Mumbai)`;
      } else {
        filters.filter = `screening_state=eq.${state}`;
      }
    }
    
    if (district && district !== 'all') {
      const existingFilter = filters.filter || '';
      filters.filter = existingFilter 
        ? `${existingFilter},screening_district=eq.${district}`
        : `screening_district=eq.${district}`;
    }
    
    const channel = supabase
      .channel('calendar-realtime')
      .on('postgres_changes', filters, (payload) => {
        console.log('[useRealtimeCalendar] Event received:', payload.eventType);
        if (payload.eventType === 'INSERT') {
          aggregatePatient(payload.new);
        } else if (payload.eventType === 'UPDATE') {
          if (payload.old) aggregatePatient(payload.old);
          if (payload.new) aggregatePatient(payload.new);
        }
      })
      .subscribe((s) => {
        console.log('[useRealtimeCalendar] Subscription status:', s);
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
  }, [year, state, district, aggregatePatient]);
  
  return {
    data: mergedData(),
    isLoading,
    error,
    status
  };
}
