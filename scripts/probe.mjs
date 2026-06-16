import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://wwcgybgvfulotflitogu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M'
);

const r1 = await sb.rpc('refresh_patients_analytics');
console.log('refresh_patients_analytics:', r1.error ? r1.error.message : 'OK');

const r2 = await sb.rpc('exec_sql', { query: 'SELECT 1' });
console.log('exec_sql:', r2.error ? r2.error.message : 'EXISTS → ' + JSON.stringify(r2.data));

// Check patients table structure
const r3 = await sb.from('patients').select('id').limit(1);
console.log('patients.id sample:', r3.error ? r3.error.message : JSON.stringify(r3.data));
