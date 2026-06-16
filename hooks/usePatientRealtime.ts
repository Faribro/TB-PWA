'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Supabase Realtime Hook for Patient Updates
 * 
 * Subscribes to INSERT, UPDATE, and DELETE events on the patients table.
 * Triggers callback on any change for live UI updates.
 * 
 * @param onUpdate - Callback function triggered on any patient change
 * @param scope - User scope identifiers for stable subscription
 * @param enabled - Whether to enable the subscription (default: true)
 */
export function usePatientRealtime(
  onUpdate: (payload: RealtimePostgresChangesPayload<any>) => void,
  scope?: { state?: string; district?: string; role?: string },
  enabled = true
) {
  const onUpdateRef = useRef(onUpdate);

  // Keep callback ref updated to avoid stale closures without triggering re-subscriptions
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled) return;

    try {
      const supabase = createClient();
      
      // Use a unique channel name per subscription to avoid conflicts
      const subscriptionId = Math.random().toString(36).substring(2, 9);
      const channelName = `notification-patients-changes-${subscriptionId}`;
      console.log(`[Realtime] Subscribing to patients table changes (channel: ${channelName})...`);

      const channel = supabase.channel(channelName);

      // Attach listener callbacks BEFORE calling subscribe()
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'patients'
          },
          (payload) => {
            console.log('[Realtime] Patient change detected:', {
              event: payload.eventType,
              id: (payload.new as any)?.id || (payload.old as any)?.id,
              timestamp: new Date().toISOString()
            });
            
            onUpdateRef.current(payload);
          }
        );

      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] ✅ Successfully subscribed to patients table (channel: ${channelName})`);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn(`[Realtime] ⚠️ Subscription error (non-blocking) on channel ${channelName}:`, err?.message || err);
        } else if (status === 'TIMED_OUT') {
          console.warn(`[Realtime] ⚠️ Subscription timed out on channel ${channelName}`);
        }
      });

      return () => {
        console.log(`[Realtime] Unsubscribing from patients table (channel: ${channelName})...`);
        try {
          channel.unsubscribe();
          supabase.removeChannel(channel);
        } catch (e) {
          console.warn(`[Realtime] ⚠️ Error removing channel ${channelName}:`, e);
        }
      };
    } catch (e) {
      console.warn('[Realtime] ⚠️ Failed to setup realtime subscription (non-blocking):', e);
      return () => {};
    }
  }, [enabled, scope?.state, scope?.district, scope?.role]);
}
