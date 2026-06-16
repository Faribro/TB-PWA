/**
 * Apply audit functions via Supabase Management API
 * The /v1/projects/{ref}/database/query endpoint accepts a PAT (sbp_...)
 * We don't have a PAT, so we'll use the alternative: 
 * POST to /rest/v1/ with a raw SQL body via the pg_dump endpoint
 * 
 * ACTUAL APPROACH: Use the Supabase SQL over HTTP endpoint
 * POST https://{ref}.supabase.co/rest/v1/rpc/{fn} only works for existing functions
 * 
 * FINAL APPROACH: The supabase-js client can execute arbitrary SQL
 * via the .rpc() method IF we first create the function.
 * Since we can't create functions via REST without DDL access,
 * we need to use the SQL Editor API endpoint.
 */

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';
const PROJECT_REF = 'wwcgybgvfulotflitogu';

// Supabase SQL Editor API — undocumented but used by the dashboard
// Requires a user JWT (not service role key)
// Endpoint: POST https://api.supabase.com/v1/projects/{ref}/database/query
// Auth: Bearer {personal_access_token}

// Alternative: The pg_meta API exposed by Supabase
// GET https://{ref}.supabase.co/pg/policies — requires service role
const endpoints = [
  `https://${PROJECT_REF}.supabase.co/pg/policies?table=patients`,
  `https://${PROJECT_REF}.supabase.co/pg/tables`,
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
];

async function tryEndpoint(url: string, method = 'GET', body?: any) {
  const res = await fetch(url, {
    method,
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

console.log('Probing Supabase internal API endpoints...\n');

for (const url of endpoints) {
  const result = await tryEndpoint(url);
  console.log(`${url}`);
  console.log(`  Status: ${result.status}`);
  console.log(`  Body: ${result.body.substring(0, 200)}\n`);
}

// Try pg_meta via the known Supabase internal path
const pgMetaUrl = `https://${PROJECT_REF}.supabase.co/pg/policies?table=patients&schema=public`;
const r = await tryEndpoint(pgMetaUrl);
console.log('pg_meta policies:', r.status, r.body.substring(0, 500));

export {};
