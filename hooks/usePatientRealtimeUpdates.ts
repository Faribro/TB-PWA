'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { mutate } from 'swr';

interface UsePatientRealtimeUpdatesOptions {
  patientId: string;
  isEditing?: boolean;
  onUpdate?: (data: any) => void;
}

/**
 * Production-safe hook for patient realtime updates
 * - Uses consistent Supabase browser client (publishable key)
 * - Prevents overwriting user edits during active editing
 * - Proper cleanup on unmount to prevent memory leaks
 * - Single subscription per patient instance
 * - Optimized SWR cache invalidation
 */
export function usePatientRealtimeUpdates({
  patientId,
  isEditing = false,
  onUpdate
}: UsePatientRealtimeUpdatesOptions) {
  const channelRef = useRef<any>(null);
  const isEditingRef = useRef(isEditing);
  const patientIdRef = useRef(patientId);
  
  // Update refs when props change to avoid stale closures
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    patientIdRef.current = patientId;
  }, [patientId]);

  const handleRealtimeUpdate = useCallback((payload: any) => {
    const currentPatientId = patientIdRef.current;
    console.log(`[usePatientRealtimeUpdates] 📨 Update received for patient ${currentPatientId}`);
    console.log(`[usePatientRealtimeUpdates] Updated fields:`, Object.keys(payload.new || {}));
    
    // Skip updates if user is currently editing
    if (isEditingRef.current) {
      console.log(`[usePatientRealtimeUpdates] ⏸️ Skipping update - user is editing`);
      return;
    }
    
    console.log(`[usePatientRealtimeUpdates] ✅ Applying realtime update`);
    
    // Optimized SWR cache mutation - target specific keys
    mutate(
      (key: unknown) => {
        if (Array.isArray(key)) {
          const [endpoint, ...params] = key;
          
          // Update patient-specific queries
          if (endpoint === 'patient' && params[0] === currentPatientId) {
            return true;
          }
          
          // Update patient list endpoints with revalidation
          if (['/api/vertex/patients-by-date', '/api/vertex/patients-by-facility', '/api/vertex/geo-summary'].includes(endpoint as string)) {
            return true;
          }
        }
        return false;
      },
      undefined,
      { revalidate: true }
    );
    
    // Call custom update handler
    if (onUpdate) {
      onUpdate(payload.new);
    }
  }, []); // Remove onUpdate dependency to prevent re-subscriptions when handler changes

  useEffect(() => {
    if (!patientId) return;

    const supabase = getSupabaseBrowserClient();
    
    console.log(`[usePatientRealtimeUpdates] 🔄 Subscribing to patient ${patientId}`);
    
    // Clean up any existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Determine if patientId is numeric ID or UUID
    const isNumericId = /^\d+$/.test(patientId);
    const filterField = isNumericId ? 'id' : 'kobo_uuid';
    const filterValue = isNumericId ? parseInt(patientId) : patientId;
    
    console.log(`[usePatientRealtimeUpdates] 📡 Using filter: ${filterField}=eq.${filterValue}`);
    
    // Create new subscription with proper error handling
    const channel = supabase
      .channel(`patient-updates-${patientId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patients',
          filter: `${filterField}=eq.${filterValue}`
        },
        handleRealtimeUpdate
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[usePatientRealtimeUpdates] ✅ Subscribed to patient ${patientId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn(`[usePatientRealtimeUpdates] ⚠️ Subscription error for patient ${patientId}:`, err);
        } else if (status === 'TIMED_OUT') {
          console.warn(`[usePatientRealtimeUpdates] ⏱️ Subscription timed out for patient ${patientId}`);
        } else if (status === 'CLOSED') {
          console.log(`[usePatientRealtimeUpdates] 🔒 Channel closed for patient ${patientId}`);
        }
      });
    
    channelRef.current = channel;

    // Cleanup on unmount or patientId change
    return () => {
      console.log(`[usePatientRealtimeUpdates] 🧹 Cleaning up subscription for patient ${patientId}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [patientId]); // Only re-subscribe when patientId changes
}
