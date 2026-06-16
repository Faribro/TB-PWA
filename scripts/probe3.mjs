import { createClient } from '@supabase/supabase-js';

const URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

const H = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// Get the function definition from pg_proc
const res = await fetch(`${URL}/rest/v1/rpc/refresh_patients_analytics`, {
  method: 'POST', headers: H, body: JSON.stringify({})
});
console.log('refresh status:', res.status);

// Check what functions exist
const r2 = await fetch(`${URL}/rest/v1/`, { headers: H });
const swagger = await r2.json();
const rpcs = Object.keys(swagger.paths).filter(p => p.startsWith('/rpc/'));
console.log('Available RPCs:', rpcs);

// Try to get function source via information_schema through PostgREST
// PostgREST can query pg_proc if we use the right endpoint
const r3 = await fetch(`${URL}/rest/v1/rpc/refresh_patients_analytics`, {
  method: 'POST',
  headers: { ...H, 'Prefer': 'return=representation' },
  body: JSON.stringify({})
});
const body3 = await r3.text();
console.log('refresh body:', body3.substring(0, 200));
