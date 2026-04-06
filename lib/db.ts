import Dexie, { type Table } from 'dexie';

export interface LocalPatient {
  id: number;
  unique_id: string;
  inmate_name: string;
  screening_state: string;
  screening_district: string;
  facility_type: string;
  // Let Dexie handle generic payloads
  [key: string]: any;
}

export interface SyncPayload {
  id?: number;
  patient_id: number;
  action: 'update' | 'insert';
  payload: any;
  timestamp: string;
}

export class TBPWADatabase extends Dexie {
  patients!: Table<LocalPatient, number>; // Primary key is ID
  syncQueue!: Table<SyncPayload, number>;

  constructor() {
    super('TBPWADatabase');
    this.version(1).stores({
      patients: 'id, unique_id, screening_state, screening_district', // Create indexes
      syncQueue: '++id, patient_id, action'
    });
  }
}

export const db = new TBPWADatabase();

// Provide background sync logic
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('Online event detected. Attempting to flush SyncQueue...');
    const pendingSyncs = await db.syncQueue.toArray();
    
    for (const sync of pendingSyncs) {
      try {
        // Simple robust retry. If successful, delete from queue.
        const res = await fetch('/api/patient-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sync)
        });

        if (res.ok) {
          await db.syncQueue.delete(sync.id!);
          console.log(`Sync ID ${sync.id} flushed successfully.`);
        }
      } catch (err) {
        console.warn('Sync flush partially failed, will retry later.', err);
      }
    }
  });
}
