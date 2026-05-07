'use client';

import { useEffect, useState } from 'react';
import { mutate } from 'swr';

interface FailedUpdate {
  patientId: string;
  updates: Record<string, any>;
  timestamp: string;
  error: string;
  detail?: string;
}

/**
 * Hook to retry failed patient updates when service is restored
 * Automatically attempts to sync locally stored failed updates
 */
export function useFailedUpdateRetry() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const retryFailedUpdates = async () => {
    try {
      const failedUpdates: FailedUpdate[] = JSON.parse(
        localStorage.getItem('failedPatientUpdates') || '[]'
      );

      if (failedUpdates.length === 0) {
        console.log('[useFailedUpdateRetry] ✅ No failed updates to retry');
        return;
      }

      console.log(`[useFailedUpdateRetry] 🔄 Retrying ${failedUpdates.length} failed updates`);
      setIsRetrying(true);

      const successfulRetries: string[] = [];
      const remainingFailures: FailedUpdate[] = [];

      for (const update of failedUpdates) {
        try {
          const res = await fetch('/api/patient-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patientId: update.patientId,
              updates: update.updates
            })
          });

          if (res.ok) {
            successfulRetries.push(update.patientId);
            console.log(`[useFailedUpdateRetry] ✅ Successfully retried update for patient ${update.patientId}`);
            
            // Invalidate relevant caches to refresh data
            mutate(['/api/vertex/patients-by-date']);
            mutate(['/api/vertex/patients-by-facility']);
            mutate(['patient', update.patientId]);
          } else {
            const errorData = await res.json();
            remainingFailures.push({
              ...update,
              error: errorData.error || 'Retry failed',
              detail: errorData.detail
            });
            console.warn(`[useFailedUpdateRetry] ⚠️ Retry failed for patient ${update.patientId}:`, errorData.error);
          }
        } catch (error) {
          remainingFailures.push({
            ...update,
            error: 'Network error during retry',
            detail: error instanceof Error ? error.message : 'Unknown error'
          });
          console.warn(`[useFailedUpdateRetry] ⚠️ Network error retrying patient ${update.patientId}:`, error);
        }
      }

      // Update localStorage with remaining failures
      if (remainingFailures.length > 0) {
        localStorage.setItem('failedPatientUpdates', JSON.stringify(remainingFailures));
      } else {
        localStorage.removeItem('failedPatientUpdates');
      }

      setRetryCount(prev => prev + 1);
      console.log(`[useFailedUpdateRetry] 📊 Retry complete: ${successfulRetries.length} succeeded, ${remainingFailures.length} still failed`);

      return {
        succeeded: successfulRetries.length,
        failed: remainingFailures.length,
        total: failedUpdates.length
      };

    } catch (error) {
      console.error('[useFailedUpdateRetry] ❌ Error during retry process:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Auto-retry when user comes back online or after a delay
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useFailedUpdateRetry] 🌐 User back online - checking for failed updates');
      setTimeout(retryFailedUpdates, 2000); // Wait 2 seconds after coming online
    };

    const checkForFailedUpdates = () => {
      const failedUpdates = JSON.parse(localStorage.getItem('failedPatientUpdates') || '[]');
      if (failedUpdates.length > 0) {
        console.log(`[useFailedUpdateRetry] ⏰ Found ${failedUpdates.length} failed updates - attempting retry`);
        retryFailedUpdates();
      }
    };

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    
    // Check for failed updates on mount and every 5 minutes
    checkForFailedUpdates();
    const interval = setInterval(checkForFailedUpdates, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, []);

  return {
    isRetrying,
    retryCount,
    retryFailedUpdates,
    getFailedUpdatesCount: () => {
      try {
        return JSON.parse(localStorage.getItem('failedPatientUpdates') || '[]').length;
      } catch {
        return 0;
      }
    }
  };
}
