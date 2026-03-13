'use client';

import { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingDown, TrendingUp, Minus, X } from 'lucide-react';
import { DESIGN_TOKENS } from '@/lib/designTokens';

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

      // Calculate trend
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

    // Sort
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
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`absolute left-0 top-0 bottom-0 ${DESIGN_TOKENS.zIndex.overlay} w-80`}
    >
      <div className={`
        h-full
        ${DESIGN_TOKENS.backdropBlur}
        ${DESIGN_TOKENS.background.panel}
        border-r ${DESIGN_TOKENS.border.inactive.split(' ')[1]}
        ${DESIGN_TOKENS.shadow.lg}
        flex flex-col
      `}>
        {/* Header */}
        <div className="flex-shrink-0 p-5 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white">District Rankings</h3>
            </div>
            <button
              onClick={onClose}
              className={`
                w-8 h-8 bg-slate-800 hover:bg-slate-700
                ${DESIGN_TOKENS.borderRadius.button}
                ${DESIGN_TOKENS.transition.fast}
                hover:-translate-y-1 active:scale-95
                flex items-center justify-center
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
              `}
              aria-label="Close leaderboard"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Sort buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('risk')}
              className={`
                flex-1 px-3 py-2
                ${DESIGN_TOKENS.borderRadius.button}
                ${DESIGN_TOKENS.transition.fast}
                hover:-translate-y-1 active:scale-95
                text-xs font-semibold border
                ${
                sortBy === 'risk'
                  ? 'bg-red-500/20 border-red-400/60 text-red-200'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              By Risk
            </button>
            <button
              onClick={() => setSortBy('volume')}
              className={`
                flex-1 px-3 py-2
                ${DESIGN_TOKENS.borderRadius.button}
                ${DESIGN_TOKENS.transition.fast}
                hover:-translate-y-1 active:scale-95
                text-xs font-semibold border
                ${
                sortBy === 'volume'
                  ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              By Volume
            </button>
          </div>
        </div>

        {/* District list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {districtStats.map((stat, idx) => {
            const pillColor =
              stat.breachRate > 25
                ? 'bg-red-500/20 border-red-400/60 text-red-300'
                : stat.breachRate > 10
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                : 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300';

            const TrendIcon =
              stat.trend === 'improving'
                ? TrendingDown
                : stat.trend === 'worsening'
                ? TrendingUp
                : Minus;

            const trendColor =
              stat.trend === 'improving'
                ? 'text-emerald-400'
                : stat.trend === 'worsening'
                ? 'text-red-400'
                : 'text-slate-400';

            return (
              <motion.button
                key={stat.district}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => handleDistrictClick(stat.district)}
                className={`
                  w-full bg-slate-900/60 hover:bg-slate-800/80
                  border border-slate-700/50 hover:border-cyan-500/50
                  ${DESIGN_TOKENS.borderRadius.button}
                  ${DESIGN_TOKENS.transition.fast}
                  hover:-translate-y-1 active:scale-95
                  p-3 text-left
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">#{idx + 1}</span>
                    <span className="text-sm font-semibold text-white truncate max-w-[140px]">
                      {stat.district}
                    </span>
                  </div>
                  <TrendIcon className={`w-4 h-4 ${trendColor} flex-shrink-0`} />
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">
                    {stat.totalScreened.toLocaleString()} screened
                  </span>
                  <div className={`px-2 py-0.5 rounded-full border text-xs font-bold ${pillColor}`}>
                    {stat.breachRate.toFixed(1)}%
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-slate-800/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      stat.breachRate > 25
                        ? 'bg-red-400'
                        : stat.breachRate > 10
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(stat.breachRate, 100)}%` }}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
});
