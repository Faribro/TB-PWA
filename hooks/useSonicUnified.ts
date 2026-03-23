'use client';
import { useEffect, useCallback, useRef } from 'react';
import { useEntityStore }        from '@/stores/useEntityStore';
import { useSonicIntelligence }  from './useSonicIntelligence';
import { useSonicGISIntelligence } from './useSonicGISIntelligence';
import { useSonicPredictive }    from './useSonicPredictive';
import { usePathname }           from 'next/navigation';

export interface UnifiedSonicProps {
  allPatients?:     any[];
  duplicatePairs?:  any[];
  eligibleCount?:   number;
  dataHealthScore?: number;
  choroplethDict?:  Record<string, any>;
  mapInstance?:     any;
  onMapCommand?:    (cmd: SonicMapCommand) => void;
}

export interface SonicMapCommand {
  action:          'flyTo' | 'setMetric' | 'reset' | 'showLeaderboard' | 'showCascade';
  targetDistrict?: string;
  targetState?:    string;
  metric?:         string;
  zoom?:           number;
}

export function useSonicUnified(props: UnifiedSonicProps) {
  const pathname = usePathname();
  const pushSonicAlert = useEntityStore(s => s.pushSonicAlert);
  const pushCommandHistory = useEntityStore(s => s.pushCommandHistory);
  const isOnGIS = pathname?.includes('/gis') || pathname?.includes('spatial');

  useSonicIntelligence({
    allPatients:     props.allPatients,
    duplicatePairs:  props.duplicatePairs,
    eligibleCount:   props.eligibleCount,
    dataHealthScore: props.dataHealthScore,
  });

  useSonicGISIntelligence(isOnGIS);

  useSonicPredictive(props.allPatients);

  const gisInsightFiredRef = useRef(false);
  useEffect(() => {
    if (!isOnGIS || !props.choroplethDict || gisInsightFiredRef.current) return;
    gisInsightFiredRef.current = true;

    const hotspots = Object.values(props.choroplethDict)
      .filter((d: any) => d.breachRate > 0.8)
      .sort((a: any, b: any) => b.breachRate - a.breachRate);

    if (hotspots.length > 0) {
      const top = hotspots[0] as any;
      setTimeout(() => {
        pushSonicAlert(
          `🗺️ Spotted ${hotspots.length} hotspot${hotspots.length > 1 ? 's' : ''}! ` +
          `${top.district} is worst at ${Math.round(top.breachRate * 100)}%. ` +
          `Click me to zoom in! 🦔`
        );
      }, 2000);
    } else {
      setTimeout(() => {
        pushSonicAlert(`🗺️ GIS looks clean! No districts above 80% breach rate. ✅`);
      }, 2000);
    }
  }, [isOnGIS, props.choroplethDict, pushSonicAlert]);

  useEffect(() => { gisInsightFiredRef.current = false; }, [pathname]);

  const parseAndExecuteCommand = useCallback((input: string) => {
    if (!props.onMapCommand) return false;
    const lower = input.toLowerCase().trim();

    const NAV_TRIGGERS = ['show', 'zoom', 'go to', 'fly to', 'navigate', 'take me'];
    const isNav = NAV_TRIGGERS.some(t => lower.includes(t));

    if (isNav) {
      const DISTRICTS = [
        'pune', 'mumbai', 'nagpur', 'thane', 'nashik', 'aurangabad',
        'solapur', 'amravati', 'kolhapur', 'nanded', 'sangli', 'satara',
        'ratnagiri', 'ahmednagar', 'latur', 'osmanabad', 'parbhani',
        'jalgaon', 'beed', 'yavatmal', 'akola', 'buldhana', 'washim',
        'wardha', 'bhandara', 'gondiya', 'gadchiroli', 'chandrapur',
        'delhi', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 'ahmedabad',
        'surat', 'jaipur', 'lucknow', 'kanpur', 'indore', 'bhopal', 'patna',
        'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'faridabad', 'meerut',
        'rajkot', 'varanasi', 'srinagar', 'dhanbad', 'amritsar', 'allahabad',
        'ranchi', 'howrah', 'coimbatore', 'jabalpur', 'gwalior', 'vijayawada',
        'jodhpur', 'madurai', 'raipur', 'kota', 'chandigarh', 'guwahati'
      ];
      const found = DISTRICTS.find(d => lower.includes(d));

      if (found) {
        const metric = lower.includes('breach') ? 'breaches'
          : lower.includes('screen') ? 'screened'
          : lower.includes('diagnos') ? 'diagnosed'
          : undefined;

        props.onMapCommand({ action: 'flyTo', targetDistrict: found, metric });
        pushCommandHistory({
          cmd: input, ts: Date.now(),
          result: `Flying to ${found}${metric ? ` showing ${metric}` : ''}`
        });
        return true;
      }
    }

    if (lower.includes('breach'))   { props.onMapCommand({ action: 'setMetric', metric: 'breaches'  }); return true; }
    if (lower.includes('screen'))   { props.onMapCommand({ action: 'setMetric', metric: 'screened'  }); return true; }
    if (lower.includes('diagnos'))  { props.onMapCommand({ action: 'setMetric', metric: 'diagnosed' }); return true; }
    if (lower.includes('notified')) { props.onMapCommand({ action: 'setMetric', metric: 'notified'  }); return true; }

    if (lower.includes('reset') || lower.includes('home') || lower.includes('india')) {
      props.onMapCommand({ action: 'reset' });
      return true;
    }
    if (lower.includes('leaderboard') || lower.includes('ranking')) {
      props.onMapCommand({ action: 'showLeaderboard' });
      return true;
    }
    if (lower.includes('cascade') || lower.includes('funnel')) {
      props.onMapCommand({ action: 'showCascade' });
      return true;
    }

    if (lower.includes('hotspot') || lower.includes('worst') || lower.includes('critical')) {
      const { gisHotspots } = useEntityStore.getState();
      if (gisHotspots?.[0]) {
        props.onMapCommand({ action: 'flyTo', targetDistrict: gisHotspots[0].district, metric: 'breaches' });
        return true;
      }
    }

    return false;
  }, [props.onMapCommand, pushCommandHistory]);

  return { parseAndExecuteCommand, isOnGIS };
}
