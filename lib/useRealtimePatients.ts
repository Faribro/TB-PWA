import { useEffect, useRef, useCallback, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimePatientsOptions {
  onInsert?: (newPatient: any) => void
  onUpdate?: (updatedPatient: any) => void
  onDelete?: (deletedId: string) => void
  showToasts?: boolean
  filterState?: string   // only listen to patients from this state
}

export interface RealtimeStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  activeUsers: number
  lastHeartbeat: number | null
}

export function useRealtimePatients(
  options: UseRealtimePatientsOptions = {}
): RealtimeStatus {
  const {
    onInsert,
    onUpdate,
    onDelete,
    showToasts = true,
    filterState
  } = options

  const channelRef = useRef<any>(null)
  const reconnectTimer = useRef<NodeJS.Timeout | undefined>(undefined)
  const reconnectAttempts = useRef(0)
  const heartbeatTimer = useRef<NodeJS.Timeout | undefined>(undefined)
  
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting' as const)
  const [activeUsers, setActiveUsers] = useState<number>(0)
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null)

  // Generate stable user ID for presence
  const userId = useRef(
    typeof window !== 'undefined'
      ? `user_${Math.random().toString(36).slice(2, 11)}`
      : 'server'
  ).current

  const subscribe = useCallback(() => {
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel('patients-realtime-shared', {
        config: {
          presence: {
            key: userId
          },
          broadcast: {
            self: false
          }
        }
      })
      // Track presence (active users)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const userCount = Object.keys(state).length
        setActiveUsers(userCount)
        console.log(`[Realtime] ${userCount} active users`)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Realtime] User joined:', key)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Realtime] User left:', key)
      })
      // Listen to database changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
          ...(filterState
            ? { filter: `screening_state=eq.${filterState}` }
            : {})
        },
        (payload) => {
          reconnectAttempts.current = 0 // reset on success
          setLastHeartbeat(Date.now())

          if (payload.eventType === 'INSERT') {
            onInsert?.(payload.new)
            if (showToasts) {
              toast.success(
                `New patient added: ${payload.new.inmate_name}`,
                {
                  description: payload.new.unique_id,
                  duration: 4000
                }
              )
            }
          }

          if (payload.eventType === 'UPDATE') {
            onUpdate?.(payload.new)
            if (
              showToasts &&
              payload.new.synced_to_sheets === true &&
              payload.old?.synced_to_sheets === false
            ) {
              toast.success(
                `${payload.new.inmate_name} synced to Sheets`,
                { duration: 3000 }
              )
            }
          }

          if (payload.eventType === 'DELETE') {
            onDelete?.(payload.old?.id)
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          reconnectAttempts.current = 0
          setConnectionStatus('connected')
          setLastHeartbeat(Date.now())
          
          // Track presence
          channel.track({
            user_id: userId,
            online_at: new Date().toISOString()
          })
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('error')
          
          // Exponential backoff reconnect
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000 // max 30s
          )
          reconnectAttempts.current++
          
          console.warn(`[Realtime] Connection error, retrying in ${delay}ms (attempt ${reconnectAttempts.current})`)
          
          reconnectTimer.current = setTimeout(subscribe, delay)
        }
      })

    channelRef.current = channel
  }, [filterState, onInsert, onUpdate, onDelete, showToasts, userId])

  // Heartbeat to detect stale connections
  useEffect(() => {
    const checkConnection = () => {
      if (!channelRef.current) return
      
      const state = channelRef.current.state
      const timeSinceLastHeartbeat = lastHeartbeat ? Date.now() - lastHeartbeat : null
      
      // If no heartbeat in 60s and state is not joined, reconnect
      if (state !== 'joined' || (timeSinceLastHeartbeat && timeSinceLastHeartbeat > 60000)) {
        console.warn('[Realtime] Connection stale, reconnecting...', {
          state,
          timeSinceLastHeartbeat
        })
        setConnectionStatus('disconnected')
        subscribe()
      }
    }
    
    heartbeatTimer.current = setInterval(checkConnection, 30000) // Check every 30s
    
    return () => {
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current)
      }
    }
  }, [subscribe, lastHeartbeat])

  useEffect(() => {
    subscribe()
    return () => {
      clearTimeout(reconnectTimer.current)
      clearInterval(heartbeatTimer.current)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [subscribe])
  
  return {
    status: connectionStatus,
    activeUsers,
    lastHeartbeat
  }
}
