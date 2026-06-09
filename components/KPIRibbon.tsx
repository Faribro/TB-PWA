'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, AlertCircle, TrendingUp, CheckCircle, AlertTriangle, MapPin, Search } from 'lucide-react';
import { useUniversalFilter, FilterStatus } from '@/contexts/FilterContext';

interface Patient {
  id: number;
  screening_date: string;
  referral_date: string | null;
  tb_diagnosed: string | null;
  att_start_date: string | null;
  att_completion_date?: string | null;
  screening_district: string;
}

import { ChoroplethMetrics } from '@/hooks/useChoroplethDictionary';

interface KPIRibbonProps {
  filteredPatients: Patient[];
  compact?: boolean;
  choroplethDict?: Map<string, ChoroplethMetrics>;
}

interface KPIMetric {
  id: string;
  label: string;
  value: number;
  context: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  filterStatus?: FilterStatus;
}

import { useEntityStore } from '@/stores/useEntityStore';

// Helper: Calculate SLA breach
const isSLABreach = (patient: Patient): boolean => {
  const screeningDate = patient.screening_date ? new Date(patient.screening_date) : null;
  if (!screeningDate) return false;
  const daysSince = (Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24);
  return !patient.referral_date && daysSince > 7;
};

// Helper: Calculate Risk Score
// Formula: (Breach Rate * 0.7) + (Total Patients Weight * 0.3)
const calculateRiskScore = (breachRate: number, totalPatients: number): number => {
  const breachWeight = breachRate * 0.7;
  
  // Normalize patient count to 0-100 scale (assuming max 20,000 patients)
  const patientWeight = Math.min((totalPatients / 20000) * 100, 100) * 0.3;
  
  return Math.round(breachWeight + patientWeight);
};

export function KPIRibbon({ filteredPatients, compact = false, choroplethDict }: KPIRibbonProps) {
  const { filter, setStatus } = useUniversalFilter();
  const activeGISMetric = useEntityStore(s => s.activeGISMetric);
  const setActiveGISMetric = useEntityStore(s => s.setActiveGISMetric);

  const metrics = useMemo((): KPIMetric[] => {
    let screened = 0;
    let diagnosed = 0;
    let suspected = 0;
    let normal = 0;
    let initiated = 0;
    let completed = 0;
    let breaches = 0;
    let districts = 0;

    if (choroplethDict && choroplethDict.size > 0) {
      choroplethDict.forEach((metricsVal) => {
        screened += metricsVal.screened || 0;
        diagnosed += metricsVal.diagnosed || 0;
        suspected += metricsVal.suspected || 0;
        normal += metricsVal.normal || 0;
        initiated += metricsVal.initiated || 0;
        completed += metricsVal.completed || 0;
        breaches += metricsVal.breaches || 0;
      });
      districts = choroplethDict.size;
    } else {
      screened = filteredPatients.length;
      diagnosed = filteredPatients.filter(p => p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y').length;
      suspected = filteredPatients.filter(p => !p.tb_diagnosed || (p.tb_diagnosed !== 'Yes' && p.tb_diagnosed !== 'Y' && p.tb_diagnosed !== 'No')).length;
      normal = filteredPatients.filter(p => p.tb_diagnosed === 'No' || p.tb_diagnosed === 'N').length;
      initiated = filteredPatients.filter(p => p.att_start_date).length;
      completed = filteredPatients.filter(p => p.att_completion_date).length;
      breaches = filteredPatients.filter(isSLABreach).length;
      districts = new Set(filteredPatients.map(p => p.screening_district)).size;
    }

    const breachRate = screened > 0 ? (breaches / screened) * 100 : 0;

    // Calculate Risk Score
    const riskScore = calculateRiskScore(breachRate, screened);
    const meetsTarget = districts >= 40;

    return [
      {
        id: 'screened',
        label: 'Screened',
        value: screened,
        context: '100% baseline',
        icon: <Users className="w-5 h-5" />,
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/20',
        borderColor: 'border-cyan-500/60',
        filterStatus: 'All',
      },
      {
        id: 'diagnosed',
        label: 'Diagnosed',
        value: diagnosed,
        context: screened > 0 ? `${((diagnosed / screened) * 100).toFixed(1)}% of screened` : '0%',
        icon: <AlertCircle className="w-5 h-5" />,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        borderColor: 'border-amber-500/60',
        filterStatus: 'Diagnosed',
      },
      {
        id: 'suspected',
        label: 'Suspected',
        value: suspected,
        context: 'Awaiting diagnosis',
        icon: <Search className={`w-5 h-5`} />,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/60',
        filterStatus: 'Suspected',
      },
      {
        id: 'normal',
        label: 'Normal',
        value: normal,
        context: 'Confirmed Negative',
        icon: <CheckCircle className={`w-5 h-5`} />,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/60',
        filterStatus: 'Normal',
      },
      {
        id: 'initiated',
        label: 'Initiated (ATT)',
        value: initiated,
        context: screened > 0 ? `${((initiated / screened) * 100).toFixed(1)}% of screened` : '0%',
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/60',
        filterStatus: 'Initiated',
      },
      {
        id: 'completed',
        label: 'Completed',
        value: completed,
        context: screened > 0 ? `${((completed / screened) * 100).toFixed(1)}% of screened` : '0%',
        icon: <CheckCircle className="w-5 h-5" />,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/60',
        filterStatus: 'Completed',
      },
      {
        id: 'breach',
        label: 'SLA Breach',
        value: breaches,
        context: `Risk Score: ${riskScore}/100 • ${breachRate.toFixed(1)}%`,
        icon: <AlertTriangle className="w-5 h-5" />,
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/60',
        filterStatus: 'Breach',
      },
      {
        id: 'coverage',
        label: 'Coverage',
        value: districts,
        context: `${districts} districts mapped`,
        icon: <MapPin className="w-5 h-5" />,
        color: meetsTarget ? 'text-emerald-400' : 'text-blue-400',
        bgColor: meetsTarget ? 'bg-emerald-500/20' : 'bg-blue-500/20',
        borderColor: meetsTarget ? 'border-emerald-500/60' : 'border-blue-500/60',
      },
    ];
  }, [filteredPatients, choroplethDict]);

  const handleMetricClick = (metric: KPIMetric) => {
    const mapMetric = metric.id === 'breach' ? 'breaches' : metric.id;
    const currentGIS = activeGISMetric || 'screened';

    if (currentGIS === mapMetric) {
      // Toggle off: Revert to default 'screened' metric and 'All' status
      setActiveGISMetric('screened');
      setStatus('All');
    } else {
      // Toggle on
      if (['screened', 'diagnosed', 'initiated', 'completed', 'breaches', 'suspected', 'normal'].includes(mapMetric)) {
        setActiveGISMetric(mapMetric);
      }
      if (metric.filterStatus) {
        setStatus(metric.filterStatus);
      }
    }
  };

  // World Monitor style "LAYERS" Panel
  if (compact) {
    return (
      <div className="font-mono text-[10px] w-full">
        {/* Metrics mapped to layers */}
        <div className="space-y-[2px]">
          {metrics.map((metric, index) => {
            const currentGIS = activeGISMetric || 'screened';
            const mappedId = metric.id === 'breach' ? 'breaches' : metric.id;
            const isActive = currentGIS === mappedId;
            const isClickable = ['screened', 'diagnosed', 'suspected', 'normal', 'initiated', 'completed', 'breach'].includes(metric.id);
            
            // Map the colors logic for neon vibes
            const accentColor = metric.id === 'breach' ? '#ef4444' : 
                                metric.id === 'screened' ? '#06b6d4' :
                                metric.id === 'diagnosed' ? '#f59e0b' :
                                metric.id === 'suspected' ? '#eab308' : 
                                metric.id === 'normal' ? '#10b981' : 
                                metric.id === 'initiated' ? '#a855f7' :
                                metric.id === 'completed' ? '#10b981' : '#3b82f6';

            return (
              <div 
                key={metric.id}
                onClick={() => handleMetricClick(metric)}
                className={`
                  flex items-center justify-between p-2 cursor-pointer transition-all rounded-sm
                  hover:bg-[#1a1a1a]
                  ${isActive ? 'bg-[#161616]' : 'bg-transparent'}
                  ${!isClickable && 'opacity-60 cursor-default hover:bg-transparent'}
                `}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-3 h-3 rounded-sm flex items-center justify-center text-[8px] font-black transition-all duration-300
                    ${isActive ? 'bg-[#10b981] text-black shadow-[0_0_12px_rgba(16,185,129,1)] scale-110' : 'border border-[#444] bg-transparent text-transparent group-hover:border-[#666]'}
                    `}
                  >
                    ✓
                  </div>
                  <div 
                    className="w-[18px] h-[18px] flex items-center justify-center drop-shadow-md"
                    style={{ color: accentColor }}
                  >
                    {metric.icon}
                  </div>
                  <span className={`font-bold tracking-wider transition-all duration-300 ${isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,1)]' : 'text-[#888] group-hover:text-[#bbb]'}`}>
                    {metric.label.toUpperCase()}
                  </span>
                </div>
                
                {/* Count value replacing context */}
                <span className={`font-black tabular-nums transition-all duration-300 ${isActive ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'text-[#666] group-hover:text-[#888]'}`}>
                  {metric.value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#111111] border-r border-[#222] font-mono text-[10px] w-[260px] shrink-0">
      {/* Header */}
      <div className="h-10 border-b border-[#222] flex items-center px-4 font-bold tracking-widest text-[#888] uppercase shrink-0">
        Situation
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-hide p-3">
        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>

        {/* Metrics mapped to layers */}
        <div className="space-y-[2px]">
          {metrics.map((metric, index) => {
            const currentGIS = activeGISMetric || 'screened';
            const mappedId = metric.id === 'breach' ? 'breaches' : metric.id;
            const isActive = currentGIS === mappedId;
            const isClickable = ['screened', 'diagnosed', 'suspected', 'normal', 'initiated', 'completed', 'breach'].includes(metric.id);
            
            // Map the colors logic for neon vibes
            const accentColor = metric.id === 'breach' ? '#ef4444' : 
                                metric.id === 'screened' ? '#06b6d4' :
                                metric.id === 'diagnosed' ? '#f59e0b' :
                                metric.id === 'suspected' ? '#eab308' : 
                                metric.id === 'normal' ? '#10b981' : 
                                metric.id === 'initiated' ? '#a855f7' :
                                metric.id === 'completed' ? '#10b981' : '#3b82f6';

            return (
              <div 
                key={metric.id}
                onClick={() => handleMetricClick(metric)}
                className={`
                  flex items-center justify-between p-2 cursor-pointer transition-all rounded-sm
                  hover:bg-[#1a1a1a]
                  ${isActive ? 'bg-[#161616]' : 'bg-transparent'}
                  ${!isClickable && 'opacity-60 cursor-default hover:bg-transparent'}
                `}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-3 h-3 rounded-sm flex items-center justify-center text-[8px] font-black transition-all duration-300
                    ${isActive ? 'bg-[#10b981] text-black shadow-[0_0_12px_rgba(16,185,129,1)] scale-110' : 'border border-[#444] bg-transparent text-transparent group-hover:border-[#666]'}
                    `}
                  >
                    ✓
                  </div>
                  <div 
                    className="w-[18px] h-[18px] flex items-center justify-center drop-shadow-md"
                    style={{ color: accentColor }}
                  >
                    {metric.icon}
                  </div>
                  <span className={`font-bold tracking-wider transition-all duration-300 ${isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,1)]' : 'text-[#888] group-hover:text-[#bbb]'}`}>
                    {metric.label.toUpperCase()}
                  </span>
                </div>
                
                {/* Count value replacing context */}
                <span className={`font-black tabular-nums transition-all duration-300 ${isActive ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'text-[#666] group-hover:text-[#888]'}`}>
                  {metric.value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Separator / Additional non-kpi layers could go here */}
        <div className="h-px bg-[#222] my-4" />
        
      </div>
    </div>
  );
}
