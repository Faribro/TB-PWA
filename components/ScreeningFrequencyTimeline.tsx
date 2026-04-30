'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Database, AlertCircle } from 'lucide-react';

interface ScreeningFrequencyTimelineProps {
  patients: any[];
  year: number;
  currentMonth: number;
  isLoading: boolean;
  error?: Error | null;
}

export function ScreeningFrequencyTimeline({ 
  patients, 
  year, 
  currentMonth,
  isLoading,
  error
}: ScreeningFrequencyTimelineProps) {
  
  // Data Aggregation
  const monthlyData = useMemo(() => {
    if (!patients || patients.length === 0) return Array(12).fill(0);
    
    const data = Array(12).fill(0);
    for (let i = 0; i < patients.length; i++) {
      const p = patients[i];
      if (!p) continue;
      const dateValue = p.screening_date || p.submitted_on;
      if (!dateValue) continue;
      
      const date = new Date(dateValue);
      if (date.getFullYear() === year) {
        data[date.getMonth()] += 1;
      }
    }
    return data;
  }, [patients, year]);

  const hasData = useMemo(() => monthlyData.some(v => v > 0), [monthlyData]);
  const maxValue = Math.max(...monthlyData, 1);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Layout Constants
  const MIN_SECTION_HEIGHT = 200;
  const BAR_AREA_HEIGHT = 140;

  // --- RENDER STATES ---

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center bg-rose-50/50 rounded-2xl border border-rose-100" style={{ minHeight: `${MIN_SECTION_HEIGHT}px` }}>
        <AlertCircle className="w-8 h-8 text-rose-400 mb-3" />
        <h3 className="text-sm font-bold text-rose-900">Failed to load timeline data</h3>
        <p className="text-xs text-rose-600 mt-1">Please try refreshing the page</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full relative bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm flex flex-col" style={{ minHeight: `${MIN_SECTION_HEIGHT}px` }}>
        <Skeleton className="h-6 w-48 mb-8" />
        <div className="flex items-end justify-between gap-2 flex-1 mt-auto pb-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-3">
              <Skeleton className="w-full max-w-[28px] rounded-t-md" style={{ height: `${Math.max(20, Math.random() * 120)}px` }} />
              <Skeleton className="h-3 w-6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100/50 relative overflow-hidden" style={{ minHeight: `${MIN_SECTION_HEIGHT}px` }}>
        {/* Decorative background grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-4 text-slate-300">
            <Database className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-1">No Activity in {year}</h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            There are no patient screening records logged for this selected year.
          </p>
        </div>
      </div>
    );
  }

  // --- SUCCESS STATE ---
  return (
    <div className="w-full relative bg-white/60 backdrop-blur-sm rounded-2xl p-6 pt-8 border border-white/50 shadow-lg flex flex-col" style={{ minHeight: `${MIN_SECTION_HEIGHT}px` }}>

      {/* Chart Area */}
      <div className="relative flex-1 flex flex-col justify-end mt-auto">
        {/* Horizontal grid lines mapping to values */}
        <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-between pointer-events-none pb-8 z-0">
          {[0, 1, 2, 3].map((_, i, arr) => {
            const isTop = i === 0;
            return (
              <div key={i} className="w-full border-t border-dashed border-slate-200/70 relative">
                {isTop && (
                  <span className="absolute -top-2.5 -left-2 text-[9px] font-bold text-slate-300 bg-white/80 px-1">
                    {maxValue.toLocaleString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Bars Container */}
        <div className="flex items-end gap-1.5 sm:gap-2 h-full z-10 relative">
          {months.map((month, index) => {
            const value = monthlyData[index];
            // Minimum 6px height if value > 0 for visibility
            const barHeight = value > 0 ? Math.max(Math.round((value / maxValue) * BAR_AREA_HEIGHT), 6) : 0;
            const isCurrentMonth = index === currentMonth;
            const hasMonthData = value > 0;

            return (
              <div key={month} className="flex-1 flex flex-col items-center group relative h-full justify-end pb-8">
                {/* Tooltip (Hover) */}
                {hasMonthData && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 opacity-0 group-hover:opacity-100 group-hover:-translate-y-[calc(100%+4px)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] z-30 pointer-events-none">
                    <div className="bg-slate-900 text-white text-[11px] px-3 py-1.5 rounded-lg whitespace-nowrap font-bold shadow-xl">
                      {value.toLocaleString()}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[90%] w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-transparent border-t-slate-900" />
                    </div>
                  </div>
                )}

                {/* The Bar */}
                <div className="w-full flex items-end justify-center px-0.5 sm:px-1">
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: barHeight, opacity: 1 }}
                    transition={{ duration: 0.8, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    className={`w-full max-w-[32px] rounded-t-lg relative overflow-hidden transition-transform duration-300 group-hover:scale-x-[1.15] cursor-default ${
                      !hasMonthData ? '' :
                      isCurrentMonth
                        ? 'shadow-[0_4px_16px_rgba(79,70,229,0.3)]'
                        : 'shadow-sm group-hover:shadow-md'
                    }`}
                    style={{
                      background: !hasMonthData ? 'transparent' :
                        isCurrentMonth
                          ? 'linear-gradient(180deg, #6366f1 0%, #818cf8 100%)'
                          : 'linear-gradient(180deg, #94a3b8 0%, #cbd5e1 100%)',
                    }}
                  >
                    {/* Inner highlight for glass effect */}
                    {hasMonthData && (
                      <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                    )}
                  </motion.div>
                </div>

                {/* Month Label pinned to bottom */}
                <div className="absolute bottom-0 w-full flex flex-col items-center">
                  <div className={`text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors duration-200 ${
                    isCurrentMonth ? 'text-indigo-600' : 
                    hasMonthData ? 'text-slate-500 group-hover:text-slate-700' : 'text-slate-300'
                  }`}>
                    {month}
                  </div>
                  {/* Current month dot indicator */}
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 transition-all duration-300 ${
                    isCurrentMonth ? 'bg-indigo-500 scale-100 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-transparent scale-0'
                  }`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
