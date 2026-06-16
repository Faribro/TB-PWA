'use client';

import { useEffect, useRef } from 'react';

interface Patient {
  id: number;
  screening_district: string;
  referral_date: string | null;
  tb_diagnosed: string | null;
  screening_date: string;
}

function isSLABreach(patient: Patient): boolean {
  if (!patient.referral_date || !patient.screening_date) return false;
  
  const screeningDate = new Date(patient.screening_date);
  const referralDate = new Date(patient.referral_date);
  const daysDiff = Math.floor((referralDate.getTime() - screeningDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysDiff > 7; // SLA breach if referral takes more than 7 days
}

export function useAmbientWatcher(
  patients: Patient[],
  onAlert: (message: string, district: string, severity: 'critical' | 'warning') => void,
  enabled = true
) {
  const prevBreachesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!enabled) return;

    const check = () => {
      const currentBreaches = new Map<string, number>();

      // Aggregate breaches by district
      patients.forEach(p => {
        if (isSLABreach(p)) {
          const district = p.screening_district;
          currentBreaches.set(district, (currentBreaches.get(district) || 0) + 1);
        }
      });

      // Detect NEW or WORSENING breaches
      currentBreaches.forEach((count, district) => {
        const prevCount = prevBreachesRef.current.get(district) || 0;
        
        // New breach detected
        if (prevCount === 0 && count > 0) {
          onAlert(
            `New SLA breach detected in ${district}. ${count} patient${
              count > 1 ? 's' : ''
            } overdue for referral. Shall I investigate?`,
            district,
            count > 5 ? 'critical' : 'warning'
          );
        }
        // Breach count increased significantly
        else if (count > prevCount && count - prevCount >= 3) {
          onAlert(
            `SLA breach escalating in ${district}. ${count - prevCount} new cases added. Total: ${count} patients overdue.`,
            district,
            count > 10 ? 'critical' : 'warning'
          );
        }
        // Critical threshold crossed
        else if (count >= 10 && prevCount < 10) {
          onAlert(
            `⚠️ CRITICAL: ${district} has reached ${count} SLA breaches. Immediate intervention required.`,
            district,
            'critical'
          );
        }
      });

      prevBreachesRef.current = currentBreaches;
    };

    check(); // Run immediately
    const id = setInterval(check, 30_000); // Check every 30 seconds
    return () => clearInterval(id);
  }, [patients, onAlert, enabled]);
}
