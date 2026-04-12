import { motion } from 'framer-motion'
import { Wifi, WifiOff, Loader2, Users } from 'lucide-react'
import type { RealtimeStatus } from '@/lib/useRealtimePatients'

interface RealtimeStatusIndicatorProps {
  status: RealtimeStatus
  compact?: boolean
}

export function RealtimeStatusIndicator({ status, compact = false }: RealtimeStatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status.status) {
      case 'connected':
        return 'emerald'
      case 'connecting':
        return 'amber'
      case 'disconnected':
      case 'error':
        return 'red'
      default:
        return 'slate'
    }
  }

  const color = getStatusColor()

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-${color}-50 border border-${color}-200`}
        title={`Status: ${status.status} • ${status.activeUsers} active users`}
      >
        <div className={`w-1.5 h-1.5 rounded-full bg-${color}-500 ${status.status === 'connected' || status.status === 'connecting' ? 'animate-pulse' : ''}`} />
        {status.status === 'connected' && status.activeUsers > 1 && (
          <span className={`text-[10px] font-bold text-${color}-700`}>
            {status.activeUsers}
          </span>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-${color}-50 border border-${color}-200 shadow-sm`}
    >
      {status.status === 'connected' && <Wifi className={`w-4 h-4 text-${color}-600`} />}
      {status.status === 'connecting' && <Loader2 className={`w-4 h-4 text-${color}-600 animate-spin`} />}
      {(status.status === 'disconnected' || status.status === 'error') && <WifiOff className={`w-4 h-4 text-${color}-600`} />}
      
      <div className="flex flex-col">
        <span className={`text-xs font-bold text-${color}-700 uppercase tracking-wide`}>
          {status.status === 'connected' ? 'Live Sync Active' :
           status.status === 'connecting' ? 'Connecting...' :
           status.status === 'disconnected' ? 'Disconnected' :
           'Connection Error'}
        </span>
        {status.status === 'connected' && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Users className="w-3 h-3" />
            <span>{status.activeUsers} active {status.activeUsers === 1 ? 'user' : 'users'}</span>
            {status.lastHeartbeat && (
              <>
                <span>•</span>
                <span>Updated {new Date(status.lastHeartbeat).toLocaleTimeString()}</span>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
