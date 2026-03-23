import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://wwcgybgvfulotflitogu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M'
);

const r1 = await sb.from('patients').select('id').limit(1);
console.log('patients query:', r1.error ? r1.error.message : JSON.stringify(r1.data));

const r2 = await sb.rpc('exec_sql_rows', { query: 'SELECT 1 AS ok' });
console.log('exec_sql_rows:', r2.error ? r2.error.message : JSON.stringify(r2.data));

// Try calling the pg endpoint directly
const res = await fetch('https://wwcgybgvfulotflitogu.supabase.co/pg/query', {
  method: 'POST',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: 'SELECT 1 AS ok' })
});
console.log('pg/query status:', res.status, await res.text());
