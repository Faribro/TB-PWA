'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, CheckCircle, AlertCircle } from 'lucide-react';

interface Patient {
  id: number;
  inmate_name: string;
  unique_id: string;
  screening_latitude?: number;
  screening_longitude?: number;
  screening_district: string;
  screening_state: string;
  referral_date: string | null;
  tb_diagnosed: string | null;
  att_start_date: string | null;
  att_completion_date?: string | null;
  screening_date: string;
  facility_name?: string;
  staff_name?: string;
  sex?: string;
  inmate_type?: string;
}

type StatusFilter = 'All' | 'High Alert' | 'On Track';

interface KPIBucket {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentColor: string;
  glowColor: string;
  borderColor: string;
  activeBg: string;
  filterStatus: StatusFilter;
  demographics: { M: number; F: number; TG: number; UT: number; C: number; O: number };
}

interface MapKPIOverlayProps {
  filteredPatients: Patient[];
  activeStatus: StatusFilter;
  onStatusFilter: (status: StatusFilter) => void;
}

export function MapKPIOverlay({ filteredPatients, activeStatus, onStatusFilter }: MapKPIOverlayProps) {

  const kpiBuckets = useMemo((): KPIBucket[] => {
    const screened = filteredPatients.length;
    const diagnosed = filteredPatients.filter(p => p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y').length;
    const initiated = filteredPatients.filter(p => p.att_start_date).length;
    const completed = filteredPatients.filter(p => p.att_completion_date).length;

    const calculateDemographics = (patients: Patient[]) => {
      const demo = { M: 0, F: 0, TG: 0, UT: 0, C: 0, O: 0 };
      patients.forEach(p => {
        if (p.sex === 'M') demo.M++;
        else if (p.sex === 'F') demo.F++;
        else if (p.sex === 'TG') demo.TG++;
        if (p.inmate_type === 'UT') demo.UT++;
        else if (p.inmate_type === 'C') demo.C++;
        else if (p.inmate_type === 'O') demo.O++;
      });
      return demo;
    };

    return [
      {
        label: 'Screened',
        value: screened,
        icon: <Users className="w-5 h-5" />,
        accentColor: 'text-cyan-400',
        glowColor: 'shadow-cyan-500/20',
        borderColor: 'border-cyan-500/40',
        activeBg: 'bg-cyan-500/20 border-cyan-400/70 shadow-cyan-500/30',
        filterStatus: 'All',
        demographics: calculateDemographics(filteredPatients),
      },
      {
        label: 'Diagnosed',
        value: diagnosed,
        icon: <AlertCircle className="w-5 h-5" />,
        accentColor: 'text-red-400',
        glowColor: 'shadow-red-500/20',
        borderColor: 'border-red-500/40',
        activeBg: 'bg-red-500/20 border-red-400/70 shadow-red-500/30',
        filterStatus: 'High Alert',
        demographics: calculateDemographics(
          filteredPatients.filter(p => p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y')
        ),
      },
      {
        label: 'Initiated (ATT)',
        value: initiated,
        icon: <TrendingUp className="w-5 h-5" />,
        accentColor: 'text-amber-400',
        glowColor: 'shadow-amber-500/20',
        borderColor: 'border-amber-500/40',
        activeBg: 'bg-amber-500/20 border-amber-400/70 shadow-amber-500/30',
        filterStatus: 'On Track',
        demographics: calculateDemographics(
          filteredPatients.filter(p => p.att_start_date)
        ),
      },
      {
        label: 'Completed',
        value: completed,
        icon: <CheckCircle className="w-5 h-5" />,
        accentColor: 'text-emerald-400',
        glowColor: 'shadow-emerald-500/20',
        borderColor: 'border-emerald-500/40',
        activeBg: 'bg-emerald-500/20 border-emerald-400/70 shadow-emerald-500/30',
        filterStatus: 'On Track',
        demographics: calculateDemographics(
          filteredPatients.filter(p => p.att_completion_date)
        ),
      },
    ];
  }, [filteredPatients]);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1, y: 0,
      transition: { duration: 0.6, staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="absolute bottom-6 left-6 right-6 z-50"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiBuckets.map((bucket) => {
          const isActive = activeStatus === bucket.filterStatus;

          return (
            <motion.div key={bucket.label} variants={cardVariants}>
              <button
                onClick={() => onStatusFilter(
                  activeStatus === bucket.filterStatus ? 'All' : bucket.filterStatus
                )}
                aria-pressed={isActive}
                aria-label={`Filter by ${bucket.label}`}
                className={`
                  w-full text-left
                  backdrop-blur-2xl border rounded-2xl p-4
                  transition-all duration-300 hover:-translate-y-1
                  shadow-2xl ${bucket.glowColor}
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                  ${isActive
                    ? bucket.activeBg
                    : `bg-slate-900/60 ${bucket.borderColor} hover:bg-slate-800/80`
                  }
                `}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                    {bucket.label}
                  </span>
                  <div className={bucket.accentColor}>
                    {bucket.icon}
                  </div>
                </div>

                {/* Main Value */}
                <div className="mb-4">
                  <motion.div
                    key={bucket.value}
                    initial={{ y: 6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`text-3xl font-black text-white drop-shadow-md ${bucket.accentColor}`}
                  >
                    {bucket.value.toLocaleString()}
                  </motion.div>
                </div>

                {/* Demographic Chips */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {bucket.demographics.M > 0 && (
                      <div className="bg-slate-950/50 border border-slate-700/50 text-[10px] text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                        M: {bucket.demographics.M}
                      </div>
                    )}
                    {bucket.demographics.F > 0 && (
                      <div className="bg-slate-950/50 border border-slate-700/50 text-[10px] text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                        F: {bucket.demographics.F}
                      </div>
                    )}
                    {bucket.demographics.TG > 0 && (
                      <div className="bg-slate-950/50 border border-slate-700/50 text-[10px] text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                        TG: {bucket.demographics.TG}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {bucket.demographics.UT > 0 && (
                      <div className="bg-slate-950/50 border border-slate-700/50 text-[10px] text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                        UT: {bucket.demographics.UT}
                      </div>
                    )}
                    {bucket.demographics.C > 0 && (
                      <div className="bg-slate-950/50 border border-slate-700/50 text-[10px] text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                        C: {bucket.demographics.C}
                      </div>
                    )}
                    {bucket.demographics.O > 0 && (
                      <div className="bg-slate-950/50 border border-slate-700/50 text-[10px] text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                        O: {bucket.demographics.O}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 pt-3 border-t border-slate-700/30">
                  <div className="w-full h-1 bg-slate-800/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(bucket.value / (kpiBuckets[0]?.value || 1)) * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full ${bucket.accentColor.replace('text-', 'bg-')}`}
                    />
                  </div>
                </div>

                {/* Active indicator badge */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-2 flex items-center gap-1"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${bucket.accentColor.replace('text-', 'bg-')} animate-pulse`} />
                    <span className={`text-[10px] font-bold ${bucket.accentColor} uppercase tracking-wider`}>
                      Active Filter
                    </span>
                  </motion.div>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
