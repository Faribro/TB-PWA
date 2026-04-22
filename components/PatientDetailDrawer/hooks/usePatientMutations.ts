import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncState {
  statusDB: SyncStatus;
  statusKobo: SyncStatus;
  statusSheets: SyncStatus;
}

interface UsePatientMutationsReturn {
  saveClinical: (patientId: number, koboUuid: string, updates: any) => Promise<void>;
  saveDemographics: (patientId: number, koboUuid: string, updates: any) => Promise<void>;
  closeLoop: (patientId: number, koboUuid: string, reason: string, serialNumber?: number) => Promise<void>;
  syncState: SyncState;
  isSubmitting: boolean;
}

export function usePatientMutations(
  onSuccess?: () => void
): UsePatientMutationsReturn {
  const { mutate } = useSWRConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>({
    statusDB: 'idle',
    statusKobo: 'idle',
    statusSheets: 'idle',
  });

  const resetSyncState = () => {
    setSyncState({
      statusDB: 'idle',
      statusKobo: 'idle',
      statusSheets: 'idle',
    });
  };

  const performTripleSync = async (
    patientId: number,
    koboUuid: string,
    updates: any,
    toastId: string
  ) => {
    setIsSubmitting(true);
    resetSyncState();

    try {
      toast.loading('Syncing across all systems...', { id: toastId });

      // Phase 1: Optimistic DB update
      setSyncState(prev => ({ ...prev, statusDB: 'syncing' }));
      
      mutate(
        (key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'),
        async (currentData: any) => {
          if (!currentData) return currentData;
          if (currentData.data && Array.isArray(currentData.data)) {
            return {
              ...currentData,
              data: currentData.data.map((p: any) =>
                p.id === patientId ? { ...p, ...updates } : p
              ),
            };
          }
          if (Array.isArray(currentData)) {
            return currentData.map((p: any) =>
              p.id === patientId ? { ...p, ...updates } : p
            );
          }
          return currentData;
        },
        { revalidate: false }
      );

      setSyncState(prev => ({ ...prev, statusDB: 'success', statusKobo: 'syncing' }));

      // Phase 2: API call (DB + Kobo + Sheets)
      const response = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          koboUuid,
          updates,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: 'Failed to parse error response', details: errorText };
        }
        throw new Error(errorData.error || errorData.details || 'Failed to sync');
      }

      const result = await response.json();

      // Phase 3: Update sync states based on result
      setSyncState(prev => ({ ...prev, statusKobo: 'success', statusSheets: 'success' }));
      toast.success('✅ Saved successfully', { id: toastId, duration: 4000 });

      // Revalidate caches
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));

      if (koboUuid) {
        window.dispatchEvent(
          new CustomEvent('sync-confirmed', { detail: { koboUuid } })
        );
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('[usePatientMutations] Error:', error);
      setSyncState({
        statusDB: 'error',
        statusKobo: 'error',
        statusSheets: 'error',
      });
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
      setTimeout(resetSyncState, 3000);
    }
  };

  const saveClinical = async (patientId: number, koboUuid: string, updates: any) => {
    const updatesWithIdentifiers = {
      ...updates,
      'Serial Number': updates['Serial Number'] || patientId,
      'KoboUUID': koboUuid,
    };

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 SENDING TO SHEETS (Clinical):');
    console.log('Patient ID:', patientId);
    console.log('Kobo UUID:', koboUuid);
    console.table(updatesWithIdentifiers);
    console.log('═══════════════════════════════════════════════════════════');

    await performTripleSync(patientId, koboUuid, updatesWithIdentifiers, 'clinical-save');
  };

  const saveDemographics = async (patientId: number, koboUuid: string, updates: any) => {
    const updatesWithIdentifiers = {
      ...updates,
      'Serial Number': updates['Serial Number'] || patientId,
      'KoboUUID': koboUuid,
    };

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 SENDING TO SHEETS (Demographics):');
    console.log('Patient ID:', patientId);
    console.log('Kobo UUID:', koboUuid);
    console.table(updatesWithIdentifiers);
    console.log('═══════════════════════════════════════════════════════════');

    await performTripleSync(patientId, koboUuid, updatesWithIdentifiers, 'demo-save');
  };

  const closeLoop = async (
    patientId: number,
    koboUuid: string,
    reason: string,
    serialNumber?: number
  ) => {
    const updates = {
      'TB diagnosed (Y/N)': 'N',
      'closure_reason': reason,
      'Remarks': `Loop closed: ${reason}`,
      'Serial Number': serialNumber || patientId,
      'KoboUUID': koboUuid,
    };

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 SENDING TO SHEETS (Close Loop):');
    console.log('Patient ID:', patientId);
    console.log('Kobo UUID:', koboUuid);
    console.table(updates);
    console.log('═══════════════════════════════════════════════════════════');

    await performTripleSync(patientId, koboUuid, updates, 'close-loop');
  };

  return {
    saveClinical,
    saveDemographics,
    closeLoop,
    syncState,
    isSubmitting,
  };
}
