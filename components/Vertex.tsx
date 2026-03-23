'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
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
import { FollowUpPipeline } from '@/components/FollowUpPipeline';
import { PatientDetailDrawer } from '@/components/PatientDetailDrawer';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import ThreeBackground from './ThreeBackground';

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
      <div className="grid grid-cols-7 gap-3 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-3">
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
                "aspect-square rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group/day",
                "active:scale-95 shadow-sm",
                isSelected 
                  ? "bg-slate-900 border-slate-900 shadow-2xl shadow-blue-500/20 ring-4 ring-blue-500/10" 
                  : "bg-white border-slate-100 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5",
                shouldDim && "opacity-20 grayscale",
                shouldHighlight && !isSelected && "bg-rose-50 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.1)]",
                !isBreachMode && isHighVolume && !isSelected && "bg-blue-50 border-blue-200"
              )}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn(
                  "text-base font-black transition-colors duration-300",
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
                  "absolute bottom-1.5 right-2 text-[10px] font-black tabular-nums opacity-60",
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

// Spark Metric Card
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
    <Card className="glass-card-light p-5 rounded-[24px] group border-transparent">
      <div className="flex items-start justify-between">
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
              className="w-full flex items-center justify-between p-5 glass-card-light rounded-[24px] border-transparent"
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
                                  className="w-full flex items-center justify-between p-4 glass-card-light rounded-2xl border-transparent"
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string>('All');
  const [filterDistrict, setFilterDistrict] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'volume' | 'breaches'>('volume');

  // Use external data when provided (avoids duplicate fetch + 400 errors)
  const { data: swrData = [], isLoading: swrLoading } = useSWRAllPatients();
  const globalPatients: any[] = externalPatients ?? swrData;
  const isLoading = externalLoading ?? swrLoading;

  // Extract available states and districts (memoized with proper dependencies)
  const { availableStates, availableDistricts } = useMemo(() => {
    if (!globalPatients?.length) return { availableStates: [], availableDistricts: [] };
    
    const states = new Set<string>();
    const districts = new Set<string>();
    
    for (let i = 0; i < globalPatients.length; i++) {
      const patient = globalPatients[i];
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

  const formattedDate = selectedDate 
    ? new Date(selectedDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '';

  return (
    <div className="h-screen w-full overflow-hidden relative font-outfit">
      <ThreeBackground />
      {/* Premium Background Decorative Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-400/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-400/10 blur-[150px] rounded-full animate-pulse delay-500" />
      </div>

      <div className="relative h-full grid grid-cols-[42%_58%] gap-8 p-8 max-w-[1920px] mx-auto z-10">
        {/* Left Pane: Calendar */}
        <motion.div
           initial={{ opacity: 0, x: -40 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
           className="h-full"
        >
          <Card className="glass-light border-white/60 shadow-2xl rounded-[32px] p-8 h-full flex flex-col overflow-hidden border-2 relative">
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
            <div className="flex-1 overflow-y-auto hide-scrollbar">
              <CalendarGrid
                heatmapData={heatmapData}
                currentDate={currentDate}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                viewMode={viewMode}
              />
            </div>
            
            {/* Monthly Pulse Console */}
            <div className="mt-8 pt-8 border-t border-slate-200/60 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="group">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-80 group-hover:text-blue-500 transition-colors">Screened</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-950 tracking-tighter">
                      {heatmapData.reduce((sum, day) => sum + day.screenedCount, 0).toLocaleString()}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Monthly</span>
                  </div>
                </div>
                <div className="group">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-80 group-hover:text-rose-500 transition-colors">Pending</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-rose-600 tracking-tighter">
                      {heatmapData.reduce((sum, day) => sum + day.breachCount, 0).toLocaleString()}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Alerts</span>
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

        {/* Right Pane: Daily Briefing */}
        <motion.div
           initial={{ opacity: 0, x: 40 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
           className="h-full"
        >
          <Card className="glass-light border-white shadow-2xl rounded-[32px] overflow-hidden flex flex-col h-full border-2 relative">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-500/[0.02] to-transparent pointer-events-none" />
            <AnimatePresence mode="wait">
              {selectedDate ? (
                <motion.div
                  key={selectedDate}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full flex flex-col"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200/50 bg-white/40 backdrop-blur-xl">
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

                  <ScrollArea className="flex-1 px-8 py-8 hide-scrollbar">
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

                      {/* Geographic Hierarchy Breakdown */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <h4 className="text-[12px] font-black text-slate-950 uppercase tracking-[0.2em]">
                            Sector Intelligence Breakdown
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
                  className="flex flex-col items-center justify-center h-full p-12 text-center"
                >
                  <div className="w-32 h-32 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center mb-8 relative">
                    <CalendarIcon className="w-12 h-12 text-blue-500 opacity-40" />
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-t-2 border-blue-500 rounded-full"
                    />
                  </div>
                  <h3 className="text-3xl font-black text-slate-950 tracking-tighter mb-4 uppercase">Timeline Interface Offline</h3>
                  <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Select a timestamp from the temporal grid to initialize the neural briefing and synchronize sector intelligence.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>

      {/* Task 3: The Mega-Drawer UI & Z-Index Override */}
      <Sheet open={!!selectedFacility} onOpenChange={(open) => !open && setSelectedFacility(null)}>
        {/* Task 1: OVERLAY FIX - Force z-index to 99998 to cover the left navigation menu */}
        <SheetOverlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm !z-[99998]" />
        
        {/* Task 2: GOLDILOCKS WIDTH - Professional fixed width with responsive mobile fallback */}
        <SheetContent 
          className="!w-[90vw] sm:!max-w-[550px] md:!max-w-[600px] !z-[99999] bg-[#FBFBFD] border-l border-slate-200 shadow-2xl p-0 flex flex-col"
        >
          <SheetHeader className="px-6 py-5 border-b border-slate-200 bg-white">
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
          
          {/* Task 3: INTERNAL LAYOUT SAFETY - Prevent horizontal overflow */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
            <FollowUpPipeline 
              patients={sortedFacilityPatients}
              isLoading={false}
              onPatientClick={handleOpenPatientDrawer}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Patient Detail Drawer */}
      <AnimatePresence>
        {selectedPatient && (
          <PatientDetailDrawer
            patient={selectedPatient}
            isOpen={!!selectedPatient}
            onClose={handleClosePatientDrawer}
            onUpdate={() => {}}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
