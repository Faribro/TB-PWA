'use client';

import React, { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, AlertCircle } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ScreeningFrequencyTimelineProps {
  patients?: any[];
  /**
   * Pre-aggregated monthly screened counts (index 0=Jan … 11=Dec).
   * When provided, the raw patient scan is skipped entirely.
   */
  monthlyBreakdown?: number[];
  year: number;
  currentMonth: number;
  isLoading: boolean;
  error?: Error | null;
}

export function ScreeningFrequencyTimeline({ 
  patients = [], 
  monthlyBreakdown,
  year, 
  currentMonth,
  isLoading,
  error
}: ScreeningFrequencyTimelineProps) {
  
  // Data Aggregation — prefers server-provided breakdown over raw scan
  const monthlyData = useMemo(() => {
    // If server breakdown is provided, use it directly (accurate full-dataset counts)
    if (monthlyBreakdown && monthlyBreakdown.length === 12) {
      return monthlyBreakdown.map(count => ({ count, corrected: 0 }));
    }
    // Fallback: derive from patient rows (may only cover paginated subset)
    if (!patients || patients.length === 0) return Array(12).fill(0).map(() => ({ count: 0, corrected: 0 }));
    
    const data = Array(12).fill(0).map(() => ({ count: 0, corrected: 0 }));
    for (let i = 0; i < patients.length; i++) {
      const p = patients[i];
      if (!p) continue;
      const dateValue = p.screening_date || p.submitted_on;
      if (!dateValue) continue;
      
      const date = new Date(dateValue);
      if (date.getFullYear() === year) {
        const monthIndex = date.getMonth();
        data[monthIndex].count += 1;
        if (p.date_corrected === true) {
          data[monthIndex].corrected += 1;
        }
      }
    }
    return data;
  }, [patients, monthlyBreakdown, year]);

  const hasData = useMemo(() => monthlyData.some(v => v.count > 0), [monthlyData]);
  const maxValue = Math.max(...monthlyData.map(m => m.count), 1);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const chartData = useMemo(() => {
    return months.map((month, index) => {
      const monthData = monthlyData[index];
      return {
        name: month,
        count: monthData.count,
        corrected: monthData.corrected,
        isCurrent: index === currentMonth
      };
    });
  }, [monthlyData, currentMonth]);

  const CustomTick = (props: any) => {
    const { x, y, payload, index } = props;
    const isCurrentMonth = index === currentMonth;
    const hasMonthData = monthlyData[index]?.count > 0;
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={14}
          textAnchor="middle"
          className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.12em] transition-colors duration-200"
          style={{
            fill: isCurrentMonth ? '#4f46e5' : hasMonthData ? '#475569' : '#94a3b8'
          }}
        >
          {payload.value}
        </text>
        {isCurrentMonth && (
          <circle
            cx={0}
            cy={24}
            r={3}
            fill="#4f46e5"
          />
        )}
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = data.count;
      const correctedCount = data.corrected;
      const hasCorrectedDates = correctedCount > 0;
      if (value === 0) return null;
      return (
        <div className="bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl whitespace-nowrap font-black shadow-2xl border border-slate-700">
          {value.toLocaleString()} screened
          {hasCorrectedDates && (
            <div className="text-[10px] text-amber-300 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {correctedCount} date{correctedCount > 1 ? 's' : ''} corrected
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center bg-rose-50/50 rounded-b-[18px] border border-rose-100 py-6">
        <AlertCircle className="w-8 h-8 text-rose-400 mb-3" />
        <h3 className="text-sm font-bold text-rose-900">Failed to load timeline data</h3>
        <p className="text-xs text-rose-600 mt-1">Please try refreshing the page</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full relative rounded-b-[18px] p-6 pb-6 flex flex-col gap-2">
        <div className="flex items-end justify-between gap-2 flex-1 mt-auto pb-2 h-[120px]">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-3">
              <Skeleton className="w-full max-w-[28px] rounded-t-md" style={{ height: `${Math.max(20, Math.random() * 80)}px` }} />
              <Skeleton className="h-3 w-6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-b-[18px] py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-4 text-slate-300">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-1">No Activity in {year}</h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            There are no patient screening records logged for this selected year.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative flex flex-col pb-0">
      <div className="relative h-[180px] sm:h-[200px] lg:h-[220px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="activeBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#c7d2fe" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.2} vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={<CustomTick />} 
              tickLine={false} 
              axisLine={false} 
              interval={0}
              height={35}
            />
            <YAxis hide={true} domain={[0, maxValue * 1.15]} />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: 'rgba(99, 102, 241, 0.03)', radius: 6 }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => {
                const isCurrent = index === currentMonth;
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={isCurrent ? "url(#activeBarGradient)" : "#e2e8f0"} 
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
