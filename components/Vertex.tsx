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
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetOverlay } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { sounds } from '@/lib/sound';
import { FollowUpPipeline } from '@/components/FollowUpPipeline';
import { PatientDetailDrawer } from '@/components/PatientDetailDrawer';
import { VertexChart } from '@/components/VertexChart';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';
import { useSWRConfig } from 'swr';

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
  availableDistricts
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
}) => (
  <div className="space-y-6 mb-8 px-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shadow-inner">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Neural Timeline Overview</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onPrevMonth}
          variant="ghost"
          size="sm"
          className="h-10 w-10 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all p-0 rounded-xl"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Button>
        <Button
          onClick={onNextMonth}
          variant="ghost"
          size="sm"
          className="h-10 w-10 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all p-0 rounded-xl"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </Button>
      </div>
    </div>
    
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Select value={filterState} onValueChange={onFilterStateChange}>
          <SelectTrigger className="h-10 text-xs font-bold border-slate-200 bg-white/50 hover:bg-white hover:border-blue-400 transition-all rounded-xl focus:ring-4 focus:ring-blue-500/10">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <SelectValue placeholder="State" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
            <SelectItem value="All" className="font-bold">All States</SelectItem>
            {availableStates.map(state => (
              <SelectItem key={state} value={state} className="font-medium">{state}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="relative flex-1">
        <Select value={filterDistrict} onValueChange={onFilterDistrictChange}>
          <SelectTrigger className="h-10 text-xs font-bold border-slate-200 bg-white/50 hover:bg-white hover:border-blue-400 transition-all rounded-xl focus:ring-4 focus:ring-blue-500/10">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <SelectValue placeholder="District" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
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
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - firstDay + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayData = heatmapData.find(d => d.date === dateStr);
    
    return { dayNum, dateStr, data: dayData };
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>
      {/* Magnetic scroll snap container */}
      <div className="grid grid-cols-7 gap-1.5 scroll-snap-x">
        {days.map((day, idx) => {
          if (!day) return <div key={idx} className="aspect-square" />;
          
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
              onClick={() => onDateSelect(day.dateStr)}
              whileHover={{ scale: shouldDim ? 1 : 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "min-h-[56px] rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group/day scroll-snap-center",
                "active:scale-95 shadow-sm",
                isSelected 
                  ? "bg-slate-900 border-slate-900 shadow-2xl shadow-blue-500/20 ring-4 ring-blue-500/10" 
                  : "bg-white border-slate-100 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5",
                shouldDim && "opacity-20 grayscale",
                shouldHighlight && !isSelected && "bg-rose-50 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.1)]",
                !isBreachMode && isHighVolume && !isSelected && "bg-blue-50 border-blue-200"
              )}
            >
              {/* Glassmorphism depth layer on hover */}
              <div className="absolute inset-0 glass-depth-1 opacity-0 group-hover/day:opacity-100 transition-opacity duration-300" />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center relative z-10">
                <span className={cn(
                  "text-sm font-semibold transition-colors duration-300",
                  isSelected ? "text-white" : 
                  shouldHighlight ? "text-rose-600" :
                  hasActivity ? "text-slate-900" : "text-slate-300 group-hover/day:text-slate-600"
                )}>
                  {day.dayNum}
                </span>
                
                {hasActivity && !isBreachMode && (
                  <div className="flex gap-1 mt-1.5 opacity-80">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full shadow-sm",
                      isSelected ? "bg-white" : hasBreaches ? "bg-rose-500" : "bg-emerald-500"
                    )} />
                  </div>
                )}
              </div>
              
              {hasActivity && (
                <div className={cn(
                  "absolute bottom-1.5 right-2 text-[10px] font-black tabular-nums opacity-60 z-10",
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
  onFacilityClick: (facilityName: string) => void;
}) => {
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());

  const toggleState = (stateName: string) => {
    setExpandedStates(prev => {
      const next = new Set(prev);
      if (next.has(stateName)) {
        next.delete(stateName);
      } else {
        next.add(stateName);
      }
      return next;
    });
  };

  const toggleDistrict = (districtKey: string) => {
    setExpandedDistricts(prev => {
      const next = new Set(prev);
      if (next.has(districtKey)) {
        next.delete(districtKey);
      } else {
        next.add(districtKey);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {groupedGeography.map((state) => {
        const isStateExpanded = expandedStates.has(state.stateName);
        
        return (
          <div key={state.stateName} className="space-y-3">
            <motion.button
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
                                  onClick={() => onFacilityClick(facility.facilityName)}
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
}: {
  externalPatients?: any[];
  externalLoading?: boolean;
} = {}) {
  // Use external data when provided (avoids duplicate fetch + 400 errors)
  const { data: swrData = [], isLoading: swrLoading } = useSWRAllPatients(null);
  const globalPatients: any[] = externalPatients ?? swrData;
  const isLoading = externalLoading ?? swrLoading;

  // Find the most recent month with data
  const mostRecentDateWithData = useMemo(() => {
    if (!globalPatients?.length) return new Date();
    
    let mostRecent = new Date(0); // Start with epoch
    for (let i = 0; i < globalPatients.length; i++) {
      const dateValue = globalPatients[i].screening_date || globalPatients[i].submitted_on;
      if (!dateValue) continue;
      const date = new Date(dateValue);
      if (date > mostRecent) mostRecent = date;
    }
    
    return mostRecent.getTime() === 0 ? new Date() : mostRecent;
  }, [globalPatients]);

  const [currentDate, setCurrentDate] = useState(mostRecentDateWithData);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const sessionScope = useSessionScope();
  const canEdit = ['PM', 'admin', 'SPM'].includes(sessionScope?.role ?? '');
  const [filterState, setFilterState] = useState<string>('All');
  const [filterDistrict, setFilterDistrict] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'volume' | 'breaches'>('volume');
  const { mutate } = useSWRConfig();

  // Update currentDate when data loads and most recent date changes
  useEffect(() => {
    if (!isLoading && mostRecentDateWithData) {
      setCurrentDate(mostRecentDateWithData);
    }
  }, [mostRecentDateWithData, isLoading]);

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

  // Task 3: Derive Calendar Data from globalPatients (Single Source of Truth) with Filters
  const heatmapData = useMemo(() => {
    if (!globalPatients?.length) return [];
    
    const grouped: Record<string, MonthlyHeatmapData> = {};
    
    for (let i = 0; i < globalPatients.length; i++) {
      const patient = globalPatients[i];
      // ✅ NULL SAFETY: Guard against null/undefined patients
      if (!patient) continue;
      
      // Apply geographic filters early
      if (filterState !== 'All' && patient.screening_state !== filterState) continue;
      if (filterDistrict !== 'All' && patient.screening_district !== filterDistrict) continue;
      
      const dateValue = patient.screening_date || patient.submitted_on;
      const normalizedDate = getLocalYMD(dateValue);
      
      if (!normalizedDate) continue;
      
      if (!grouped[normalizedDate]) {
        grouped[normalizedDate] = { date: normalizedDate, screenedCount: 0, breachCount: 0 };
      }
      grouped[normalizedDate].screenedCount++;
      if (!patient.referral_date) grouped[normalizedDate].breachCount++;
    }

    return Object.values(grouped);
  }, [globalPatients, filterState, filterDistrict]);

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

  // Task 1: Data Aggregation - Daily Sparks
  const dailySparks = useMemo((): DailySparks => {
    const totalScreened = patientsForSelectedDate.length;
    const pendingSputum = patientsForSelectedDate.filter((p: any) => !p.referral_date).length;
    const diagnosed = patientsForSelectedDate.filter((p: any) => p.tb_diagnosed === 'Y').length;
    const onTrack = totalScreened - pendingSputum;

    return { totalScreened, pendingSputum, diagnosed, onTrack };
  }, [patientsForSelectedDate]);

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

  // Task 3: Filter patients for selected facility
  const patientsForSelectedFacility = useMemo(() => {
    if (!selectedFacility) return [];
    return patientsForSelectedDate.filter((p: any) => p.facility_name === selectedFacility);
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
      const hasAbnormalXray = patient.xray_result?.toLowerCase().includes('abnormal');
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
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateSelect = (date: string) => {
    sounds.calendarClick();
    setSelectedDate(date);
  };

  const handleClearDate = () => {
    setSelectedDate(null);
  };

  const handleFacilityClick = (facilityName: string) => {
    setSelectedFacility(facilityName);
  };

  const handleOpenPatientDrawer = (patient: any) => {
    setSelectedPatient(patient);
  };

  const handleClosePatientDrawer = () => {
    setSelectedPatient(null);
  };

  const handlePatientUpdate = () => {
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
      const now = new Date();
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
  }, [selectedDate, dailySparks, globalPatients]);

  return (
    <div className="relative flex flex-col lg:flex-row items-start w-full gap-8 font-outfit">
      {/* Premium Background Decorative Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-400/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-400/10 blur-[150px] rounded-full animate-pulse delay-500" />
      </div>

      <div className="relative flex flex-col lg:flex-row items-start w-full gap-8 p-8 max-w-[1920px] mx-auto z-10">
        {/* Left Pane: Calendar - UNLOCKED HEIGHT */}
        <motion.div
           initial={{ opacity: 0, x: -40 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
           className="w-full lg:w-[45%] lg:sticky lg:top-6 h-auto pb-40"
        >
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-4 flex flex-col border relative">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-500/[0.02] to-transparent pointer-events-none" />
            
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
            />
            <div className="">
              <CalendarGrid
                heatmapData={heatmapData}
                currentDate={currentDate}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                viewMode={viewMode}
              />
            </div>
            
            {/* Monthly Pulse Console - Dynamic Metrics */}
            <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="group">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-80 group-hover:text-blue-500 transition-colors">Total</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-950 tracking-tighter">
                      {globalPatients.length.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Screened</span>
                  </div>
                </div>
                <div className="group">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-80 group-hover:text-rose-500 transition-colors">Pending</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-rose-600 tracking-tighter">
                      {globalPatients.filter((p: any) => {
                        const isAbnormal = p.xray_result?.toLowerCase().includes('abnormal');
                        const noTreatment = !p.att_start_date && !p.referral_date;
                        return isAbnormal && noTreatment;
                      }).length.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Alerts</span>
                  </div>
                </div>
                <div className="group">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-80 group-hover:text-emerald-500 transition-colors">This Month</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-600 tracking-tighter">
                      {globalPatients.filter((p: any) => {
                        const dateValue = p.screening_date || p.submitted_on;
                        if (!dateValue) return false;
                        const date = new Date(dateValue);
                        const now = new Date();
                        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                      }).length.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Screened</span>
                  </div>
                </div>
              </div>
              
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'volume' | 'breaches')} className="w-[180px]">
                <TabsList className="grid w-full grid-cols-2 h-10 bg-slate-100/50 p-1 border-slate-200/60 rounded-xl">
                  <TabsTrigger value="volume" className="rounded-lg text-[10px] font-black uppercase tracking-wider h-8 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md">
                    Volume
                  </TabsTrigger>
                  <TabsTrigger value="breaches" className="rounded-lg text-[10px] font-black uppercase tracking-wider h-8 data-[state=active]:bg-white data-[state=active]:text-rose-700 data-[state=active]:shadow-md">
                    Alerts
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </Card>
        </motion.div>

        {/* Right Pane: Daily Briefing - INTERNAL SCROLL */}
        <motion.div
           initial={{ opacity: 0, x: 40 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
           className="w-full lg:w-[55%] flex flex-col lg:sticky lg:top-6 h-[calc(100vh-3rem)]"
           id="right-scroll-container"
        >
          <Card className="flex flex-col flex-1 min-h-0 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm relative">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-500/[0.02] to-transparent pointer-events-none" />
            <AnimatePresence mode="wait">
              {selectedDate ? (
                <motion.div
                  key={selectedDate}
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
                    <Button
                      onClick={handleClearDate}
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-slate-950 hover:bg-slate-100 rounded-xl font-bold uppercase text-[10px] tracking-widest border border-transparent hover:border-slate-200 px-4 h-10"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Close
                    </Button>
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
                          label="On Track"
                          value={dailySparks.onTrack}
                          color="emerald"
                        />
                        <SparkCard 
                          icon={AlertCircle}
                          label="Follow-ups"
                          value={dailySparks.pendingSputum}
                          color="amber"
                        />
                        <SparkCard 
                          icon={Activity}
                          label="Positive Diagnosed"
                          value={dailySparks.diagnosed}
                          color="red"
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
                        <div className="bg-slate-50/50 rounded-[32px] p-2 border border-slate-200/50">
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
                      suspected: monthPatients.filter((p: any) => {
                        const hasAbnormalXray = p.xray_result?.toLowerCase().includes('abnormal');
                        const hasSymptoms = p.symptoms_10s === 'Yes' || p.symptoms_10s === 'Y';
                        return hasAbnormalXray || hasSymptoms;
                      }).length,
                      notSuspected: monthPatients.filter((p: any) => {
                        const hasAbnormalXray = p.xray_result?.toLowerCase().includes('abnormal');
                        const hasSymptoms = p.symptoms_10s === 'Yes' || p.symptoms_10s === 'Y';
                        return !hasAbnormalXray && !hasSymptoms;
                      }).length,
                      diagnosed: monthPatients.filter((p: any) => p.tb_diagnosed === 'Y').length,
                      notDiagnosed: monthPatients.filter((p: any) => p.tb_diagnosed === 'N').length,
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

      {/* LEVEL 1: Master Drawer (Facility Patient List) - Elegant Sidebar Width */}
      <Sheet open={!!selectedFacility} onOpenChange={(open) => !open && setSelectedFacility(null)}>
        <SheetOverlay className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm !z-[99998] data-[state=open]:duration-700 data-[state=closed]:duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        
        <SheetContent 
          onInteractOutside={(e) => {
            // Prevent Master List from closing if the Detail Drawer is open!
            if (selectedPatient) e.preventDefault();
          }}
          className="!w-[90vw] sm:!max-w-[500px] md:!max-w-[600px] !z-[99998] bg-slate-50/70 backdrop-blur-2xl border-l border-white/60 shadow-[-10px_0_40px_rgba(0,0,0,0.08)] p-0 flex flex-col data-[state=open]:duration-700 data-[state=closed]:duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden"
        >
          {/* THE PARALLAX WRAPPER - Apple-Style Push-Back */}
          <div className={cn(
            "flex flex-col h-full w-full origin-right transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
            selectedPatient && "scale-[0.94] opacity-50 blur-[2px] pointer-events-none bg-slate-100/50"
          )}>
            <SheetHeader className="px-6 py-5 border-b border-white/30 bg-white/20 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-2xl font-black text-slate-900 mb-1">
                    {selectedFacility}
                  </SheetTitle>
                  <p className="text-sm font-medium text-slate-500">
                    {patientsForSelectedFacility.length} patients screened
                  </p>
                </div>
                <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 text-sm font-bold px-3 py-1.5">
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
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Patient Detail Drawer - Full clinical drawer */}
      <PatientDetailDrawer
        patient={selectedPatient}
        isOpen={!!selectedPatient}
        onClose={handleClosePatientDrawer}
        onUpdate={handlePatientUpdate}
      />
    </div>
  );
}
