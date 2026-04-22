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
 * 
 * @example
 * ```tsx
 * import { usePatientRealtime } from '@/hooks/usePatientRealtime';
 * import { mutate } from 'swr';
 * 
 * function PatientList() {
 *   const { data } = useSWR('/api/patients', fetcher);
 *   
 *   usePatientRealtime(() => {
 *     mutate('/api/patients'); // Refresh data on any change
 *   });
 *   
 *   return <div>{data?.patients.map(...)}</div>;
 * }
 * ```
 */
export function usePatientRealtime(
  onUpdate: (payload: RealtimePostgresChangesPayload<any>) => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    
    console.log('[Realtime] Subscribing to patients table changes...');

    const channel = supabase
      .channel('patients-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'patients'
        },
        (payload) => {
          console.log('[Realtime] Patient change detected:', {
            event: payload.eventType,
            id: payload.new?.id || payload.old?.id,
            timestamp: new Date().toISOString()
          });
          
          onUpdate(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Successfully subscribed to patients table');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] ❌ Subscription error');
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] ⏱️ Subscription timed out');
        }
      });

    // Cleanup on unmount
    return () => {
      console.log('[Realtime] Unsubscribing from patients table...');
      supabase.removeChannel(channel);
    };
  }, [onUpdate, enabled]);
}
