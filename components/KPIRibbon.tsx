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

export function KPIRibbon({ filteredPatients }: KPIRibbonProps) {
  const { filter, setStatus } = useUniversalFilter();

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
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      className="fixed bottom-0 left-0 right-0 z-[1200] bg-white/40 backdrop-blur-3xl border-t border-slate-200/50"
      style={{ height: '100px' }}
    >
      <div className="h-full px-8 flex items-center gap-4">
        {metrics.map((metric, index) => {
          const isActive = metric.filterStatus && filter.status === metric.filterStatus;
          const isClickable = !!metric.filterStatus;
          
          // Calculate risk score for dynamic glow
          const screened = filteredPatients.length;
          const breaches = filteredPatients.filter(isSLABreach).length;
          const breachRate = screened > 0 ? (breaches / screened) * 100 : 0;
          const riskScore = calculateRiskScore(breachRate, screened);
          const isHighRisk = metric.id === 'breach' && riskScore > 70;

          return (
            <motion.button
              key={metric.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => handleMetricClick(metric)}
              disabled={!isClickable}
              className={`
                flex-1 h-14 px-5
                rounded-2xl
                border transition-all duration-300
                ${isActive 
                  ? `${metric.borderColor} bg-white shadow-lg ${metric.id === 'breach' ? 'shadow-red-500/10' : 'shadow-blue-500/10'}` 
                  : 'border-slate-200/40 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-md'
                }
                ${isClickable ? 'cursor-pointer active:scale-95' : 'cursor-default'}
                ${isHighRisk ? 'animate-pulse' : ''}
                flex items-center justify-between
                group relative overflow-hidden
              `}
            >
              {/* Subtle background gradient on active */}
              {isActive && (
                <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${metric.bgColor.replace('bg-', 'from-')}`} />
              )}

              {/* Left: Icon + Label */}
              <div className="flex items-center gap-4">
                <div className={`
                  ${metric.color} transition-transform duration-300 group-hover:scale-110
                `}>
                  {metric.icon}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                    {metric.label}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {metric.context}
                  </div>
                </div>
              </div>

              {/* Right: Value */}
              <div className="flex items-center gap-3">
                <motion.div
                  key={metric.value}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-2xl font-black text-slate-900 tabular-nums"
                >
                  {metric.value.toLocaleString()}
                </motion.div>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-1.5 h-1.5 rounded-full ${metric.color.replace('text-', 'bg-')} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}
                  />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
