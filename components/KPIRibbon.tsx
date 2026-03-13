'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, AlertCircle, TrendingUp, CheckCircle, AlertTriangle, MapPin } from 'lucide-react';
import { useUniversalFilter, FilterStatus } from '@/contexts/FilterContext';
import { DESIGN_TOKENS } from '@/lib/designTokens';

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={`
        fixed bottom-0 left-0 right-0
        ${DESIGN_TOKENS.zIndex.interactive}
        ${DESIGN_TOKENS.background.panel}
        ${DESIGN_TOKENS.backdropBlur}
        border-t ${DESIGN_TOKENS.border.inactive.split(' ')[1]}
      `}
      style={{ height: `${DESIGN_TOKENS.layout.footerHeight}px` }}
    >
      <div className="h-full px-6 flex items-center gap-4">
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => handleMetricClick(metric)}
              disabled={!isClickable}
              className={`
                flex-1 h-16 px-4
                ${DESIGN_TOKENS.borderRadius.panel}
                ${DESIGN_TOKENS.backdropBlur}
                ${isActive ? metric.borderColor : DESIGN_TOKENS.border.inactive}
                ${isActive ? metric.bgColor : DESIGN_TOKENS.background.panelLight}
                ${DESIGN_TOKENS.transition.fast}
                ${isClickable ? 'cursor-pointer hover:-translate-y-1 active:scale-95' : 'cursor-default'}
                ${DESIGN_TOKENS.shadow.md}
                ${isHighRisk ? 'animate-pulse border-red-500/40' : ''}
                flex items-center justify-between
                group
              `}
            >
              {/* Left: Icon + Label */}
              <div className="flex items-center gap-3">
                <div className={metric.color}>
                  {metric.icon}
                </div>
                <div className="text-left">
                  <div className={DESIGN_TOKENS.text.label}>
                    {metric.label}
                  </div>
                  <div className={DESIGN_TOKENS.text.context}>
                    {metric.context}
                  </div>
                </div>
              </div>

              {/* Right: Value */}
              <div className="flex items-center gap-2">
                <motion.div
                  key={metric.value}
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`${DESIGN_TOKENS.text.value} ${metric.color}`}
                >
                  {metric.value.toLocaleString()}
                </motion.div>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-2 h-2 rounded-full ${metric.color.replace('text-', 'bg-')} animate-pulse`}
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
