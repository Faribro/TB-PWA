import { useEffect, useRef, useCallback } from 'react'
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

export function useRealtimePatients(
  options: UseRealtimePatientsOptions = {}
) {
  const {
    onInsert,
    onUpdate,
    onDelete,
    showToasts = true,
    filterState
  } = options

  const channelRef = useRef<any>(null)
  const reconnectTimer = useRef<NodeJS.Timeout>()
  const reconnectAttempts = useRef(0)

  const subscribe = useCallback(() => {
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`patients-realtime-${Date.now()}`)
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
        if (status === 'SUBSCRIBED') {
          reconnectAttempts.current = 0
        }
        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          // Exponential backoff reconnect
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000 // max 30s
          )
          reconnectAttempts.current++
          reconnectTimer.current = setTimeout(subscribe, delay)
        }
      })

    channelRef.current = channel
  }, [filterState, onInsert, onUpdate, onDelete, showToasts])

  useEffect(() => {
    subscribe()
    return () => {
      clearTimeout(reconnectTimer.current)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [subscribe])
}
