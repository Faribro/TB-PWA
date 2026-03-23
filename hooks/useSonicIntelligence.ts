'use client';

import { useEffect, useRef } from 'react';
import { useEntityStore } from '@/stores/useEntityStore';

interface UseSonicIntelligenceProps {
  allPatients?: any[];
  duplicatePairs?: any[];
  eligibleCount?: number;
  dataHealthScore?: number;
}

export function useSonicIntelligence({
  allPatients,
  duplicatePairs,
  eligibleCount,
  dataHealthScore,
}: UseSonicIntelligenceProps) {
  const pushSonicAlert = useEntityStore((s) => s.pushSonicAlert);
  const setDuplicateCount = useEntityStore((s) => s.setDuplicateCount);
  const setEligibleCount = useEntityStore((s) => s.setEligibleCount);
  const setDataHealthScore = useEntityStore((s) => s.setDataHealthScore);
  const setBreachSpikeBase = useEntityStore((s) => s.setBreachSpikeBase);

  const prevBreachRef = useRef(0);
  const prevDupRef = useRef(0);
  const prevEligibleRef = useRef(0);
  const prevHealthRef = useRef(100);

  useEffect(() => {
    if (!allPatients?.length) return;

    const breachCount = allPatients.filter(p => {
      const days = daysSince(p.screening_date || p.submitted_on);
      const phase = (p.current_phase || '').toLowerCase();
      return days > 7 && !phase.includes('treatment') && !phase.includes('closed');
    }).length;

    const spike = breachCount - prevBreachRef.current;

    if (spike > 10 && prevBreachRef.current > 0) {
      pushSonicAlert(
        `🚨 BREACH SPIKE! +${spike} new breaches! Total: ${breachCount.toLocaleString()}`
      );
    } else if (breachCount > 5000 && prevBreachRef.current <= 5000) {
      pushSonicAlert(`⚠️ Breach count crossed 5,000! Action needed.`);
    } else if (breachCount === 0 && prevBreachRef.current > 0) {
      pushSonicAlert(`✅ Zero breaches! Clean slate Sir! 🎉`);
    }

    prevBreachRef.current = breachCount;
    setBreachSpikeBase(breachCount);
  }, [allPatients, pushSonicAlert, setBreachSpikeBase]);

  useEffect(() => {
    if (duplicatePairs === undefined) return;
    setDuplicateCount(duplicatePairs.length);

    const increase = duplicatePairs.length - prevDupRef.current;
    if (increase > 5 && prevDupRef.current > 0) {
      pushSonicAlert(
        `⚠️ ${duplicatePairs.length} duplicate patients detected! Check M&E Hub`
      );
    } else if (duplicatePairs.length === 0 && prevDupRef.current > 0) {
      pushSonicAlert(`✅ All duplicates resolved! M&E clean.`);
    }
    prevDupRef.current = duplicatePairs.length;
  }, [duplicatePairs, pushSonicAlert, setDuplicateCount]);

  useEffect(() => {
    if (eligibleCount === undefined) return;
    setEligibleCount(eligibleCount);

    if (eligibleCount > 50 && prevEligibleRef.current <= 50) {
      pushSonicAlert(
        `✅ ${eligibleCount} patients ready for bulk triage! Follow-up Pipeline`
      );
    } else if (eligibleCount > 200 && prevEligibleRef.current <= 200) {
      pushSonicAlert(`🔥 ${eligibleCount} triage-ready! Pipeline is filling up!`);
    }
    prevEligibleRef.current = eligibleCount;
  }, [eligibleCount, pushSonicAlert, setEligibleCount]);

  useEffect(() => {
    if (dataHealthScore === undefined) return;
    setDataHealthScore(dataHealthScore);

    if (dataHealthScore < 70 && prevHealthRef.current >= 70) {
      pushSonicAlert(
        `⚠️ Data health at ${dataHealthScore}%! Check integrity scanner`
      );
    } else if (dataHealthScore >= 90 && prevHealthRef.current < 90) {
      pushSonicAlert(`✅ Data health restored to ${dataHealthScore}%!`);
    }
    prevHealthRef.current = dataHealthScore;
  }, [dataHealthScore, pushSonicAlert, setDataHealthScore]);
}

const daysSince = (dateStr: string | null | undefined): number => {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
};
