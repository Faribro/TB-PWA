'use client';

import { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingDown, TrendingUp, Minus, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Patient {
  id: number;
  screening_district: string;
  screening_date: string;
  referral_date: string | null;
}

interface DistrictLeaderboardProps {
  filteredPatients: Patient[];
  onDistrictSelect: (district: string) => void;
  onClose: () => void;
}

interface DistrictStats {
  district: string;
  totalScreened: number;
  breachCount: number;
  breachRate: number;
  trend: 'improving' | 'stable' | 'worsening';
}

export const DistrictLeaderboard = memo(function DistrictLeaderboard({
  filteredPatients,
  onDistrictSelect,
  onClose,
}: DistrictLeaderboardProps) {
  const [sortBy, setSortBy] = useState<'risk' | 'volume'>('risk');

  const districtStats = useMemo((): DistrictStats[] => {
    const districtMap = new Map<string, Patient[]>();
    
    filteredPatients.forEach((p) => {
      if (!districtMap.has(p.screening_district)) {
        districtMap.set(p.screening_district, []);
      }
      districtMap.get(p.screening_district)!.push(p);
    });

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86400000;
    const fourteenDaysAgo = now - 14 * 86400000;

    const stats: DistrictStats[] = [];

    districtMap.forEach((patients, district) => {
      const totalScreened = patients.length;
      
      const breachCount = patients.filter((p) => {
        if (p.referral_date) return false;
        const screeningTime = new Date(p.screening_date).getTime();
        if (isNaN(screeningTime)) return false;
        const daysSince = (now - screeningTime) / 86400000;
        return daysSince > 7;
      }).length;

      const breachRate = totalScreened > 0 ? (breachCount / totalScreened) * 100 : 0;

      const recentPatients = patients.filter((p) => {
        const t = new Date(p.screening_date).getTime();
        return !isNaN(t) && t >= sevenDaysAgo;
      });
      const priorPatients = patients.filter((p) => {
        const t = new Date(p.screening_date).getTime();
        return !isNaN(t) && t >= fourteenDaysAgo && t < sevenDaysAgo;
      });

      const recentBreaches = recentPatients.filter((p) => {
        if (p.referral_date) return false;
        const screeningTime = new Date(p.screening_date).getTime();
        const daysSince = (now - screeningTime) / 86400000;
        return daysSince > 7;
      }).length;

      const priorBreaches = priorPatients.filter((p) => {
        if (p.referral_date) return false;
        const screeningTime = new Date(p.screening_date).getTime();
        const daysSince = (now - screeningTime) / 86400000;
        return daysSince > 7;
      }).length;

      const recentRate = recentPatients.length > 0 ? (recentBreaches / recentPatients.length) * 100 : 0;
      const priorRate = priorPatients.length > 0 ? (priorBreaches / priorPatients.length) * 100 : 0;

      let trend: 'improving' | 'stable' | 'worsening' = 'stable';
      if (recentRate < priorRate - 2) trend = 'improving';
      else if (recentRate > priorRate + 2) trend = 'worsening';

      stats.push({ district, totalScreened, breachCount, breachRate, trend });
    });

    if (sortBy === 'risk') {
      stats.sort((a, b) => b.breachRate - a.breachRate);
    } else {
      stats.sort((a, b) => b.totalScreened - a.totalScreened);
    }

    return stats;
  }, [filteredPatients, sortBy]);

  const handleDistrictClick = (district: string) => {
    onDistrictSelect(district);
    onClose();
  };

  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -400, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      className="absolute left-0 top-0 bottom-0 z-50 w-96 font-outfit"
    >
      <div className="h-full glass-light border-r border-white shadow-[32px_0_128px_rgba(0,0,0,0.05)] flex flex-col p-6 pt-10">
        {/* Header */}
        <div className="flex-shrink-0 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shadow-inner">
                <Trophy className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Sector Rankings</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">District Performance Matrix</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-all hover:rotate-90 active:scale-95"
              aria-label="Close leaderboard"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Sort Control */}
          <div className="flex p-1 bg-slate-100/50 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setSortBy('risk')}
              className={cn(
                "flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                sortBy === 'risk' 
                  ? "bg-white text-rose-600 shadow-md" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              Risk Profile
            </button>
            <button
              onClick={() => setSortBy('volume')}
              className={cn(
                "flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                sortBy === 'volume' 
                  ? "bg-white text-blue-600 shadow-md" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              Throughput
            </button>
          </div>
        </div>

        {/* District list */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 hide-scrollbar">
          {districtStats.map((stat, idx) => {
            const riskColor =
              stat.breachRate > 25 ? 'bg-rose-500' : 
              stat.breachRate > 10 ? 'bg-amber-500' : 'bg-emerald-500';

            return (
              <motion.button
                key={stat.district}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleDistrictClick(stat.district)}
                className="w-full glass-card-light rounded-[24px] border-transparent p-5 text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-300 group-hover:text-blue-500 transition-colors">#{String(idx + 1).padStart(2, '0')}</span>
                    <span className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:tracking-wide transition-all">
                      {stat.district}
                    </span>
                  </div>
                  {stat.trend === 'improving' ? (
                     <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                       <TrendingDown className="w-4 h-4 text-emerald-600" />
                     </div>
                  ) : stat.trend === 'worsening' ? (
                     <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
                       <TrendingUp className="w-4 h-4 text-rose-600" />
                     </div>
                  ) : (
                     <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                       <Minus className="w-4 h-4 text-slate-400" />
                     </div>
                  )}
                </div>

                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Throughput</p>
                    <p className="text-xl font-black text-slate-900 tracking-tighter">{stat.totalScreened.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Alerts</p>
                    <div className={cn(
                      "inline-flex px-3 py-1 rounded-full text-[10px] font-black border",
                      stat.breachRate > 25 ? "bg-rose-50 text-rose-600 border-rose-200" :
                      stat.breachRate > 10 ? "bg-amber-50 text-amber-600 border-amber-200" :
                      "bg-emerald-50 text-emerald-600 border-emerald-200"
                    )}>
                      {stat.breachRate.toFixed(1)}% ALERTS
                    </div>
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(stat.breachRate, 100)}%` }}
                    transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: idx * 0.05 }}
                    className={cn("h-full shadow-[0_0_10px_rgba(0,0,0,0.1)]", riskColor)}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
        
        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3">
          <Info className="w-4 h-4 text-slate-300" />
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-normal">
            Rankings recalibrated based on real-time neural feed across all active sectors.
          </p>
        </div>
      </div>
    </motion.div>
  );
});
