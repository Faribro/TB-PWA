'use client';

import { memo } from 'react';
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

  // Color scheme based on health score
  const getScoreColor = () => {
    if (isPerfect) return { primary: '#10b981', secondary: '#d1fae5', text: 'text-emerald-600' };
    if (isCritical) return { primary: '#ef4444', secondary: '#fee2e2', text: 'text-red-600' };
    if (isWarning) return { primary: '#f59e0b', secondary: '#fef3c7', text: 'text-amber-600' };
    return { primary: '#3b82f6', secondary: '#dbeafe', text: 'text-blue-600' };
  };

  const colors = getScoreColor();

  // Calculate arc segments
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const scoreOffset = circumference - (healthScore / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_4px_24px_rgb(0,0,0,0.04)] p-6">
      <div className="flex items-center justify-between gap-6">
        
        {/* Left: Circular Gauge */}
        <div className="relative flex items-center justify-center">
          <svg width="180" height="180" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="12"
            />
            
            {/* Animated score arc with pulse glow */}
            <motion.circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={colors.primary}
              strokeWidth="12"
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
                strokeDashoffset: { duration: 1.2, ease: 'easeOut' },
                filter: isCritical ? { repeat: Infinity, duration: 2 } : { duration: 0 }
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
              <div className={`text-4xl font-black ${colors.text}`}>
                {Math.round(healthScore)}
              </div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
                Health Score
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right: Breakdown & Actions */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-bold text-slate-900">Data Health Monitor</h3>
          </div>

          {/* Status message */}
          <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border ${
            isPerfect ? 'bg-emerald-50 border-emerald-200' :
            isCritical ? 'bg-red-50 border-red-200' :
            isWarning ? 'bg-amber-50 border-amber-200' :
            'bg-blue-50 border-blue-200'
          }`}>
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
          </div>

          {/* Interactive violation breakdown */}
          {(highCount > 0 || mediumCount > 0) && (
            <div className="grid grid-cols-2 gap-2">
              {highCount > 0 && (
                <motion.button
                  type="button"
                  onClick={() => onSectionClick('high')}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors group"
                >
                  <div className="text-left">
                    <p className="text-xs text-red-600 font-medium">High Severity</p>
                    <p className="text-2xl font-bold text-red-700">{highCount}</p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
                </motion.button>
              )}

              {mediumCount > 0 && (
                <motion.button
                  type="button"
                  onClick={() => onSectionClick('medium')}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors group"
                >
                  <div className="text-left">
                    <p className="text-xs text-amber-600 font-medium">Medium Severity</p>
                    <p className="text-2xl font-bold text-amber-700">{mediumCount}</p>
                  </div>
                  <AlertCircle className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
