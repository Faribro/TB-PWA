import { useMemo } from 'react';
import { normalizeGeographicKey } from '@/lib/normalizeGeographicKey';

interface Patient {
  id: number;
  screening_district: string;
  screening_state: string;
  screening_date: string;
  referral_date: string | null;
  tb_diagnosed: string | null;
  att_start_date: string | null;
  att_completion_date?: string | null;
}

export interface ChoroplethMetrics {
  name?: string;
  state?: string;
  screened: number;
  diagnosed: number;
  initiated: number;
  completed: number;
  breaches: number;
  suspected: number;
  normal: number;
}

type DepthLevel = 'state' | 'district' | 'facility';

// Global cache for parsed date strings to timestamps to avoid GC pressure and CPU overhead in O(N) loops
const dateCache = new Map<string, number>();

const parseDateToMs = (dateStr: string): number => {
  if (!dateStr) return 0;
  const cached = dateCache.get(dateStr);
  if (cached !== undefined) return cached;
  const ms = new Date(dateStr).getTime();
  dateCache.set(dateStr, ms);
  return ms;
};

// Helper: Calculate SLA breach using pre-fetched current timestamp
const isSLABreach = (patient: Patient, nowMs: number): boolean => {
  if (patient.referral_date || !patient.screening_date) return false;
  const screeningTime = parseDateToMs(patient.screening_date);
  const daysSince = (nowMs - screeningTime) / (1000 * 60 * 60 * 24);
  return daysSince > 7;
};

/**
 * O(n) Aggregation Engine
 * Single-pass iteration through globalPatients, grouping by district or state
 * Returns a Map with normalized keys for fast O(1) lookups
 */
export function useChoroplethDictionary(
  globalPatients: Patient[],
  depthLevel: DepthLevel
): Map<string, ChoroplethMetrics> {
  return useMemo(() => {
    const dictionary = new Map<string, ChoroplethMetrics>();
    const nowMs = Date.now();

    // Single-pass O(n) aggregation
    globalPatients.forEach((patient) => {
      // Determine key based on depth level
      const rawKey = depthLevel === 'state' 
        ? patient.screening_state 
        : patient.screening_district;
      
      if (!rawKey) return; // Skip if no district/state

      const key = normalizeGeographicKey(rawKey);

      // Get or initialize metrics with a single map lookup
      let metrics = dictionary.get(key);
      if (!metrics) {
        metrics = {
          screened: 0,
          diagnosed: 0,
          initiated: 0,
          completed: 0,
          breaches: 0,
          suspected: 0,
          normal: 0,
        };
        dictionary.set(key, metrics);
      }

      // Increment counters
      metrics.screened++;
      
      if (patient.tb_diagnosed === 'Yes' || patient.tb_diagnosed === 'Y') {
        metrics.diagnosed++;
      } else if (patient.tb_diagnosed === 'No' || patient.tb_diagnosed === 'N') {
        metrics.normal++;
      } else {
        metrics.suspected++;
      }
      
      if (patient.att_start_date) {
        metrics.initiated++;
      }
      
      if (patient.att_completion_date) {
        metrics.completed++;
      }
      
      if (isSLABreach(patient, nowMs)) {
        metrics.breaches++;
      }
    });

    return dictionary;
  }, [globalPatients, depthLevel]);
}
