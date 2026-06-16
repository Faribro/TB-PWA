'use client';

import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DataHealthGaugeProps {
  healthScore: number;
  highCount: number;
  mediumCount: number;
  onSectionClick: (severity: 'high' | 'medium') => void;
}

export const DataHealthGauge = memo(function DataHealthGauge({
  healthScore,
  highCount,
  mediumCount,
  onSectionClick,
}: DataHealthGaugeProps) {
  const isPerfect = healthScore === 100;
  const isCritical = healthScore < 60;
  const isWarning = healthScore >= 60 && healthScore < 85;
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const checkViewport = () => setIsCompact(window.innerHeight < 860);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Color scheme based on health score
  const getScoreColor = () => {
    if (isPerfect) return { primary: '#10b981', secondary: '#d1fae5', text: 'text-emerald-600', glow: 'shadow-[0_0_24px_rgba(16,185,129,0.3)]' };
    if (isCritical) return { primary: '#ef4444', secondary: '#fee2e2', text: 'text-red-600', glow: 'shadow-[0_0_24px_rgba(239,68,68,0.3)]' };
    if (isWarning) return { primary: '#f59e0b', secondary: '#fef3c7', text: 'text-amber-600', glow: 'shadow-[0_0_24px_rgba(245,158,11,0.3)]' };
    return { primary: '#3b82f6', secondary: '#dbeafe', text: 'text-blue-600', glow: 'shadow-[0_0_24px_rgba(59,130,246,0.3)]' };
  };

  const colors = getScoreColor();

  // Calculate arc segments (adaptive radius)
  const radius = isCompact ? 55 : 70;
  const svgSize = isCompact ? 140 : 180;
  const centerPos = svgSize / 2;
  const circumference = 2 * Math.PI * radius;
  const scoreOffset = circumference - (healthScore / 100) * circumference;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] transition-all duration-500 ${
        isCompact ? 'p-4' : 'p-6'
      } ${colors.glow}`}
    >
      <div className={`flex items-center gap-6 ${
        isCompact ? 'flex-col' : 'justify-between'
      }`}>
        
        {/* Left: Circular Gauge */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg width={svgSize} height={svgSize} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={centerPos}
              cy={centerPos}
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={isCompact ? '10' : '12'}
            />
            
            {/* Animated score arc with pulse glow */}
            <motion.circle
              cx={centerPos}
              cy={centerPos}
              r={radius}
              fill="none"
              stroke={colors.primary}
              strokeWidth={isCompact ? '10' : '12'}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={scoreOffset}
              initial={{ strokeDashoffset: circumference }}
              animate={{ 
                strokeDashoffset: scoreOffset,
                filter: isCritical 
                  ? ['drop-shadow(0 0 8px rgba(239,68,68,0.4))', 'drop-shadow(0 0 16px rgba(239,68,68,0.7))', 'drop-shadow(0 0 8px rgba(239,68,68,0.4))']
                  : 'drop-shadow(0 0 8px rgba(0,0,0,0.1))'
              }}
              transition={{ 
                strokeDashoffset: { duration: 1.5, ease: [0.22, 1, 0.36, 1] },
                filter: isCritical ? { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } : { duration: 0 }
              }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-center"
            >
              <div className={`font-black ${colors.text} ${
                isCompact ? 'text-3xl' : 'text-4xl'
              }`}>
                {Math.round(healthScore)}
              </div>
              <div className={`text-slate-500 font-semibold uppercase tracking-wider mt-1 ${
                isCompact ? 'text-[10px]' : 'text-xs'
              }`}>
                Health Score
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right: Breakdown & Actions */}
        <div className={`flex-1 ${
          isCompact ? 'space-y-2 w-full' : 'space-y-3'
        }`}>
          <div className={`flex items-center gap-2 ${
            isCompact ? 'mb-2' : 'mb-4'
          }`}>
            <Shield className={`text-slate-600 ${
              isCompact ? 'w-4 h-4' : 'w-5 h-5'
            }`} />
            <h3 className={`font-bold text-slate-900 ${
              isCompact ? 'text-base' : 'text-lg'
            }`}>Data Health Monitor</h3>
          </div>

          {/* Status message */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className={`flex items-start gap-2 rounded-xl border backdrop-blur-sm ${
              isCompact ? 'px-3 py-2' : 'px-4 py-3'
            } ${
              isPerfect ? 'bg-emerald-500/10 border-emerald-500/20' :
              isCritical ? 'bg-red-500/10 border-red-500/20' :
              isWarning ? 'bg-amber-500/10 border-amber-500/20' :
              'bg-blue-500/10 border-blue-500/20'
            }`}
          >
            {isPerfect ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-900">Perfect Data Quality</p>
                  <p className="text-xs text-emerald-700 mt-0.5">No integrity violations detected</p>
                </div>
              </>
            ) : isCritical ? (
              <>
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">Critical Issues Detected</p>
                  <p className="text-xs text-red-700 mt-0.5">Immediate attention required</p>
                </div>
              </>
            ) : isWarning ? (
              <>
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">Data Quality Warning</p>
                  <p className="text-xs text-amber-700 mt-0.5">Review and resolve violations</p>
                </div>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">Good Data Quality</p>
                  <p className="text-xs text-blue-700 mt-0.5">Minor issues to address</p>
                </div>
              </>
            )}
          </motion.div>

          {/* Interactive violation breakdown */}
          {(highCount > 0 || mediumCount > 0) && (
            <div className="grid grid-cols-2 gap-2">
              {highCount > 0 && (
                <motion.button
                  type="button"
                  onClick={() => onSectionClick('high')}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className={`group relative flex items-center justify-between bg-gradient-to-br from-red-500/10 to-red-600/10 hover:from-red-500/15 hover:to-red-600/15 border border-red-500/20 hover:border-red-500/30 rounded-xl transition-all duration-300 overflow-hidden ${
                    isCompact ? 'px-3 py-2' : 'px-4 py-3'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <div className="text-left relative z-10">
                    <p className={`text-red-600 font-medium ${
                      isCompact ? 'text-[10px]' : 'text-xs'
                    }`}>High Severity</p>
                    <p className={`font-bold text-red-700 ${
                      isCompact ? 'text-xl' : 'text-2xl'
                    }`}>{highCount}</p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform relative z-10" />
                </motion.button>
              )}

              {mediumCount > 0 && (
                <motion.button
                  type="button"
                  onClick={() => onSectionClick('medium')}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className={`group relative flex items-center justify-between bg-gradient-to-br from-amber-500/10 to-amber-600/10 hover:from-amber-500/15 hover:to-amber-600/15 border border-amber-500/20 hover:border-amber-500/30 rounded-xl transition-all duration-300 overflow-hidden ${
                    isCompact ? 'px-3 py-2' : 'px-4 py-3'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <div className="text-left relative z-10">
                    <p className={`text-amber-600 font-medium ${
                      isCompact ? 'text-[10px]' : 'text-xs'
                    }`}>Medium Severity</p>
                    <p className={`font-bold text-amber-700 ${
                      isCompact ? 'text-xl' : 'text-2xl'
                    }`}>{mediumCount}</p>
                  </div>
                  <AlertCircle className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform relative z-10" />
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
