'use client';

import { useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Layers, X, BarChart3, Trophy, Globe, Maximize2, Settings, Search, Cpu, Database, ChevronLeft, ChevronRight, Activity, AlertCircle, ChevronDown, Sparkles, Send, Compass } from 'lucide-react';
import { useUniversalFilter } from '@/contexts/FilterContext';
import { KPIRibbon } from './KPIRibbon';
import { ColorLegend } from './ColorLegend';

import { normalizeGeographicKey } from '@/lib/normalizeGeographicKey';

// Global cache for parsed date strings to avoid GC pressure and CPU overhead in O(N) loops
const dateCache = new Map<string, number>();

const parseDateToMs = (dateStr: string): number => {
  if (!dateStr) return 0;
  const cached = dateCache.get(dateStr);
  if (cached !== undefined) return cached;
  const ms = new Date(dateStr).getTime();
  dateCache.set(dateStr, ms);
  return ms;
};

interface CommandCenterLayoutProps {
  children: ReactNode;
  filteredPatients: any[];
  globalPatients?: any[];
  uniqueCoordinators: string[];
  onZoomToFit: () => void;
  onShowCascade: () => void;
  onShowLeaderboard: () => void;
  showCascade: boolean;
  showLeaderboard: boolean;
  heatmapMode: 'auto' | 'state' | 'district' | 'facility';
  onHeatmapModeChange: (mode: 'auto' | 'state' | 'district' | 'facility') => void;
  choroplethDict?: Map<string, any>;
  choroplethData?: { districts: Record<string, any>; states: Record<string, any> };
  activeMetric?: string;
}

export function CommandCenterLayout({
  children,
  filteredPatients,
  globalPatients,
  uniqueCoordinators,
  onZoomToFit,
  onShowCascade,
  onShowLeaderboard,
  showCascade,
  showLeaderboard,
  heatmapMode,
  onHeatmapModeChange,
  choroplethDict,
  choroplethData,
  activeMetric,
}: CommandCenterLayoutProps) {
  const { filter, setDistrict, setState, setStatus, resetFilters, hasActiveFilters } = useUniversalFilter();
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [showDistricts, setShowDistricts] = useState(false);

  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isGeographyMatrixOpen, setIsGeographyMatrixOpen] = useState(false);
  const [isSituationTabOpen, setIsSituationTabOpen] = useState(true);
  const [isAIBriefFloating, setIsAIBriefFloating] = useState(true);
  const [isAIBriefOpen, setIsAIBriefOpen] = useState(false);
  const [aiBriefPosition, setAiBriefPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [aiInsights, setAiInsights] = useState<{insightText: string, activeNode: string, timestamp: number, severity?: string}[]>([
    {
      insightText: '🚀 SAMADHAAN INTELLIGENCE CORE ONLINE: Neural surveillance systems initialized. Real-time district analytics active.',
      activeNode: 'SYSTEM',
      timestamp: Date.now(),
      severity: 'INFO'
    }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isIntervening, setIsIntervening] = useState(false);
  const matrixRef = useRef<HTMLDivElement>(null);
  const aiFeedRef = useRef<HTMLDivElement>(null);

  // Pin matrix to global nodes so it doesn't collapse when the user zeroes in on a single node
  const activePool = (globalPatients && globalPatients.length > 0) ? globalPatients : filteredPatients;

  // Pre-calculate state and district analytics in a single pass O(N) loop to avoid O(M * N) filter overhead.
  const { stateMetricsMap, districtMetricsMap } = useMemo(() => {
    const stateMap = new Map<string, { name: string; screened: number; patients: any[] }>();
    const distMap = new Map<string, {
      name: string;
      state: string;
      screened: number;
      suspected: number;
      diagnosed: number;
      initiated: number;
      completed: number;
      breaches: number;
      patients: any[];
    }>();

    const nowMs = Date.now();
    const activePoolArray = activePool || [];

    for (let i = 0; i < activePoolArray.length; i++) {
      const p = activePoolArray[i];
      if (!p) continue;

      // State Aggregation
      const state = p.screening_state;
      if (state) {
        const key = normalizeGeographicKey(state);
        let stateData = stateMap.get(key);
        if (!stateData) {
          stateData = { name: state, screened: 0, patients: [] };
          stateMap.set(key, stateData);
        }
        stateData.screened++;
        stateData.patients.push(p);
      }

      // District Aggregation
      const dist = p.screening_district;
      if (dist) {
        const key = normalizeGeographicKey(dist);
        let distData = distMap.get(key);
        if (!distData) {
          distData = {
            name: dist,
            state: p.screening_state || '',
            screened: 0,
            suspected: 0,
            diagnosed: 0,
            initiated: 0,
            completed: 0,
            breaches: 0,
            patients: [],
          };
          distMap.set(key, distData);
        }
        distData.screened++;
        distData.patients.push(p);

        if (p.xray_result === 'Suspected TB Case') {
          distData.suspected++;
        }
        if (p.tb_diagnosed === 'Y' || p.tb_diagnosed === 'Yes') {
          distData.diagnosed++;
        }
        if (p.att_start_date) {
          distData.initiated++;
        }
        if (p.att_completion_date) {
          distData.completed++;
        }

        // SLA Breach calculation
        if (!p.referral_date && p.screening_date) {
          const sTime = parseDateToMs(p.screening_date);
          const days = (nowMs - sTime) / (1000 * 60 * 60 * 24);
          if (days > 7) {
            distData.breaches++;
          }
        }
      }
    }

    return { stateMetricsMap: stateMap, districtMetricsMap: distMap };
  }, [activePool]);

  // Quick stats extraction (avoiding multiple array walks)
  const highRiskPatients = useMemo(() => {
    let count = 0;
    const len = filteredPatients.length;
    for (let i = 0; i < len; i++) {
      if (!filteredPatients[i].referral_date) {
        count++;
      }
    }
    return count;
  }, [filteredPatients]);
  
  // Calculate topDistricts, uniqueStates and districtsForState with full-dataset SWR support
  const topDistricts = useMemo(() => {
    if (choroplethData?.districts) {
      return Object.values(choroplethData.districts)
        .sort((a: any, b: any) => b.screened - a.screened)
        .slice(0, 6)
        .map((d: any) => d.name);
    }
    return Array.from(districtMetricsMap.values())
      .sort((a, b) => b.screened - a.screened)
      .slice(0, 6)
      .map(d => d.name);
  }, [choroplethData, districtMetricsMap]);

  const uniqueStates = useMemo(() => {
    if (choroplethData?.states) {
      return Object.values(choroplethData.states)
        .map((s: any) => s.name)
        .filter(Boolean)
        .sort();
    }
    return Array.from(stateMetricsMap.values())
      .map(s => s.name)
      .filter(Boolean)
      .sort();
  }, [choroplethData, stateMetricsMap]);

  const districtsForState = useMemo(() => {
    if (!selectedState) return [];
    if (choroplethData?.districts) {
      const targetStateKey = normalizeGeographicKey(selectedState);
      return Object.values(choroplethData.districts)
        .filter((d: any) => normalizeGeographicKey(d.state || '') === targetStateKey)
        .map((d: any) => d.name)
        .sort();
    }
    const targetStateKey = normalizeGeographicKey(selectedState);
    return Array.from(districtMetricsMap.values())
      .filter(d => d.state && normalizeGeographicKey(d.state) === targetStateKey)
      .map(d => d.name)
      .sort();
  }, [selectedState, choroplethData, districtMetricsMap]);

  // Auto-scroll logic for Geography Matrix
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const startScroll = () => {
      const el = matrixRef.current;
      if (!el) return;

      let direction = 1;
      const scrollSpeed = 0.8; // slightly faster for responsiveness
      
      interval = setInterval(() => {
        if (!el || el.matches(':hover')) return;

        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 5) {
          direction = -1;
        } else if (el.scrollLeft <= 5) {
          direction = 1;
        }
        
        el.scrollLeft += direction * scrollSpeed;
      }, 30);
    };

    const timeout = setTimeout(startScroll, 500);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [topDistricts.length]);

  // Shuffling sound effect for card navigation
  const playShuffleSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Create noise buffer for shuffle sound
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      
      const gain = ctx.createGain();
      gain.gain.value = 0.15;
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      noise.start();
      noise.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // Audio play failed, ignore
    }
  }, []);

  const scrollMatrix = (dir: 'L' | 'R') => {
    if (!matrixRef.current) return;
    // Scroll by card width (180px) + gap (16px)
    const scrollAmount = 196;
    matrixRef.current.scrollBy({ left: dir === 'L' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    playShuffleSound();
  };

  // Draggable AI Brief functionality
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - aiBriefPosition.x,
      y: e.clientY - aiBriefPosition.y
    };
  };

  const handleDragMove = useCallback((e: globalThis.MouseEvent) => {
    if (!isDragging) return;
    setAiBriefPosition({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y
    });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  const playSonarBeep = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
  }, []);

  // Critical Alert Sound (Red Alert)
  const playCriticalAlert = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Create pulsing alarm sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}
  }, []);

  // Warning Sound (Amber Alert)
  const playWarningBeep = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch(e) {}
  }, []);

  // Success Chime (Positive)
  const playSuccessChime = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Create ascending chord
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.03, ctx.currentTime + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.3);
        osc.start(ctx.currentTime + i * 0.05);
        osc.stop(ctx.currentTime + i * 0.05 + 0.3);
      });
    } catch(e) {}
  }, []);

  // Data Sync Sound (Info)
  const playDataSync = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch(e) {}
  }, []);

  // Intervention Activation Sound
  const playInterventionActivation = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Create power-up sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.4);
      
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.4);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch(e) {}
  }, []);

  // Advanced AI Brief Engine with Fallback Intelligence
  useEffect(() => {
    if (!filteredPatients || filteredPatients.length === 0) return;
    
    setAiLoading(true);
    const timeout = setTimeout(async () => {
      try {
        // Calculate district-level analytics (optimized O(1) lookups from districtMetricsMap)
        const districtAnalytics = topDistricts.map(dist => {
          const key = normalizeGeographicKey(dist);
          const dData = districtMetricsMap.get(key) || {
            screened: 0,
            suspected: 0,
            diagnosed: 0,
            initiated: 0,
            completed: 0,
            breaches: 0,
          };
          const volume = dData.screened;
          const suspected = dData.suspected;
          const breaches = dData.breaches;
          const diagnosed = dData.diagnosed;
          const breachRate = volume > 0 ? (breaches / volume) * 100 : 0;
          const suspectedRate = volume > 0 ? (suspected / volume) * 100 : 0;
          const yieldRate = volume > 0 ? (diagnosed / volume) * 100 : 0;
          
          return {
            district: dist,
            volume,
            suspected,
            breaches,
            diagnosed,
            breachRate,
            suspectedRate,
            yieldRate,
            riskScore: (breachRate * 0.4) + (suspectedRate * 0.4) + (100 - yieldRate) * 0.2
          };
        }).sort((a, b) => b.riskScore - a.riskScore);

        // Try AI API first
        try {
          const payload = {
            stats: { highRiskPatients, totalPatients: filteredPatients.length },
            districts: topDistricts
          };
          const res = await fetch('/api/ai/insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000)
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.insight) {
              setAiInsights(prev => {
                if (prev.length > 0 && prev[prev.length - 1].insightText === data.insight.insightText) return prev;
                return [...prev, { ...data.insight, timestamp: Date.now() }];
              });
              setAiLoading(false);
              return;
            }
          }
        } catch (apiError) {
          console.warn('AI API unavailable, using local intelligence engine');
        }

        // Fallback: Local Intelligence Engine (Always works)
        const criticalDistrict = districtAnalytics[0];
        const totalBreachRate = activePool.length > 0 ? (highRiskPatients / activePool.length) * 100 : 0;
        
        let insightText = '';
        let severity = 'NOMINAL';
        
        if (criticalDistrict.breachRate > 50) {
          severity = 'CRITICAL';
          insightText = `⚠️ CRITICAL BREACH DETECTED: ${criticalDistrict.district.toUpperCase()} sector reporting ${criticalDistrict.breachRate.toFixed(1)}% SLA violation rate across ${criticalDistrict.volume} patients. IMMEDIATE INTERVENTION REQUIRED.`;
        } else if (criticalDistrict.breachRate > 30) {
          severity = 'WARNING';
          insightText = `⚡ WARNING: ${criticalDistrict.district.toUpperCase()} sector shows elevated breach rate at ${criticalDistrict.breachRate.toFixed(1)}% with ${criticalDistrict.suspected} suspected cases pending triage.`;
        } else if (criticalDistrict.suspectedRate > 25) {
          severity = 'ALERT';
          insightText = `🔍 SURVEILLANCE ALERT: ${criticalDistrict.district.toUpperCase()} sector has ${criticalDistrict.suspected} suspected TB cases (${criticalDistrict.suspectedRate.toFixed(1)}% of volume). Enhanced monitoring recommended.`;
        } else if (criticalDistrict.yieldRate > 10) {
          severity = 'POSITIVE';
          insightText = `✅ HIGH YIELD DETECTED: ${criticalDistrict.district.toUpperCase()} sector achieving ${criticalDistrict.yieldRate.toFixed(1)}% diagnosis rate with ${criticalDistrict.diagnosed} confirmed cases. Operational excellence maintained.`;
        } else {
          severity = 'NOMINAL';
          insightText = `📊 SYSTEM NOMINAL: ${criticalDistrict.district.toUpperCase()} sector operational with ${criticalDistrict.volume} patients under surveillance. All metrics within acceptable parameters.`;
        }

        // Add system status insight
        const systemInsight = {
          insightText,
          activeNode: criticalDistrict.district,
          timestamp: Date.now(),
          severity
        };

        setAiInsights(prev => {
          if (prev.length > 0 && prev[prev.length - 1].insightText === systemInsight.insightText) return prev;
          return [...prev, systemInsight];
        });
        
        // Play sound based on severity
        setTimeout(() => {
          if (severity === 'CRITICAL') {
            playCriticalAlert();
          } else if (severity === 'WARNING') {
            playWarningBeep();
          } else if (severity === 'POSITIVE') {
            playSuccessChime();
          } else {
            playDataSync();
          }
        }, 100);

        // Add secondary insights for other high-risk districts
        if (districtAnalytics.length > 1) {
          const secondaryDistrict = districtAnalytics[1];
          if (secondaryDistrict.breachRate > 20 || secondaryDistrict.suspectedRate > 15) {
            setTimeout(() => {
              setAiInsights(prev => [...prev, {
                insightText: `📍 SECONDARY NODE: ${secondaryDistrict.district.toUpperCase()} requires attention - ${secondaryDistrict.breaches} breaches, ${secondaryDistrict.suspected} suspected cases.`,
                activeNode: secondaryDistrict.district,
                timestamp: Date.now(),
                severity: 'INFO'
              }]);
              playDataSync();
            }, 2000);
          }
        }

        // Add trend analysis
        setTimeout(() => {
          const avgBreachRate = districtAnalytics.reduce((sum, d) => sum + d.breachRate, 0) / districtAnalytics.length;
          const trendText = avgBreachRate > 30 
            ? `📈 TREND ANALYSIS: System-wide breach rate at ${avgBreachRate.toFixed(1)}%. Recommend resource reallocation to high-risk sectors.`
            : `📉 TREND ANALYSIS: System-wide breach rate stable at ${avgBreachRate.toFixed(1)}%. Continue current operational protocols.`;
          
          setAiInsights(prev => [...prev, {
            insightText: trendText,
            activeNode: 'SYSTEM',
            timestamp: Date.now(),
            severity: avgBreachRate > 30 ? 'WARNING' : 'INFO'
          }]);
          
          if (avgBreachRate > 30) {
            playWarningBeep();
          } else {
            playDataSync();
          }
        }, 4000);

      } catch (err) {
        console.error('Intelligence Engine Error:', err);
        // Ultimate fallback
        setAiInsights(prev => [...prev, {
          insightText: `⚙️ SYSTEM ONLINE: Monitoring ${filteredPatients.length} patients across ${topDistricts.length} districts. ${highRiskPatients} high-risk cases flagged for review.`,
          activeNode: topDistricts[0] || 'UNKNOWN',
          timestamp: Date.now(),
          severity: 'INFO'
        }]);
      } finally {
        setAiLoading(false);
      }
    }, 1500);
    
    return () => clearTimeout(timeout);
  }, [highRiskPatients, filteredPatients.length, topDistricts.length]);

  // Auto-scroll AI feed
  useEffect(() => {
    if (aiFeedRef.current) {
      aiFeedRef.current.scrollTo({ top: aiFeedRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [aiInsights.length]);

  const handleIntervention = async () => {
    if (aiInsights.length === 0 || isIntervening) return;
    
    playInterventionActivation();
    setIsIntervening(true);
    
    // Get the last insight's active node
    const lastInsight = aiInsights[aiInsights.length - 1];
    const activeNode = lastInsight.activeNode;
    
    if (!activeNode || activeNode === 'SYSTEM') {
      setIsIntervening(false);
      return;
    }
    
    // Add tactical notification
    setAiInsights(prev => [...prev, {
      insightText: `📡 COMMAND TRANSMITTED: Deploying resource sync to ${activeNode.toUpperCase()} sector. Initiating district-level deep scan...`,
      activeNode: activeNode,
      timestamp: Date.now(),
      severity: 'INFO'
    }]);
    playDataSync();

    // Simulate processing
    await new Promise(r => setTimeout(r, 1500));
    
    // Execute the actual intervention: Set district filter and fly to location
    setDistrict(activeNode);
    
    // Add success confirmation
    setAiInsights(prev => [...prev, {
      insightText: `✅ NODES SYNCHRONIZED: ${activeNode.toUpperCase()} sector is now under active surveillance. District filter applied, map view adjusted.`,
      activeNode: activeNode,
      timestamp: Date.now(),
      severity: 'POSITIVE'
    }]);
    
    // Play success sound
    playSuccessChime();
    
    // Add tactical analysis after intervention
    setTimeout(() => {
      const key = normalizeGeographicKey(activeNode);
      const distData = districtMetricsMap.get(key);
      const vol = distData ? distData.screened : 0;
      const breaches = distData ? distData.breaches : 0;
      
      setAiInsights(prev => [...prev, {
        insightText: `📊 TACTICAL ANALYSIS: ${activeNode.toUpperCase()} sector contains ${vol} patients with ${breaches} SLA breaches detected. Review Geography Matrix for detailed metrics.`,
        activeNode: activeNode,
        timestamp: Date.now(),
        severity: 'INFO'
      }]);
      playDataSync();
    }, 2500);
    
    setIsIntervening(false);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] text-slate-300 font-mono overflow-hidden uppercase">
      {/* ───────────────────────────────────────────────────────── */}
      {/* PREMIUM TOP HEADER - Award Winning Aesthetic */}
      {/* ───────────────────────────────────────────────────────── */}
      <header className="h-[52px] bg-gradient-to-r from-[#0a0a0a] via-[#111111] to-[#0a0a0a] flex items-center justify-between border-b border-white/5 px-4 shrink-0 relative z-50 backdrop-blur-2xl">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        {/* Animated top line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        

        {/* Premium Vertex-Style State/District Filters */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden xl:flex items-center gap-4 bg-gradient-to-r from-[#111]/90 via-[#0f0f0f]/95 to-[#111]/90 backdrop-blur-2xl border border-white/10 px-5 py-2.5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)]">
          {/* State Filter */}
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-bold tracking-[0.2em] text-[#888] uppercase">State</span>
            <div className="relative group">
              <select
                value={filter.state || ''}
                onChange={(e) => {
                  playSonarBeep();
                  setState(e.target.value || null);
                }}
                className="appearance-none bg-gradient-to-b from-[#1a1a1a] to-[#111] border border-white/10 text-white text-[10px] font-bold tracking-wider uppercase pl-3 pr-8 py-2 rounded-lg focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all cursor-pointer hover:border-white/20 min-w-[150px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                <option value="">All States</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Delhi">Delhi</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666] pointer-events-none group-hover:text-cyan-400 transition-colors" />
            </div>
          </div>
          
          <div className="w-px h-5 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          
          {/* District Filter */}
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-bold tracking-[0.2em] text-[#888] uppercase">District</span>
            <div className="relative group">
              <select
                value={filter.district || ''}
                onChange={(e) => {
                  playSonarBeep();
                  setDistrict(e.target.value || null);
                }}
                className="appearance-none bg-gradient-to-b from-[#1a1a1a] to-[#111] border border-white/10 text-white text-[10px] font-bold tracking-wider uppercase pl-3 pr-8 py-2 rounded-lg focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all cursor-pointer hover:border-white/20 min-w-[150px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                <option value="">All Districts</option>
                {topDistricts.map((d: string) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666] pointer-events-none group-hover:text-cyan-400 transition-colors" />
            </div>
          </div>
          
          {/* Clear Filters - Premium Button */}
          {(filter.state || filter.district) && (
            <button
              onClick={() => {
                playSonarBeep();
                setState(null);
                setDistrict(null);
              }}
              className="flex items-center gap-1.5 text-[9px] text-cyan-400 hover:text-white transition-all ml-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/30 border border-transparent hover:border-cyan-500/30"
            >
              <X className="w-3.5 h-3.5" />
              <span className="font-bold tracking-wider">Clear</span>
            </button>
          )}
        </div>

        {/* Premium Action Buttons */}
        <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.15em] relative">
          {/* FIT Button */}
          <button 
            onClick={onZoomToFit}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-300 group"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#888] group-hover:text-white transition-colors" />
            <span className="text-[#888] group-hover:text-white transition-colors tracking-wider">FIT</span>
          </button>
          
          {/* CASCADE Button */}
          <button 
            onClick={onShowCascade}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 group ${
              showCascade 
                ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.3)]' 
                : 'bg-gradient-to-b from-white/5 to-transparent border-white/10 hover:border-blue-500/30 text-[#888] hover:text-blue-400'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="tracking-wider">CASCADE</span>
          </button>
          
          {/* RANK Button */}
          <button 
            onClick={onShowLeaderboard}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 group ${
              showLeaderboard 
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]' 
                : 'bg-gradient-to-b from-white/5 to-transparent border-white/10 hover:border-amber-500/30 text-[#888] hover:text-amber-400'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span className="tracking-wider">RANK</span>
          </button>
          
          <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/20 to-transparent mx-1" />
          
          {/* Icon Buttons */}
          <button className="p-2.5 rounded-lg bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group">
            <Search className="w-3.5 h-3.5 text-[#888] group-hover:text-white transition-colors" />
          </button>
          <button className="p-2.5 rounded-lg bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group">
            <Settings className="w-3.5 h-3.5 text-[#888] group-hover:text-white transition-colors" />
          </button>
        </div>
      </header>

      {/* Global shimmer animation */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>

      {/* Premium Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Subtle ambient background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] via-transparent to-purple-500/[0.02] pointer-events-none" />
        
        {/* Premium Sidebar - Collapsible */}
        <AnimatePresence>
          {isSituationTabOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '280px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="border-r border-white/5 bg-gradient-to-b from-[#0a0a0a] to-[#050505] overflow-hidden shrink-0 flex flex-col relative backdrop-blur-xl"
            >
              {/* Sidebar top line accent */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
              
              {/* Sidebar header */}
              <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-gradient-to-r from-white/[0.02] to-transparent">
                <span className="text-[9px] font-bold tracking-[0.3em] text-[#666] uppercase">Situation</span>
                <button
                  onClick={() => setIsSituationTabOpen(false)}
                  className="text-[#666] hover:text-cyan-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* State Cards for PM/Admin */}
            {uniqueStates.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-bold tracking-[0.2em] text-[#888] uppercase">States</span>
                  {selectedState && (
                    <button 
                      onClick={() => {
                        setSelectedState(null);
                        setShowDistricts(false);
                        setState(null);
                      }}
                      className="text-[7px] text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>
                
                {/* State Cards */}
                <AnimatePresence mode="wait">
                  {!showDistricts ? (
                    <motion.div 
                      key="states"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-2 gap-2"
                    >
                      {uniqueStates.map((state) => {
                        const isSelected = filter.state === state;
                        const stateKey = normalizeGeographicKey(state);
                        const stateMetrics = choroplethData?.states[stateKey];
                        const metricKey = activeMetric || 'screened';
                        const count = stateMetrics ? (stateMetrics[metricKey] || 0) : (stateMetricsMap.get(stateKey)?.screened || 0);
                        
                        return (
                          <motion.button
                            key={state}
                            onClick={() => {
                              setSelectedState(state);
                              setShowDistricts(true);
                              setState(state);
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`relative p-3 rounded-lg border transition-all ${
                              isSelected 
                                ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]' 
                                : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                            }`}
                          >
                            <p className="text-[9px] font-bold text-white/90 truncate">{state}</p>
                            <p className="text-[7px] text-[#666] mt-1">{count.toLocaleString()} {metricKey}</p>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="districts"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <button 
                          onClick={() => {
                            setShowDistricts(false);
                          }}
                          className="text-[7px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                          ← Back to States
                        </button>
                        <span className="text-[8px] font-bold text-white/90">{selectedState}</span>
                      </div>
                      
                      {districtsForState.map((district) => {
                        const isSelected = filter.district === district;
                        const districtKey = normalizeGeographicKey(district);
                        const districtMetrics = choroplethData?.districts[districtKey];
                        const metricKey = activeMetric || 'screened';
                        const count = districtMetrics ? (districtMetrics[metricKey] || 0) : (districtMetricsMap.get(districtKey)?.screened || 0);
                        
                        return (
                          <motion.button
                            key={district}
                            onClick={() => setDistrict(district)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-2.5 rounded-lg border transition-all ${
                              isSelected 
                                ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                                : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                            }`}
                          >
                            <p className="text-[8px] font-bold text-white/90 truncate">{district}</p>
                            <p className="text-[6px] text-[#666] mt-0.5">{count.toLocaleString()} {metricKey}</p>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
              <KPIRibbon 
                filteredPatients={globalPatients || filteredPatients} 
                compact 
                choroplethDict={choroplethDict} 
              />
            </div>
          </motion.div>
          )}
        </AnimatePresence>
        
        {/* Situation Tab Toggle Button (when collapsed) */}
        {!isSituationTabOpen && (
          <motion.button
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onClick={() => setIsSituationTabOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-gradient-to-r from-cyan-500/20 to-transparent border-l-2 border-cyan-500/50 px-2 py-4 rounded-r-lg backdrop-blur-xl hover:bg-cyan-500/30 transition-all group"
          >
            <Compass className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
        
        {/* Premium Main Map Area */}
        <main className="flex-1 relative z-0 bg-gradient-to-br from-[#050505] to-[#0a0a0a]">
          {children}



          {/* Premium Floating Legend Control */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none z-50 flex flex-col items-center gap-3">
            <AnimatePresence>
              {isLegendOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-gradient-to-b from-[#111111]/95 to-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-xl p-4 pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(34,211,238,0.1)] origin-bottom"
                >
                  <ColorLegend className="bg-transparent border-none p-0 !shadow-none" />
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-2xl border border-white/10 hover:border-cyan-500/50 hover:text-cyan-400 rounded-xl px-6 py-2.5 transition-all duration-300 flex items-center gap-2.5 pointer-events-auto text-[10px] font-black tracking-[0.2em] uppercase shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] group"
            >
              <Layers className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> 
              {isLegendOpen ? 'Close Legend' : 'Open Legend'}
            </button>
          </div>
        </main>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* BOTTOM PANEL: PREMIUM NEURAL CONSOLE - Only shows when Geography Matrix is open */}
      {/* ───────────────────────────────────────────────────────── */}

      <AnimatePresence>
        {isGeographyMatrixOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: '340px', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-gradient-to-b from-[#0a0a0a] to-[#050505] border-t border-white/5 shrink-0 flex text-[10px] font-bold tracking-widest text-[#777] z-50 relative overflow-hidden"
          >
            {/* Panel top line accent */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        
        {/* SECTION 1: GEOGRAPHY MATRIX (LEFT - COLLAPSIBLE WITH STEERING WHEEL) */}
        <div className="relative">
          
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ 
              type: 'spring',
              stiffness: 400,
              damping: 25,
              mass: 0.8,
              velocity: 50
            }}
            className="flex-1 border-r border-white/5 flex flex-col bg-gradient-to-b from-[#080808] to-[#030303] relative overflow-hidden"
          >
          {/* Subtle dot pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle, #444 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
               
          {/* Premium Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-white/[0.02] via-transparent to-transparent z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <Globe className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-white tracking-[0.25em] font-black text-[11px] uppercase">Geography Matrix</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-500/30 text-red-400 text-[9px] font-black tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                High Yield
              </span>
            </div>
          </div>
          
          <div className="flex-1 relative flex items-center px-4">
            {/* Left Arrow */}
            <button 
              onClick={() => scrollMatrix('L')}
              className="absolute left-2 z-30 w-10 h-10 rounded-full bg-black/60 border border-white/20 backdrop-blur flex items-center justify-center text-cyan-400 hover:text-white hover:border-cyan-400 hover:bg-black/80 transition-all duration-300 shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            {/* Scrollable Container */}
            <div 
              ref={matrixRef}
              className="flex-1 h-full flex gap-3 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide px-12"
              style={{ scrollBehavior: 'smooth' }}
            >
               {topDistricts.map((dist:any, i) => {
                 const distKey = normalizeGeographicKey(dist);
                 const distData = districtMetricsMap.get(distKey);
                 const vol = distData ? distData.screened : 0;
                 
                 // Detailed metrics
                 const suspected = distData ? distData.suspected : 0;
                 const notSuspected = vol - suspected;
                 const diagnosed = distData ? distData.diagnosed : 0;
                 const treatmentInitiated = distData ? distData.initiated : 0;
                 const treated = distData ? distData.completed : 0;
                 
                 // Determine glow color based on suspected rate
                 const suspectedRate = vol > 0 ? (suspected / vol) * 100 : 0;
                 let glowColor = '6,182,212'; 
                 let textColor = 'text-cyan-400';
                 if (suspectedRate > 30) {
                   glowColor = '239,68,68';
                   textColor = 'text-red-400';
                 } else if (suspectedRate > 15) {
                   glowColor = '245,158,11';
                   textColor = 'text-amber-400';
                 }
                 const isSelected = filter.district === dist;
                 
                 return (
                  <div 
                    key={dist} 
                    onClick={() => {
                      playSonarBeep();
                      setDistrict(isSelected ? null : dist);
                    }}
                    className={`shrink-0 w-[180px] h-full snap-center snap-always relative group/tile transition-all duration-500 cursor-crosshair transform-gpu hover:scale-[1.02] ${isSelected ? 'z-30' : 'z-10'}`}
                  >
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute -inset-6 rounded-xl blur-3xl pointer-events-none"
                          style={{ backgroundColor: `rgba(${glowColor}, 0.4)` }}
                        />
                      )}
                    </AnimatePresence>

                    <div 
                      className="w-full h-full bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] backdrop-blur-2xl border-[1.5px] rounded-xl transition-all duration-500 flex flex-col overflow-hidden relative transform-gpu p-3 group-hover/tile:shadow-[0_0_40px_rgba(34,211,238,0.3)] group/card"
                      style={{
                        borderColor: isSelected ? 'rgba(255,255,255,0.9)' : `rgba(${glowColor}, 0.5)`,
                        boxShadow: isSelected 
                          ? `0 0 50px rgba(${glowColor}, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)` 
                          : `0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`
                      }}
                    >
                       {/* Animated border glow */}
                       <div 
                         className="absolute -inset-[1px] rounded-xl opacity-40 blur-[2px] transition-opacity duration-500 group-hover/card:opacity-80"
                         style={{ background: `linear-gradient(135deg, rgba(${glowColor}, 0.6) 0%, transparent 50%, rgba(${glowColor}, 0.3) 100%)` }}
                       />
                       {/* Premium glass overlay */}
                       <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
                       <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                       
                       {/* District Header */}
                       <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                         <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: `rgb(${glowColor})`, boxShadow: `0 0 10px rgba(${glowColor}, 0.8)` }} />
                           <span className={`text-[8px] font-black tracking-[0.15em] truncate uppercase ${isSelected ? 'text-white' : textColor}`}>{dist}</span>
                         </div>
                         <span className="text-[10px] font-black text-white tabular-nums">{vol.toLocaleString()}</span>
                       </div>
                       
                       {/* Premium Metrics Grid */}
                       <div className="flex-1 grid grid-cols-2 gap-2">
                         <div className="flex flex-col bg-gradient-to-br from-red-950/40 to-red-900/20 rounded-lg p-2 border border-red-500/30 backdrop-blur-sm group-hover/tile:border-red-500/50 transition-colors">
                           <span className="text-red-400 font-bold text-[7px] tracking-wider uppercase mb-1">Suspected</span>
                           <span className="text-white font-black text-[14px] tabular-nums leading-none">{suspected}</span>
                         </div>
                         <div className="flex flex-col bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 rounded-lg p-2 border border-emerald-500/30 backdrop-blur-sm group-hover/tile:border-emerald-500/50 transition-colors">
                           <span className="text-emerald-400 font-bold text-[7px] tracking-wider uppercase mb-1">Clear</span>
                           <span className="text-white font-black text-[14px] tabular-nums leading-none">{notSuspected}</span>
                         </div>
                         <div className="flex flex-col bg-gradient-to-br from-amber-950/40 to-amber-900/20 rounded-lg p-2 border border-amber-500/30 backdrop-blur-sm group-hover/tile:border-amber-500/50 transition-colors">
                           <span className="text-amber-400 font-bold text-[7px] tracking-wider uppercase mb-1">Diagnosed</span>
                           <span className="text-white font-black text-[14px] tabular-nums leading-none">{diagnosed}</span>
                         </div>
                         <div className="flex flex-col bg-gradient-to-br from-purple-950/40 to-purple-900/20 rounded-lg p-2 border border-purple-500/30 backdrop-blur-sm group-hover/tile:border-purple-500/50 transition-colors">
                           <span className="text-purple-400 font-bold text-[7px] tracking-wider uppercase mb-1">On ATT</span>
                           <span className="text-white font-black text-[14px] tabular-nums leading-none">{treatmentInitiated}</span>
                         </div>
                       </div>
                       
                       {/* Progress Bar - Suspected Rate */}
                       <div className="mt-2 space-y-1">
                         <div className="flex items-center justify-between text-[6px] uppercase tracking-wider">
                           <span className="text-[#666] font-bold">Risk Level</span>
                           <span className="font-black" style={{ color: `rgb(${glowColor})` }}>{suspectedRate.toFixed(1)}%</span>
                         </div>
                         <div className="h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${Math.min(suspectedRate, 100)}%` }}
                             transition={{ duration: 0.8, ease: "easeOut" }}
                             className="h-full rounded-full relative"
                             style={{ 
                               backgroundColor: `rgb(${glowColor})`,
                               boxShadow: `0 0 8px rgba(${glowColor}, 0.8), 0 0 20px rgba(${glowColor}, 0.4)`
                             }}
                           >
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                           </motion.div>
                         </div>
                       </div>
                       
                       {/* Premium Treated Footer */}
                       <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-950/30 to-transparent rounded-lg px-2 py-1">
                         <span className="text-[7px] text-cyan-300/70 font-bold tracking-wider uppercase">Treated</span>
                         <span className="text-[12px] font-black text-cyan-400 tabular-nums">{treated}</span>
                       </div>
                    </div>
                  </div>
                 );
               })}
            </div>
            
                {/* Right Arrow */}
                <button 
                  onClick={() => scrollMatrix('R')}
                  className="absolute right-2 z-30 w-10 h-10 rounded-full bg-black/60 border border-white/20 backdrop-blur flex items-center justify-center text-cyan-400 hover:text-white hover:border-cyan-400 hover:bg-black/80 transition-all duration-300 shrink-0"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI BRIEF - Small round floating icon that opens on press */}
      <AnimatePresence>
        {isAIBriefFloating && (
          <>
            {/* Small round icon when closed */}
            {!isAIBriefOpen && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => setIsAIBriefOpen(true)}
                className="fixed right-4 bottom-4 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)] z-50 transition-all duration-300 backdrop-blur-xl"
              >
                <Sparkles className="w-6 h-6 text-cyan-400" />
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]" />
              </motion.button>
            )}

            {/* Full panel when open */}
            {isAIBriefOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="fixed right-4 bottom-4 w-[320px] z-50 flex flex-col bg-gradient-to-b from-[#080808] to-[#030303] rounded-xl border border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.3)] overflow-hidden group/ai"
                style={{
                  transform: `translate(${aiBriefPosition.x}px, ${aiBriefPosition.y}px)`
                }}
              >
            {/* Left accent line */}
            <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-cyan-500/0 via-cyan-500/50 to-cyan-500/0" />
            
            {/* Subtle ambient glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] via-transparent to-transparent pointer-events-none" />
            
            {/* Premium Header - Draggable */}
            <div 
              className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-white/[0.02] via-transparent to-transparent relative overflow-hidden cursor-move"
              onMouseDown={handleDragStart}
            >
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-white tracking-[0.25em] font-black text-[11px] uppercase">AI Brief</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-emerald-400 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.15)] font-black text-[8px] relative z-10 backdrop-blur-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]" />
                  ACTIVE
                </div>
                <button
                  onClick={() => setIsAIBriefOpen(false)}
                  className="p-1.5 rounded-lg transition-all bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                  title="Close"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a] relative" style={{ maxHeight: '400px' }}>
              {/* Functional Telemetry Layer */}
              <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none overflow-hidden font-mono text-[6px] text-cyan-500 break-all leading-none transition-opacity group-hover:opacity-[0.07]">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="whitespace-nowrap animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
                    {Math.random().toString(16).repeat(10)}
                  </div>
                ))}
              </div>

              {/* Notification Stream - NOVA NEON */}
              <div ref={aiFeedRef} className="flex-1 overflow-y-auto custom-dark-scrollbar p-3 space-y-3 relative z-10">
                <AnimatePresence initial={false}>
                  {aiInsights.map((insight, idx) => {
                    const isCommand = insight.insightText.includes('COMMAND');
                    const severity = (insight as any).severity || 'INFO';
                    
                    // Dynamic color based on severity
                    let spectralColor = 'cyan';
                    let glowRGB = '6,182,212';
                    
                    if (severity === 'CRITICAL') {
                      spectralColor = 'red';
                      glowRGB = '239,68,68';
                    } else if (severity === 'WARNING') {
                      spectralColor = 'amber';
                      glowRGB = '245,158,11';
                    } else if (severity === 'ALERT') {
                      spectralColor = 'orange';
                      glowRGB = '249,115,22';
                    } else if (severity === 'POSITIVE') {
                      spectralColor = 'emerald';
                      glowRGB = '16,185,129';
                    } else if (isCommand) {
                      spectralColor = 'blue';
                      glowRGB = '37,99,235';
                    }
                    
                    return (
                    <motion.div 
                      key={insight.timestamp}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      onMouseEnter={() => {
                        // Subtle hover sound
                        try {
                          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                          if (!AudioContext) return;
                          const ctx = new AudioContext();
                          const osc = ctx.createOscillator();
                          const gain = ctx.createGain();
                          osc.connect(gain);
                          gain.connect(ctx.destination);
                          osc.type = 'sine';
                          osc.frequency.value = 1400;
                          gain.gain.setValueAtTime(0.01, ctx.currentTime);
                          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
                          osc.start();
                          osc.stop(ctx.currentTime + 0.05);
                        } catch(e) {}
                      }}
                      className={`border p-3 rounded-sm relative overflow-hidden group/card shadow-[0_0_25px_rgba(${glowRGB},0.15)] hover:shadow-[0_0_40px_rgba(${glowRGB},0.3)] transition-all duration-500 backdrop-blur-xl bg-white/[0.02] cursor-pointer`}
                      style={{ borderColor: `rgba(${glowRGB}, 0.3)` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                      <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgb(${glowRGB})] to-transparent opacity-50`} />
                      <div className={`absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgb(${glowRGB})] to-transparent opacity-50`} />
                      
                      <div className="flex items-center justify-between mb-2 opacity-60 text-[8px] font-black tracking-widest uppercase relative z-10">
                        <span className="flex items-center gap-1.5">
                          <div className={`w-1 h-1 rounded-full bg-[rgb(${glowRGB})] shadow-[0_0_6px_rgba(${glowRGB},1)] animate-pulse`} />
                          <Globe className="w-2.5 h-2.5" style={{ color: `rgb(${glowRGB})` }} /> 
                          <span style={{ color: `rgb(${glowRGB})` }}>{severity}</span>
                        </span>
                        <span className="text-[#666]">{new Date(insight.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <p className="text-[10px] text-[#aaa] leading-relaxed normal-case font-medium tracking-tight relative z-10 group-hover/card:text-white transition-colors">
                        {insight.insightText}
                      </p>
                      {insight.activeNode && insight.activeNode !== 'SYSTEM' && !isCommand && (
                        <div className="mt-2 text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 relative z-10" style={{ color: `rgb(${glowRGB})` }}>
                          <div className={`w-1 h-1 rounded-full shadow-[0_0_6px_rgba(${glowRGB},1)]`} style={{ backgroundColor: `rgb(${glowRGB})` }} />
                          NODE: {insight.activeNode}
                        </div>
                      )}
                    </motion.div>
                    );
                  })}
                </AnimatePresence>
                
                {aiLoading && (
                  <div className="flex items-center gap-2 p-2 opacity-50">
                    <span className="w-1 h-1 bg-cyan-500 animate-ping rounded-full" />
                    <span className="text-[9px] tracking-widest animate-pulse">SYNCING_TELEMETRY...</span>
                  </div>
                )}

                {aiInsights.length === 0 && !aiLoading && (
                  <div className="h-full flex flex-col items-center justify-center text-[#333] opacity-50 space-y-2">
                    <Cpu className="w-8 h-8 animate-pulse" />
                    <span className="text-[9px] tracking-[0.2em] font-black uppercase italic">Neural standby...</span>
                  </div>
                )}
              </div>

              {/* Tactical Action Button */}
              <div className="p-3 bg-[#0d0d0d] border-t border-[#222]">
                <button 
                  onClick={handleIntervention}
                  disabled={aiInsights.length === 0 || isIntervening || (aiInsights[aiInsights.length - 1]?.activeNode === 'SYSTEM')}
                  className={`w-full flex flex-col items-center justify-center p-3 rounded-sm font-black tracking-[0.2em] text-[9px] transition-all relative overflow-hidden uppercase
                    ${aiInsights.length > 0 && !isIntervening && aiInsights[aiInsights.length - 1]?.activeNode !== 'SYSTEM' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] cursor-pointer' 
                      : 'bg-[#1a1a1a] text-[#444] cursor-not-allowed'}
                  `}
                >
                  {isIntervening && (
                    <>
                      <motion.div 
                        animate={{ x: ['-100%', '100%'] }} 
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent skew-x-12" 
                      />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="absolute top-2 right-2 w-2 h-2 border-2 border-blue-400 border-t-transparent rounded-full"
                      />
                    </>
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {isIntervening ? (
                      <>
                        <Activity className="w-3.5 h-3.5 animate-pulse" />
                        SYNCHRONIZING NODES...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        EXECUTE INTERVENTION
                      </>
                    )}
                  </span>
                  {!isIntervening && aiInsights.length > 0 && aiInsights[aiInsights.length - 1]?.activeNode !== 'SYSTEM' && (
                    <span className="text-[7px] opacity-60 mt-0.5 tracking-[0.1em] relative z-10">
                      Target: {aiInsights[aiInsights.length - 1].activeNode}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
        </>
        )}
      </AnimatePresence>

      {/* AI BRIEF DOCKED - Only shows when not floating */}
      {!isAIBriefFloating && (
        <div className="w-[280px] flex flex-col bg-gradient-to-b from-[#080808] to-[#030303] relative group/ai overflow-hidden border-l border-white/5">
          {/* Left accent line */}
          <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-cyan-500/0 via-cyan-500/50 to-cyan-500/0" />
          
          {/* Subtle ambient glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] via-transparent to-transparent pointer-events-none" />
          
          {/* Premium Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-white/[0.02] via-transparent to-transparent relative overflow-hidden">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-white tracking-[0.25em] font-black text-[11px] uppercase">AI Brief</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-emerald-400 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.15)] font-black text-[8px] relative z-10 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]" />
                ACTIVE
              </div>
              <button
                onClick={() => setIsAIBriefFloating(true)}
                className="p-1.5 rounded-lg transition-all bg-white/5 text-[#666] hover:text-cyan-400 hover:bg-cyan-500/20"
                title="Float as menu"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a] relative">
            {/* Functional Telemetry Layer */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none overflow-hidden font-mono text-[6px] text-cyan-500 break-all leading-none transition-opacity group-hover:opacity-[0.07]">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="whitespace-nowrap animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
                  {Math.random().toString(16).repeat(10)}
                </div>
              ))}
            </div>

            {/* Notification Stream - NOVA NEON */}
            <div ref={aiFeedRef} className="flex-1 overflow-y-auto custom-dark-scrollbar p-3 space-y-3 relative z-10">
              <AnimatePresence initial={false}>
                {aiInsights.map((insight, idx) => {
                  const isCommand = insight.insightText.includes('COMMAND');
                  const severity = (insight as any).severity || 'INFO';
                  
                  // Dynamic color based on severity
                  let spectralColor = 'cyan';
                  let glowRGB = '6,182,212';
                  
                  if (severity === 'CRITICAL') {
                    spectralColor = 'red';
                    glowRGB = '239,68,68';
                  } else if (severity === 'WARNING') {
                    spectralColor = 'amber';
                    glowRGB = '245,158,11';
                  } else if (severity === 'ALERT') {
                    spectralColor = 'orange';
                    glowRGB = '249,115,22';
                  } else if (severity === 'POSITIVE') {
                    spectralColor = 'emerald';
                    glowRGB = '16,185,129';
                  } else if (isCommand) {
                    spectralColor = 'blue';
                    glowRGB = '37,99,235';
                  }
                  
                  return (
                  <motion.div 
                    key={insight.timestamp}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    onMouseEnter={() => {
                      // Subtle hover sound
                      try {
                        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                        if (!AudioContext) return;
                        const ctx = new AudioContext();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.type = 'sine';
                        osc.frequency.value = 1400;
                        gain.gain.setValueAtTime(0.01, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.05);
                      } catch(e) {}
                    }}
                    className={`border p-3 rounded-sm relative overflow-hidden group/card shadow-[0_0_25px_rgba(${glowRGB},0.15)] hover:shadow-[0_0_40px_rgba(${glowRGB},0.3)] transition-all duration-500 backdrop-blur-xl bg-white/[0.02] cursor-pointer`}
                    style={{ borderColor: `rgba(${glowRGB}, 0.3)` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                    <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgb(${glowRGB})] to-transparent opacity-50`} />
                    <div className={`absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgb(${glowRGB})] to-transparent opacity-50`} />
                    
                    <div className="flex items-center justify-between mb-2 opacity-60 text-[8px] font-black tracking-widest uppercase relative z-10">
                      <span className="flex items-center gap-1.5">
                        <div className={`w-1 h-1 rounded-full bg-[rgb(${glowRGB})] shadow-[0_0_6px_rgba(${glowRGB},1)] animate-pulse`} />
                        <Globe className="w-2.5 h-2.5" style={{ color: `rgb(${glowRGB})` }} /> 
                        <span style={{ color: `rgb(${glowRGB})` }}>{severity}</span>
                      </span>
                      <span className="text-[#666]">{new Date(insight.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <p className="text-[10px] text-[#aaa] leading-relaxed normal-case font-medium tracking-tight relative z-10 group-hover/card:text-white transition-colors">
                      {insight.insightText}
                    </p>
                    {insight.activeNode && insight.activeNode !== 'SYSTEM' && !isCommand && (
                      <div className="mt-2 text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 relative z-10" style={{ color: `rgb(${glowRGB})` }}>
                        <div className={`w-1 h-1 rounded-full shadow-[0_0_6px_rgba(${glowRGB},1)]`} style={{ backgroundColor: `rgb(${glowRGB})` }} />
                        NODE: {insight.activeNode}
                      </div>
                    )}
                  </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {aiLoading && (
                <div className="flex items-center gap-2 p-2 opacity-50">
                  <span className="w-1 h-1 bg-cyan-500 animate-ping rounded-full" />
                  <span className="text-[9px] tracking-widest animate-pulse">SYNCING_TELEMETRY...</span>
                </div>
              )}

              {aiInsights.length === 0 && !aiLoading && (
                <div className="h-full flex flex-col items-center justify-center text-[#333] opacity-50 space-y-2">
                  <Cpu className="w-8 h-8 animate-pulse" />
                  <span className="text-[9px] tracking-[0.2em] font-black uppercase italic">Neural standby...</span>
                </div>
              )}
            </div>

            {/* Tactical Action Button */}
            <div className="p-3 bg-[#0d0d0d] border-t border-[#222]">
              <button 
                onClick={handleIntervention}
                disabled={aiInsights.length === 0 || isIntervening || (aiInsights[aiInsights.length - 1]?.activeNode === 'SYSTEM')}
                className={`w-full flex flex-col items-center justify-center p-3 rounded-sm font-black tracking-[0.2em] text-[9px] transition-all relative overflow-hidden uppercase
                  ${aiInsights.length > 0 && !isIntervening && aiInsights[aiInsights.length - 1]?.activeNode !== 'SYSTEM' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] cursor-pointer' 
                    : 'bg-[#1a1a1a] text-[#444] cursor-not-allowed'}
                `}
              >
                {isIntervening && (
                  <>
                    <motion.div 
                      animate={{ x: ['-100%', '100%'] }} 
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent skew-x-12" 
                    />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="absolute top-2 right-2 w-2 h-2 border-2 border-blue-400 border-t-transparent rounded-full"
                    />
                  </>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {isIntervening ? (
                    <>
                      <Activity className="w-3.5 h-3.5 animate-pulse" />
                      SYNCHRONIZING NODES...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      EXECUTE INTERVENTION
                    </>
                  )}
                </span>
                {!isIntervening && aiInsights.length > 0 && aiInsights[aiInsights.length - 1]?.activeNode !== 'SYSTEM' && (
                  <span className="text-[7px] opacity-60 mt-0.5 tracking-[0.1em] relative z-10">
                    Target: {aiInsights[aiInsights.length - 1].activeNode}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
