'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Supabase Realtime Hook for Patient Updates
 * 
 * Subscribes to INSERT, UPDATE, and DELETE events on the patients table.
 * Triggers callback on any change for live UI updates.
 * 
 * @param onUpdate - Callback function triggered on any patient change
 * @param enabled - Whether to enable the subscription (default: true)
 */
export function usePatientRealtime(
  onUpdate: (payload: RealtimePostgresChangesPayload<any>) => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    try {
      const supabase = createClient();
      
      console.log('[Realtime] Subscribing to patients table changes...');

      const channel = supabase.channel('notification-patients-changes');

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
            
            onUpdate(payload);
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] ✅ Successfully subscribed to patients table');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[Realtime] ⚠️ Subscription error (non-blocking):', err?.message || err);
          } else if (status === 'TIMED_OUT') {
            console.warn('[Realtime] ⚠️ Subscription timed out');
          }
        });

      return () => {
        console.log('[Realtime] Unsubscribing from patients table...');
        try {
          channel.unsubscribe();
          supabase.removeChannel(channel);
        } catch (e) {
          console.warn('[Realtime] ⚠️ Error removing channel:', e);
        }
      };
    } catch (e) {
      console.warn('[Realtime] ⚠️ Failed to setup realtime subscription (non-blocking):', e);
      return () => {};
    }
  }, [onUpdate, enabled]);
}
