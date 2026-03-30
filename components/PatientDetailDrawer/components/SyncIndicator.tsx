'use client';

import { motion } from 'framer-motion';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncIndicatorProps {
  statusDB: SyncStatus;
  statusKobo: SyncStatus;
  statusSheets: SyncStatus;
}

const statusColors = {
  idle: 'bg-slate-300',
  syncing: 'bg-amber-400',
  success: 'bg-emerald-500',
  error: 'bg-red-500',
};

const statusLabels = {
  idle: 'Idle',
  syncing: 'Syncing',
  success: 'Synced',
  error: 'Failed',
};

export function SyncIndicator({ statusDB, statusSheets, statusKobo }: SyncIndicatorProps) {
  const allIdle = statusDB === 'idle' && statusSheets === 'idle' && statusKobo === 'idle';

  if (allIdle) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="flex items-center justify-center gap-4 py-2 px-4 bg-white/60 backdrop-blur-xl rounded-xl border border-white/40 shadow-sm"
    >
      {/* DB Indicator */}
      <div className="flex items-center gap-1.5">
        <motion.div
          animate={{
            scale: statusDB === 'syncing' ? [1, 1.3, 1] : 1,
          }}
          transition={{
            duration: 1,
            repeat: statusDB === 'syncing' ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className={`w-2 h-2 rounded-full ${statusColors[statusDB]} shadow-lg`}
        />
        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
          DB
        </span>
      </div>

      {/* Sheets Indicator */}
      <div className="flex items-center gap-1.5">
        <motion.div
          animate={{
            scale: statusSheets === 'syncing' ? [1, 1.3, 1] : 1,
          }}
          transition={{
            duration: 1,
            repeat: statusSheets === 'syncing' ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className={`w-2 h-2 rounded-full ${statusColors[statusSheets]} shadow-lg`}
        />
        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
          Sheets
        </span>
      </div>

      {/* Kobo Indicator (always idle - ingestion only) */}
      <div className="flex items-center gap-1.5 opacity-40">
        <div className={`w-2 h-2 rounded-full ${statusColors[statusKobo]} shadow-lg`} />
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          Kobo
        </span>
      </div>
    </motion.div>
  );
}
