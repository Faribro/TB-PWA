// Vertex Dashboard - Neural Timeline Calendar with Redis-backed aggregates
// Last updated: 2025-01-23 - Hydration fixes applied
'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BentoTilt } from '@/components/BentoTilt';
import { AnimatedTitle } from '@/components/AnimatedTitle';
import { SmokeCard } from '@/components/SmokeCard';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  X,
  Users,
  Activity,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Building2,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Upload,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { sounds } from '@/lib/sound';
import { FollowUpPipeline } from '@/components/FollowUpPipeline';
import { PatientDetailDrawer } from '@/components/PatientDetailDrawer';
import { VertexChart } from '@/components/VertexChart';
import { ScreeningFrequencyChart } from '@/components/ScreeningFrequencyChart';
import { ScreeningFrequencyTimeline } from '@/components/ScreeningFrequencyTimeline';
import { useSWRConfig } from 'swr';
import { RegisterReconciliation } from '@/components/RegisterReconciliation';
import { useReconciliationStore } from '@/stores/useReconciliationStore';
import { RegisterUploadModal } from '@/components/RegisterUploadModal';
import useSWR from 'swr';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';
import { useVertexHeatmap, useVertexMonthSummary, useVertexDaily } from '@/hooks/useVertexAggregates';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { GlassShatterOverlay } from '@/components/GlassShatterOverlay';
import { GSAPCubeLoader } from '@/components/GSAPCubeLoader';

// TypeScript Interfaces
interface MonthlyHeatmapData {
  date: string;
  screenedCount: number;
  breachCount: number;
}

interface DailySparks {
  totalScreened: number;
  pendingSputum: number;
  diagnosed: number;
  onTrack: number;
}

interface FacilityData {
  facilityName: string;
  patientCount: number;
  pendingCount: number;
}

interface DistrictData {
  districtName: string;
  facilities: FacilityData[];
  totalPatients: number;
}

interface StateData {
  stateName: string;
  districts: DistrictData[];
  totalPatients: number;
}

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Supabase Client (singleton — prevents Multiple GoTrueClient warning)
const supabase = getSupabaseBrowserClient();

// Robust fetcher for Client-side SWR hooks
const clientFetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) {
    const errorData = await r.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `HTTP error! status: ${r.status}`);
  }
  return r.json();
};

// Spring Animation Config
const springConfig = { type: 'spring' as const, stiffness: 300, damping: 30 };
const CALENDAR_DEPTH = {
  tile: "0 8px 18px rgba(15,23,42,0.08)",
  tileSelected: "0 18px 36px rgba(30,64,175,0.28)",
} as const;

// Single Source of Truth: Timezone-Safe Date Formatter
const getLocalYMD = (dateString: string | null | undefined): string | null => {
  if (!dateString) return null;
  try {
    // If already in YYYY-MM-DD format, extract it directly
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
      return dateString.split(' ')[0].split('T')[0];
    }
    // Parse date and extract local components (no UTC shift)
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
};

// Sub-Components
const CalendarHeader = ({ 
  currentDate, 
  onPrevMonth, 
  onNextMonth,
  filterState,
  filterDistrict,
  onFilterStateChange,
  onFilterDistrictChange,
  availableStates,
  availableDistricts,
  mounted
}: { 
  currentDate: Date; 
  onPrevMonth: () => void; 
  onNextMonth: () => void;
  filterState: string;
  filterDistrict: string;
  onFilterStateChange: (value: string) => void;
  onFilterDistrictChange: (value: string) => void;
  availableStates: string[];
  availableDistricts: string[];
  mounted: boolean;
}) => {
  // Memoize formatted date to prevent hydration mismatch
  const formattedMonth = useMemo(() => {
    if (!mounted) return 'Loading...';
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentDate, mounted]);

  return (
  <div className="space-y-2 mb-3 px-1">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl vertex-header-icon flex items-center justify-center shrink-0">
          <CalendarIcon className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
            {formattedMonth}
          </h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.14em] mt-0.5">Screening Activity</p>
        </div>
      </div>
      <div className="flex gap-1.5">
        <Button
          data-tour-id="neural-timeline-prev-month"
          onClick={onPrevMonth}
          variant="ghost"
          size="sm"
          className="h-9 w-9 vertex-nav-btn flex items-center justify-center rounded-xl p-0"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </Button>
        <Button
          data-tour-id="neural-timeline-next-month"
          onClick={onNextMonth}
          variant="ghost"
          size="sm"
          className="h-9 w-9 vertex-nav-btn flex items-center justify-center rounded-xl p-0"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </Button>
      </div>
    </div>
    
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Select value={filterState} onValueChange={onFilterStateChange}>
          <SelectTrigger
            data-tour-id="neural-timeline-state-filter"
            className="h-9 text-xs font-bold vertex-filter-select rounded-xl focus:ring-4 focus:ring-indigo-500/10"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-slate-400" />
              <SelectValue placeholder="State" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-white/60 shadow-2xl bg-white/80 backdrop-blur-xl">
            <SelectItem value="All" className="font-bold">All States</SelectItem>
            {availableStates.map(state => (
              <SelectItem key={state} value={state} className="font-medium">{state}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="relative flex-1">
        <Select value={filterDistrict} onValueChange={onFilterDistrictChange}>
          <SelectTrigger className="h-9 text-xs font-bold vertex-filter-select rounded-xl focus:ring-4 focus:ring-indigo-500/10">
            <div className="flex items-center gap-2">
              <Building2 className="w-3 h-3 text-slate-400" />
              <SelectValue placeholder="District" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-white/60 shadow-2xl bg-white/80 backdrop-blur-xl">
            <SelectItem value="All" className="font-bold">All Districts</SelectItem>
            {availableDistricts.map(district => (
              <SelectItem key={district} value={district} className="font-medium">{district}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
);
};

const CalendarGrid = ({ 
  heatmapData, 
  currentDate, 
  selectedDate, 
  onDateSelect,
  viewMode
}: { 
  heatmapData: MonthlyHeatmapData[];
  currentDate: Date;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  viewMode: 'volume' | 'breaches';
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = useMemo(() => {
    const day = new Date(year, month, 1).getDay();
    return day;
  }, [year, month]);
  
  const daysInMonth = useMemo(() => {
    const days = new Date(year, month + 1, 0).getDate();
    return days;
  }, [year, month]);
  
  // OPTIMIZATION 3: Convert heatmap array to Map for O(1) lookups
  const heatmapMap = useMemo(() => {
    const map = new Map<string, MonthlyHeatmapData>();
    heatmapData.forEach(d => map.set(d.date, d));
    return map;
  }, [heatmapData]);
  
  const days = useMemo(() => {
    return Array.from({ length: 42 }, (_, i) => {
      const dayNum = i - firstDay + 1;
      if (dayNum < 1 || dayNum > daysInMonth) return null;
      
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayData = heatmapMap.get(dateStr);
      
      return { dayNum, dateStr, data: dayData };
    });
  }, [firstDay, daysInMonth, year, month, heatmapMap]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-1.5" data-tour-id="neural-timeline-calendar">
      <div className="grid grid-cols-7 gap-1 mb-0.5">
        {weekDays.map(day => (
          <div key={day} className="text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.1em]">
            {day}
          </div>
        ))}
      </div>
      {/* Magnetic scroll snap container */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (!day) return <div key={idx} className="aspect-square w-full rounded-xl" style={{ minHeight: "clamp(30px, 4vh, 44px)" }} />;
          
          const isSelected = selectedDate === day.dateStr;
          const hasActivity = day.data && day.data.screenedCount > 0;
          const hasBreaches = day.data && day.data.breachCount > 0;
          const isHighVolume = day.data && day.data.screenedCount > 10;
          
          const isBreachMode = viewMode === 'breaches';
          const shouldDim = isBreachMode && !hasBreaches;
          const shouldHighlight = isBreachMode && hasBreaches;
          
          return (
            <motion.button
              key={day.dateStr}
              data-tour-id="neural-timeline-day"
              data-has-data={hasActivity ? 'true' : 'false'}
              data-selected={isSelected ? 'true' : 'false'}
              onClick={() => onDateSelect(day.dateStr)}
              whileHover={{ scale: shouldDim ? 1 : 1.02, y: 0 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "aspect-square w-full rounded-[14px] flex flex-col items-center justify-center relative group/day scroll-snap-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/80 focus-visible:ring-offset-1 z-10",
                "active:scale-[0.97]",
                isSelected ? "vertex-glass-tile-selected" : "vertex-glass-tile",
                !isSelected && shouldHighlight && "vertex-glass-tile-breach",
                !isSelected && !isBreachMode && isHighVolume && "vertex-glass-tile-high",
                shouldDim && "opacity-30 grayscale"
              )}
              style={{
                minHeight: "clamp(30px, 4vh, 44px)"
              }}
            >
              
              <div className="absolute inset-0 flex flex-col items-center justify-center relative z-20">
                <span className={cn(
                  "text-sm font-bold tracking-tight transition-colors duration-300",
                  isSelected ? "text-white" : 
                  shouldHighlight ? "text-rose-600" :
                  hasActivity ? "text-slate-900" : "text-slate-400 group-hover/day:text-indigo-600"
                )}>
                  {day.dayNum}
                </span>
                
                {hasActivity && !isBreachMode && (
                  <div className="flex gap-1 mt-1.5 opacity-90">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full shadow-sm vertex-activity-dot",
                      isSelected ? "bg-white text-white" : hasBreaches ? "bg-rose-500 text-rose-500" : "bg-indigo-500 text-indigo-500"
                    )} />
                  </div>
                )}
              </div>
              
              {hasActivity && (
                <div className={cn(
                  "absolute bottom-1.5 right-2 text-[10px] font-black tabular-nums opacity-70 z-10",
                  isSelected ? "text-white/80" : shouldHighlight ? "text-rose-700" : "text-slate-500"
                )}>
                  {isBreachMode && hasBreaches ? day.data.breachCount : day.data.screenedCount}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// Spark Metric Card with BentoTilt, SmokeCard, and Haptic Feedback
const SparkCard = ({ 
  icon: Icon, 
  label, 
  value, 
  color = 'cyan',
  trend,
  percentage,
  accent,
  stage
}: { 
  icon: any; 
  label: string; 
  value: number;
  color?: string;
  trend?: string;
  percentage?: string;
  accent?: string;
  stage?: string;
}) => {
  let borderClass = 'border-l-blue-500';
  let textClass = 'text-blue-500';

  if (accent) {
    if (accent.includes('border-l-')) {
      const parts = accent.split(',');
      const borderPart = parts[0]?.trim();
      let iconPart = parts[1]?.trim() || '';
      if (iconPart.startsWith('icon ')) {
        iconPart = iconPart.slice(5).trim();
      }
      borderClass = borderPart;
      textClass = iconPart;
    } else {
      borderClass = `border-l-${accent}`;
      textClass = `text-${accent}`;
    }
  } else {
    const colorMap: Record<string, { border: string; text: string }> = {
      cyan: { border: 'border-l-blue-500', text: 'text-blue-500' },
      amber: { border: 'border-l-amber-500', text: 'text-amber-500' },
      red: { border: 'border-l-rose-500', text: 'text-rose-500' },
      emerald: { border: 'border-l-emerald-500', text: 'text-emerald-500' }
    };
    const mapped = colorMap[color] || colorMap.cyan;
    borderClass = mapped.border;
    textClass = mapped.text;
  }

  return (
    <SmokeCard>
      <BentoTilt>
        <Card className={cn(
          "bg-white p-3 rounded-xl shadow-sm border border-slate-100/80 overflow-hidden relative border-l-4 group transition-all duration-200 hover:shadow-md hover:border-slate-200 h-full",
          borderClass
        )}>
          {/* Glassmorphism overlay on hover */}
          <div className="absolute inset-0 glass-depth-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="flex flex-col justify-between h-full relative z-10 gap-3">
            {/* Top row: Label & Icon */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {label}
              </span>
              <Icon className={cn("w-4 h-4 flex-shrink-0 transition-transform duration-500 group-hover:rotate-12", textClass)} />
            </div>

            {/* Middle row: Value & Percentage */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[22px] font-black text-slate-900 tracking-tighter leading-none group-hover:scale-[1.02] transition-transform duration-300 origin-left">
                {value.toLocaleString()}
              </span>
              {percentage && (
                <span className={cn(
                  "inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-current/10 text-current",
                  textClass
                )}>
                  {percentage}
                </span>
              )}
            </div>

            {/* Bottom row: Optional sub-label */}
            {trend && (
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-none mt-1">
                {trend}
              </p>
            )}
          </div>
        </Card>
      </BentoTilt>
    </SmokeCard>
  );
};

// Geographic Hierarchy Component
const GeographicHierarchy = ({ 
  groupedGeography, 
  onFacilityClick 
}: { 
  groupedGeography: StateData[];
  onFacilityClick: (facilityName: string, state: string, district: string) => void;
}) => {
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());

  // Sort states by patient count descending
  const sortedGeography = useMemo(() => {
    return [...groupedGeography].sort((a, b) => b.totalPatients - a.totalPatients);
  }, [groupedGeography]);

  // Auto-expand top state and its top district on mount
  useEffect(() => {
    if (sortedGeography.length > 0) {
      const topState = sortedGeography[0];
      setExpandedStates(new Set([topState.stateName]));
      
      // Find top district in top state
      if (topState.districts.length > 0) {
        const topDistrict = topState.districts.sort((a, b) => b.totalPatients - a.totalPatients)[0];
        const districtKey = `${topState.stateName}::${topDistrict.districtName}`;
        setExpandedDistricts(new Set([districtKey]));
      }
    }
  }, [sortedGeography]);

  const toggleState = useCallback((stateName: string) => {
    setExpandedStates(prev => {
      const next = new Set(prev);
      if (next.has(stateName)) {
        next.delete(stateName);
      } else {
        next.add(stateName);
      }
      return next;
    });
  }, []);

  const toggleDistrict = useCallback((districtKey: string) => {
    setExpandedDistricts(prev => {
      const next = new Set(prev);
      if (next.has(districtKey)) {
        next.delete(districtKey);
      } else {
        next.add(districtKey);
      }
      return next;
    });
  }, []);

  // Stable ID helpers for accessibility
  const statePanelId = (name: string) => `geo-state-panel-${name.replace(/\s+/g, '-').toLowerCase()}`;
  const stateHeaderId = (name: string) => `geo-state-header-${name.replace(/\s+/g, '-').toLowerCase()}`;
  const distPanelId = (key: string) => `geo-district-panel-${key.replace(/\s+/g, '-').toLowerCase()}`;
  const distHeaderId = (key: string) => `geo-district-header-${key.replace(/\s+/g, '-').toLowerCase()}`;

  // Keyboard navigation for accordion headers
  const handleStateKeyDown = useCallback((e: React.KeyboardEvent, stateName: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleState(stateName);
    }
  }, [toggleState]);

  const handleDistrictKeyDown = useCallback((e: React.KeyboardEvent, districtKey: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDistrict(districtKey);
    }
  }, [toggleDistrict]);

  return (
    <div className="space-y-4" data-tour-id="geo-case-distribution">
      {sortedGeography.map((state) => {
        const isStateExpanded = expandedStates.has(state.stateName);
        
        // Sort districts by patient count descending
        const sortedDistricts = [...state.districts].sort((a, b) => b.totalPatients - a.totalPatients);
        
        return (
          <div key={state.stateName} className="space-y-3">
            <motion.button
              id={stateHeaderId(state.stateName)}
              data-accordion-header="state"
              data-tour-id="state-drawer"
              onClick={() => toggleState(state.stateName)}
              onKeyDown={(e) => handleStateKeyDown(e, state.stateName)}
              aria-expanded={isStateExpanded}
              aria-controls={statePanelId(state.stateName)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.998 }}
              className="w-full flex items-center justify-between p-5 bg-white rounded-xl border border-slate-200/70 shadow-sm hover:shadow-md hover:border-slate-300/70 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  <MapPin className="w-5.5 h-5.5 text-blue-600" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-semibold text-slate-900 uppercase tracking-[0.1em]">{state.stateName}</span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-medium text-slate-500">{state.totalPatients} Patients</span>
                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-medium text-slate-400">{state.districts.length} Districts</span>
                  </div>
                </div>
              </div>
              <motion.div
                animate={{ rotate: isStateExpanded ? 180 : 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
                aria-hidden="true"
              >
                <ChevronDown className="w-4.5 h-4.5" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {isStateExpanded && (
                <motion.div
                  id={statePanelId(state.stateName)}
                  role="region"
                  aria-labelledby={stateHeaderId(state.stateName)}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="ml-5 space-y-3 pl-4 border-l-2 border-slate-100 relative"
                >
                  {/* Signature premium detail: animated highlight line */}
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    exit={{ scaleY: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/60 via-blue-400/40 to-transparent origin-top"
                  />
                  {sortedDistricts.map((district) => {
                    const districtKey = `${state.stateName}-${district.districtName}`;
                    const isDistrictExpanded = expandedDistricts.has(districtKey);
                    
                    return (
                      <div key={districtKey} className="space-y-2">
                        <motion.button
                          id={distHeaderId(districtKey)}
                          data-tour-id="district-drawer"
                          onClick={() => toggleDistrict(districtKey)}
                          onKeyDown={(e) => handleDistrictKeyDown(e, districtKey)}
                          aria-expanded={isDistrictExpanded}
                          aria-controls={distPanelId(districtKey)}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.998 }}
                          className="w-full flex items-center justify-between p-3.5 bg-white border border-slate-200/50 rounded-lg hover:bg-slate-50 hover:border-slate-300/60 transition-all duration-200 group/dist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-semibold text-slate-800 uppercase tracking-[0.08em]">{district.districtName}</span>
                            <span className="text-[10px] font-medium text-slate-500">{district.totalPatients}</span>
                          </div>
                          <motion.div
                            animate={{ rotate: isDistrictExpanded ? 180 : 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 group-hover/dist:bg-slate-200 group-hover/dist:text-slate-600 transition-colors"
                            aria-hidden="true"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </motion.div>
                        </motion.button>

                        <AnimatePresence>
                          {isDistrictExpanded && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              className="ml-4 space-y-2"
                            >
                              {district.facilities.map((facility) => (
                                <motion.button
                                  key={facility.facilityName}
                                  data-tour-id="facility-card"
                                  onClick={() => onFacilityClick(facility.facilityName, state.stateName, district.districtName)}
                                  whileHover={{ x: 3 }}
                                  whileTap={{ scale: 0.998 }}
                                  className="w-full flex items-center justify-between p-3 bg-white border border-slate-200/50 rounded-lg hover:bg-slate-50 hover:border-slate-300/60 transition-all duration-200 group/fac focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center group-hover/fac:bg-blue-600 group-hover/fac:text-white transition-colors duration-200">
                                      <Building2 className="w-4.5 h-4.5" />
                                    </div>
                                    <div className="text-left">
                                      <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-[0.05em] group-hover/fac:text-slate-900 transition-colors">
                                        {facility.facilityName}
                                      </span>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9px] font-medium text-slate-500">{facility.patientCount} Screened</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {facility.pendingCount > 0 && (
                                      <span className="text-[9px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                        {facility.pendingCount}
                                      </span>
                                    )}
                                    <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover/fac:text-blue-600 transition-colors" />
                                  </div>
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

// Main Component
export default function Vertex({
  externalPatients,
  externalLoading,
  summaryData,
  monthMetrics,
}: {
  externalPatients?: any[];
  externalLoading?: boolean;
  summaryData?: {
    total: number;
    pending: number;
    alertsThisMonth: number;
    screenedThisMonth: number;
    suspected: number;
    diagnosed: number;
    onTreatment: number;
  };
  monthMetrics?: {
    screened: number;
    suspected: number;
    diagnosed: number;
    attStarted: number;
    referred: number;
  };
} = {}) {


  const now = useMemo(() => new Date(), []);
  const currentMonthStart = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
    [now]
  );

  const clampToCurrentMonth = useCallback((date: Date) => {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    if (monthStart.getTime() > currentMonthStart.getTime()) {
      return currentMonthStart;
    }
    return monthStart;
  }, [currentMonthStart]);

  // Background load all patients for VertexChart and legacy fallbacks
  const { patients: swrData = [], isLoading: swrLoading } = useSWRAllPatients(null);
  const globalPatients: any[] = swrData;
  const isLoading = swrLoading;

  // Find the most recent month with screening activity
  const mostRecentDateWithData = useMemo(() => {
    if (!globalPatients?.length) return new Date();
    
    let mostRecentScreening = new Date(0); // Start with epoch
    let mostRecentFallback = new Date(0); // Start with epoch
    for (let i = 0; i < globalPatients.length; i++) {
      const p = globalPatients[i]
      if (!p) continue

      // Prefer true screening date for Neural Timeline activity.
      if (p.screening_date) {
        const d = new Date(p.screening_date)
        if (!isNaN(d.getTime()) && d > mostRecentScreening) mostRecentScreening = d
      } else if (p.submitted_on) {
        const d = new Date(p.submitted_on)
        if (!isNaN(d.getTime()) && d > mostRecentFallback) mostRecentFallback = d
      }
    }
    
    if (mostRecentScreening.getTime() !== 0) return mostRecentScreening
    if (mostRecentFallback.getTime() !== 0) return mostRecentFallback
    return new Date()
  }, [globalPatients]);

  const [currentDate, setCurrentDate] = useState(() => clampToCurrentMonth(mostRecentDateWithData));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDateChanging, setIsDateChanging] = useState(false);
  const [geographyKey, setGeographyKey] = useState(0);
  const [selectedFacility, setSelectedFacility] = useState<{ name: string; state: string; district: string } | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showAttChart, setShowAttChart] = useState(true);
  const sessionScope = useSessionScope();
  const canEdit = ['PM', 'admin', 'SPM'].includes(sessionScope?.role ?? '');
  const [filterState, setFilterState] = useState<string>('All');
  const [filterDistrict, setFilterDistrict] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'volume' | 'breaches'>('volume');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isReviewOpen } = useReconciliationStore();
  const { mutate } = useSWRConfig();
  const hasAutoJumpedRef = useRef(false);
  const currentDateRef = useRef(currentDate);
  
  // OPTIMIZATION 2: Refs for stable realtime subscription
  const selectedDateRef = useRef(selectedDate);
  const selectedFacilityRef = useRef(selectedFacility);

  // Keep refs in sync without triggering callback recreation
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);
  useEffect(() => { selectedFacilityRef.current = selectedFacility; }, [selectedFacility]);

  // Reusable filtered patients to ensure consistency across all metrics
  const filteredGlobalPatients = useMemo(() => {
    const filtered = globalPatients.filter((p: any) => {
      // Apply state filter - check multiple possible field names
      const patientState = p.screening_state || p.state;
      const patientDistrict = p.screening_district || p.district;
      
      if (filterState !== 'All' && patientState !== filterState) {
        return false;
      }
      
      // Apply district filter - check multiple possible field names
      if (filterDistrict !== 'All' && patientDistrict !== filterDistrict) {
        return false;
      }
      
      return true;
    });
    
    return filtered;
  }, [globalPatients, filterState, filterDistrict]);

  // FIX A: Clear geography on date change with transition state
  useEffect(() => {
    setIsDateChanging(true);
    setGeographyKey(prev => prev + 1);
    const timer = setTimeout(() => setIsDateChanging(false), 400);
    return () => clearTimeout(timer);
  }, [selectedDate]);

  // ── TIERED DATA ARCHITECTURE ──────────────────────────────────────────
  // Tier 1: Instant shell (already rendered above)
  // Tier 2: Fast aggregates (heatmap, month summary, daily summary via Redis)
  // Tier 3: Lazy detail data (geo-summary, patients-by-date, patients-by-facility)

  // TIER 2: Geo-summary for selected date (server-side aggregation, replaces client-side grouping)
  const { data: geoSummaryData, mutate: mutateGeoSummary } = useSWR(
    mounted && sessionScope && selectedDate ? `/api/vertex/geo-summary?date=${selectedDate}&state=${filterState === 'All' ? 'all' : filterState}&district=${filterDistrict === 'All' ? 'all' : filterDistrict}` : null,
    clientFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 5000 }
  );

  // TIER 3: Patient detail rows for selected date (scoped, minimal columns)
  const { data: patientsByDateData, mutate: mutatePatientsByDate } = useSWR(
    mounted && sessionScope && selectedDate ? `/api/vertex/patients-by-date?date=${selectedDate}&state=${filterState === 'All' ? 'all' : filterState}&district=${filterDistrict === 'All' ? 'all' : filterDistrict}` : null,
    clientFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 5000 }
  );

  // TIER 3: Patient detail rows for selected facility
  const { data: patientsByFacilityData, mutate: mutatePatientsByFacility } = useSWR(
    mounted && sessionScope && selectedFacility && selectedDate ? `/api/vertex/patients-by-date?date=${selectedDate}&facility=${encodeURIComponent(selectedFacility.name)}&state=${selectedFacility.state}&district=${selectedFacility.district}` : null,
    clientFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 5000 }
  );

  // Fetch metrics dynamically for the selected calendar month (currentDate) and active filters
  const { data: localMonthMetrics } = useSWR(
    mounted && sessionScope ? `/api/vertex/metrics?year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}&view=month&state=${filterState === 'All' ? 'all' : filterState}&district=${filterDistrict === 'All' ? 'all' : filterDistrict}` : null,
    clientFetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  // Server-provided data (preferred over client-side derivation)
  const serverGeoSummary = geoSummaryData?.geoSummary || null;
  const serverPatientsByDate = patientsByDateData?.data || null;
  const serverPatientsByFacility = patientsByFacilityData?.data || null;

  // Keep ref in sync with state
  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redis-backed aggregates (instant reads)
  const { heatmap: cachedHeatmap, mutate: mutateHeatmap } = useVertexHeatmap(
    currentDate.getFullYear(),
    filterState === 'All' ? undefined : filterState,
    filterDistrict === 'All' ? undefined : filterDistrict
  );

  const { monthSummary: cachedMonthSummary, mutate: mutateMonthSummary } = useVertexMonthSummary(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    filterState === 'All' ? undefined : filterState,
    filterDistrict === 'All' ? undefined : filterDistrict
  );

  const { dailySummary: cachedDailySummary, mutate: mutateDaily } = useVertexDaily(
    selectedDate,
    filterState === 'All' ? undefined : filterState,
    filterDistrict === 'All' ? undefined : filterDistrict
  );

  // TIER 2: Filters endpoint for available states/districts (lightweight, no full patient fetch)
  const { data: filtersData, mutate: mutateFilters } = useSWR(
    mounted && sessionScope ? '/api/vertex/filters' : null,
    clientFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 300000 } // 5min cache
  );

  const availableStates = filtersData?.availableStates || [];
  const availableDistricts = filtersData?.availableDistricts || [];

  // OPTIMIZATION 2: Stable callback for realtime updates - mutate functions from SWR are stable
  const handleRealtimeUpdate = useCallback((payload: any) => {
    const currentSelectedDate = selectedDateRef.current;
    const currentSelectedFacility = selectedFacilityRef.current;
    
    const { eventType, old: oldRecord, new: newRecord } = payload;
    const targets = new Set<string>();

    // INSERT/DELETE always affect counts and potentially filters
    if (eventType === 'INSERT' || eventType === 'DELETE') {
      targets.add('heatmap');
      targets.add('monthSummary');
      if (currentSelectedDate) targets.add('daily');
      if (currentSelectedDate) targets.add('geoSummary');
      if (currentSelectedDate) targets.add('patientsByDate');
      if (currentSelectedFacility && currentSelectedDate) targets.add('patientsByFacility');
      
      // Filters only affected if a new state/district is added or removed
      if (eventType === 'INSERT' && newRecord?.screening_state) {
        targets.add('filters');
      }
      if (eventType === 'DELETE' && oldRecord?.screening_state) {
        targets.add('filters');
      }
    }

    // UPDATE: only invalidate based on which fields changed
    if (eventType === 'UPDATE') {
      const changedFields = new Set<string>();
      if (oldRecord && newRecord) {
        Object.keys(newRecord).forEach(key => {
          if (oldRecord[key] !== newRecord[key]) {
            changedFields.add(key);
          }
        });
      }

      // Date-related changes affect heatmap, daily, patients-by-date, geo-summary
      if (changedFields.has('screening_date') || changedFields.has('submitted_on')) {
        targets.add('heatmap');
        if (currentSelectedDate) targets.add('daily');
        if (currentSelectedDate) targets.add('geoSummary');
        if (currentSelectedDate) targets.add('patientsByDate');
        if (currentSelectedFacility && currentSelectedDate) targets.add('patientsByFacility');
      }

      // Geography changes affect filters, geo-summary, patients-by-date
      if (changedFields.has('screening_state') || changedFields.has('screening_district')) {
        targets.add('filters');
        if (currentSelectedDate) targets.add('geoSummary');
        if (currentSelectedDate) targets.add('patientsByDate');
        if (currentSelectedFacility && currentSelectedDate) targets.add('patientsByFacility');
      }

      // Facility changes affect geo-summary, patients-by-date
      if (changedFields.has('facility_name')) {
        if (currentSelectedDate) targets.add('geoSummary');
        if (currentSelectedDate) targets.add('patientsByDate');
        if (currentSelectedFacility && currentSelectedDate) targets.add('patientsByFacility');
      }

      // Status/diagnosis changes affect aggregates
      if (changedFields.has('xray_result') || changedFields.has('tb_diagnosed') || 
          changedFields.has('att_start_date') || changedFields.has('referral_date')) {
        targets.add('heatmap');
        targets.add('monthSummary');
        if (currentSelectedDate) targets.add('daily');
      }
    }

    // Execute invalidations
    if (targets.has('heatmap')) mutateHeatmap();
    if (targets.has('monthSummary')) mutateMonthSummary();
    if (targets.has('daily')) mutateDaily();
    if (targets.has('geoSummary')) mutateGeoSummary();
    if (targets.has('patientsByDate')) mutatePatientsByDate();
    if (targets.has('patientsByFacility')) mutatePatientsByFacility();
    if (targets.has('filters')) mutateFilters();
  }, [mutateHeatmap, mutateMonthSummary, mutateDaily, mutateGeoSummary, mutatePatientsByDate, mutatePatientsByFacility, mutateFilters]);

  // ── SURGICAL REALTIME INVALIDATION ─────────────────────────────────────
  // Only invalidate endpoints that could be affected by the specific change
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    
    const channel = supabase
      .channel('vertex-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, handleRealtimeUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleRealtimeUpdate]);

  // Use Redis-backed heatmap (instant reads)
  const heatmapData = useMemo(() => {
    return cachedHeatmap.map(day => ({
      date: day.date,
      screenedCount: day.screenedCount,
      breachCount: day.breachCount
    }));
  }, [cachedHeatmap]);

  // Derive monthly screened counts for the timeline bar chart from the full heatmap
  // This avoids passing the 50-row patient page slice into the chart
  const yearMonthlyBreakdown = useMemo((): number[] => {
    const counts = Array(12).fill(0);
    for (const day of heatmapData) {
      if (!day.date) continue;
      const parts = day.date.split('-');
      if (parts.length < 2) continue;
      const monthIdx = parseInt(parts[1], 10) - 1; // 0-indexed
      if (monthIdx >= 0 && monthIdx < 12) {
        counts[monthIdx] += day.screenedCount;
      }
    }
    return counts;
  }, [heatmapData]);

  // FIXED: Auto-jump to latest month with data (ONE-TIME ONLY)
  useEffect(() => {
    if (!heatmapData.length) return;
    if (selectedDate) return; // Don't auto-jump if user selected a date
    if (hasAutoJumpedRef.current) return; // ✅ Prevent re-triggering after first jump

    const monthKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const currentKey = monthKey(currentDateRef.current); // ✅ Use ref instead of state

    const hasAnyInCurrentMonth = heatmapData.some(
      d => d?.date?.startsWith(currentKey) && (d?.screenedCount ?? 0) > 0
    );

    if (hasAnyInCurrentMonth) {
      hasAutoJumpedRef.current = true; // ✅ Mark as complete
      return; // Current month has data, stay here
    }

    // Find latest date with activity
    let latestDateStr: string | null = null;
    for (const d of heatmapData) {
      if ((d?.screenedCount ?? 0) <= 0) continue;
      if (!latestDateStr || d.date > latestDateStr) latestDateStr = d.date;
    }

    if (!latestDateStr) {
      hasAutoJumpedRef.current = true; // ✅ Mark as complete even if no data
      return;
    }

    const [yStr, mStr] = latestDateStr.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    if (!y || !m) {
      hasAutoJumpedRef.current = true;
      return;
    }

    const next = new Date(y, m - 1, 1);
    const nextClamped = clampToCurrentMonth(next);
    
    // Only jump if different from current month
    if (monthKey(nextClamped) !== currentKey) {
      setCurrentDate(nextClamped);
      hasAutoJumpedRef.current = true; // ✅ Mark as complete after jump
    } else {
      hasAutoJumpedRef.current = true; // ✅ Mark as complete if no jump needed
    }
  }, [heatmapData, selectedDate]); // ⚠️ REMOVED currentDate and clampToCurrentMonth from dependencies

  // Use server-provided patients for selected date when available, fall back to client-side
  const patientsForSelectedDate = useMemo(() => {
    if (serverPatientsByDate) return serverPatientsByDate;
    if (!selectedDate || !globalPatients?.length) {
      return [];
    }
    
    const result = [];
    for (let i = 0; i < globalPatients.length; i++) {
      const patient = globalPatients[i];
      if (!patient) continue;
      
      const dateValue = patient.screening_date || patient.submitted_on;
      const normalizedDate = getLocalYMD(dateValue);
      
      if (normalizedDate !== selectedDate) continue;
      
      if (filterState !== 'All' && patient.screening_state !== filterState) continue;
      if (filterDistrict !== 'All' && patient.screening_district !== filterDistrict) continue;
      
      result.push(patient);
    }
    
    return result;
  }, [serverPatientsByDate, selectedDate, globalPatients, filterState, filterDistrict]);

  // Use Redis-backed daily summary (instant reads)
  const dailySparks = useMemo((): DailySparks => {
    if (cachedDailySummary) {
      return cachedDailySummary;
    }
    // Fallback to client-side computation only if cache miss
    const totalScreened = patientsForSelectedDate.length;
    const pendingSputum = patientsForSelectedDate.filter((p: any) => !p.referral_date).length;
    const diagnosed = patientsForSelectedDate.filter((p: any) => p.tb_diagnosed === 'Y').length;
    const suspected = patientsForSelectedDate.filter((p: any) => {
      const xrayResult = (p.xray_result || '').toLowerCase();
      return xrayResult === 'suspected tb case' || xrayResult.includes('abnormal') || xrayResult.includes('suspected');
    }).length;

    return { totalScreened, pendingSputum, diagnosed, onTrack: suspected };
  }, [cachedDailySummary, patientsForSelectedDate]);

  // Task 1: Data Aggregation - Grouped Geography (use server summary when available)
  const groupedGeography = useMemo((): StateData[] => {
    if (!selectedDate) return []; // FIX A: Guard - clear on no date
    if (serverGeoSummary) return serverGeoSummary;
    
    if (!patientsForSelectedDate || !patientsForSelectedDate.length) return [];
    
    const stateMap = new Map<string, Map<string, Map<string, any[]>>>();
    const stateNameMap = new Map<string, string>();
    const districtNameMap = new Map<string, string>();

    for (let i = 0; i < patientsForSelectedDate.length; i++) {
      const patient = patientsForSelectedDate[i];
      if (!patient) continue;
      
      const originalState = patient.screening_state || 'Unknown State';
      const originalDistrict = patient.screening_district || 'Unknown District';
      const facility = patient.facility_name || 'Unknown Facility';
      
      const stateKey = originalState.trim().toLowerCase();
      const districtKey = `${stateKey}::${originalDistrict.trim().toLowerCase()}`;
      
      if (!stateNameMap.has(stateKey)) {
        stateNameMap.set(stateKey, originalState.trim());
      }
      if (!districtNameMap.has(districtKey)) {
        districtNameMap.set(districtKey, originalDistrict.trim());
      }
      
      const state = stateNameMap.get(stateKey)!;
      const district = districtNameMap.get(districtKey)!;

      let districtMap = stateMap.get(state);
      if (!districtMap) {
        districtMap = new Map();
        stateMap.set(state, districtMap);
      }

      let facilityMap = districtMap.get(district);
      if (!facilityMap) {
        facilityMap = new Map();
        districtMap.set(district, facilityMap);
      }

      let patients = facilityMap.get(facility);
      if (!patients) {
        patients = [];
        facilityMap.set(facility, patients);
      }
      patients.push(patient);
    }

    const result: StateData[] = [];
    stateMap.forEach((districtMap, stateName) => {
      const districts: DistrictData[] = [];
      let stateTotalPatients = 0;
      
      districtMap.forEach((facilityMap, districtName) => {
        const facilities: FacilityData[] = [];
        let districtTotalPatients = 0;
        
        facilityMap.forEach((patients, facilityName) => {
          const pendingCount = patients.filter((p: any) => !p.referral_date).length;
          facilities.push({
            facilityName,
            patientCount: patients.length,
            pendingCount
          });
          districtTotalPatients += patients.length;
        });

        districts.push({
          districtName,
          facilities,
          totalPatients: districtTotalPatients
        });
        stateTotalPatients += districtTotalPatients;
      });

      result.push({
        stateName,
        districts,
        totalPatients: stateTotalPatients
      });
    });

    return result;
  }, [patientsForSelectedDate, selectedDate, serverGeoSummary]); // FIX A: Add selectedDate and serverGeoSummary

  // Task 3: Filter patients for selected facility (use server data when available)
  const patientsForSelectedFacility = useMemo(() => {
    if (serverPatientsByFacility) return serverPatientsByFacility;
    if (!selectedFacility) return [];
    return patientsForSelectedDate.filter((p: any) =>
      p.facility_name === selectedFacility.name &&
      p.screening_state === selectedFacility.state &&
      p.screening_district === selectedFacility.district
    );
  }, [serverPatientsByFacility, selectedFacility, patientsForSelectedDate]);

  // Task 2: SLA Auto-Sort Engine (Triage Intelligence)
  const sortedFacilityPatients = useMemo(() => {
    if (!patientsForSelectedFacility.length) return [];

    const calculatePriority = (patient: any): number => {
      const screeningDate = patient.screening_date ? new Date(patient.screening_date) : null;
      const daysSinceScreening = screeningDate 
        ? (Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24) 
        : 0;

      // Priority 1: Critical - Awaiting Sputum > 10 days
      if (!patient.referral_date && daysSinceScreening > 10) {
        return 1;
      }

      // Priority 2: Actionable - Abnormal X-Ray or Symptoms Present
      const hasAbnormalXray = (() => {
        const xrayResult = (patient.xray_result || '').toLowerCase();
        return xrayResult === 'suspected tb case' || xrayResult.includes('abnormal') || xrayResult.includes('suspected');
      })();
      const hasSymptoms = patient.symptoms_10s === 'Yes' || patient.symptoms_10s === 'Y';
      if ((hasAbnormalXray || hasSymptoms) && !patient.tb_diagnosed) {
        return 2;
      }

      // Priority 3: On Track - Moving through pipeline
      if (patient.referral_date && !patient.tb_diagnosed) {
        return 3;
      }

      // Priority 4: Completed - Closed or ATT Initiated
      if (patient.tb_diagnosed === 'Y' || patient.tb_diagnosed === 'N' || patient.att_start_date) {
        return 4;
      }

      // Default: Standard priority
      return 3;
    };

    return [...patientsForSelectedFacility].sort((a, b) => {
      const priorityA = calculatePriority(a);
      const priorityB = calculatePriority(b);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Secondary sort: Most recent screening date first
      const dateA = a.screening_date ? new Date(a.screening_date).getTime() : 0;
      const dateB = b.screening_date ? new Date(b.screening_date).getTime() : 0;
      return dateB - dateA;
    });
  }, [patientsForSelectedFacility]);

  const handlePrevMonth = () => {
    const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(prev);
    // Prefetch adjacent month for instant navigation
    const prefetchYear = prev.getFullYear();
    const prefetchMonth = prev.getMonth() + 1;
    fetch(`/api/vertex/aggregates?type=month&year=${prefetchYear}&month=${prefetchMonth}&state=${filterState === 'All' ? 'all' : filterState}&district=${filterDistrict === 'All' ? 'all' : filterDistrict}`);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const clamped = clampToCurrentMonth(next);
    setCurrentDate(clamped);
    // Prefetch adjacent month for instant navigation
    const prefetchYear = clamped.getFullYear();
    const prefetchMonth = clamped.getMonth() + 1;
    fetch(`/api/vertex/aggregates?type=month&year=${prefetchYear}&month=${prefetchMonth}&state=${filterState === 'All' ? 'all' : filterState}&district=${filterDistrict === 'All' ? 'all' : filterDistrict}`);
  };

  const handleDateSelect = (date: string) => {
    sounds.calendarClick();
    setSelectedDate(date);
    // Prefetch daily data for instant drilldown
    fetch(`/api/vertex/aggregates?type=daily&date=${date}&state=${filterState === 'All' ? 'all' : filterState}&district=${filterDistrict === 'All' ? 'all' : filterDistrict}`);
  };

  const handleClearDate = () => {
    setSelectedDate(null);
  };

  const handleFacilityClick = (facilityName: string, state: string, district: string) => {
    setSelectedFacility({ name: facilityName, state, district });
  };

  const handleOpenPatientDrawer = (patient: any) => {
    setSelectedPatient(patient);
  };

  const handleClosePatientDrawer = () => {
    setSelectedPatient(null);
  };

  const handlePatientUpdate = () => {
    // Optimistic invalidation: mutate all affected aggregate keys
    mutateHeatmap();
    mutateMonthSummary();
    mutateDaily();
    mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
  };

  // OPTIMIZATION 4: Memoize inline metric computations
  const pendingAlertsCount = useMemo(() => {
    return filteredGlobalPatients.filter((p: any) => {
      const xrayResult = (p.xray_result || '').toLowerCase();
      const isAbnormal = xrayResult === 'suspected tb case' || xrayResult.includes('abnormal') || xrayResult.includes('suspected');
      const noTreatment = !p.att_start_date && !p.referral_date;
      return isAbnormal && noTreatment;
    }).length;
  }, [filteredGlobalPatients]);

  const thisMonthScreenedCount = useMemo(() => {
    return filteredGlobalPatients.filter((p: any) => {
      const dateValue = p.screening_date || p.submitted_on;
      if (!dateValue) return false;
      const date = new Date(dateValue);
      return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
    }).length;
  }, [filteredGlobalPatients, currentDate]);

  const formattedDate = selectedDate 
    ? new Date(selectedDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '';

  // Dynamic Calendar Sentence
  const dynamicSentence = useMemo(() => {
    if (selectedDate) {
      const dateObj = new Date(selectedDate);
      const formattedDateShort = dateObj.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const screened = dailySparks.totalScreened;
      const suspected = dailySparks.pendingSputum;
      return (
        <>
          On {formattedDateShort}, <span className="text-blue-700 font-black text-xl">{screened}</span> screenings were conducted, out of which <span className="text-blue-700 font-black text-xl">{suspected}</span> were found suspected.
        </>
      );
    } else {
      const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const monthTotal = globalPatients.filter((p: any) => {
        const dateValue = p.screening_date || p.submitted_on;
        if (!dateValue) return false;
        const date = new Date(dateValue);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length;
      return (
        <>
          In {monthYear}, a total of <span className="text-blue-700 font-black text-xl">{monthTotal}</span> screenings have been conducted.
        </>
      );
    }
  }, [selectedDate, dailySparks, globalPatients, now]);

  const totalScreened = dailySparks?.totalScreened ?? 0;
  const suspectedTB   = dailySparks?.onTrack       ?? 0;
  const tbDiagnosed   = dailySparks?.diagnosed      ?? 0;
  const pendingSputum = dailySparks?.pendingSputum  ?? 0;
  const notSuspected  = Math.max(0, totalScreened - suspectedTB);
  const notDiagnosed  = Math.max(0, totalScreened - tbDiagnosed);

  const pct = (n: number) =>
    totalScreened > 0 ? `${Math.round((n / totalScreened) * 100)}%` : "—";

  return (
    <>
      <GlassShatterOverlay />
      <div className="relative w-full font-outfit">
      {/* Premium Background Decorative Elements / Synthwave Aurora */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[rgba(167,139,250,0.15)] blur-[120px] rounded-full mix-blend-screen" style={{ animation: 'vertex-aurora 15s ease-in-out infinite alternate' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-[rgba(96,165,250,0.12)] blur-[140px] rounded-full mix-blend-screen" style={{ animation: 'vertex-aurora 20s ease-in-out infinite alternate-reverse' }} />
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-[rgba(244,114,182,0.08)] blur-[100px] rounded-full mix-blend-screen" style={{ animation: 'vertex-aurora 18s ease-in-out infinite alternate' }} />
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-12 items-start w-full gap-6 xl:gap-8 p-5 xl:p-8 mx-auto z-10 min-w-0">
        {/* Left Pane: Calendar - UNLOCKED HEIGHT */}
        <motion.div
           initial={{ opacity: 0, x: -40 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
           className="w-full lg:col-span-5 lg:sticky lg:top-2 lg:self-start min-w-0"
        >
          <div className="vertex-glass-card rounded-[24px] p-3 lg:p-4 flex flex-col relative min-h-0">

            <div className="overflow-hidden">
              <CalendarHeader 
                currentDate={currentDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                filterState={filterState}
                filterDistrict={filterDistrict}
                onFilterStateChange={setFilterState}
                onFilterDistrictChange={setFilterDistrict}
                availableStates={availableStates}
                availableDistricts={availableDistricts}
                mounted={mounted}
              />
              <div>
                {mounted && (
                  <CalendarGrid
                    heatmapData={heatmapData}
                    currentDate={currentDate}
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelect}
                    viewMode={viewMode}
                  />
                )}
              </div>
            </div>
            
            {/* Monthly Pulse Console - Dynamic Metrics - Responsive wrapping */}
            <div className="mt-3 pt-3 pb-2 px-3 vertex-pulse-console rounded-xl flex flex-wrap items-center gap-2 sm:gap-3 justify-between shrink-0 overflow-hidden">
              <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                <div className="group shrink-0">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-80 group-hover:text-indigo-500 transition-colors">Total</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg sm:text-xl lg:text-[22px] font-black text-slate-900 tracking-tighter whitespace-nowrap leading-none">
                      {(summaryData?.total ?? filteredGlobalPatients.length).toLocaleString()}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0 leading-none">Screened</span>
                  </div>
                </div>
                <div className="vertex-metric-divider" />
                <div className="group shrink-0">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-80 group-hover:text-rose-500 transition-colors">Pending</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg sm:text-xl lg:text-[22px] font-black text-rose-600 tracking-tighter whitespace-nowrap leading-none">
                      {(summaryData?.pending ?? pendingAlertsCount).toLocaleString()}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0 leading-none">Alerts</span>
                  </div>
                </div>
                <div className="vertex-metric-divider hidden sm:block" />
                <div className="group hidden sm:block shrink-0">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-80 group-hover:text-emerald-500 transition-colors">This Month</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg sm:text-xl lg:text-[22px] font-black text-emerald-600 tracking-tighter whitespace-nowrap leading-none">
                      {(summaryData?.screenedThisMonth ?? thisMonthScreenedCount).toLocaleString()}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0 leading-none">Screened</span>
                  </div>
                </div>
              </div>
              
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'volume' | 'breaches')} className="shrink-0">
                <TabsList className="grid w-[88px] grid-cols-2 h-10 bg-white/40 backdrop-blur-md p-1 border border-white/60 shadow-inner rounded-xl">
                  <TabsTrigger 
                    value="volume" 
                    className="rounded-lg h-8 data-[state=active]:vertex-tab-active data-[state=active]:text-indigo-700 transition-all duration-300 flex items-center justify-center"
                    title="Volume View"
                  >
                    <Users className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger 
                    value="breaches" 
                    className="rounded-lg h-8 data-[state=active]:vertex-tab-active data-[state=active]:text-rose-700 transition-all duration-300 flex items-center justify-center"
                    title="Alerts View"
                  >
                    <AlertCircle className="w-4 h-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </motion.div>

        {/* Right Pane: Daily Briefing - INTERNAL SCROLL */}
        <motion.div
           initial={{ opacity: 0, x: 40 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
           className="w-full lg:col-span-7 flex flex-col lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] min-w-0"
           id="right-scroll-container"
        >
          <Card className="care-cascade-card flex flex-col flex-1 min-h-0 overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-500/[0.02] to-transparent pointer-events-none" />
            <AnimatePresence mode="wait">
              {selectedDate ? (
                <motion.div
                  key={selectedDate}
                  data-tour-id="active-intelligence-feed-panel"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col flex-1 min-h-0"
                >
                  {/* Header — Premium frosted glass */}
                  <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 vertex-feed-header">
                    <div>
                      <h3 className="text-[21px] font-black text-slate-900 tracking-tight leading-none">{formattedDate}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-600/80">Daily Summary</p>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em]">{patientsForSelectedDate.length} records</p>
                      </div>
                    </div>
                    {!selectedPatient && (
                      <button
                        onClick={handleClearDate}
                        className="flex items-center justify-center rounded-lg bg-slate-100 hover:bg-rose-50 hover:border hover:border-rose-200 w-7 h-7 text-slate-400 hover:text-rose-500 transition-all duration-200"
                        title="Close Feed"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <ScrollArea className="flex-1 px-8 py-8">
                    <div className="space-y-10">
                      {/* Interactive Metrics */}
                      {cachedDailySummary === undefined ? (
                        // GSAP Cube Loader for loading metrics
                        <div className="flex items-center justify-center py-12">
                          <GSAPCubeLoader />
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Stage 1 — Screening & Triage */}
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              <span className="vertex-stage-label text-[9px] font-black uppercase tracking-[0.18em] text-blue-500">
                                Stage 1 — Screening & Triage
                              </span>
                              <div className="flex-1 h-px bg-gradient-to-r from-blue-100 to-transparent" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <SparkCard 
                                icon={Users}
                                label="Total Screened"
                                value={totalScreened}
                                accent="border-l-blue-500, icon text-blue-500"
                              />
                              <SparkCard 
                                icon={ShieldAlert}
                                label="Suspected TB"
                                value={suspectedTB}
                                accent="border-l-amber-500, icon text-amber-500"
                                percentage={pct(suspectedTB)}
                              />
                              <SparkCard 
                                icon={ShieldCheck}
                                label="Not Suspected"
                                value={notSuspected}
                                accent="border-l-slate-400, icon text-slate-400"
                                percentage={pct(notSuspected)}
                              />
                            </div>
                          </div>

                          {/* Stage 2 — Diagnosis & Sputum */}
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              <span className="vertex-stage-label text-[9px] font-black uppercase tracking-[0.18em] text-rose-400">
                                Stage 2 — Diagnosis & Sputum
                              </span>
                              <div className="flex-1 h-px bg-gradient-to-r from-rose-100 to-transparent" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <SparkCard 
                                icon={Clock}
                                label="Pending Sputum"
                                value={pendingSputum}
                                accent="border-l-emerald-500, icon text-emerald-500"
                              />
                              <SparkCard 
                                icon={Activity}
                                label="TB Diagnosed"
                                value={tbDiagnosed}
                                accent="border-l-rose-500, icon text-rose-500"
                                percentage={pct(tbDiagnosed)}
                              />
                              <SparkCard 
                                icon={Check}
                                label="Not Diagnosed"
                                value={notDiagnosed}
                                accent="border-l-zinc-400, icon text-zinc-400"
                                percentage={pct(notDiagnosed)}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Geographic Hierarchy Breakdown — Elegant Feature Block */}
                      <div className="space-y-4">
                        {(() => {
                          const topStateObj = groupedGeography[0];
                          const topState = topStateObj?.stateName || 'N/A';
                          const topDistrict = topStateObj?.districts?.[0]?.districtName || 'N/A';
                          const locationsCount = groupedGeography.reduce((sum, state) => 
                            sum + state.districts.reduce((dSum, d) => dSum + d.facilities.length, 0), 0);

                          return (
                            <div className="flex items-center justify-between gap-3 mb-3">
                              {/* LEFT: icon + title + subtitle */}
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                                  <MapPin className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-800 leading-tight">
                                    Geographic Case Distribution
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-medium">
                                    Operational drilldown by location
                                  </p>
                                </div>
                              </div>

                              {/* RIGHT: compact meta pills — wire to existing topState, topDistrict, locationsCount variables */}
                              {selectedDate && groupedGeography.length > 0 && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Top State */}
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100">
                                    <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <div>
                                      <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400 leading-none">State</p>
                                      <p className="text-[10px] font-black text-slate-800 leading-tight truncate max-w-[70px]">{topState}</p>
                                    </div>
                                  </div>

                                  {/* Top District */}
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100">
                                    <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <div>
                                      <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400 leading-none">District</p>
                                      <p className="text-[10px] font-black text-slate-800 leading-tight truncate max-w-[70px]">{topDistrict}</p>
                                    </div>
                                  </div>

                                  {/* Locations */}
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100">
                                    <Users className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <div>
                                      <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400 leading-none">Locations</p>
                                      <p className="text-[10px] font-black text-slate-800 leading-tight">{locationsCount}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <div
                          key={geographyKey}
                          className="vertex-geo-card rounded-2xl p-4 relative"
                        >
                          {isDateChanging && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] rounded-2xl z-10 flex items-center justify-center">
                              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                                <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                                Updating locations...
                              </div>
                            </div>
                          )}
                          {selectedDate ? (
                            geoSummaryData === undefined ? (
                              // GSAP Cube Loader for loading geo-summary
                              <div className="flex items-center justify-center py-12">
                                <GSAPCubeLoader />
                              </div>
                            ) : (
                              <GeographicHierarchy 
                                groupedGeography={groupedGeography}
                                onFacilityClick={handleFacilityClick}
                              />
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                              <MapPin className="w-8 h-8 text-slate-400 mb-3" />
                              <p className="text-sm text-slate-600 font-medium">
                                Select a date from the calendar to view geographic distribution
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ATT Line Chart — Elegant Collapsible Treatment */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center">
                              <Activity className="w-5.5 h-5.5 text-white" />
                            </div>
                            <div>
                              <h4 className="text-[12px] font-semibold text-slate-900 uppercase tracking-[0.15em]">
                                ATT Initiation Trend
                              </h4>
                              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mt-0.5">
                                Screened vs Treated over time
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowAttChart(!showAttChart)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                            title="Toggle chart visibility"
                          >
                            <motion.div
                              animate={{ rotate: showAttChart ? 180 : 0 }}
                              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            >
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            </motion.div>
                          </button>
                        </div>
                        <AnimatePresence>
                          {showAttChart && (
                            <motion.div
                              id="att-trend-chart"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            >
                              <VertexChart patients={globalPatients} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </ScrollArea>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col flex-1 min-h-0"
                >
                  {(() => {
                    // Apply state and district filters to ALL patients for the year (for bar chart)
                    const filteredYearPatients = filteredGlobalPatients;

                    // Apply state and district filters to month patients (for pie chart)
                    const filteredMonthPatients = filteredYearPatients.filter((p: any) => {
                      const dateValue = p.screening_date || p.submitted_on;
                      if (!dateValue) return false;
                      const date = new Date(dateValue);
                      return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
                    });

                    // Prefer server-side monthMetrics (from /api/vertex/metrics) for accuracy
                    // Fall back to client-side computation from the partial 50-row snapshot
                    const clientStats = {
                      total: filteredMonthPatients.length,
                      suspected: filteredMonthPatients.filter((p: any) => {
                        const xrayResult = (p.xray_result || '').toLowerCase();
                        return xrayResult === 'suspected tb case' || xrayResult.includes('abnormal') || xrayResult.includes('suspected');
                      }).length,
                      notSuspected: filteredMonthPatients.filter((p: any) => {
                        const xrayResult = (p.xray_result || '').toLowerCase();
                        return !(xrayResult === 'suspected tb case' || xrayResult.includes('abnormal') || xrayResult.includes('suspected'));
                      }).length,
                      diagnosed: filteredMonthPatients.filter((p: any) => p.tb_diagnosed === 'Y').length,
                      notDiagnosed: filteredMonthPatients.filter((p: any) => p.tb_diagnosed !== 'Y').length,
                      attStarted: filteredMonthPatients.filter((p: any) => p.att_start_date != null).length,
                      referralDone: filteredMonthPatients.filter((p: any) => p.referral_date != null).length,
                    };
                    const isInitialState = currentDate.getFullYear() === 2026 && 
                                           currentDate.getMonth() === 3 && 
                                           filterState === 'All' && 
                                           filterDistrict === 'All';
                    const activeMonthMetrics = localMonthMetrics || (isInitialState ? monthMetrics : null);
                    const hasValidMetrics = activeMonthMetrics && typeof activeMonthMetrics.screened === 'number';
                    const stats = hasValidMetrics ? {
                      total: activeMonthMetrics.screened,
                      suspected: activeMonthMetrics.suspected,
                      notSuspected: Math.max(0, activeMonthMetrics.screened - activeMonthMetrics.suspected),
                      diagnosed: activeMonthMetrics.diagnosed,
                      notDiagnosed: Math.max(0, activeMonthMetrics.screened - activeMonthMetrics.diagnosed),
                      attStarted: activeMonthMetrics.attStarted,
                      referralDone: activeMonthMetrics.referred,
                    } : clientStats;

                    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
                    const year = currentDate.getFullYear();

                    return (
                      <div className="flex flex-col flex-1 h-full min-h-0 justify-between">
                        {/* Premium Care Cascade Header */}
                        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-4 pb-3 border-b border-slate-100/80 shadow-sm relative z-10 bg-white rounded-t-[20px]">
                          <div>
                            <h4 className="text-lg font-bold text-slate-900 tracking-[0.06em] uppercase">CARE CASCADE</h4>
                            <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">Real-time patient journey analytics</p>
                          </div>
                          <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded-full shadow-sm">{monthName} {year}</div>
                        </div>

                        {/* Donut Zone Section - compact & fluid */}
                        <div className="px-6 pt-3 pb-1 flex-1 flex flex-col justify-center min-h-0 overflow-hidden">
                          <div className="relative cascade-donut-zone p-3 shadow-sm flex-1 flex items-center min-h-0 overflow-hidden">
                            <ScreeningFrequencyChart
                              data={[
                                { stage: "Screened", value: stats.total },
                                { stage: "Not Suspected", value: stats.notSuspected },
                                { stage: "Suspected", value: stats.suspected },
                                { stage: "Referred", value: stats.referralDone },
                                { stage: "Diagnosed", value: stats.diagnosed },
                                { stage: "ATT Started", value: stats.attStarted }
                              ]}
                            />
                          </div>
                        </div>

                        {/* Bottom section — compact for better timeline visibility */}
                        <div className="bg-slate-50/40 rounded-b-[20px] overflow-hidden flex-shrink-0">
                          {/* Premium Divider */}
                          <div className="relative mx-6 my-1">
                            <div className="h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" />
                          </div>

                          {/* Timeline Band - compact & fluid height */}
                          <div className="pt-2 px-6 pb-3 h-[130px] sm:h-[150px] lg:h-[170px] xl:h-[190px] w-full overflow-hidden">
                            <div className="w-full max-w-full min-w-0 h-full">
                              <ScreeningFrequencyTimeline
                                monthlyBreakdown={yearMonthlyBreakdown}
                                year={year}
                                currentMonth={currentDate.getMonth()}
                                isLoading={isLoading}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>

      {/* LEVEL 1: Facility Patient List — modal={false} so it does NOT trap focus or block the Detail Drawer */}
      {!!selectedFacility && (
        <div 
          className="fixed inset-0 z-[200] bg-slate-900/20 backdrop-blur-sm transition-opacity duration-500"
          onClick={() => { if (!selectedPatient) setSelectedFacility(null); }}
        />
      )}
      <Sheet open={!!selectedFacility} onOpenChange={(open) => { if (!open) setSelectedFacility(null); }} modal={false}>
        <SheetContent
          data-tour-id="patient-list-panel"
          hideOverlay
          onInteractOutside={(e) => {
            // Prevent Facility List from closing if the Detail Drawer is open
            if (selectedPatient) e.preventDefault();
          }}
          className="!w-[95vw] sm:!max-w-[1400px] md:!max-w-[1600px] lg:!max-w-[1800px] xl:!max-w-[2000px] !z-[300] bg-slate-50/70 backdrop-blur-2xl border-l border-white/60 shadow-[-10px_0_40px_rgba(0,0,0,0.08)] p-0 flex flex-col data-[state=open]:duration-700 data-[state=closed]:duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ overflow: 'hidden' }}
        >
          {/* THE PARALLAX WRAPPER - Apple-Style Push-Back */}
          <div className={cn(
            "flex flex-col h-full w-full origin-right transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
            selectedPatient && "scale-[0.94] opacity-50 blur-[2px] pointer-events-none bg-slate-100/50"
          )}>

            
            {/* INTERNAL LAYOUT SAFETY - Allow full width for cards */}
            <div className="flex-1 p-0 bg-white/10" style={{ overflow: 'hidden' }}>
              <FollowUpPipeline 
                patients={selectedFacility ? sortedFacilityPatients : patientsForSelectedDate}
                isLoading={false}
                onPatientClick={handleOpenPatientDrawer}
                onUploadRegister={canEdit ? () => setIsUploadModalOpen(true) : undefined}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* LEVEL 2: Patient Detail Drawer — renders above the Facility sheet via higher z-index */}
      <PatientDetailDrawer
        patient={selectedPatient}
        isOpen={!!selectedPatient}
        onClose={handleClosePatientDrawer}
        onUpdate={handlePatientUpdate}
      />

      <RegisterUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        screeningDate={selectedDate}
        facilityName={selectedFacility?.name ?? null}
        screeningDistrict={filterDistrict !== 'All' ? filterDistrict : null}
        screeningState={filterState !== 'All' ? filterState : null}
        onSuccess={() => {
          mutate((key: any) => 
            Array.isArray(key) && 
            (key[0] === 'patients' || key[0] === 'allPatients' || key[0] === '/api/patients')
          );
        }}
      />

      {/* Reconciliation Review overlay - positioned beside sidebar */}
      <AnimatePresence>
        {isReviewOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 right-0 bottom-0 left-[72px] z-50 bg-white flex flex-col shadow-2xl"
          >
            <RegisterReconciliation />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
