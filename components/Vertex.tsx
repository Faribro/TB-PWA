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
  <div className="space-y-4 mb-6 px-1">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CalendarIcon className="w-5 h-5 text-cyan-600" />
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onPrevMonth}
          variant="ghost"
          size="sm"
          className="h-9 w-9 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all p-0"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </Button>
        <Button
          onClick={onNextMonth}
          variant="ghost"
          size="sm"
          className="h-9 w-9 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all p-0"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </Button>
      </div>
    </div>
    
    <div className="flex items-center gap-2">
      <Select value={filterState} onValueChange={onFilterStateChange}>
        <SelectTrigger className="h-8 text-xs font-medium border-slate-200 bg-white hover:bg-slate-50 w-[140px]">
          <SelectValue placeholder="State" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All States</SelectItem>
          {availableStates.map(state => (
            <SelectItem key={state} value={state}>{state}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={filterDistrict} onValueChange={onFilterDistrictChange}>
        <SelectTrigger className="h-8 text-xs font-medium border-slate-200 bg-white hover:bg-slate-50 w-[140px]">
          <SelectValue placeholder="District" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Districts</SelectItem>
          {availableDistricts.map(district => (
            <SelectItem key={district} value={district}>{district}</SelectItem>
          ))}
        </SelectContent>
      </Select>
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
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          if (!day) return <div key={idx} className="aspect-square" />;
          
          const isSelected = selectedDate === day.dateStr;
          const hasActivity = day.data && day.data.screenedCount > 0;
          const hasBreaches = day.data && day.data.breachCount > 0;
          const isHighVolume = day.data && day.data.screenedCount > 10;
          
          // Breaches Mode: Dim days without breaches, highlight days with breaches
          const isBreachMode = viewMode === 'breaches';
          const shouldDim = isBreachMode && !hasBreaches;
          const shouldHighlight = isBreachMode && hasBreaches;
          
          return (
            <motion.button
              key={day.dateStr}
              onClick={() => onDateSelect(day.dateStr)}
              whileHover={{ scale: shouldDim ? 1 : 1.02 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "aspect-square rounded-lg border-2 transition-all duration-200 relative overflow-hidden",
                "hover:bg-slate-50 active:scale-95",
                // Selected state (overrides everything)
                isSelected && "bg-cyan-500/10 border-cyan-500 shadow-lg shadow-cyan-500/20",
                // Breaches Mode
                shouldDim && "opacity-30 grayscale",
                shouldHighlight && !isSelected && "bg-red-50 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]",
                // Volume Mode (default)
                !isBreachMode && !isSelected && "bg-white border-slate-200",
                !isBreachMode && isHighVolume && !isSelected && "bg-cyan-50 border-cyan-300",
                !isBreachMode && hasBreaches && "border-red-400 animate-pulse"
              )}
              style={!isBreachMode && isHighVolume && !isSelected ? {
                boxShadow: 'inset 0 0 10px rgba(6,182,212,0.1)'
              } : undefined}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn(
                  "text-sm font-semibold",
                  isSelected ? "text-cyan-700" : 
                  shouldHighlight ? "text-red-700" :
                  hasActivity ? "text-slate-700" : "text-slate-400"
                )}>
                  {day.dayNum}
                </span>
                {hasActivity && !isBreachMode && (
                  <div className="flex gap-0.5 mt-1">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      hasBreaches ? "bg-red-500" : "bg-emerald-500"
                    )} />
                  </div>
                )}
              </div>
              {hasActivity && (
                <div className={cn(
                  "absolute bottom-1 right-1 text-[9px] font-bold",
                  shouldHighlight ? "text-red-700" : "text-slate-500"
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
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200'
  };

  return (
    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-black text-slate-900">{value.toLocaleString()}</p>
          {trend && (
            <p className="text-xs text-slate-500 mt-1">{trend}</p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-xl border-2", colorClasses[color])}>
          <Icon className="w-5 h-5" />
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
    <div className="space-y-3">
      {groupedGeography.map((state) => {
        const isStateExpanded = expandedStates.has(state.stateName);
        
        return (
          <div key={state.stateName} className="space-y-2">
            <button
              onClick={() => toggleState(state.stateName)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-slate-600" />
                <span className="font-bold text-slate-900">{state.stateName}</span>
                <Badge variant="default" className="bg-slate-200 text-slate-700 text-xs">
                  {state.totalPatients} patients
                </Badge>
              </div>
              <motion.div
                animate={{ rotate: isStateExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </motion.div>
            </button>

            <AnimatePresence>
              {isStateExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-6 space-y-2"
                >
                  {state.districts.map((district) => {
                    const districtKey = `${state.stateName}-${district.districtName}`;
                    const isDistrictExpanded = expandedDistricts.has(districtKey);
                    
                    return (
                      <div key={districtKey} className="space-y-2">
                        <button
                          onClick={() => toggleDistrict(districtKey)}
                          className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 text-sm">{district.districtName}</span>
                            <Badge variant="default" className="bg-cyan-100 text-cyan-700 text-xs">
                              {district.totalPatients}
                            </Badge>
                          </div>
                          <motion.div
                            animate={{ rotate: isDistrictExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          </motion.div>
                        </button>

                        <AnimatePresence>
                          {isDistrictExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="ml-4 space-y-1.5"
                            >
                              {district.facilities.map((facility) => (
                                <motion.button
                                  key={facility.facilityName}
                                  onClick={() => onFacilityClick(facility.facilityName)}
                                  whileHover={{ scale: 1.01, x: 4 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-200/50 hover:border-cyan-300 hover:shadow-md rounded-lg transition-all group"
                                >
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-600" />
                                    <span className="text-sm font-medium text-slate-900 group-hover:text-cyan-900">
                                      {facility.facilityName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-cyan-600 bg-cyan-50 border-cyan-200/50 text-xs font-bold">
                                      {facility.patientCount} screened
                                    </Badge>
                                    {facility.pendingCount > 0 && (
                                      <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200/50 text-xs font-bold">
                                        {facility.pendingCount} pending
                                      </Badge>
                                    )}
                                    <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-600" />
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
export default function Vertex() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string>('All');
  const [filterDistrict, setFilterDistrict] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'volume' | 'breaches'>('volume');
  
  const { data: globalPatients = [], isLoading } = useSWRAllPatients();

  // Extract available states and districts
  const { availableStates, availableDistricts } = useMemo(() => {
    const states = new Set<string>();
    const districts = new Set<string>();
    
    globalPatients.forEach((patient: any) => {
      const state = patient.screening_state;
      const district = patient.screening_district;
      if (state) states.add(state);
      if (district) districts.add(district);
    });
    
    return {
      availableStates: Array.from(states).sort(),
      availableDistricts: Array.from(districts).sort()
    };
  }, [globalPatients]);

  // Task 3: Derive Calendar Data from globalPatients (Single Source of Truth) with Filters
  const heatmapData = useMemo(() => {
    if (!globalPatients || !globalPatients.length) return [];
    
    // Apply geographic filters
    const filteredPatients = globalPatients.filter((patient: any) => {
      const stateMatch = filterState === 'All' || patient.screening_state === filterState;
      const districtMatch = filterDistrict === 'All' || patient.screening_district === filterDistrict;
      return stateMatch && districtMatch;
    });
    
    const grouped = filteredPatients.reduce((acc: Record<string, MonthlyHeatmapData>, patient: any) => {
      // Use the exact same date logic as the briefing pane
      const dateValue = patient.screening_date || patient.submitted_on;
      const normalizedDate = getLocalYMD(dateValue);
      
      if (!normalizedDate) return acc;
      
      if (!acc[normalizedDate]) {
        acc[normalizedDate] = { date: normalizedDate, screenedCount: 0, breachCount: 0 };
      }
      acc[normalizedDate].screenedCount++;
      if (!patient.referral_date) acc[normalizedDate].breachCount++;
      return acc;
    }, {});

    return Object.values(grouped);
  }, [globalPatients, filterState, filterDistrict]);

  const patientsForSelectedDate = useMemo(() => {
    if (!selectedDate || !globalPatients.length) return [];
    
    return globalPatients.filter((patient: any) => {
      const dateValue = patient.screening_date || patient.submitted_on;
      const normalizedDate = getLocalYMD(dateValue);
      const dateMatch = normalizedDate === selectedDate;
      
      // Apply geographic filters
      const stateMatch = filterState === 'All' || patient.screening_state === filterState;
      const districtMatch = filterDistrict === 'All' || patient.screening_district === filterDistrict;
      
      return dateMatch && stateMatch && districtMatch;
    });
  }, [selectedDate, globalPatients, filterState, filterDistrict]);

  // Task 1: Data Aggregation - Daily Sparks
  const dailySparks = useMemo((): DailySparks => {
    const totalScreened = patientsForSelectedDate.length;
    const pendingSputum = patientsForSelectedDate.filter((p: any) => !p.referral_date).length;
    const diagnosed = patientsForSelectedDate.filter((p: any) => p.tb_diagnosed === 'Y').length;
    const onTrack = totalScreened - pendingSputum;

    return { totalScreened, pendingSputum, diagnosed, onTrack };
  }, [patientsForSelectedDate]);

  // Task 1: Data Aggregation - Grouped Geography
  const groupedGeography = useMemo((): StateData[] => {
    const stateMap = new Map<string, Map<string, Map<string, any[]>>>();

    patientsForSelectedDate.forEach((patient: any) => {
      const state = patient.screening_state || 'Unknown State';
      const district = patient.screening_district || 'Unknown District';
      const facility = patient.facility_name || 'Unknown Facility';

      if (!stateMap.has(state)) {
        stateMap.set(state, new Map());
      }
      const districtMap = stateMap.get(state)!;

      if (!districtMap.has(district)) {
        districtMap.set(district, new Map());
      }
      const facilityMap = districtMap.get(district)!;

      if (!facilityMap.has(facility)) {
        facilityMap.set(facility, []);
      }
      facilityMap.get(facility)!.push(patient);
    });

    return Array.from(stateMap.entries()).map(([stateName, districtMap]) => {
      const districts = Array.from(districtMap.entries()).map(([districtName, facilityMap]) => {
        const facilities = Array.from(facilityMap.entries()).map(([facilityName, patients]) => ({
          facilityName,
          patientCount: patients.length,
          pendingCount: patients.filter((p: any) => !p.referral_date).length
        }));

        return {
          districtName,
          facilities,
          totalPatients: facilities.reduce((sum, f) => sum + f.patientCount, 0)
        };
      });

      return {
        stateName,
        districts,
        totalPatients: districts.reduce((sum, d) => sum + d.totalPatients, 0)
      };
    });
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
    <div className="h-screen w-full bg-[#FBFBFD] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-50/50 via-[#FBFBFD] to-[#FBFBFD]" />
      
      <div className="relative h-full grid grid-cols-[40%_60%] gap-6 p-6">
        {/* Left Pane: Calendar */}
        <Card className="bg-white/90 backdrop-blur-xl border-slate-200 shadow-xl p-6 overflow-hidden">
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
          <CalendarGrid
            heatmapData={heatmapData}
            currentDate={currentDate}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            viewMode={viewMode}
          />
          
          {/* Monthly Pulse Console */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Screened</div>
                <div className="text-xs font-bold text-slate-500">
                  <span className="text-2xl text-slate-900">
                    {heatmapData.reduce((sum, day) => sum + day.screenedCount, 0).toLocaleString()}
                  </span>
                  {' '}this month
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pending</div>
                <div className="text-xs font-bold text-slate-500">
                  <span className="text-2xl text-red-600">
                    {heatmapData.reduce((sum, day) => sum + day.breachCount, 0).toLocaleString()}
                  </span>
                  {' '}follow-ups
                </div>
              </div>
            </div>
            
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'volume' | 'breaches')} className="w-[200px]">
              <TabsList className="grid w-full grid-cols-2 h-8 bg-slate-100 border border-slate-200">
                <TabsTrigger value="volume" className="text-xs h-7 data-[state=active]:bg-white data-[state=active]:text-cyan-700 data-[state=active]:shadow-sm">
                  Volume
                </TabsTrigger>
                <TabsTrigger value="breaches" className="text-xs h-7 data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-sm">
                  Breaches
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Card>

        {/* Right Pane: Daily Briefing */}
        <Card className="bg-white/90 backdrop-blur-xl border-slate-200 shadow-xl overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {selectedDate ? (
              <motion.div
                key={selectedDate}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springConfig}
                className="h-full flex flex-col"
              >
                {/* Task 2: Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{formattedDate}</h3>
                    <p className="text-sm text-slate-600 mt-0.5">Daily Briefing</p>
                  </div>
                  <Button
                    onClick={handleClearDate}
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6">
                    {/* Task 2: The Sparks */}
                    <div className="grid grid-cols-2 gap-4">
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
                        label="Pending Sputum"
                        value={dailySparks.pendingSputum}
                        color="amber"
                      />
                      <SparkCard 
                        icon={Activity}
                        label="Diagnosed"
                        value={dailySparks.diagnosed}
                        color="red"
                      />
                    </div>

                    {/* Task 2: The Hierarchy List */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-600" />
                        Geographic Breakdown
                      </h4>
                      <GeographicHierarchy 
                        groupedGeography={groupedGeography}
                        onFacilityClick={handleFacilityClick}
                      />
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
                className="flex items-center justify-center h-full"
              >
                <div className="text-center">
                  <CalendarIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-700 mb-2">Select a Date</h3>
                  <p className="text-sm text-slate-500 max-w-xs">
                    Click on any date in the calendar to view the daily briefing and patient breakdown
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
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
