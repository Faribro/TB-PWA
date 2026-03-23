'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence }  from 'framer-motion';
import { useEntityStore }           from '@/stores/useEntityStore';
import { useRouter, usePathname }   from 'next/navigation';
import { useUniversalFilter }       from '@/contexts/FilterContext';
import dynamic from 'next/dynamic';
import { SonicNavigator } from './SonicNavigator';
import { speakSonic, updateSpatialPan } from '@/utils/sonicSpeech';
import { Activity, BarChart3, Brain, Map, Search, Users, Settings, AlertTriangle, MapPin, Calendar, CheckCircle, HelpCircle, MessageCircle, Zap, Siren, X, Loader2, Globe, Layers } from 'lucide-react';
import { SonicBoom }                from './SonicBoom';
import { parseUIAction, parseUIActionsFromAnalysis, getTargetSelector } from '@/lib/uiActionParser';
import { translateSonicText, clearTranslationCache } from '@/utils/sonicTextTranslator';
import { cn } from '@/lib/utils';
import { Z_INDEX } from '@/lib/zIndex';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';

const SonicCanvas = dynamic(() => import('./SonicCanvas'), { ssr: false, loading: () => null });
const SonicDisplayTVDynamic = dynamic(() => import('./SonicDisplayTV'), { 
  ssr: false,
  loading: () => null,
});

const isProd = process.env.NODE_ENV === 'production';

// ─── SECURITY: Input sanitization utility
const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>"']/g, '') // Remove dangerous characters
    .trim()
    .slice(0, 500); // Limit length to prevent DoS
};

// ─── TYPE DEFINITIONS
interface CommandResponse {
  aiMessage: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  presentationCue?: string;
  visualInsights?: any[];
  action?: string;
  targetDistrict?: string;
  targetState?: string;
  metric?: string;
}

interface DistrictAnalysis {
  district: string;
  summary: string;
  insights: string[];
  recommendations: string[];
  riskLevel: string;
  presentationCue?: string;
}

export const SONIC_ROUTES = {
  '/dashboard':        { label: 'Dashboard',      icon: 'BarChart3', desc: 'Main overview'         },
  '/dashboard/vertex':           { label: 'Vertex',         icon: 'Brain', desc: 'Neural overview'        },
  '/dashboard/gis':              { label: 'GIS Map',        icon: 'Map', desc: 'District hotspots'      },
  '/dashboard/mande':            { label: 'M&E Hub',        icon: 'Search', desc: 'Duplicates & integrity' },
  '/dashboard/follow-up':        { label: 'Follow-up',      icon: 'Users', desc: 'Triage pipeline'        },
} as const;

const MAJOR_STATES = [
  'Maharashtra', 'Gujarat', 'Karnataka', 'Tamil Nadu', 'Tamilnadu', 'Uttar Pradesh', 
  'West Bengal', 'Rajasthan', 'Madhya Pradesh', 'Bihar', 'Andhra Pradesh',
  'Delhi', 'Kerala', 'Odisha', 'Telangana', 'Punjab', 'Haryana', 
  'Chhattisgarh', 'Jharkhand', 'Assam', 'Himachal Pradesh', 'Goa', 'Bihar', 'Tripura'
];

const ICON_MAP: Record<string, any> = {
  BarChart3, Brain, Map, Search, Users, Settings, AlertTriangle, MapPin, Calendar, CheckCircle, HelpCircle, Layers
};

export const SONIC_NAV_DIALOGUE: Record<string, string> = {
  '/dashboard':        'Taking you to Dashboard Sir! Keep an eye on those numbers! 📊',
  '/dashboard/vertex':           'Neural overview incoming Sir! Brain of the operation! 🧠',
  '/dashboard/gis':              'GIS Map time! I see some hotspots we need to check! 🗺️',
  '/dashboard/mande':            'M&E Hub! Let\'s hunt those duplicates Sir! 🔍',
  '/dashboard/follow-up':        'Follow-up Pipeline! Patients are waiting Sir! 💨',
};

const QUICK_ACTIONS = [
  { id: 'summary',  label: 'Summary',       icon: 'BarChart3' },
  { id: 'breaches', label: 'Breaches',      icon: 'AlertTriangle' },
  { id: 'district', label: 'Districts',     icon: 'MapPin' },
  { id: 'month',    label: 'This Month',    icon: 'Calendar' },
  { id: 'dupes',    label: 'Duplicates',    icon: 'Search' },
  { id: 'demo',     label: 'Display Demo',  icon: 'Layers' },
];

interface Props {
  onClose: () => void;
}

export default function SonicAssistantPanel({ onClose }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const isOnGIS  = pathname?.includes('gis') || pathname?.includes('spatial');
  const { setDistrict: setGlobalDistrict, setState: setGlobalState } = useUniversalFilter();

  const districtData    = useEntityStore((s) => s.districtData);
  const duplicateCount  = useEntityStore((s) => s.duplicateCount);
  const eligibleCount   = useEntityStore((s) => s.eligibleCount);
  const dataHealthScore = useEntityStore((s) => s.dataHealthScore);
  const workflowHistory = useEntityStore((s) => s.workflowHistory);
  const sonicLanguage   = useEntityStore((s) => s.sonicLanguage);
  const setSonicLanguage = useEntityStore((s) => s.setSonicLanguage);
  const isPausedForSonic = useEntityStore((s) => s.isPausedForSonic);
  const storeCharacterType = useEntityStore((s) => s.characterType);
  const sonicDeepScanTarget = useEntityStore((s) => s.sonicDeepScanTarget);
  const sonicDeepScanData = useEntityStore((s) => s.sonicDeepScanData);
  const setSonicDeepScanTarget = useEntityStore((s) => s.setSonicDeepScanTarget);
  const setSonicFlyTarget = useEntityStore((s) => s.setSonicFlyTarget);
  
  // Magic Lens control (only for Sonic)
  const [isMagicLensActive, setIsMagicLensActive] = useState(false);

  const [displayedText,  setDisplayedText]  = useState('');
  const [sonicMood,      setSonicMood]      = useState<'idle' | 'talk' | 'excited' | 'alert'>('idle');
  const [activeAction,   setActiveAction]   = useState<string | null>(null);
  const [isTyping,       setIsTyping]       = useState(false);
  const [gisInput,       setGisInput]       = useState('');
  const [showNavMenu,    setShowNavMenu]    = useState(false);
  const [sonicBoomTarget, setSonicBoomTarget] = useState<string | null>(null);
  const [navigating,     setNavigating]     = useState<{
    path: string; label: string; icon: string;
  } | null>(null);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const typewriterRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGreetingLangRef = useRef<string | null>(null);
  const lastEnglishTextRef = useRef<string>('');
  const avatarPosRef = useRef({ x: 0 });

  // Video Generation Hook Integration
  const { generate: generateVideo, videoUrl, progress, status: videoStatus, error: videoError, reset: resetVideo } = useVideoGeneration();

  // Initialize avatar position ref
  useEffect(() => {
    avatarPosRef.current = { x: 0 };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typewriterRef.current) {
        clearTimeout(typewriterRef.current);
        typewriterRef.current = null;
      }
    };
  }, []);

  const typeText = useCallback((text: string, mood: typeof sonicMood): Promise<void> => {
    if (!avatarPosRef.current) avatarPosRef.current = { x: 0 };
    return new Promise(async (resolve, reject) => {
      try {
        if (typewriterRef.current) clearTimeout(typewriterRef.current);
        lastEnglishTextRef.current = text;

        setSonicMood(mood);
        setIsTyping(true);
        setDisplayedText('');

        const translated = await translateSonicText(text, sonicLanguage);
        speakSonic(translated, sonicLanguage, avatarPosRef.current?.x ?? 0);

        let i = 0;
        const type = () => {
          if (i <= translated.length) {
            setDisplayedText(translated.slice(0, i));
            i++;
            const speed = 8 + Math.random() * 10;
            typewriterRef.current = setTimeout(type, speed);
          } else {
            setIsTyping(false);
            setSonicMood('idle');
            typewriterRef.current = null;
            resolve();
          }
        };

        type();
      } catch (error) {
        // Production: Graceful fallback
        
        // Fallback message for user
        setDisplayedText("Sir, I'm having trouble reaching the intelligence matrix. Please check your connection.");
        setIsTyping(false);
        setSonicMood('alert');
        reject(error);
      }
    });
  }, [sonicLanguage]);

  // Cinematic Presentation Orchestrator
  const sonicCue = useEntityStore(s => s.sonicActivePresentationCue);
  const setPausedForSonic = useEntityStore(s => s.setPausedForSonic);
  const isAnalyzing = useEntityStore(s => s.isAnalyzing);
  const setIsAnalyzing = useEntityStore(s => s.setIsAnalyzing);
  const setLastSonicCommand = useEntityStore(s => s.setLastSonicCommand);
  const setSonicActivePresentationCue = useEntityStore(s => s.setSonicActivePresentationCue);

  useEffect(() => {
    if (!sonicCue) return;

    const runPresentationCue = async () => {
      setPausedForSonic(true);
      
      const dateStr = new Date(sonicCue.timestamp).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const totalScreened = districtData?.reduce((s, d) => s + (d.screened || 0), 0) ?? 0;
      const totalBreaches = districtData?.reduce((s, d) => s + (d.breachCount || 0), 0) ?? 0;

      let msg = "";
      // If we already have text being displayed (e.g. from a district analysis), 
      // we don't want to overwrite it with "Initializing temporal evolution..."
      // unless we are specifically in temporal mode.
      const isTemporalMode = useEntityStore.getState().isTemporalMode;

      if (isTemporalMode) {
        if (sonicCue.type === 'intro') {
          msg = `Initializing temporal evolution analysis for ${dateStr}. Notice the baseline distribution of ${totalScreened.toLocaleString()} patients. I'm starting the sequence now Sir!`;
        } else if (sonicCue.type === 'midpoint') {
          msg = `Sir, we've hit the midpoint in ${dateStr}. Observe how the red columns are surfacing critical breaches—currently totaling ${totalBreaches.toLocaleString()}. This highlights our primary intervention targets.`;
        } else if (sonicCue.type === 'outro') {
          msg = `The temporal scan for the period ending in ${dateStr} is complete. We've successfully mapped the evolution across all districts. Excellent progress Sir!`;
        }
      }

      if (msg) {
        await typeText(msg, sonicCue.type === 'midpoint' ? 'alert' : 'excited');
      }
      
      // Dramatic pause before resuming
      setTimeout(() => {
        setPausedForSonic(false);
        setSonicActivePresentationCue(null);
      }, 1000);
    };

    runPresentationCue();
  }, [sonicCue, districtData, setPausedForSonic, setSonicActivePresentationCue]);

  // MODULE 2D: Magic Lens Neural Link - Deep Scan Orchestration
  useEffect(() => {
    if (!sonicDeepScanTarget || !sonicDeepScanData) return;

    const executeDeepScan = async () => {
      console.log('🤝 Sonic Deep Scan initiated for:', sonicDeepScanTarget);
      
      // Step 1: Visual - Highlight district on map
      setSonicFlyTarget({ district: sonicDeepScanTarget });
      
      // Step 2: Audio/UI - Announce scan initiation
      await typeText(`Initializing deep scan on ${sonicDeepScanTarget}... Analyzing ${sonicDeepScanData.screened} patient records Sir! 🔍`, 'excited');
      
      // Step 3: Intelligence - Fetch AI analysis
      try {
        const response = await fetch('/api/analyze-district', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            command: `Deep scan analysis for ${sonicDeepScanTarget}`,
            district: {
              district: sonicDeepScanData.district,
              screened: sonicDeepScanData.screened,
              breachCount: sonicDeepScanData.breaches,
              breachRate: sonicDeepScanData.breachRate / 100,
            },
            allDistricts: districtData 
          })
        });
        
        if (response.ok) {
          const analysis = await response.json() as DistrictAnalysis;
          
          // Step 4: Delivery - Vocalize findings
          let detailedResponse = `📍 Deep Scan Results for ${analysis.district}\n\n${analysis.summary}\n\n🔍 Key Insights:\n`;
          analysis.insights.forEach((insight: string, i: number) => {
            detailedResponse += `${i + 1}. ${insight}\n`;
          });
          
          if (analysis.recommendations.length > 0) {
            detailedResponse += `\n💡 Recommendations:\n`;
            analysis.recommendations.forEach((rec: string, i: number) => {
              detailedResponse += `${i + 1}. ${rec}\n`;
            });
          }
          
          const mood = analysis.riskLevel === 'critical' ? 'alert' : 'talk';
          await typeText(detailedResponse, mood);
        } else {
          // Fallback to basic analysis
          const breachRate = sonicDeepScanData.breachRate.toFixed(1);
          await typeText(
            `Deep Scan Complete for ${sonicDeepScanTarget}:\n\n` +
            `• Total Screened: ${sonicDeepScanData.screened.toLocaleString()}\n` +
            `• SLA Breaches: ${sonicDeepScanData.breaches.toLocaleString()}\n` +
            `• Breach Rate: ${breachRate}%\n\n` +
            `${parseFloat(breachRate) > 70 ? 'CRITICAL SECTOR Sir! Immediate intervention required! 🚨' : 'Sector status: Nominal. Continue monitoring Sir! ✅'}`,
            parseFloat(breachRate) > 70 ? 'alert' : 'talk'
          );
        }
      } catch (error) {
        if (!isProd) console.error('Deep scan error:', error);
        await typeText(`Sir, I'm having trouble reaching the intelligence matrix. Please check your connection.`, 'alert');
      }
      
      // Step 5: Cleanup
      setSonicDeepScanTarget(null);
    };

    executeDeepScan();
  }, [sonicDeepScanTarget, sonicDeepScanData, setSonicDeepScanTarget, setSonicFlyTarget, districtData]);

  // Handle language change re-translation
  useEffect(() => {
    if (lastGreetingLangRef.current === sonicLanguage) return;
    lastGreetingLangRef.current = sonicLanguage;

    if (lastEnglishTextRef.current) {
      typeText(lastEnglishTextRef.current, sonicMood).catch(() => {});
    }
  }, [sonicLanguage]);

  const navigateTo = useCallback((path: string) => {
    const route = SONIC_ROUTES[path as keyof typeof SONIC_ROUTES];
    if (!route) return;

    const dialogue = SONIC_NAV_DIALOGUE[path] ?? `Taking you to ${route.label} Sir! 🦔`;
    typeText(dialogue, 'excited').catch(() => {});

    setTimeout(() => {
      setNavigating({ path, label: route.label, icon: route.icon });
    }, 600);
  }, [typeText]);

  const handleAction = useCallback((actionId: string) => {
    setActiveAction(actionId);

    const total    = districtData?.reduce((s, d) => s + (d.screened  || 0), 0) ?? 0;
    const breaches = districtData?.reduce((s, d) => s + (d.breachCount || 0), 0) ?? 0;
    const health   = dataHealthScore ?? 100;
    const top3     = [...(districtData ?? [])]
      .sort((a, b) => (b.breachCount ?? 0) - (a.breachCount ?? 0))
      .slice(0, 3);

    let responseText = '';
    let uiAction = null;

    switch (actionId) {
      case 'summary':
        responseText = `March Summary:\n` +
          `• ${total.toLocaleString()} screened this month\n` +
          `• ${breaches.toLocaleString()} pending follow-ups\n` +
          `• Data health: ${health}%\n` +
          `• ${duplicateCount ?? 0} duplicates, ${eligibleCount ?? 0} triage-ready\n` +
          `Looking ${breaches === 0 ? 'perfect Sir!' : 'busy Sir! Gotta go fast!'}`;
        typeText(responseText, breaches > 1000 ? 'alert' : 'talk').catch(() => {});
        uiAction = parseUIAction(responseText);
        break;

      case 'breaches':
        if (top3.length === 0) {
          responseText = 'Zero breaches Sir! Clean slate!';
          typeText(responseText, 'excited').catch(() => {});
        } else {
          responseText = `Top breach districts:\n` +
            top3.map((d, i) => `${i + 1}. ${d.district} — ${d.breachCount} breaches`).join('\n') +
            `\n\nClick Districts on GIS to zoom in!`;
          typeText(responseText, 'alert').catch(() => {});
          uiAction = { type: 'highlight' as const, target: 'nav-gis', delay: 1500 };
        }
        break;

      case 'district': {
        const critical = districtData?.filter(d => (d.breachRate ?? 0) > 0.7).length ?? 0;
        const good     = districtData?.filter(d => (d.breachRate ?? 0) < 0.3).length ?? 0;
        typeText(
          `District Health Overview:\n` +
          `• Critical (>70% breach): ${critical} districts\n` +
          `• Moderate: ${(districtData?.length ?? 0) - critical - good} districts\n` +
          `• Good (<30% breach): ${good} districts\n` +
          `${critical > 5 ? `${critical} districts need urgent attention Sir!` : 'Most districts are stable!'}`,
          critical > 5 ? 'alert' : 'talk'
        ).catch(() => {});
        break;
      }

      case 'month': {
        const avg = total / Math.max(districtData?.length ?? 1, 1);
        typeText(
          `March Progress:\n` +
          `• ${total.toLocaleString()} screened across ${districtData?.length ?? 0} districts\n` +
          `• Avg ${Math.round(avg)} per district\n` +
          `• We're on day 15 of 31 — ${Math.round((15/31)*100)}% through month\n` +
          `${total > 10000 ? 'Strong month Sir! Keep it up!' : 'Good pace, push harder!'}`,
          'talk'
        ).catch(() => {});
        break;
      }

      case 'dupes':
        responseText = duplicateCount === 0
          ? 'No duplicates detected! M&E is clean Sir!'
          : `${duplicateCount} duplicate patients found!\n` +
            `→ Head to M&E Hub to resolve them.\n` +
            `This affects data accuracy Sir!`;
        typeText(responseText, duplicateCount > 5 ? 'alert' : 'excited').catch(() => {});
        if (duplicateCount > 0) {
          uiAction = { type: 'highlight' as const, target: 'nav-mande', delay: 1200 };
        }
        break;

      case 'lens':
        if (!isOnGIS) {
          typeText('Magic Lens is only available on the GIS Map Sir! Navigate there first! 🗺️', 'alert').catch(() => {});
        } else {
          // Dispatch global event to toggle lens
          window.dispatchEvent(new CustomEvent('toggle-magic-lens'));
          typeText('Magic Lens activated Sir! Hold Alt and hover over districts for instant X-Ray analysis. Click to trigger my deep scan! 🔍', 'excited').catch(() => {});
        }
        break;

      case 'triage':
        responseText = eligibleCount === 0
          ? 'No patients in triage queue right now Sir.'
          : `${eligibleCount} patients ready for bulk triage!\n` +
            `→ Open Follow-up Pipeline to process them.\n` +
            `${eligibleCount > 100 ? "That's a lot Sir! Let's go fast!" : 'Manageable queue!'}`;
        typeText(responseText, eligibleCount > 50 ? 'excited' : 'talk').catch(() => {});
        if (eligibleCount > 0) {
          uiAction = { type: 'highlight' as const, target: 'nav-followup', delay: 1200 };
        }
        break;

      case 'help':
        typeText(
          `Here's your map Sir!\n` +
          `Dashboard → Main overview\n` +
          `Vertex → Neural overview\n` +
          `GIS Map → District hotspots\n` +
          `M&E Hub → Duplicates & integrity\n` +
          `Follow-up → Triage pipeline\n` +
          `Calendar → Daily screening data\n` +
          `Tap any page below to go there Sir!`,
          'talk'
        ).catch(() => {});
        setShowNavMenu(true);
        break;
      
      case 'demo':
        // 🎬 DEMO: Show the latest-gen SonicDisplayTV
        setIsAnalyzing(true);
        typeText('Initializing Neural Display Demo... Sir! 🎬', 'excited').catch(() => {});
        setTimeout(() => {
          setIsAnalyzing(false);
        }, 3000);
        break;
    }
    
    if (uiAction) {
      setTimeout(() => {
        setSonicBoomTarget(getTargetSelector(uiAction.target));
      }, uiAction.delay || 800);
    }
  }, [districtData, duplicateCount, eligibleCount, dataHealthScore, typeText]);

  const handleGISCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim()) return;
    const store = useEntityStore.getState();
    const sanitizedCmd = sanitizeInput(cmd);
    
    setIsAnalyzing(true);
    setLastSonicCommand(sanitizedCmd);
    typeText(`Analyzing your query... 🔍`, 'excited');
    
    try {
      const cmdLower = sanitizedCmd.toLowerCase();
      
      // 0. TEMPORAL CHRONOSPHERE TRIGGER (Smart Date Range Parsing)
      const timeMatch = cmdLower.match(/(over time|history|evolution|last year|past year|last 6 months|timeline|chronological)/i);
      const rangeMatch = cmdLower.match(/(?:from|between)\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(?:to|and)\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)/i);
      
      if (timeMatch || rangeMatch) {
        let startTs = store.timeRange[0];
        let endTs = store.timeRange[1];
        let isCustomRange = false;
        
        if (rangeMatch) {
          const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const m1 = months.findIndex(m => rangeMatch[1].toLowerCase().startsWith(m));
          const m2 = months.findIndex(m => rangeMatch[2].toLowerCase().startsWith(m));
          
          if (m1 !== -1 && m2 !== -1) {
            const currentYear = new Date().getFullYear();
            // Start of the first month
            startTs = new Date(currentYear, m1, 1).getTime();
            // End of the second month
            endTs = new Date(currentYear, m2 + 1, 0, 23, 59, 59).getTime();
            
            // Handle cross-year (e.g. Nov to Feb)
            if (m2 < m1) {
              startTs = new Date(currentYear - 1, m1, 1).getTime();
            }
            
            isCustomRange = true;
          }
        }
        
        // Automatically start playback from the beginning of the range
        store.setTemporalMode(true);
        if (isCustomRange) {
          store.setTimeRange([startTs, endTs]);
          store.setCurrentPlayhead(startTs);
          
          const m1Name = rangeMatch?.[1].charAt(0).toUpperCase() + rangeMatch?.[1].slice(1).toLowerCase();
          const m2Name = rangeMatch?.[2].charAt(0).toUpperCase() + rangeMatch?.[2].slice(1).toLowerCase();
          typeText(`Understood, Sir. I have filtered the timeline strictly between ${m1Name} and ${m2Name}. Initiating automatic temporal visualization now.`, 'excited');
        } else {
          store.setCurrentPlayhead(store.timeRange[0]);
          typeText('Initializing the Chronosphere, Sir. Activating automatic playback to show our historical geospatial progress.', 'talk');
        }
        
        store.setIsPlaying(true); // Automatic playback enabled
        setIsAnalyzing(false);
        setGisInput('');
        return;
      }
      
      // 0a. ANNEXURE GENERATION COMMAND
      const annexureMatch = cmdLower.match(/generate\s+annexure\s*(1|2|one|two)/i);
      if (annexureMatch) {
        const num = annexureMatch[1].replace('one','1').replace('two','2');
        const stateMatch = MAJOR_STATES.find(s => cmdLower.includes(s.toLowerCase()));
        const districtMatch2 = districtData?.find(d => cmdLower.includes(d.district.toLowerCase()));
        typeText(`Compiling Annexure ${num} for ${stateMatch || districtMatch2?.district || 'All India'}... Querying verified Client IDs Sir! 📋`, 'excited');
        try {
          const res = await fetch('/api/actions/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              annexure: num,
              state: stateMatch || undefined,
              district: districtMatch2?.district || undefined,
            }),
          });
          if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"','') || `Annexure_${num}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            typeText(res.headers.get('X-Sonic-Message') || `Annexure ${num} compiled with verified Client IDs. Downloading now, Sir.`, 'excited');
          } else {
            const err = await res.json();
            typeText(`Annexure generation failed Sir: ${err.error}`, 'alert');
          }
        } catch {
          typeText('Annexure export failed Sir. Check network connection!', 'alert');
        }
        setIsAnalyzing(false);
        setGisInput('');
        return;
      }

      // 0b. UNIFIED AI BRAIN (Server-side Gemini with rotation)
      const res = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: cmd, 
          context: { 
            districtData, 
            lookingAt: pathname,
            activeFilters: store.activeFilters
          } 
        })
      });

      if (res.ok) {
        const { command: brainResponse } = await res.json() as { command: CommandResponse };
        
        if (brainResponse) {
          typeText(brainResponse.aiMessage, brainResponse.riskLevel === 'critical' || brainResponse.riskLevel === 'high' ? 'alert' : 'excited');
          
          // Trigger Cinematic Presentation from Brain
          if (brainResponse.presentationCue && ['intro', 'midpoint', 'outro'].includes(brainResponse.presentationCue)) {
            store.setSonicActivePresentationCue({
              type: brainResponse.presentationCue as 'intro' | 'midpoint' | 'outro',
              timestamp: Date.now(),
              insights: brainResponse.visualInsights
            });
          }

          // Handle Map Actions from Brain
          if (brainResponse.action === 'flyTo') {
            if (brainResponse.targetDistrict) {
              store.setSonicFlyTarget({ district: brainResponse.targetDistrict, metric: brainResponse.metric || 'breaches' });
              setGlobalDistrict(brainResponse.targetDistrict);
              store.setGlobalFilter({ district: brainResponse.targetDistrict });
            } else if (brainResponse.targetState) {
              store.setSonicFlyTarget({ state: brainResponse.targetState, metric: brainResponse.metric || 'breaches' });
              setGlobalState(brainResponse.targetState);
              store.setGlobalFilter({ state: brainResponse.targetState });
            }
          }

          setIsAnalyzing(false);
          setGisInput('');
          return;
        }
      }

      // 1. KNOWLEDGEABLE STATE/NATIONAL LOGIC
      const stateMatch = MAJOR_STATES.find(s => cmdLower.includes(s.toLowerCase()));
      if (stateMatch) {
         const normState = stateMatch.toLowerCase();
         // Filter districts belonging to this state
         const stateDistricts = districtData?.filter(d => 
           d.state?.toLowerCase() === normState || 
           (normState === 'tamil nadu' && d.state?.toLowerCase() === 'tamilnadu')
         );

         if (stateDistricts && stateDistricts.length > 0) {
           const stats = stateDistricts.reduce((acc, d) => ({
             screened: acc.screened + (d.screened || 0),
             diagnosed: acc.diagnosed + (d.diagnosed || 0),
             breaches: acc.breaches + (d.breachCount || 0)
           }), { screened: 0, diagnosed: 0, breaches: 0 });

           let intelligentResponse = "";
           if (cmdLower.includes('screening') || cmdLower.includes('how many') || cmdLower.includes('total')) {
             intelligentResponse = `Sir, ${stateMatch} has a total of ${stats.screened.toLocaleString()} patients screened across ${stateDistricts.length} districts! 📊 Flying the Neural Link to the state overview now! 💨`;
           } else {
             intelligentResponse = `Locked onto ${stateMatch} sector! Collective intel for ${stateDistricts.length} districts: ${stats.screened.toLocaleString()} screened, ${stats.diagnosed.toLocaleString()} diagnosed. 🗺️`;
           }
           
           typeText(intelligentResponse, 'excited');
           store.setSonicFlyTarget({ state: stateMatch, metric: 'breaches' });
           setGlobalState(stateMatch);
           store.setGlobalFilter({ state: stateMatch });
           setIsAnalyzing(false);
           setGisInput('');
           return;
         }
      }

      // 1.5 NATIONAL LOGIC
      if (cmdLower.includes('national') || cmdLower.includes('all india') || cmdLower.includes('total patients') || cmdLower.includes('full count')) {
         const totalStats = districtData?.reduce((acc, d) => ({
           screened: acc.screened + (d.screened || 0),
           diagnosed: acc.diagnosed + (d.diagnosed || 0),
           breaches: acc.breaches + (d.breachCount || 0)
         }), { screened: 0, diagnosed: 0, breaches: 0 });

         if (totalStats) {
            typeText(`Sir, nationwide we have monitored ${totalStats.screened.toLocaleString()} patients across all sectors! Total Diagnosed: ${totalStats.diagnosed.toLocaleString()}. Current SLA violations: ${totalStats.breaches.toLocaleString()}! 🇮🇳`, 'excited');
            setIsAnalyzing(false);
            setGisInput('');
            return;
         }
      }

      // 2. BASIC DISTRICT LOGIC
      const districtMatch = districtData?.find(d => 
        d.district.toLowerCase().includes(cmdLower.replace('show', '').replace('analyze', '').trim())
      );
      
      if (districtMatch) {
         store.setSonicFlyTarget({ district: districtMatch.district, metric: 'breaches' });
         setGlobalDistrict(districtMatch.district);
         store.setGlobalFilter({ district: districtMatch.district });

        const response = await fetch('/api/analyze-district', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: sanitizedCmd, district: districtMatch, allDistricts: districtData })
        });
        
        if (response.ok) {
          const analysis = await response.json() as DistrictAnalysis;
          let detailedResponse = `📍 ${analysis.district}\n\n${analysis.summary}\n\n🔍 Key Insights:\n`;
          analysis.insights.forEach((insight: string, i: number) => { detailedResponse += `${i + 1}. ${insight}\n`; });
          if (analysis.recommendations.length > 0) {
            detailedResponse += `\n💡 Recommendations:\n`;
            analysis.recommendations.forEach((rec: string, i: number) => { detailedResponse += `${i + 1}. ${rec}\n`; });
          }
          const mood = analysis.riskLevel === 'critical' ? 'alert' : 'talk';
          typeText(detailedResponse, mood);
          
          if (analysis.presentationCue && ['intro', 'midpoint', 'outro'].includes(analysis.presentationCue)) {
            store.setSonicActivePresentationCue({
              type: analysis.presentationCue as 'intro' | 'midpoint' | 'outro',
              timestamp: Date.now()
            });
          }

          const uiAction = parseUIActionsFromAnalysis(analysis);
          if (uiAction) {
            setTimeout(() => { setSonicBoomTarget(getTargetSelector(uiAction.target)); }, uiAction.delay || 1200);
          }
        } else {
          handleBasicGISCommand(cmd, cmdLower, districtMatch);
        }
      } else {
        handleBasicGISCommand(cmd, cmdLower);
      }
    } catch (error) {
      if (!isProd) console.error('GIS Command Error:', error);
      typeText('Sir, I\'m having trouble reaching the intelligence matrix. Please check your connection.', 'alert');
      handleBasicGISCommand(cmd, cmd.toLowerCase());
    } finally {
      setIsAnalyzing(false);
      setGisInput('');
    }
  }, [districtData, typeText, sonicLanguage, setIsAnalyzing, setLastSonicCommand, setGlobalDistrict, setGlobalState]);
  
  const handleBasicGISCommand = useCallback((cmd: string, cmdLower: string, district?: any) => {
    const store = useEntityStore.getState();
    try {
      // SMART COMMAND: Hotspots / Clusters
      if (cmdLower.includes('hotspot') || cmdLower.includes('cluster') || cmdLower.includes('high breach') || cmdLower.includes('warning')) {
        const hotspots = districtData?.filter(d => (d.breachRate ?? 0) > 0.6)
          .sort((a, b) => (b.breachCount ?? 0) - (a.breachCount ?? 0))
          .slice(0, 3);
        
        if (hotspots && hotspots.length > 0) {
          const names = hotspots.map(h => h.district).join(', ');
          typeText(`I've identified ${hotspots.length} major hotspots Sir: ${names}. Switching to breach view! ⚠️`, 'alert');
          store.setActiveGISMetric('breaches');
          store.setSonicFlyTarget({ district: hotspots[0].district, metric: 'breaches' });
          setGlobalDistrict(hotspots[0].district);
          store.setGlobalFilter({ district: hotspots[0].district });
        } else {
          typeText("No critical hotspots detected Sir! All systems are within expected variance. ✨", 'excited');
        }
      } 
      // SMART COMMAND: Best performing
      else if (cmdLower.includes('best') || cmdLower.includes('top performance') || cmdLower.includes('lowest breach') || cmdLower.includes('clean')) {
        const best = districtData?.filter(d => (d.screened ?? 0) > 50)
          .sort((a, b) => (a.breachRate ?? 0) - (b.breachRate ?? 0))[0];
        
        if (best) {
          typeText(`Top performer is ${best.district} with only ${Math.round((best.breachRate ?? 0) * 100)}% breach rate. Excellent data integrity! 🏆`, 'excited');
          store.setSonicFlyTarget({ district: best.district, metric: 'breaches' });
          setGlobalDistrict(best.district);
          store.setGlobalFilter({ district: best.district });
        }
      }
      // SMART COMMAND: Zoom out / Reset
      else if (cmdLower.includes('zoom out') || cmdLower.includes('show all') || cmdLower.includes('overview') || cmdLower.includes('reset')) {
        store.setSonicFlyTarget(null);
        store.setActiveGISMetric('breaches');
        setGlobalDistrict(null);
        setGlobalState(null);
        store.setGlobalFilter({ district: null, state: null });
        typeText('Map reset! Visualizing the complete sector Sir! 🗺️', 'talk');
      }
      // Existing: worst
      else if (cmdLower.includes('worst')) {
        const worst = districtData?.reduce((max, d) => ((d.breachCount ?? 0) > (max?.breachCount ?? 0)) ? d : max, districtData?.[0]);
        if (worst) {
          store.setSonicFlyTarget({ district: worst.district, metric: 'breaches' });
          setGlobalDistrict(worst.district);
          store.setGlobalFilter({ district: worst.district });
          typeText(`Directing Neural Link to worst district: ${worst.district} (${worst.breachCount} breaches). Urgent attention required Sir! 🛑`, 'alert');
        }
      } else if (cmdLower.includes('breach')) {
        store.setActiveGISMetric('breaches');
        typeText('Switching to breach view Sir! Red means high SLA violations. 🚨', 'excited');
        setIsAnalyzing(false);
      } else if (cmdLower.includes('screen')) {
        store.setActiveGISMetric('screened');
        typeText('Showing screening data overview! 📊', 'talk');
        setTimeout(() => setIsAnalyzing(false), 2000);
      } else if (cmdLower.includes('leaderboard') || cmdLower.includes('rank')) {
        store.setShowGISLeaderboard(true);
        typeText('Opening tactical leaderboard! Let\'s see the performance ranking Sir! 🏆', 'excited');
        setIsAnalyzing(false);
      } else if (cmdLower.includes('cascade') || cmdLower.includes('funnel')) {
        store.setShowGISCascade(true);
        typeText('Initiating Cascade Funnel Analysis! 📈', 'talk');
        setIsAnalyzing(false);
      } else if (district) {
        store.setSonicFlyTarget({ district: district.district, metric: 'breaches' });
        setGlobalDistrict(district.district);
        store.setGlobalFilter({ district: district.district });
        const breachRate = ((district.breachCount ?? 0) / (district.screened ?? 1) * 100).toFixed(0);
        typeText(`Tactical Lock on ${district.district}: ${district.screened} screened, ${district.breachCount} breaches (${breachRate}%). ${Number(breachRate) > 70 ? 'This sector is CRITICAL Sir!' : 'Sector status: Nominal.'}`, Number(breachRate) > 70 ? 'alert' : 'talk');
        setIsAnalyzing(false);
      }
    } catch (error) {
      if (!isProd) console.error('GIS Processing Error:', error);
      typeText("Sir, I'm having trouble reaching the intelligence matrix. Please check your connection.", "alert");
    } finally {
      setIsAnalyzing(false);
    }
  }, [districtData, duplicateCount, eligibleCount, dataHealthScore, typeText, pathname, setGlobalDistrict, setGlobalState]);



  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 30 }}
      animate={{ scale: 1,   opacity: 1, y: 0  }}
      exit={{    scale: 0.9, opacity: 0, y: 30 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="fixed bottom-24 right-12 flex items-end gap-6 font-outfit"
      style={{ zIndex: Z_INDEX.sonic }}
      onPointerDownCapture={(e) => e.stopPropagation()}
    >
      {/* BORDERLESS HOLOGRAM AVATAR — drag is isolated to this child only */}
      <motion.div
        drag
        dragElastic={0.15}
        dragConstraints={{ left: -600, right: 200, top: -400, bottom: 100 }}
        onDrag={(_, info) => {
          if (avatarPosRef.current) {
            avatarPosRef.current.x += info.delta.x;
            updateSpatialPan(avatarPosRef.current.x);
          }
        }}
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="flex-shrink-0 relative group cursor-grab active:cursor-grabbing"
        style={{ width: 200, height: 280, pointerEvents: 'auto' }}
      >
        <div className="absolute inset-0 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-cyan-400/10 blur-[120px] rounded-full pointer-events-none" />
        <SonicCanvas
          characterType={storeCharacterType}
          isPausedForSonic={isPausedForSonic}
          sonicMood={sonicMood}
        />
        <AnimatePresence>
          {sonicMood !== 'idle' && (
            <motion.div initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0, y: 10 }} className="absolute -top-4 left-1/2 -translate-x-1/2">
               <div className="bg-white/90 backdrop-blur shadow-xl rounded-full p-2 border border-blue-100">
                  {sonicMood === 'talk'    && <MessageCircle className="w-5 h-5 text-blue-500" />}
                  {sonicMood === 'excited' && <Zap className="w-5 h-5 text-amber-500 animate-pulse" />}
                  {sonicMood === 'alert'   && <Siren className="w-5 h-5 text-rose-500 animate-bounce" />}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-4 py-1 rounded-full shadow-2xl tracking-[0.2em] transition-all group-hover:px-6">SONIC.AI</div>
      </motion.div>

      <motion.div 
        initial={{ x: 40, opacity: 0 }} 
        animate={{ x: 0, opacity: 1 }} 
        className="glass-light rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,0.1)] overflow-hidden border border-white relative flex flex-col max-h-[85vh]" 
        style={{ width: 400 }}
      >
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-500/[0.03] to-transparent pointer-events-none" />
        <div className="px-8 pt-8 pb-4 flex items-center justify-between relative z-10 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">SonicX</h2>
            <div className="flex items-center gap-2 mt-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Neural Link</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowLanguageMenu(!showLanguageMenu)} 
                aria-label="Select language"
                aria-expanded={showLanguageMenu}
                className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-900 transition-all active:scale-90"
              >
                <Globe className="w-5 h-5" />
              </button>
              <AnimatePresence>
                {showLanguageMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-slate-100 p-4 w-48 pointer-events-auto"
                    style={{ 
                      top: 'calc(15vh + 80px)',
                      right: 'calc(12px + 40px)',
                      zIndex: Z_INDEX.popover,
                    }}
                  >
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-3">Select Language</p>
                    <div className="max-h-[260px] overflow-y-auto no-scrollbar space-y-1">
                      {([
                        { code: 'en', label: 'English' },
                        { code: 'hi', label: 'हिंदी' },
                        { code: 'mr', label: 'मराठी' },
                        { code: 'ta', label: 'தமிழ்' },
                        { code: 'te', label: 'తెలుగు' },
                        { code: 'kn', label: 'ಕನ್ನಡ' },
                        { code: 'gu', label: 'ગુજરાતી' },
                        { code: 'bn', label: 'বাংলা' },
                        { code: 'pa', label: 'ਪੰਜਾਬੀ' },
                        { code: 'ml', label: 'മലയാളം' },
                        { code: 'ur', label: 'اردو' },
                      ] as const).map(({ code, label }) => (
                        <button
                          key={code}
                          onClick={() => {
                            console.log(`🌐 Switching to ${code} - ${label}`);
                            clearTranslationCache();
                            setSonicLanguage(code);
                            setShowLanguageMenu(false);
                          }}
                           className={cn(
                             'w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold transition-all pointer-events-auto',
                             sonicLanguage === code
                               ? 'bg-slate-900 text-white shadow-lg'
                               : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                           )}
                        >
                           {label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button 
              onPointerDownCapture={(e) => { e.stopPropagation(); e.preventDefault(); onClose(); }}
              aria-label="Close Sonic assistant"
              className="relative z-[99999] w-10 h-10 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center text-slate-500 transition-all active:scale-90 pointer-events-auto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-8 py-4 relative group flex-shrink-0">
          {/* 3D CINEMATIC ENVIRONMENT */}
          <div 
            className="relative w-full h-[260px] flex items-center justify-center" 
            style={{ perspective: '1000px' }}
          >
            {/* AMBIENT GLOW (Ambilight effect) */}
            <div className="absolute inset-4 bg-cyan-500/20 blur-2xl animate-pulse rounded-full z-0" />
            
            {/* DISPLAY SCREEN */}
            <motion.div 
              initial={{ rotateY: -20, rotateX: 5, scale: 0.9 }}
              animate={{ rotateY: -12, rotateX: 4, scale: 0.95 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="relative w-full h-full rounded-[20px] border border-slate-700/50 shadow-2xl bg-black overflow-hidden z-10 group"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* LED DISPLAY FRONT */}
              <div className="w-full h-full flex items-center justify-center">
                <SonicDisplayTVDynamic 
                  isEmbedded={true} 
                  videoUrl={videoUrl} 
                  progress={progress} 
                  text={displayedText} 
                  isTyping={isTyping} 
                />
              </div>
              
              {/* SCREEN GLARE (Glossy reflection) */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none z-50 mix-blend-overlay opacity-50 group-hover:opacity-30 transition-opacity" />
            </motion.div>
          </div>
        </div>

        <div className="px-8 pb-8 space-y-4 overflow-y-auto no-scrollbar flex-1">
           <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Core Protocols</span>
              <div className="h-px flex-1 ml-4 bg-slate-100" />
           </div>
           <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.slice(0, 6).map(action => {
                const Icon = ICON_MAP[action.icon];
                const isActive = activeAction === action.id;
                return (
                  <motion.button key={action.id} whileTap={{ scale: 0.97 }} onClick={() => handleAction(action.id)} className={cn("group h-14 rounded-[20px] px-4 flex items-center gap-3 transition-all duration-300 border", isActive ? "bg-slate-900 text-white border-slate-900 shadow-xl" : "bg-white border-slate-100 text-slate-500 hover:border-blue-200 hover:text-blue-600 hover:shadow-lg")}>
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-colors", isActive ? "bg-white/20" : "bg-slate-50 group-hover:bg-blue-50")}><Icon className="w-4 h-4" /></div>
                    <span className="text-[11px] font-black uppercase tracking-tight">{action.label}</span>
                  </motion.button>
                );
              })}
           </div>
           <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                    {isOnGIS ? <Map className="w-4 h-4 text-blue-600" /> : <Brain className="w-4 h-4 text-blue-600" />}
                 </div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {isOnGIS ? 'Geospatial Command' : 'Neural Intelligence'}
                 </span>
              </div>
              <div className="relative">
                <input 
                  value={gisInput} 
                  onChange={e => setGisInput(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter' && !isAnalyzing && videoStatus !== 'generating' && videoStatus !== 'starting') handleGISCommand(gisInput); }} 
                  placeholder={isOnGIS ? "Ask about hotspots or districts..." : "Query neural database..."} 
                  disabled={isAnalyzing || videoStatus === 'generating' || videoStatus === 'starting'}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all pr-14 disabled:opacity-50" 
                />
                <button
                  onClick={() => {
                    const videoKeywords = ['generate video', 'create video', 'make video', 'video of', 'show me a video', 'veo'];
                    const isVideoRequest = videoKeywords.some(kw => gisInput.toLowerCase().includes(kw));
                    
                    if (isVideoRequest) {
                      let cleanPrompt = gisInput;
                      videoKeywords.forEach(kw => {
                        cleanPrompt = cleanPrompt.toLowerCase().replace(kw, '').trim();
                      });
                      if (cleanPrompt) {
                        typeText(`Initiating Veo 2 video generation for: "${cleanPrompt}"... Sir! 🎬`, 'excited');
                        generateVideo(cleanPrompt);
                        setGisInput('');
                      }
                    } else {
                      handleGISCommand(gisInput);
                    }
                  }} 
                  disabled={isAnalyzing || !gisInput.trim() || videoStatus === 'generating' || videoStatus === 'starting'} 
                  aria-label="Send command to Sonic"
                  className="absolute right-1.5 top-1.5 w-9 h-9 bg-slate-900 text-white rounded-[14px] flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
                >
                  {isAnalyzing || videoStatus === 'generating' || videoStatus === 'starting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                </button>
              </div>
           </div>
        </div>

        <AnimatePresence>
            {showNavMenu && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute inset-0 bg-white/95 backdrop-blur-xl p-10 overflow-y-auto no-scrollbar" style={{ zIndex: Z_INDEX.modal }}>
                   <div className="flex items-center justify-between mb-8">
                     <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Navigation Hub</h3>
                     <button 
                       onClick={() => setShowNavMenu(false)} 
                       aria-label="Close navigation menu"
                       className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center"
                     >
                       <X className="w-5 h-5 text-slate-500" />
                     </button>
                   </div>
                   <div className="grid grid-cols-1 gap-4">
                      {Object.entries(SONIC_ROUTES).map(([path, route]) => {
                         const Icon = ICON_MAP[route.icon];
                         return (
                            <button key={path} onClick={() => { navigateTo(path); setShowNavMenu(false); }} className="w-full h-20 bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-200 hover:shadow-2xl rounded-[24px] px-6 flex items-center gap-5 transition-all group">
                               <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 group-hover:border-blue-100 flex items-center justify-center shadow-sm"><Icon className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" /></div>
                               <div className="text-left"><div className="text-sm font-black text-slate-900 uppercase tracking-tight">{route.label}</div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{route.desc}</div></div>
                            </button>
                         );
                      })}
                   </div>
                </motion.div>
            )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {sonicBoomTarget && <SonicBoom targetSelector={sonicBoomTarget} onComplete={() => setSonicBoomTarget(null)} />}
        {navigating && <SonicNavigator targetPath={navigating.path} targetLabel={navigating.label} targetIcon={navigating.icon} onComplete={() => { setNavigating(null); onClose(); }} />}
      </AnimatePresence>
    </motion.div>
  );
}
