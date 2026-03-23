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
  screened: number;
  diagnosed: number;
  initiated: number;
  completed: number;
  breaches: number;
}

type DepthLevel = 'state' | 'district' | 'facility';

// Helper: Calculate SLA breach
const isSLABreach = (patient: Patient): boolean => {
  const screeningDate = patient.screening_date ? new Date(patient.screening_date) : null;
  if (!screeningDate) return false;
  const daysSince = (Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24);
  return !patient.referral_date && daysSince > 7;
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

    // Single-pass O(n) aggregation
    globalPatients.forEach((patient) => {
      // Determine key based on depth level
      const rawKey = depthLevel === 'state' 
        ? patient.screening_state 
        : patient.screening_district;
      
      if (!rawKey) return; // Skip if no district/state

      const key = normalizeGeographicKey(rawKey);

      // Get or initialize metrics
      if (!dictionary.has(key)) {
        dictionary.set(key, {
          screened: 0,
          diagnosed: 0,
          initiated: 0,
          completed: 0,
          breaches: 0,
        });
      }

      const metrics = dictionary.get(key)!;

      // Increment counters
      metrics.screened++;
      
      if (patient.tb_diagnosed === 'Yes' || patient.tb_diagnosed === 'Y') {
        metrics.diagnosed++;
      }
      
      if (patient.att_start_date) {
        metrics.initiated++;
      }
      
      if (patient.att_completion_date) {
        metrics.completed++;
      }
      
      if (isSLABreach(patient)) {
        metrics.breaches++;
      }
    });

    return dictionary;
  }, [globalPatients, depthLevel]);
}
