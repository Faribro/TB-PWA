'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface RealtimeStatus {
  status: ConnectionStatus;
  activeUsers: number;
  lastHeartbeat: number | null;
}

interface UseRealtimePatientsOptions {
  onInsert?: (patient: Record<string, unknown>) => void;
  onUpdate?: (patient: Record<string, unknown>) => void;
  onDelete?: (id: string) => void;
  showToasts?: boolean;
  filterState?: string;
}

// Stable user ID persisted for the browser session
function getSessionUserId(): string {
  if (typeof window === 'undefined') return 'server';
  const key = 'samadhaan_realtime_uid';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `u_${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

const MAX_RECONNECT_DELAY_MS = 30_000;
const STALE_THRESHOLD_MS = 60_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

export function useRealtimePatients(
  options: UseRealtimePatientsOptions = {}
): RealtimeStatus {
  const { onInsert, onUpdate, onDelete, showToasts = true, filterState } = options;

  // Keep latest callbacks in a ref — never a subscribe dep
  const cb = useRef({ onInsert, onUpdate, onDelete, showToasts });
  useEffect(() => {
    cb.current = { onInsert, onUpdate, onDelete, showToasts };
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const lastHeartbeatRef = useRef<number | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [activeUsers, setActiveUsers] = useState(0);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);

  const userId = useRef(getSessionUserId()).current;

  const clearReconnectTimer = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  const subscribe = useCallback(() => {
    const supabase = getSupabaseBrowserClient();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setStatus('connecting');

    const channel = supabase
      .channel('patients-realtime-shared', {
        config: {
          presence: { key: userId },
          broadcast: { self: false },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        const count = Object.keys(channel.presenceState()).length;
        setActiveUsers(count);
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
          ...(filterState ? { filter: `screening_state=eq.${filterState}` } : {}),
        },
        (payload) => {
          reconnectAttempts.current = 0;
          const now = Date.now();
          lastHeartbeatRef.current = now;
          setLastHeartbeat(now);

          if (payload.eventType === 'INSERT') {
            const p = payload.new as Record<string, unknown>;
            cb.current.onInsert?.(p);
            if (cb.current.showToasts) {
              toast.success(`New patient: ${p.inmate_name}`, {
                description: p.unique_id as string,
                duration: 4000,
              });
            }
          }

          if (payload.eventType === 'UPDATE') {
            const p = payload.new as Record<string, unknown>;
            const old = payload.old as Record<string, unknown>;
            cb.current.onUpdate?.(p);
            if (
              cb.current.showToasts &&
              p.synced_to_sheets === true &&
              old?.synced_to_sheets === false
            ) {
              toast.success(`${p.inmate_name} synced to Sheets`, { duration: 3000 });
            }
          }

          if (payload.eventType === 'DELETE') {
            cb.current.onDelete?.((payload.old as Record<string, unknown>)?.id as string);
          }
        }
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          reconnectAttempts.current = 0;
          setStatus('connected');
          const now = Date.now();
          lastHeartbeatRef.current = now;
          setLastHeartbeat(now);
          channel.track({ user_id: userId, online_at: new Date().toISOString() });
        } else if (s === 'CLOSED') {
          setStatus('disconnected');
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          setStatus('error');
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            MAX_RECONNECT_DELAY_MS
          );
          reconnectAttempts.current++;
          reconnectTimer.current = setTimeout(subscribe, delay);
        }
      });

    channelRef.current = channel;
  }, [filterState, userId]); // stable — callbacks never in deps

  // Heartbeat watchdog — uses ref for lastHeartbeat, no dep-array churn
  useEffect(() => {
    const id = setInterval(() => {
      if (!channelRef.current) return;
      const stale =
        lastHeartbeatRef.current !== null &&
        Date.now() - lastHeartbeatRef.current > STALE_THRESHOLD_MS;
      const notJoined = (channelRef.current as unknown as { state: string }).state !== 'joined';
      if (stale || notJoined) {
        setStatus('disconnected');
        subscribe();
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(id);
  }, [subscribe]); // subscribe is stable (memoized with useCallback)

  // Pause when tab hidden, resume when visible
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        clearReconnectTimer();
        subscribe();
      } else {
        // Tab hidden — disconnect to free server resources
        if (channelRef.current) {
          getSupabaseBrowserClient().removeChannel(channelRef.current);
          channelRef.current = null;
        }
        setStatus('disconnected');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [subscribe]);

  // Mount / unmount
  useEffect(() => {
    subscribe();
    return () => {
      clearReconnectTimer();
      if (channelRef.current) {
        getSupabaseBrowserClient().removeChannel(channelRef.current);
      }
    };
  }, [subscribe]);

  return { status, activeUsers, lastHeartbeat };
}
