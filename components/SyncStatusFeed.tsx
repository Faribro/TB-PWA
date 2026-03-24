'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, RefreshCw } from 'lucide-react';

export function SyncStatusFeed() {
  const [syncs, setSyncs] = useState<{ id: string; koboUuid: string; timestamp: number }[]>([]);

  useEffect(() => {
    const handleSyncConfirmed = (e: CustomEvent<{ koboUuid: string }>) => {
      const newSync = {
        id: Math.random().toString(36).substr(2, 9),
        koboUuid: e.detail.koboUuid,
        timestamp: Date.now()
      };
      
      setSyncs(prev => [...prev, newSync]);
      
      setTimeout(() => {
        setSyncs(prev => prev.filter(s => s.id !== newSync.id));
      }, 3000); // 3-second toast
    };

    window.addEventListener('sync-confirmed', handleSyncConfirmed as EventListener);
    return () => window.removeEventListener('sync-confirmed', handleSyncConfirmed as EventListener);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[999999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {syncs.map((sync) => (
          <motion.div
            key={sync.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-lg px-4 py-3 rounded-xl flex items-center gap-3 w-72 pointer-events-auto"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-800">Sync Confirmed</span>
              <span className="text-[10px] font-mono text-slate-500 truncate" title={sync.koboUuid}>{sync.koboUuid}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
