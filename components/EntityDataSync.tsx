'use client';

import { useEffect, useRef } from 'react';
import { useEntityStore } from '@/stores/useEntityStore';

interface Patient {
  id: number;
  screening_district: string;
  screening_state: string;
  tb_diagnosed: string | null;
  att_start_date: string | null;
  att_completion_date?: string | null;
  referral_date: string | null;
  screening_date: string;
}

interface EntityDataSyncProps {
  patients: Patient[];
}

export function EntityDataSync({ patients }: EntityDataSyncProps) {
  const setDistrictData = useEntityStore(state => state.setDistrictData);
  const prevLengthRef = useRef(0);
  
  useEffect(() => {
    // Skip if no patients or same length (optimization)
    if (!patients?.length || patients.length === prevLengthRef.current) return;
    prevLengthRef.current = patients.length;
    
    // Aggregate patient data by district (optimized with Map)
    const districtMap = new Map<string, {
      screened: number;
      diagnosed: number;
      initiated: number;
      completed: number;
      breachCount: number;
      state: string;
    }>();
    
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const district = patient.screening_district;
      if (!district) continue;
      
      let current = districtMap.get(district);
      if (!current) {
        current = {
          screened: 0,
          diagnosed: 0,
          initiated: 0,
          completed: 0,
          breachCount: 0,
          state: patient.screening_state || ''
        };
        districtMap.set(district, current);
      }
      
      current.screened++;
      
      if (patient.tb_diagnosed) {
        current.diagnosed++;
      }
      
      if (patient.att_start_date) {
        current.initiated++;
      }
      
      if (patient.att_completion_date) {
        current.completed++;
      }
      
      // Calculate SLA breach (simplified: >7 days from screening to diagnosis)
      if (patient.screening_date && patient.tb_diagnosed) {
        const screeningDate = new Date(patient.screening_date);
        const diagnosisDate = new Date(patient.tb_diagnosed);
        const daysDiff = (diagnosisDate.getTime() - screeningDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff > 7) {
          current.breachCount++;
        }
      }
    }
    
    // Convert to array format (optimized)
    const districtData: any[] = [];
    districtMap.forEach((metrics, district) => {
      districtData.push({
        district,
        state: metrics.state,
        screened: metrics.screened,
        diagnosed: metrics.diagnosed,
        initiated: metrics.initiated,
        completed: metrics.completed,
        breachCount: metrics.breachCount,
        breachRate: metrics.screened > 0 ? metrics.breachCount / metrics.screened : 0,
      });
    });
    
    setDistrictData(districtData);
  }, [patients, setDistrictData]);
  
  return null;
}
