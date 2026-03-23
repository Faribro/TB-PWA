import { useEffect, useRef } from 'react';
import { useEntityStore } from '@/stores/useEntityStore';

interface PredictivePattern {
  type: 'spike' | 'trend' | 'anomaly';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

const daysSince = (dateStr: string | null | undefined): number => {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
};

export function useSonicPredictive(allPatients?: any[]) {
  const pushSonicAlert = useEntityStore(s => s.pushSonicAlert);
  const workflowHistory = useEntityStore(s => s.workflowHistory);
  const lastAnalysisRef = useRef<number>(0);
  const patternsDetectedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!allPatients || allPatients.length === 0) return;

    // Run analysis every 30 seconds
    const now = Date.now();
    if (now - lastAnalysisRef.current < 30000) return;
    lastAnalysisRef.current = now;

    const patterns: PredictivePattern[] = [];

    // ═══════════════════════════════════════════════════════════════════════
    // 1. BREACH SPIKE DETECTION
    // ═══════════════════════════════════════════════════════════════════════
    const recentPatients = allPatients.filter(p => {
      const days = daysSince(p.screening_date || p.submitted_on);
      return days <= 7; // Last 7 days
    });

    const recentBreaches = recentPatients.filter(p => {
      const days = daysSince(p.screening_date || p.submitted_on);
      const phase = (p.current_phase || '').toLowerCase();
      return days > 7 && !phase.includes('treatment') && !phase.includes('closed');
    }).length;

    const totalBreaches = allPatients.filter(p => {
      const days = daysSince(p.screening_date || p.submitted_on);
      const phase = (p.current_phase || '').toLowerCase();
      return days > 7 && !phase.includes('treatment') && !phase.includes('closed');
    }).length;

    const breachRate = recentPatients.length > 0 ? (recentBreaches / recentPatients.length) : 0;

    if (breachRate > 0.3 && recentBreaches > 10) {
      const patternKey = `breach-spike-${Math.floor(now / 86400000)}`;
      if (!patternsDetectedRef.current.has(patternKey)) {
        patterns.push({
          type: 'spike',
          severity: breachRate > 0.5 ? 'high' : 'medium',
          message: `🚨 Breach Spike Alert! ${recentBreaches} new breaches in last 7 days (${(breachRate * 100).toFixed(1)}% of recent patients). Total: ${totalBreaches.toLocaleString()}`
        });
        patternsDetectedRef.current.add(patternKey);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. DIAGNOSIS RATE TREND
    // ═══════════════════════════════════════════════════════════════════════
    const diagnosed = allPatients.filter(p => p.tb_diagnosed === 'Y' || p.tb_diagnosed === 'Yes');
    const diagnosisRate = allPatients.length > 0 ? (diagnosed.length / allPatients.length) : 0;

    if (diagnosisRate > 0.2) {
      const patternKey = `high-diagnosis-${Math.floor(now / 86400000)}`;
      if (!patternsDetectedRef.current.has(patternKey)) {
        patterns.push({
          type: 'trend',
          severity: 'high',
          message: `⚠️ High Diagnosis Rate: ${(diagnosisRate * 100).toFixed(1)}% of screened patients are TB positive. This is above normal threshold!`
        });
        patternsDetectedRef.current.add(patternKey);
      }
    } else if (diagnosisRate < 0.05 && allPatients.length > 100) {
      const patternKey = `low-diagnosis-${Math.floor(now / 86400000)}`;
      if (!patternsDetectedRef.current.has(patternKey)) {
        patterns.push({
          type: 'anomaly',
          severity: 'medium',
          message: `📉 Low Diagnosis Rate: Only ${(diagnosisRate * 100).toFixed(1)}% diagnosed. Screening quality may need review.`
        });
        patternsDetectedRef.current.add(patternKey);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. TREATMENT INITIATION GAP
    // ═══════════════════════════════════════════════════════════════════════
    const initiated = allPatients.filter(p => p.att_start_date);
    const initiationRate = diagnosed.length > 0 ? (initiated.length / diagnosed.length) : 0;

    if (initiationRate < 0.9 && diagnosed.length > 10) {
      const gap = diagnosed.length - initiated.length;
      const patternKey = `initiation-gap-${Math.floor(now / 86400000)}`;
      if (!patternsDetectedRef.current.has(patternKey)) {
        patterns.push({
          type: 'anomaly',
          severity: initiationRate < 0.7 ? 'high' : 'medium',
          message: `💊 Treatment Gap: ${gap} diagnosed patients haven't started ATT (${(initiationRate * 100).toFixed(1)}% initiation rate). Target is 95%+`
        });
        patternsDetectedRef.current.add(patternKey);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. DISTRICT CONCENTRATION ANOMALY
    // ═══════════════════════════════════════════════════════════════════════
    const districtMap = new Map<string, number>();
    allPatients.forEach(p => {
      const dist = p.screening_district || 'Unknown';
      districtMap.set(dist, (districtMap.get(dist) || 0) + 1);
    });

    const sortedDistricts = Array.from(districtMap.entries())
      .sort((a, b) => b[1] - a[1]);

    if (sortedDistricts.length > 0) {
      const topDistrict = sortedDistricts[0];
      const concentration = topDistrict[1] / allPatients.length;

      if (concentration > 0.4 && allPatients.length > 50) {
        const patternKey = `concentration-${topDistrict[0]}-${Math.floor(now / 86400000)}`;
        if (!patternsDetectedRef.current.has(patternKey)) {
          patterns.push({
            type: 'anomaly',
            severity: 'medium',
            message: `📍 Geographic Concentration: ${topDistrict[0]} has ${(concentration * 100).toFixed(1)}% of all patients (${topDistrict[1].toLocaleString()}). Possible outbreak or data entry issue?`
          });
          patternsDetectedRef.current.add(patternKey);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. WORKFLOW PATTERN DETECTION
    // ═══════════════════════════════════════════════════════════════════════
    if (workflowHistory.length >= 5) {
      const recentPaths = workflowHistory.slice(0, 5).map(w => w.path);
      const uniquePaths = new Set(recentPaths);

      // User keeps going back to same page
      if (uniquePaths.size === 1 && recentPaths[0] === '/dashboard/mande') {
        const patternKey = `workflow-mande-${Math.floor(now / 3600000)}`; // Hourly
        if (!patternsDetectedRef.current.has(patternKey)) {
          patterns.push({
            type: 'trend',
            severity: 'low',
            message: `🔍 You've been focusing on M&E Hub. Need help with duplicates or data integrity?`
          });
          patternsDetectedRef.current.add(patternKey);
        }
      }

      // User keeps switching between GIS and Follow-up
      const gisCount = recentPaths.filter(p => p.includes('gis')).length;
      const followUpCount = recentPaths.filter(p => p.includes('follow-up')).length;

      if (gisCount >= 2 && followUpCount >= 2) {
        const patternKey = `workflow-gis-followup-${Math.floor(now / 3600000)}`;
        if (!patternsDetectedRef.current.has(patternKey)) {
          patterns.push({
            type: 'trend',
            severity: 'low',
            message: `🗺️ Analyzing geographic patterns and follow-ups? I can help correlate district data with patient pipelines!`
          });
          patternsDetectedRef.current.add(patternKey);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. TIME-BASED PATTERNS (Day of Week)
    // ═══════════════════════════════════════════════════════════════════════
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Monday morning - weekly summary
    if (dayOfWeek === 1 && today.getHours() < 12) {
      const patternKey = `monday-summary-${today.toISOString().split('T')[0]}`;
      if (!patternsDetectedRef.current.has(patternKey)) {
        const lastWeekPatients = allPatients.filter(p => {
          const days = daysSince(p.screening_date || p.submitted_on);
          return days <= 7;
        });

        patterns.push({
          type: 'trend',
          severity: 'low',
          message: `📅 Monday Morning Brief: ${lastWeekPatients.length} patients screened last week. ${recentBreaches} need follow-up. Ready to tackle the week Sir!`
        });
        patternsDetectedRef.current.add(patternKey);
      }
    }

    // Friday afternoon - week wrap-up
    if (dayOfWeek === 5 && today.getHours() >= 15) {
      const patternKey = `friday-wrapup-${today.toISOString().split('T')[0]}`;
      if (!patternsDetectedRef.current.has(patternKey)) {
        patterns.push({
          type: 'trend',
          severity: 'low',
          message: `🎯 Week Wrap-up: ${totalBreaches} total breaches to address. Plan to clear these next week?`
        });
        patternsDetectedRef.current.add(patternKey);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUSH ALERTS
    // ═══════════════════════════════════════════════════════════════════════
    patterns.forEach(pattern => {
      setTimeout(() => {
        pushSonicAlert(pattern.message);
      }, Math.random() * 2000); // Stagger alerts
    });

    // Clean up old pattern keys (older than 24 hours)
    const dayAgo = now - 86400000;
    patternsDetectedRef.current.forEach(key => {
      const timestamp = parseInt(key.split('-').pop() || '0');
      if (timestamp < dayAgo) {
        patternsDetectedRef.current.delete(key);
      }
    });

  }, [allPatients, workflowHistory, pushSonicAlert]);

  return {};
}
