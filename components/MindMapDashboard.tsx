'use client';

import { useMemo, useState, useEffect, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import { Activity, Stethoscope, Pill, Shield, X } from 'lucide-react';
import { useTreeFilter } from '@/contexts/TreeFilterContext';
import { calculatePatientPhase } from '@/lib/phase-engine';

interface Patient {
  screening_date: string;
  submitted_on?: string;
  referral_date: string | null;
  tb_diagnosed: string | null;
  att_start_date: string | null;
  screening_district: string;
}

interface MindMapProps {
  patients: Patient[];
}

interface TreeNode {
  name: string;
  value: number;
  screened: number;
  diagnosed: number;
  pending: number;
  children?: TreeNode[];
  year?: number;
  month?: number;
  district?: string;
  date?: string;
}

const ACTION_TYPES = [
  { id: 'sputum', label: 'Sputum & Referral', icon: Activity, color: 'cyan' },
  { id: 'diagnosis', label: 'Diagnosis Update', icon: Stethoscope, color: 'emerald' },
  { id: 'treatment', label: 'Treatment Update', icon: Pill, color: 'purple' },
  { id: 'admin', label: 'Administration', icon: Shield, color: 'slate' }
] as const;

export default function MindMapDashboard({ patients }: MindMapProps) {
  const { filter, setFilter, clearFilter } = useTreeFilter();
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [expandedDistrict, setExpandedDistrict] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedDate) {
        console.log('ESC key pressed - closing modal');
        setSelectedDate(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedDate]);

  const treeData = useMemo(() => {
    const yearMap = new Map<number, Map<number, Map<string, { screened: number; diagnosed: number; pending: number }>>>();
    let totalDiagnosed = 0;
    let totalPending = 0;

    patients.forEach(p => {
      const dateValue = p.screening_date || p.submitted_on;
      if (!dateValue || !p.screening_district) return;
      
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return;

      const year = date.getFullYear();
      const month = date.getMonth();
      const district = p.screening_district;
      const isDiagnosed = p.tb_diagnosed === 'Y';
      const isPending = !p.referral_date;

      if (isDiagnosed) totalDiagnosed++;
      if (isPending) totalPending++;

      if (!yearMap.has(year)) yearMap.set(year, new Map());
      const monthMap = yearMap.get(year)!;
      if (!monthMap.has(month)) monthMap.set(month, new Map());
      const districtMap = monthMap.get(month)!;
      if (!districtMap.has(district)) {
        districtMap.set(district, { screened: 0, diagnosed: 0, pending: 0 });
      }
      const stats = districtMap.get(district)!;
      stats.screened++;
      if (isDiagnosed) stats.diagnosed++;
      if (isPending) stats.pending++;
    });

    const root: TreeNode = {
      name: 'Root',
      value: patients.length,
      screened: patients.length,
      diagnosed: totalDiagnosed,
      pending: totalPending,
      children: Array.from(yearMap.entries()).map(([year, monthMap]) => {
        let yearScreened = 0, yearDiagnosed = 0, yearPending = 0;
        const monthChildren = Array.from(monthMap.entries()).map(([month, districtMap]) => {
          let monthScreened = 0, monthDiagnosed = 0, monthPending = 0;
          const districtChildren = Array.from(districtMap.entries()).map(([district, stats]) => {
            monthScreened += stats.screened;
            monthDiagnosed += stats.diagnosed;
            monthPending += stats.pending;
            return {
              name: district,
              district,
              value: stats.screened,
              screened: stats.screened,
              diagnosed: stats.diagnosed,
              pending: stats.pending
            };
          });
          yearScreened += monthScreened;
          yearDiagnosed += monthDiagnosed;
          yearPending += monthPending;
          return {
            name: new Date(year, month).toLocaleString('default', { month: 'short' }),
            month,
            value: monthScreened,
            screened: monthScreened,
            diagnosed: monthDiagnosed,
            pending: monthPending,
            children: districtChildren
          };
        });
        return {
          name: year.toString(),
          year,
          value: yearScreened,
          screened: yearScreened,
          diagnosed: yearDiagnosed,
          pending: yearPending,
          children: monthChildren
        };
      })
    };

    return root;
  }, [patients]);

  const hierarchy = useMemo(() => d3.hierarchy(treeData), [treeData]);

  const handleYearClick = (year: number) => {
    setExpandedYear(expandedYear === year ? null : year);
    setExpandedMonth(null);
    setExpandedDistrict(null);
    setSelectedDate(null);
  };

  const handleMonthClick = (year: number, month: number) => {
    setExpandedMonth(expandedMonth === month ? null : month);
    setExpandedDistrict(null);
    setSelectedDate(null);
  };

  const handleDistrictClick = (district: string) => {
    setExpandedDistrict(expandedDistrict === district ? null : district);
    setSelectedDate(null);
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(selectedDate === date ? null : date);
  };

  const handleActionClick = (actionType: 'sputum' | 'diagnosis' | 'treatment' | 'admin') => {
    console.log('🎯 Action clicked:', actionType);
    
    if (!expandedYear || expandedMonth === null || !expandedDistrict || !selectedDate) {
      console.error('❌ Missing context data');
      return;
    }
    
    // 1. Lock in the exact primitive values so they survive the modal unmounting
    const exactFilterPayload = { 
      year: expandedYear, 
      month: expandedMonth, 
      district: expandedDistrict, 
      date: selectedDate, 
      actionType 
    };
    
    // 2. High Priority UI Update: Close the modal instantly
    console.log('🚪 Closing modal instantly via high-priority update');
    setSelectedDate(null); 
    
    // 3. Low Priority Background Task: Run the heavy 14k record filter safely
    startTransition(() => {
      console.log('✅ Setting context filter in background transition:', exactFilterPayload);
      setFilter(exactFilterPayload);
    });
  };

  const datePatientMap = useMemo(() => {
    const map = new Map<string, Patient[]>();
    patients.forEach(p => {
      const dateValue = p.screening_date || p.submitted_on;
      if (!dateValue) return;
      
      const pDate = new Date(dateValue);
      if (isNaN(pDate.getTime())) return;
      
      const dateStr = pDate.toISOString().split('T')[0];
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(p);
    });
    return map;
  }, [patients]);

  const getMonthDates = useMemo(() => {
    const dateCache = new Map<string, { date: string; count: number; pending: number }[]>();
    
    return (year: number, month: number, district: string) => {
      const cacheKey = `${year}-${month}-${district}`;
      if (dateCache.has(cacheKey)) {
        return dateCache.get(cacheKey)!;
      }
      
      const dates: { date: string; count: number; pending: number }[] = [];
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayPatients = (datePatientMap.get(dateStr) || []).filter(p => p.screening_district === district);
        
        if (dayPatients.length > 0) {
          dates.push({
            date: dateStr,
            count: dayPatients.length,
            pending: dayPatients.filter(p => !p.referral_date).length
          });
        }
      }
      
      dateCache.set(cacheKey, dates);
      return dates;
    };
  }, [datePatientMap]);

  const getPendingCount = useMemo(() => {
    const countCache = new Map<string, number>();
    
    return (date: string, actionType: string) => {
      const cacheKey = `${date}-${actionType}`;
      if (countCache.has(cacheKey)) {
        return countCache.get(cacheKey)!;
      }
      
      const dayPatients = datePatientMap.get(date) || [];

      let count = 0;
      switch (actionType) {
        case 'sputum': 
          count = dayPatients.filter(p => !p.referral_date).length;
          break;
        case 'diagnosis': 
          count = dayPatients.filter(p => p.referral_date && !p.tb_diagnosed).length;
          break;
        case 'treatment': 
          count = dayPatients.filter(p => p.tb_diagnosed === 'Y' && !p.att_start_date).length;
          break;
        case 'admin':
          count = dayPatients.length;
          break;
        default: 
          count = 0;
      }
      
      countCache.set(cacheKey, count);
      return count;
    };
  }, [datePatientMap]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-blue-100/40 via-cyan-50/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-purple-100/30 via-pink-50/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-radial from-cyan-50/20 to-transparent rounded-full blur-2xl" />
      </div>
      
      <div className="relative z-10 p-8 overflow-y-auto light-scrollbar">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-black bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 bg-clip-text text-transparent mb-3">Vertex</h1>
          <p className="text-slate-600 text-lg font-medium">Spatial navigation through {patients.length.toLocaleString()} records</p>
        </motion.div>

        <div className="space-y-6">
          {hierarchy.children?.map((yearNode, idx) => {
            const year = yearNode.data.year!;
            const isExpanded = expandedYear === year;

            return (
              <motion.div
                key={year}
                layoutId={`year-${year}`}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0, duration: 0.2 }}
              >
                <motion.button
                  onClick={() => handleYearClick(year)}
                  className="w-full group relative"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.1 }}
                >
                  <div className="relative backdrop-blur-xl bg-white/90 border border-slate-200/60 rounded-3xl p-8 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 group-hover:scale-[1.01]">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-cyan-50/30 to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                    
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-8">
                        <div className="text-6xl font-black bg-gradient-to-br from-slate-900 to-blue-900 bg-clip-text text-transparent">{year}</div>
                        
                        <div className="flex gap-8">
                          <div className="text-center">
                            <div className="text-3xl font-black bg-gradient-to-br from-cyan-600 to-blue-600 bg-clip-text text-transparent">{yearNode.data.screened}</div>
                            <div className="text-xs font-bold text-cyan-600/70 uppercase tracking-widest">Screened</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-black bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent">{yearNode.data.diagnosed}</div>
                            <div className="text-xs font-bold text-purple-600/70 uppercase tracking-widest">Diagnosed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-black bg-gradient-to-br from-amber-600 to-orange-600 bg-clip-text text-transparent">{yearNode.data.pending}</div>
                            <div className="text-xs font-bold text-amber-600/70 uppercase tracking-widest">Pending</div>
                          </div>
                        </div>
                      </div>

                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        className="text-slate-400 text-2xl font-light"
                      >
                        →
                      </motion.div>
                    </div>
                  </div>
                </motion.button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="ml-12 mt-4 space-y-3"
                    >
                      {yearNode.children?.map((monthNode, mIdx) => {
                        const month = monthNode.data.month!;
                        const isMonthExpanded = expandedMonth === month;

                        return (
                          <motion.div
                            key={month}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0, duration: 0.15 }}
                          >
                            <motion.button
                              onClick={() => handleMonthClick(year, month)}
                              className="w-full group relative"
                              whileHover={{ scale: 1.01 }}
                              transition={{ duration: 0.1 }}
                            >
                              <div className="backdrop-blur-xl bg-white/80 border border-slate-200/60 rounded-2xl p-5 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-6">
                                    <div className="text-2xl font-black bg-gradient-to-br from-slate-800 to-purple-800 bg-clip-text text-transparent">{monthNode.data.name}</div>
                                    
                                    <div className="flex gap-4 text-sm font-bold">
                                      <span className="text-cyan-600">{monthNode.data.screened}</span>
                                      <span className="text-purple-600">{monthNode.data.diagnosed}</span>
                                      <span className="text-amber-600">{monthNode.data.pending}</span>
                                    </div>
                                  </div>

                                  <motion.div
                                    animate={{ rotate: isMonthExpanded ? 90 : 0 }}
                                    className="text-slate-400 text-lg"
                                  >
                                    →
                                  </motion.div>
                                </div>
                              </div>
                            </motion.button>

                            <AnimatePresence>
                              {isMonthExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="ml-8 mt-3 space-y-2"
                                >
                                  {monthNode.children?.map((districtNode, dIdx) => {
                                    const district = districtNode.data.district!;
                                    const isDistrictExpanded = expandedDistrict === district;

                                    return (
                                      <motion.div
                                        key={district}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0, duration: 0.15 }}
                                      >
                                        <motion.button
                                          onClick={() => handleDistrictClick(district)}
                                          className="w-full group relative"
                                          whileHover={{ scale: 1.005 }}
                                          transition={{ duration: 0.1 }}
                                        >
                                          <div className="backdrop-blur-xl bg-white/70 border border-slate-200/50 rounded-xl p-4 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-4">
                                                <div className="text-lg font-black bg-gradient-to-br from-slate-700 to-emerald-700 bg-clip-text text-transparent">{district}</div>
                                                
                                                <div className="flex gap-3 text-xs font-bold">
                                                  <span className="text-cyan-600">{districtNode.data.screened}</span>
                                                  <span className="text-purple-600">{districtNode.data.diagnosed}</span>
                                                  <span className="text-amber-600">{districtNode.data.pending}</span>
                                                </div>
                                              </div>

                                              <motion.div
                                                animate={{ rotate: isDistrictExpanded ? 90 : 0 }}
                                                className="text-slate-400 text-sm"
                                              >
                                                →
                                              </motion.div>
                                            </div>
                                          </div>
                                        </motion.button>

                                        <AnimatePresence>
                                          {isDistrictExpanded && (
                                            <motion.div
                                              initial={{ opacity: 0, height: 0 }}
                                              animate={{ opacity: 1, height: 'auto' }}
                                              exit={{ opacity: 0, height: 0 }}
                                              transition={{ duration: 0.15 }}
                                              className="ml-6 mt-2"
                                            >
                                              <div className="grid grid-cols-7 gap-2">
                                                {getMonthDates(year, month, district).map((dateData, dayIdx) => (
                                                  <motion.button
                                                    key={dateData.date}
                                                    onClick={() => {
                                                      setExpandedYear(year);
                                                      setExpandedMonth(month);
                                                      setExpandedDistrict(district);
                                                      handleDateClick(dateData.date);
                                                    }}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0, duration: 0.1 }}
                                                    whileHover={{ scale: 1.1 }}
                                                    className="relative group"
                                                  >
                                                    <div
                                                      className={`aspect-square rounded-xl border-2 transition-all shadow-lg ${
                                                        dateData.pending > 0
                                                          ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-300 hover:border-red-400 hover:shadow-red-200 animate-pulse'
                                                          : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 hover:border-emerald-400 hover:shadow-emerald-200'
                                                      }`}
                                                    >
                                                      <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className={`text-sm font-black ${
                                                          dateData.pending > 0 ? 'text-red-700' : 'text-emerald-700'
                                                        }`}>
                                                          {new Date(dateData.date).getDate()}
                                                        </span>
                                                      </div>
                                                    </div>
                                                    
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                      <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white whitespace-nowrap shadow-2xl">
                                                        <div className="font-bold">{dateData.count} patients</div>
                                                        {dateData.pending > 0 && (
                                                          <div className="text-red-300 text-[10px] mt-0.5">{dateData.pending} pending</div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </motion.button>
                                                ))}
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </motion.div>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-8 bg-black/40 backdrop-blur-xl"
          onClick={() => {
            console.log('🚪 Backdrop clicked - closing');
            setSelectedDate(null);
          }}
        >
          <div
            className="relative w-full max-w-6xl bg-white/95 border border-slate-200/60 rounded-[2rem] p-10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-4xl font-black bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">Spark</h2>
                <p className="text-slate-600 mt-2 text-lg font-medium">{new Date(selectedDate).toLocaleDateString('en-US', { dateStyle: 'full' })}</p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('❌ Close button explicitly clicked');
                  setSelectedDate(null);
                }}
                className="w-12 h-12 rounded-2xl bg-red-500 hover:bg-red-600 flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {ACTION_TYPES.map((action, idx) => {
                const Icon = action.icon;
                const count = getPendingCount(selectedDate, action.id);
                
                const colorClasses = {
                  cyan: {
                    bg: 'bg-gradient-to-br from-cyan-50 to-blue-50',
                    border: 'border-cyan-200',
                    hoverBorder: 'hover:border-cyan-400',
                    hoverShadow: 'hover:shadow-2xl hover:shadow-cyan-500/20',
                    gradient: 'from-cyan-100/50 via-blue-100/30 to-cyan-100/50',
                    text: 'text-cyan-700',
                    icon: 'text-cyan-600'
                  },
                  emerald: {
                    bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
                    border: 'border-emerald-200',
                    hoverBorder: 'hover:border-emerald-400',
                    hoverShadow: 'hover:shadow-2xl hover:shadow-emerald-500/20',
                    gradient: 'from-emerald-100/50 via-teal-100/30 to-emerald-100/50',
                    text: 'text-emerald-700',
                    icon: 'text-emerald-600'
                  },
                  purple: {
                    bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
                    border: 'border-purple-200',
                    hoverBorder: 'hover:border-purple-400',
                    hoverShadow: 'hover:shadow-2xl hover:shadow-purple-500/20',
                    gradient: 'from-purple-100/50 via-pink-100/30 to-purple-100/50',
                    text: 'text-purple-700',
                    icon: 'text-purple-600'
                  },
                  slate: {
                    bg: 'bg-gradient-to-br from-slate-50 to-gray-50',
                    border: 'border-slate-200',
                    hoverBorder: 'hover:border-slate-400',
                    hoverShadow: 'hover:shadow-2xl hover:shadow-slate-500/20',
                    gradient: 'from-slate-100/50 via-gray-100/30 to-slate-100/50',
                    text: 'text-slate-700',
                    icon: 'text-slate-600'
                  }
                };
                
                const colors = colorClasses[action.color as keyof typeof colorClasses];

                return (
                  <button
                    key={action.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleActionClick(action.id as any);
                    }}
                    className="group relative w-full"
                    disabled={count === 0}
                  >
                    <div className={`backdrop-blur-xl ${colors.bg} border-2 ${colors.border} rounded-3xl p-10 ${colors.hoverBorder} ${colors.hoverShadow} transition-all duration-500 ${count === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl`} />
                      
                      <div className="relative">
                        <div className="mb-6 inline-flex p-4 rounded-2xl bg-white/80 shadow-lg">
                          <Icon className={`w-12 h-12 ${colors.icon}`} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-3">{action.label}</h3>
                        <div className={`text-5xl font-black mb-2 ${colors.text}`}>{count}</div>
                        <p className="text-slate-600 text-sm font-medium">{count === 1 ? 'patient' : 'patients'} pending action</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
