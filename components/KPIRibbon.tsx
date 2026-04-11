'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, AlertCircle, TrendingUp, CheckCircle, AlertTriangle, MapPin } from 'lucide-react';
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

interface KPIRibbonProps {
  filteredPatients: Patient[];
  compact?: boolean;
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

export function KPIRibbon({ filteredPatients, compact = false }: KPIRibbonProps) {
  const { filter, setStatus } = useUniversalFilter();
  const setActiveGISMetric = useEntityStore(s => s.setActiveGISMetric);

  const metrics = useMemo((): KPIMetric[] => {
    const screened = filteredPatients.length;
    const diagnosed = filteredPatients.filter(p => p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y').length;
    const initiated = filteredPatients.filter(p => p.att_start_date).length;
    const completed = filteredPatients.filter(p => p.att_completion_date).length;
    const breaches = filteredPatients.filter(isSLABreach).length;
    const breachRate = screened > 0 ? (breaches / screened) * 100 : 0;
    const districts = new Set(filteredPatients.map(p => p.screening_district)).size;

    // Calculate Risk Score
    const riskScore = calculateRiskScore(breachRate, screened);
    const isHighRisk = riskScore > 70;
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
        filterStatus: 'High Alert',
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
  }, [filteredPatients]);

  const handleMetricClick = (metric: KPIMetric) => {
    if (metric.filterStatus) {
      // Toggle filter: if already active, reset to 'All'
      setStatus(filter.status === metric.filterStatus ? 'All' : metric.filterStatus);
    }
    
    // Connect to Map Indicator Engine
    const mapMetric = metric.id === 'breach' ? 'breaches' : metric.id;
    if (['screened', 'diagnosed', 'initiated', 'completed', 'breaches'].includes(mapMetric)) {
      setActiveGISMetric(mapMetric);
    }
  };

  // World Monitor style "LAYERS" Panel
  return (
    <div className="flex flex-col h-full bg-[#111111] border-r border-[#222] font-mono text-[10px] w-[260px] shrink-0">
      {/* Header */}
      <div className="h-10 border-b border-[#222] flex items-center px-4 font-bold tracking-widest text-[#888] uppercase shrink-0">
        Global Situation
      </div>
      
      <div className="flex-1 overflow-y-auto custom-dark-scrollbar p-3">
        <div className="flex items-center justify-between text-[#666] mb-2 px-1">
          <span>LAYERS</span>
          <span className="cursor-pointer hover:text-white pb-1">?</span>
        </div>
        
        {/* Search */}
        <div className="mb-4 relative">
          <input
            type="text"
            placeholder="Search layers..."
            className="w-full bg-[#1a1a1a] border border-[#333] text-white px-3 py-1.5 focus:outline-none focus:border-[#555] rounded-sm placeholder-[#555]"
          />
        </div>

        {/* Metrics mapped to layers */}
        <div className="space-y-[2px]">
          {metrics.map((metric, index) => {
            const isActive = metric.filterStatus && filter.status === metric.filterStatus;
            const isClickable = !!metric.filterStatus;
            
            // Map the colors logic for neon vibes
            const accentColor = metric.id === 'breach' ? '#ef4444' : 
                                metric.id === 'screened' ? '#06b6d4' :
                                metric.id === 'diagnosed' ? '#f59e0b' :
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
                    className={`w-3 h-3 rounded-sm flex items-center justify-center text-[8px] font-black
                    ${isActive ? 'bg-[#10b981] text-black shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'border border-[#444] bg-transparent text-transparent'}
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
                  <span className={`font-bold tracking-wider ${isActive ? 'text-white' : 'text-[#999]'}`}>
                    {metric.label.toUpperCase()}
                  </span>
                </div>
                
                {/* Count value replacing context */}
                <span className="text-[#666] font-bold tabular-nums">
                  {metric.value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Separator / Additional non-kpi layers could go here */}
        <div className="h-px bg-[#222] my-4" />
        
        {/* Mini user tag imitating worldmonitor bottom left corner */}
        <div className="mt-auto px-1 pt-4 text-[9px] text-[#555] tracking-widest uppercase font-bold flex flex-col gap-1">
          <div><span className="text-cyan-500">© SAMADHAAN</span> · WORLD OS™</div>
          <div>v2.0.7 · <span className="text-[#888]">@HEALTH_DEPT</span></div>
        </div>
      </div>
    </div>
  );
}
