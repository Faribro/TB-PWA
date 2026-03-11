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

interface KPIBucket {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentColor: string;
  glowColor: string;
  demographics: {
    M: number;
    F: number;
    TG: number;
    UT: number;
    C: number;
    O: number;
  };
}

interface MapKPIOverlayProps {
  filteredPatients: Patient[];
}

export function MapKPIOverlay({ filteredPatients }: MapKPIOverlayProps) {
  // Real-time KPI aggregation
  const kpiBuckets = useMemo(() => {
    const screened = filteredPatients.length;
    const diagnosed = filteredPatients.filter(p => 
      p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y'
    ).length;
    const initiated = filteredPatients.filter(p => p.att_start_date).length;
    const completed = filteredPatients.filter(p => p.att_completion_date).length;

    // Calculate demographics for each bucket
    const calculateDemographics = (patients: Patient[]) => {
      const demo = { M: 0, F: 0, TG: 0, UT: 0, C: 0, O: 0 };
      
      patients.forEach(p => {
        // Sex demographics
        if (p.sex === 'M') demo.M++;
        else if (p.sex === 'F') demo.F++;
        else if (p.sex === 'TG') demo.TG++;
        
        // Inmate type demographics
        if (p.inmate_type === 'UT') demo.UT++;
        else if (p.inmate_type === 'C') demo.C++;
        else if (p.inmate_type === 'O') demo.O++;
      });
      
      return demo;
    };

    const screenedDemo = calculateDemographics(filteredPatients);
    const diagnosedDemo = calculateDemographics(
      filteredPatients.filter(p => p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y')
    );
    const initiatedDemo = calculateDemographics(
      filteredPatients.filter(p => p.att_start_date)
    );
    const completedDemo = calculateDemographics(
      filteredPatients.filter(p => p.att_completion_date)
    );

    return [
      {
        label: 'Screened',
        value: screened,
        icon: <Users className="w-5 h-5" />,
        accentColor: 'text-cyan-400',
        glowColor: 'shadow-cyan-500/20',
        demographics: screenedDemo
      },
      {
        label: 'Diagnosed',
        value: diagnosed,
        icon: <AlertCircle className="w-5 h-5" />,
        accentColor: 'text-red-400',
        glowColor: 'shadow-red-500/20',
        demographics: diagnosedDemo
      },
      {
        label: 'Initiated (ATT)',
        value: initiated,
        icon: <TrendingUp className="w-5 h-5" />,
        accentColor: 'text-amber-400',
        glowColor: 'shadow-amber-500/20',
        demographics: initiatedDemo
      },
      {
        label: 'Completed',
        value: completed,
        icon: <CheckCircle className="w-5 h-5" />,
        accentColor: 'text-emerald-400',
        glowColor: 'shadow-emerald-500/20',
        demographics: completedDemo
      }
    ];
  }, [filteredPatients]);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="absolute bottom-6 left-6 right-6 z-50 pointer-events-none"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiBuckets.map((bucket, idx) => (
          <motion.div
            key={bucket.label}
            variants={cardVariants}
            className="pointer-events-auto"
          >
            <div
              className={`
                bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 rounded-2xl p-4
                transition-all duration-300 hover:-translate-y-1 hover:bg-slate-800/80
                shadow-2xl ${bucket.glowColor}
              `}
            >
              {/* Header with Icon and Label */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs uppercase tracking-widest text-slate-400 font-semibold`}>
                  {bucket.label}
                </span>
                <div className={`${bucket.accentColor}`}>
                  {bucket.icon}
                </div>
              </div>

              {/* Main Value */}
              <div className="mb-4">
                <div className={`text-3xl font-black text-white drop-shadow-md ${bucket.accentColor}`}>
                  {bucket.value.toLocaleString()}
                </div>
              </div>

              {/* Demographic Chips */}
              <div className="space-y-2">
                {/* Sex Demographics */}
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

                {/* Inmate Type Demographics */}
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
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
