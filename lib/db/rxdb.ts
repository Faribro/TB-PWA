'use client';

import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';

addRxPlugin(RxDBQueryBuilderPlugin);

const patientSchema = {
  version: 0,
  primaryKey: 'unique_id',
  type: 'object',
  properties: {
    unique_id: { type: 'string', maxLength: 100 },
    id: { type: 'number' },
    staff_name: { type: 'string' },
    submitted_on: { type: 'string' },
    screening_state: { type: 'string' },
    screening_district: { type: 'string' },
    facility_name: { type: 'string' },
    facility_type: { type: 'string' },
    screening_date: { type: 'string' },
    inmate_name: { type: 'string' },
    inmate_type: { type: 'string' },
    father_husband_name: { type: 'string' },
    date_of_birth: { type: 'string' },
    age: { type: 'number' },
    sex: { type: 'string' },
    contact_number: { type: 'string' },
    address: { type: 'string' },
    xray_result: { type: 'string' },
    symptoms_10s: { type: 'string' },
    tb_past_history: { type: 'string' },
    referral_date: { type: 'string' },
    referred_facility: { type: 'string' },
    tb_diagnosed: { type: 'string' },
    tb_diagnosis_date: { type: 'string' },
    tb_type: { type: 'string' },
    att_start_date: { type: 'string' },
    att_completion_date: { type: 'string' },
    hiv_status: { type: 'string' },
    art_status: { type: 'string' },
    art_number: { type: 'string' },
    nikshay_abha_id: { type: 'string' },
    registration_date: { type: 'string' },
    remarks: { type: 'string' },
    kobo_uuid: { type: 'string' },
    kobo_id: { type: 'string' },
    serial_number: { type: 'string' },
    created_at: { type: 'string' }
  },
  required: ['unique_id']
};

let dbInstance: any = null;

export const getDatabase = async () => {
  if (dbInstance) return dbInstance;
  
  const db = await createRxDatabase({
    name: 'tb_command_center',
    storage: getRxStorageDexie(),
    ignoreDuplicate: true
  });

  await db.addCollections({
    patients: { schema: patientSchema }
  });

  dbInstance = db;
  return db;
};

export const syncFromSupabase = async (data: any[]) => {
  const db = await getDatabase();
  await db.patients.bulkUpsert(data);
  return data.length;
};
