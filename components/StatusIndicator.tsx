'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Z_INDEX } from '@/lib/zIndex';

type Status = 'checking' | 'online' | 'offline';

const BACKEND_URL = process.env.NEXT_PUBLIC_MED_BACKEND_URL;

export function StatusIndicator() {
  const [status, setStatus] = useState<Status>('checking');

  const ping = useCallback(async () => {
    if (!BACKEND_URL) { setStatus('offline'); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      setStatus(res.ok ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    ping();
    const interval = setInterval(ping, 30_000);
    return () => clearInterval(interval);
  }, [ping]);

  return (
    <div style={{ zIndex: Z_INDEX.statusIndicator }} className="relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest',
            status === 'online'   && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
            status === 'offline'  && 'bg-red-500/10 border-red-500/20 text-red-600',
            status === 'checking' && 'bg-slate-100 border-slate-200 text-slate-400',
          )}
        >
          {status === 'checking' && <Loader2 className="w-3 h-3 animate-spin" />}
          {status === 'online'   && <Wifi className="w-3 h-3" />}
          {status === 'offline'  && <WifiOff className="w-3 h-3" />}

          {status === 'checking' && 'Connecting...'}
          {status === 'online'   && 'Secure Tunnel Active'}
          {status === 'offline'  && 'Secure Tunnel Offline'}

          {/* Breathing pulse — online only */}
          {status === 'online' && (
            <span className="relative flex w-2 h-2 ml-0.5">
              <motion.span
                animate={{ scale: [1, 2], opacity: [0.6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full bg-emerald-500"
              />
              <span className="relative rounded-full w-2 h-2 bg-emerald-500" />
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Offline warning overlay — shown as a subtle banner below the pill */}
      <AnimatePresence>
        {status === 'offline' && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full right-0 mt-2 w-56 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl shadow-lg"
            style={{ zIndex: Z_INDEX.statusIndicator }}
          >
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Backend Unreachable</p>
            <p className="text-[10px] font-bold text-red-400 mt-0.5">{BACKEND_URL}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
