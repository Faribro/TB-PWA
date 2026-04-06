import { db, SyncPayload } from './db';

/**
 * Attempts to hit the backend directly.
 * If offline or fetch fails with a network error, queues the payload into Dexie syncQueue securely.
 */
export async function queuePatientSync(patientId: number, action: 'update' | 'insert', payload: any) {
  const syncRecord: SyncPayload = {
    patient_id: patientId,
    action,
    payload,
    timestamp: new Date().toISOString()
  };

  try {
    if (!navigator.onLine) {
      throw new Error('Offline (detected by navigator.onLine)');
    }
    
    const res = await fetch('/api/patient-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncRecord)
    });

    if (!res.ok) {
        throw new Error('Backend failed');
    }
    return { status: 'synced' };

  } catch (error) {
    console.log('Network/backend error. Queuing to Sync DB offline store...', error);
    await db.syncQueue.add(syncRecord);
    return { status: 'queued_offline' };
  }
}
