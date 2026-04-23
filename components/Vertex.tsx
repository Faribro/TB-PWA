// Vertex Dashboard - Neural Timeline Calendar with Redis-backed aggregates
// Last updated: 2025-01-23 - Hydration fixes applied
'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
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
  Upload
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { sounds } from '@/lib/sound';
import { FollowUpPipeline } from '@/components/FollowUpPipeline';
import { PatientDetailDrawer } from '@/components/PatientDetailDrawer';
import { VertexChart } from '@/components/VertexChart';
import { useSWRConfig } from 'swr';
import { RegisterReconciliation } from '@/components/RegisterReconciliation';
import { useReconciliationStore } from '@/stores/useReconciliationStore';
import { RegisterUploadModal } from '@/components/RegisterUploadModal';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';
import { useVertexHeatmap, useVertexMonthSummary, useVertexDaily } from '@/hooks/useVertexAggregates';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

// Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    console.log('[CalendarHeader] Formatting date:', currentDate.toISOString());
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentDate, mounted]);

  return (
  <div className="space-y-3 mb-4 px-1">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl vertex-header-icon flex items-center justify-center">
          <CalendarIcon className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
            {formattedMonth}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Neural Timeline Overview</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          data-tour-id="neural-timeline-prev-month"
          onClick={onPrevMonth}
          variant="ghost"
          size="sm"
          className="h-10 w-10 vertex-nav-btn flex items-center justify-center rounded-xl p-0"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Button>
        <Button
          data-tour-id="neural-timeline-next-month"
          onClick={onNextMonth}
          variant="ghost"
          size="sm"
          className="h-10 w-10 vertex-nav-btn flex items-center justify-center rounded-xl p-0"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </Button>
      </div>
    </div>
    
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Select value={filterState} onValueChange={onFilterStateChange}>
          <SelectTrigger
            data-tour-id="neural-timeline-state-filter"
            className="h-10 text-xs font-bold vertex-filter-select rounded-xl focus:ring-4 focus:ring-indigo-500/10"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
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
          <SelectTrigger className="h-10 text-xs font-bold vertex-filter-select rounded-xl focus:ring-4 focus:ring-indigo-500/10">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
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
  
  console.log('[CalendarGrid] Render - year:', year, 'month:', month, 'heatmapData length:', heatmapData.length);
  
  const firstDay = useMemo(() => {
    const day = new Date(year, month, 1).getDay();
    console.log('[CalendarGrid] firstDay:', day);
    return day;
  }, [year, month]);
  
  const daysInMonth = useMemo(() => {
    const days = new Date(year, month + 1, 0).getDate();
    console.log('[CalendarGrid] daysInMonth:', days);
    return days;
  }, [year, month]);
  
  const days = useMemo(() => {
    console.log('[CalendarGrid] Computing days array - firstDay:', firstDay, 'daysInMonth:', daysInMonth);
    return Array.from({ length: 42 }, (_, i) => {
      const dayNum = i - firstDay + 1;
      if (dayNum < 1 || dayNum > daysInMonth) return null;
      
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayData = heatmapData.find(d => d.date === dateStr);
      
      return { dayNum, dateStr, data: dayData };
    });
  }, [firstDay, daysInMonth, year, month, heatmapData]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-2.5" data-tour-id="neural-timeline-calendar">
      <div className="grid grid-cols-7 gap-1.5 mb-0.5">
        {weekDays.map(day => (
          <div key={day} className="text-center text-[10px] font-black text-slate-400/90 uppercase tracking-[0.18em]">
            {day}
          </div>
        ))}
      </div>
      {/* Magnetic scroll snap container */}
      <div className="grid grid-cols-7 gap-1.5 scroll-snap-x">
        {days.map((day, idx) => {
          if (!day) return <div key={idx} className="aspect-square w-full rounded-xl" style={{ minHeight: "clamp(40px, 5.2vh, 52px)" }} />;
          
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
                minHeight: "clamp(40px, 5.2vh, 52px)"
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
  trend
}: { 
  icon: any; 
  label: string; 
  value: number;
  color?: 'cyan' | 'emerald' | 'amber' | 'red';
  trend?: string;
}) => {
  const colorClasses = {
    cyan: 'bg-blue-50 text-blue-600 border-blue-200 shadow-blue-500/5',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-500/5',
    amber: 'bg-amber-50 text-amber-600 border-amber-200 shadow-amber-500/5',
    red: 'bg-rose-50 text-rose-600 border-rose-200 shadow-rose-500/5'
  };

  return (
    <SmokeCard>
      <BentoTilt>
        <Card className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 group transition-all duration-200 hover:shadow-md hover:border-blue-300 relative overflow-hidden">
          {/* Glassmorphism overlay on hover */}
          <div className="absolute inset-0 glass-depth-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 opacity-80">
                {label}
              </p>
              <p className="text-4xl font-black text-slate-900 tracking-tighter group-hover:scale-105 transition-transform duration-500">
                {value.toLocaleString()}
              </p>
              {trend && (
                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">{trend}</p>
              )}
            </div>
            <div className={cn(
              "w-12 h-12 rounded-2xl border-2 flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:rotate-12", 
              colorClasses[color]
            )}>
              <Icon className="w-6 h-6" />
            </div>
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

  return (
    <div className="space-y-4" data-tour-id="geo-case-distribution">
      {groupedGeography.map((state) => {
        const isStateExpanded = expandedStates.has(state.stateName);
        
        return (
          <div key={state.stateName} className="space-y-3">
            <motion.button
              data-tour-id="state-drawer"
              onClick={() => toggleState(state.stateName)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full flex items-center justify-between p-5 bg-white rounded-xl border border-slate-100 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-black text-slate-950 uppercase tracking-wider">{state.stateName}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{state.totalPatients} Patients Active</span>
                  </div>
                </div>
              </div>
              <motion.div
                animate={{ rotate: isStateExpanded ? 180 : 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {isStateExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.98 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="ml-6 space-y-3 pl-4 border-l-2 border-slate-100"
                >
                  {state.districts.map((district) => {
                    const districtKey = `${state.stateName}-${district.districtName}`;
                    const isDistrictExpanded = expandedDistricts.has(districtKey);
                    
                    return (
                      <div key={districtKey} className="space-y-2">
                        <motion.button
                          data-tour-id="district-drawer"
                          onClick={() => toggleDistrict(districtKey)}
                          className="w-full flex items-center justify-between p-4 bg-white/60 border border-slate-200 rounded-2xl shadow-sm hover:bg-white transition-all group/dist"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{district.districtName}</span>
                            <Badge variant="default" className="bg-blue-100/50 text-blue-700 text-[10px] font-black border-transparent">
                              {district.totalPatients}
                            </Badge>
                          </div>
                          <motion.div
                            animate={{ rotate: isDistrictExpanded ? 180 : 0 }}
                            className="text-slate-300 group-hover/dist:text-slate-600"
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
                                  whileHover={{ scale: 1.01, x: 8 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover/fac:bg-blue-600 group-hover/fac:text-white transition-colors">
                                      <Building2 className="w-4 h-4" />
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide group-hover/fac:text-blue-900 transition-colors">
                                      {facility.facilityName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 border-blue-200/50 hidden sm:flex">
                                      {facility.patientCount} Screened
                                    </Badge>
                                    {facility.pendingCount > 0 && (
                                      <Badge variant="destructive" className="bg-rose-50 text-rose-700 border-rose-200/50 text-[9px] font-black uppercase">
                                        {facility.pendingCount} Alerts
                                      </Badge>
                                    )}
                                    <ChevronRightIcon className="w-3.5 h-3.5 text-slate-300 group-hover/fac:text-blue-600" />
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

  // FIXED: Always use fresh SWR data, ignore stale externalPatients
  const { patients: swrData = [], isLoading: swrLoading } = useSWRAllPatients(null);
  const globalPatients: any[] = swrData; // Always use fresh SWR data
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
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedFacility, setSelectedFacility] = useState<{ name: string; state: string; district: string } | null>(null);
  const sessionScope = useSessionScope();
  const canEdit = ['PM', 'admin', 'SPM'].includes(sessionScope?.role ?? '');
  const [filterState, setFilterState] = useState<string>('All');
  const [filterDistrict, setFilterDistrict] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'volume' | 'breaches'>('volume');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isReviewOpen } = useReconciliationStore();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    console.log('[Vertex] Mounting component, setting mounted=true');
    setMounted(true);
  }, []);

  // Update currentDate when data loads and most recent date changes
  useEffect(() => {
    if (!isLoading && mostRecentDateWithData) {
      setCurrentDate(clampToCurrentMonth(mostRecentDateWithData));
    }
  }, [mostRecentDateWithData, isLoading, clampToCurrentMonth]);

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

  // Realtime subscription for targeted cache invalidation
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel('vertex-realtime-invalidation')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        (payload) => {
          console.log('[Vertex] Realtime event:', payload.eventType);
          // Optimistic invalidation: mutate only affected keys
          mutateHeatmap();
          mutateMonthSummary();
          if (selectedDate) mutateDaily();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutateHeatmap, mutateMonthSummary, mutateDaily, selectedDate]);

  // Extract available states and districts (memoized with proper dependencies)
  const { availableStates, availableDistricts } = useMemo(() => {
    if (!globalPatients?.length) return { availableStates: [], availableDistricts: [] };
    
    const states = new Set<string>();
    const districts = new Set<string>();
    
    for (let i = 0; i < globalPatients.length; i++) {
      const patient = globalPatients[i];
      // ✅ NULL SAFETY: Guard against null/undefined patients
      if (!patient) continue;
      if (patient.screening_state) states.add(patient.screening_state);
      if (patient.screening_district) districts.add(patient.screening_district);
    }
    
    return {
      availableStates: Array.from(states).sort(),
      availableDistricts: Array.from(districts).sort()
    };
  }, [globalPatients]);

  // Use Redis-backed heatmap (instant reads)
  const heatmapData = useMemo(() => {
    return cachedHeatmap.map(day => ({
      date: day.date,
      screenedCount: day.screenedCount,
      breachCount: day.breachCount
    }));
  }, [cachedHeatmap]);

  // FIXED: Auto-jump to latest month with data (responds to new data)
  useEffect(() => {
    if (!heatmapData.length) return;
    if (selectedDate) return; // Don't auto-jump if user selected a date

    const monthKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const currentKey = monthKey(currentDate);

    const hasAnyInCurrentMonth = heatmapData.some(
      d => d?.date?.startsWith(currentKey) && (d?.screenedCount ?? 0) > 0
    );

    if (hasAnyInCurrentMonth) return; // Current month has data, stay here

    // Find latest date with activity
    let latestDateStr: string | null = null;
    for (const d of heatmapData) {
      if ((d?.screenedCount ?? 0) <= 0) continue;
      if (!latestDateStr || d.date > latestDateStr) latestDateStr = d.date;
    }

    if (!latestDateStr) return;

    const [yStr, mStr] = latestDateStr.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    if (!y || !m) return;

    const next = new Date(y, m - 1, 1);
    const nextClamped = clampToCurrentMonth(next);
    
    // Only jump if different from current month
    if (monthKey(nextClamped) !== currentKey) {
      setCurrentDate(nextClamped);
    }
  }, [heatmapData, selectedDate, currentDate, clampToCurrentMonth]);

  const patientsForSelectedDate = useMemo(() => {
    if (!selectedDate || !globalPatients?.length) return [];
    
    const result = [];
    for (let i = 0; i < globalPatients.length; i++) {
      const patient = globalPatients[i];
      // ✅ NULL SAFETY: Guard against null/undefined patients
      if (!patient) continue;
      
      const dateValue = patient.screening_date || patient.submitted_on;
      const normalizedDate = getLocalYMD(dateValue);
      
      if (normalizedDate !== selectedDate) continue;
      
      // Apply geographic filters
      if (filterState !== 'All' && patient.screening_state !== filterState) continue;
      if (filterDistrict !== 'All' && patient.screening_district !== filterDistrict) continue;
      
      result.push(patient);
    }
    
    return result;
  }, [selectedDate, globalPatients, filterState, filterDistrict]);

  // Use Redis-backed daily summary (instant reads)
  const dailySparks = useMemo((): DailySparks => {
    if (cachedDailySummary) {
      return cachedDailySummary;
    }
    // Fallback to client-side computation only if cache miss
    const totalScreened = patientsForSelectedDate.length;
    const pendingSputum = patientsForSelectedDate.filter((p: any) => !p.referral_date).length;
    const diagnosed = patientsForSelectedDate.filter((p: any) => p.tb_diagnosed === 'Y').length;
    const suspected = patientsForSelectedDate.filter((p: any) => p.xray_result === 'Suspected TB Case').length;

    return { totalScreened, pendingSputum, diagnosed, onTrack: suspected };
  }, [cachedDailySummary, patientsForSelectedDate]);

  // Task 1: Data Aggregation - Grouped Geography (optimized)
  const groupedGeography = useMemo((): StateData[] => {
    if (!patientsForSelectedDate.length) return [];
    
    const stateMap = new Map<string, Map<string, Map<string, any[]>>>();

    for (let i = 0; i < patientsForSelectedDate.length; i++) {
      const patient = patientsForSelectedDate[i];
      // ✅ NULL SAFETY: Guard against null/undefined patients
      if (!patient) continue;
      
      const state = patient.screening_state || 'Unknown State';
      const district = patient.screening_district || 'Unknown District';
      const facility = patient.facility_name || 'Unknown Facility';

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
  }, [patientsForSelectedDate]);

  // Task 3: Filter patients for selected facility (match name + state + district to avoid cross-state collisions)
  const patientsForSelectedFacility = useMemo(() => {
    if (!selectedFacility) return [];
    return patientsForSelectedDate.filter((p: any) =>
      p.facility_name === selectedFacility.name &&
      p.screening_state === selectedFacility.state &&
      p.screening_district === selectedFacility.district
    );
  }, [selectedFacility, patientsForSelectedDate]);

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
      const hasAbnormalXray = patient.xray_result === 'Suspected TB Case';
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

  return (
    <div className="relative w-full font-outfit overflow-x-hidden">
      {/* Premium Background Decorative Elements / Synthwave Aurora */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[rgba(167,139,250,0.15)] blur-[120px] rounded-full mix-blend-screen" style={{ animation: 'vertex-aurora 15s ease-in-out infinite alternate' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-[rgba(96,165,250,0.12)] blur-[140px] rounded-full mix-blend-screen" style={{ animation: 'vertex-aurora 20s ease-in-out infinite alternate-reverse' }} />
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-[rgba(244,114,182,0.08)] blur-[100px] rounded-full mix-blend-screen" style={{ animation: 'vertex-aurora 18s ease-in-out infinite alternate' }} />
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-12 items-start w-full gap-6 xl:gap-8 p-5 xl:p-8 max-w-[1920px] mx-auto z-10 min-w-0">
        {/* Left Pane: Calendar - UNLOCKED HEIGHT */}
        <motion.div
           initial={{ opacity: 0, x: -40 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
           className="w-full lg:col-span-5 lg:sticky lg:top-2 lg:self-start lg:h-[calc(100vh-0.75rem)] min-w-0"
        >
          <div className="vertex-glass-card rounded-[24px] p-3 lg:p-4 flex flex-col relative h-full min-h-0">

            <div
              className="min-h-0 overflow-y-auto pr-1 hide-scrollbar"
              style={{
                maxHeight: 'min(76vh, calc(100vh - 200px))',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
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
            
            {/* Monthly Pulse Console - Dynamic Metrics */}
            <div className="mt-3 pt-4 pb-2 px-3 vertex-pulse-console rounded-xl flex flex-wrap items-start gap-4 justify-between shrink-0">
              <div className="flex flex-wrap items-center gap-5 min-w-0">
                <div className="group">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-80 group-hover:text-indigo-500 transition-colors">Total</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 tracking-tighter shadow-sm drop-shadow-sm">
                      {(summaryData?.total ?? globalPatients.length).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Screened</span>
                  </div>
                </div>
                <div className="group">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-80 group-hover:text-rose-500 transition-colors">Pending</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-rose-600 tracking-tighter drop-shadow-sm">
                      {(summaryData?.pending ?? globalPatients.filter((p: any) => {
                        const isAbnormal = p.xray_result === 'Suspected TB Case';
                        const noTreatment = !p.att_start_date && !p.referral_date;
                        return isAbnormal && noTreatment;
                      }).length).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Alerts</span>
                  </div>
                </div>
                <div className="group hidden sm:block">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-80 group-hover:text-emerald-500 transition-colors">This Month</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-600 tracking-tighter drop-shadow-sm">
                      {(summaryData?.screenedThisMonth ?? globalPatients.filter((p: any) => {
                        const dateValue = p.screening_date || p.submitted_on;
                        if (!dateValue) return false;
                        const date = new Date(dateValue);
                        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                      }).length).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Screened</span>
                  </div>
                </div>
              </div>
              
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'volume' | 'breaches')} className="w-full sm:w-[180px]">
                <TabsList className="grid w-full grid-cols-2 h-10 bg-white/40 backdrop-blur-md p-1 border border-white/60 shadow-inner rounded-xl">
                  <TabsTrigger value="volume" className="rounded-lg text-[10px] font-black uppercase tracking-wider h-8 data-[state=active]:vertex-tab-active data-[state=active]:text-indigo-700 transition-all duration-300">
                    Volume
                  </TabsTrigger>
                  <TabsTrigger value="breaches" className="rounded-lg text-[10px] font-black uppercase tracking-wider h-8 data-[state=active]:vertex-tab-active data-[state=active]:text-rose-700 transition-all duration-300">
                    Alerts
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
           className="w-full lg:col-span-7 flex flex-col lg:sticky lg:top-6 h-[calc(100vh-3rem)] min-w-0"
           id="right-scroll-container"
        >
          <Card className="flex flex-col flex-1 min-h-0 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm relative">
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
                  {/* Header */}
                  <div className="flex-shrink-0 flex items-center justify-between px-8 py-6 border-b border-slate-200/50 bg-white/40 backdrop-blur-xl">
                    <div>
                      <h3 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">{formattedDate}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Active Intelligence Feed</p>
                      </div>
                    </div>
                    {!selectedPatient && (
                      <Button
                        onClick={handleClearDate}
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-950 hover:bg-slate-100 rounded-xl font-bold uppercase text-[10px] tracking-widest border border-transparent hover:border-slate-200 px-4 h-10"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Close
                      </Button>
                    )}
                  </div>

                  <ScrollArea className="flex-1 px-8 py-8">
                    <div className="space-y-10">
                      {/* Interactive Metrics */}
                      <div className="grid grid-cols-2 gap-6">
                        <SparkCard 
                          icon={Users}
                          label="Total Screened"
                          value={dailySparks.totalScreened}
                          color="cyan"
                        />
                        <SparkCard 
                          icon={CheckCircle2}
                          label="Suspected TB"
                          value={dailySparks.onTrack}
                          color="amber"
                        />
                        <SparkCard 
                          icon={AlertCircle}
                          label="TB Diagnosed"
                          value={dailySparks.diagnosed}
                          color="red"
                        />
                        <SparkCard 
                          icon={Activity}
                          label="Pending Sputum"
                          value={dailySparks.pendingSputum}
                          color="emerald"
                        />
                      </div>

                      {/* ATT Line Chart */}
                      <VertexChart patients={globalPatients} />

                      {/* Geographic Hierarchy Breakdown */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <h4 className="text-[12px] font-black text-slate-950 uppercase tracking-[0.2em]">
                            Geographic Case Distribution
                          </h4>
                        </div>
                        <div
                          className="bg-slate-50/50 rounded-[32px] p-2 border border-slate-200/50"
                        >
                          <GeographicHierarchy 
                            groupedGeography={groupedGeography}
                            onFacilityClick={handleFacilityClick}
                          />
                        </div>
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
                    const monthPatients = globalPatients.filter((p: any) => {
                      const dateValue = p.screening_date || p.submitted_on;
                      if (!dateValue) return false;
                      const date = new Date(dateValue);
                      return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
                    });

                    const stats = {
                      total: monthPatients.length,
                      suspected: monthPatients.filter((p: any) => p.xray_result === 'Suspected TB Case').length,
                      notSuspected: monthPatients.filter((p: any) => p.xray_result !== 'Suspected TB Case').length,
                      diagnosed: monthPatients.filter((p: any) => p.tb_diagnosed === 'Y').length,
                      notDiagnosed: monthPatients.filter((p: any) => p.tb_diagnosed !== 'Y').length,
                      attStarted: monthPatients.filter((p: any) => p.att_start_date != null).length,
                      referralDone: monthPatients.filter((p: any) => p.referral_date != null).length,
                    };

                    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
                    const year = currentDate.getFullYear();

                    return (
                      <div className="flex flex-col flex-1 min-h-0">
                        {/* Clean Header - UPGRADED */}
                        <div className="flex items-center justify-between bg-slate-900 text-white rounded-t-xl px-5 py-4">
                          <h3 className="text-xs font-medium tracking-[0.15em] uppercase text-slate-400">Monthly Overview</h3>
                          <Badge variant="outline" className="bg-slate-700 text-slate-200 text-xs px-2.5 py-0.5 rounded-full font-medium border-slate-600">
                            {monthName} {year}
                          </Badge>
                        </div>

                        <div className="flex flex-col">
                          {/* Dominant Anchor Stat */}
                          <div className="px-5 pt-5 pb-4 flex-shrink-0">
                            <div className="text-[2.75rem] font-bold tracking-tight leading-none tabular-nums text-slate-900">
                              {stats.total.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
                              patients screened · {monthName} {year}
                            </div>
                          </div>

                          {/* 2×2 Micro-Stat Grid with Accent Dots */}
                          <div className="px-5 flex-shrink-0 mb-6">
                            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50">
                              <div className="flex flex-col gap-0.5 p-4 border-t-2 border-amber-400">
                                <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{stats.suspected.toLocaleString()}</span>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400">Suspected</span>
                              </div>
                              <div className="flex flex-col gap-0.5 p-4 border-t-2 border-red-400">
                                <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{stats.diagnosed.toLocaleString()}</span>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400">Diagnosed</span>
                              </div>
                              <div className="flex flex-col gap-0.5 p-4 border-t-2 border-blue-500">
                                <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{stats.attStarted.toLocaleString()}</span>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400">ATT Started</span>
                              </div>
                              <div className="flex flex-col gap-0.5 p-4 border-t-2 border-emerald-500">
                                <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{stats.referralDone.toLocaleString()}</span>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400">Referred</span>
                              </div>
                            </div>
                          </div>

                          {/* Linear Funnel with Proportional Bars */}
                          <div className="flex-shrink-0 px-5 pb-5 pt-4 space-y-4">
                            <h4 className="text-xs font-semibold text-slate-500 tracking-wide">Care Cascade</h4>
                            
                            <div className="flex items-start gap-2">

                              {/* Screened */}
                              <div className="flex flex-col items-center gap-1 flex-1">
                                <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{stats.total.toLocaleString()}</span>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400">Screened</span>
                                <div className="w-full bg-slate-100 rounded-full h-0.5 mt-1.5">
                                  <div 
                                    className="bg-slate-400 h-0.5 rounded-full transition-all duration-700"
                                    style={{ width: '100%' }}
                                  />
                                </div>
                              </div>

                              {/* Connector */}
                              <div className="flex flex-col items-center justify-center flex-1 pt-3">
                                <span className="text-[9px] text-slate-300 mb-1">
                                  {(() => {
                                    const pct = stats.total > 0 ? Math.round((stats.suspected / stats.total) * 100) : 0;
                                    return stats.suspected === 0 ? '—' : pct < 1 ? '<1%' : `${pct}%`;
                                  })()}
                                </span>
                                <div className="h-px bg-slate-200 w-full" />
                              </div>

                              {/* Suspected */}
                              <div className="flex flex-col items-center gap-1 flex-1">
                                <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{stats.suspected.toLocaleString()}</span>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400">Suspected</span>
                                <div className="w-full bg-slate-100 rounded-full h-0.5 mt-1.5">
                                  <div 
                                    className="bg-slate-400 h-0.5 rounded-full transition-all duration-700"
                                    style={{ width: `${stats.total > 0 ? Math.round((stats.suspected / stats.total) * 100) : 0}%` }}
                                  />
                                </div>
                              </div>

                              {/* Connector */}
                              <div className="flex flex-col items-center justify-center flex-1 pt-3">
                                <span className="text-[9px] text-slate-300 mb-1">
                                  {(() => {
                                    const pct = stats.suspected > 0 ? Math.round((stats.referralDone / stats.suspected) * 100) : 0;
                                    return stats.referralDone === 0 ? '—' : pct < 1 ? '<1%' : `${pct}%`;
                                  })()}
                                </span>
                                <div className="h-px bg-slate-200 w-full" />
                              </div>

                              {/* Referred */}
                              <div className="flex flex-col items-center gap-1 flex-1">
                                <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{stats.referralDone.toLocaleString()}</span>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400">Referred</span>
                                <div className="w-full bg-slate-100 rounded-full h-0.5 mt-1.5">
                                  <div 
                                    className="bg-slate-400 h-0.5 rounded-full transition-all duration-700"
                                    style={{ width: `${stats.total > 0 ? Math.round((stats.referralDone / stats.total) * 100) : 0}%` }}
                                  />
                                </div>
                              </div>

                              {/* Connector */}
                              <div className="flex flex-col items-center justify-center flex-1 pt-3">
                                <span className="text-[9px] text-slate-300 mb-1">
                                  {(() => {
                                    const pct = stats.referralDone > 0 ? Math.round((stats.diagnosed / stats.referralDone) * 100) : 0;
                                    return stats.diagnosed === 0 ? '—' : pct < 1 ? '<1%' : `${pct}%`;
                                  })()}
                                </span>
                                <div className="h-px bg-slate-200 w-full" />
                              </div>

                              {/* Diagnosed */}
                              <div className="flex flex-col items-center gap-1 flex-1">
                                <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{stats.diagnosed.toLocaleString()}</span>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400">Diagnosed</span>
                                <div className="w-full bg-slate-100 rounded-full h-0.5 mt-1.5">
                                  <div 
                                    className="bg-slate-400 h-0.5 rounded-full transition-all duration-700"
                                    style={{ width: `${stats.total > 0 ? Math.round((stats.diagnosed / stats.total) * 100) : 0}%` }}
                                  />
                                </div>
                              </div>

                              {/* Connector */}
                              <div className="flex flex-col items-center justify-center flex-1 pt-3">
                                <span className="text-[9px] text-slate-300 mb-1">
                                  {(() => {
                                    const pct = stats.diagnosed > 0 ? Math.round((stats.attStarted / stats.diagnosed) * 100) : 0;
                                    return stats.attStarted === 0 ? '—' : pct < 1 ? '<1%' : `${pct}%`;
                                  })()}
                                </span>
                                <div className="h-px bg-slate-200 w-full" />
                              </div>

                              {/* ATT Started */}
                              <div className="flex flex-col items-center gap-1 flex-1">
                                <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{stats.attStarted.toLocaleString()}</span>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400">ATT Started</span>
                                <div className="w-full bg-slate-100 rounded-full h-0.5 mt-1.5">
                                  <div 
                                    className="bg-slate-400 h-0.5 rounded-full transition-all duration-700"
                                    style={{ width: `${stats.total > 0 ? Math.round((stats.attStarted / stats.total) * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Hint */}
                          <div className="mt-auto px-5 pb-5 pt-3 border-t border-slate-100">
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Select a specific date on the calendar to view daily intelligence.
                            </p>
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
          className="!w-[90vw] sm:!max-w-[500px] md:!max-w-[600px] !z-[300] bg-slate-50/70 backdrop-blur-2xl border-l border-white/60 shadow-[-10px_0_40px_rgba(0,0,0,0.08)] p-0 flex flex-col data-[state=open]:duration-700 data-[state=closed]:duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden"
        >
          {/* THE PARALLAX WRAPPER - Apple-Style Push-Back */}
          <div className={cn(
            "flex flex-col h-full w-full origin-right transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
            selectedPatient && "scale-[0.94] opacity-50 blur-[2px] pointer-events-none bg-slate-100/50"
          )}>
            <SheetHeader className="px-4 py-3 border-b border-white/30 bg-white/20 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-lg font-black text-slate-900 leading-tight">
                    {selectedFacility?.name}
                  </SheetTitle>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {patientsForSelectedFacility.length} patients screened
                  </p>
                </div>
                <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 text-xs font-bold px-2.5 py-1">
                  {patientsForSelectedFacility.length} total
                </Badge>
              </div>
            </SheetHeader>
            
            {/* INTERNAL LAYOUT SAFETY - Prevent horizontal overflow */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-white/10">
              <FollowUpPipeline 
                patients={sortedFacilityPatients}
                isLoading={false}
                onPatientClick={handleOpenPatientDrawer}
                onUploadRegister={() => setIsUploadModalOpen(true)}
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
        onSuccess={() => {
          mutate((key: any) => 
            Array.isArray(key) && 
            (key[0] === 'patients' || key[0] === 'allPatients' || key[0] === '/api/patients')
          );
        }}
      />

      {/* Reconciliation Review cinemantic overlay */}
      <AnimatePresence>
        {isReviewOpen && (
          <div className="fixed inset-0 z-[100001] bg-slate-950 flex flex-col">
            <RegisterReconciliation />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
