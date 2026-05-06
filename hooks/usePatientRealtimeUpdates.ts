'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { mutate } from 'swr';

interface UsePatientRealtimeUpdatesOptions {
  patientId: string;
  isEditing?: boolean;
  onUpdate?: (data: any) => void;
}

/**
 * Production-safe hook for patient realtime updates
 * - Uses standard Supabase browser client (publishable key)
 * - Prevents overwriting user edits
 * - Proper cleanup on unmount
 * - Single subscription per patient
 */
export function usePatientRealtimeUpdates({
  patientId,
  isEditing = false,
  onUpdate
}: UsePatientRealtimeUpdatesOptions) {
  const channelRef = useRef<any>(null);
  const isEditingRef = useRef(isEditing);
  
  // Update ref when isEditing changes to avoid stale closures
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log(`[usePatientRealtimeUpdates] 📨 Update received for patient ${patientId}`);
    console.log(`[usePatientRealtimeUpdates] Updated fields:`, Object.keys(payload.new || {}));
    
    // Skip updates if user is currently editing
    if (isEditingRef.current) {
      console.log(`[usePatientRealtimeUpdates] ⏸️ Skipping update - user is editing`);
      return;
    }
    
    console.log(`[usePatientRealtimeUpdates] ✅ Applying realtime update`);
    
    // Update SWR cache for all patient-related queries
    mutate(
      (key: unknown) => {
        if (Array.isArray(key)) {
          const [endpoint] = key;
          // Update patient-specific queries
          if (endpoint === 'patient' && key[1] === patientId) {
            return true;
          }
          // Update general patient lists
          if (['patients', 'allPatients', 'patient'].includes(endpoint as string)) {
            return true;
          }
        }
        return false;
      },
      undefined,
      { revalidate: false }
    );
    
    // Call custom update handler
    if (onUpdate) {
      onUpdate(payload.new);
    }
  }, [patientId, onUpdate]);

  useEffect(() => {
    if (!patientId) return;

    const supabase = createClient();
    
    console.log(`[usePatientRealtimeUpdates] 🔄 Subscribing to patient ${patientId}`);
    
    // Clean up any existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Create new subscription
    const channel = supabase
      .channel(`patient-updates-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patients',
          filter: `id=eq.${patientId}`
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[usePatientRealtimeUpdates] ✅ Subscribed to patient ${patientId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[usePatientRealtimeUpdates] ❌ Subscription error for patient ${patientId}`);
        } else if (status === 'TIMED_OUT') {
          console.error(`[usePatientRealtimeUpdates] ⏱️ Subscription timed out for patient ${patientId}`);
        }
      });
    
    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      console.log(`[usePatientRealtimeUpdates] 🧹 Cleaning up subscription for patient ${patientId}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [patientId, handleRealtimeUpdate]);
}
