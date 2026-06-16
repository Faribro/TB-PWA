import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2, CloudOff, Cloud } from 'lucide-react'
import type { SyncState } from '@/lib/useSyncStatus'
import { useEffect, useState } from 'react'

interface SyncStatusBadgeProps {
  state: SyncState
  message: string
  lastSyncedAt?: string
}

export function SyncStatusBadge({ state, message, lastSyncedAt }: SyncStatusBadgeProps) {
  const [showSynced, setShowSynced] = useState(true)

  // Auto-fade synced badge after 4 seconds
  useEffect(() => {
    if (state === 'synced') {
      const timer = setTimeout(() => {
        setShowSynced(false)
      }, 4000)
      return () => clearTimeout(timer)
    } else {
      setShowSynced(true)
    }
  }, [state])

  if (state === 'idle' || (state === 'synced' && !showSynced)) {
    return null
  }

  let content: React.ReactNode

  switch (state) {
    case 'saving':
      content = (
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200/60 rounded-full px-2.5 py-1">
          <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
            Saving
          </span>
        </div>
      )
      break

    case 'syncing':
      content = (
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/60 rounded-full px-2.5 py-1">
          <Cloud className="w-3 h-3 text-amber-500 animate-pulse" />
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
            Syncing
          </span>
        </div>
      )
      break

    case 'synced':
      content = (
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/60 rounded-full px-2.5 py-1">
          <Check className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
            Synced
          </span>
        </div>
      )
      break

    case 'error':
      content = (
        <div 
          className="flex items-center gap-1.5 bg-red-50 border border-red-200/60 rounded-full px-2.5 py-1 cursor-help"
          title={message}
        >
          <CloudOff className="w-3 h-3 text-red-500" />
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
            Sync Failed
          </span>
        </div>
      )
      break

    default:
      return null
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  )
}
