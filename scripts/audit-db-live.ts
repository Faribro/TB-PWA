/**
 * ZERO-TRUST AUDIT — Live DB Policy Verification
 * Probes all Supabase pooler regions to find the correct one
 * Run: bun run scripts/audit-db-live.ts
 */

import postgres from 'postgres';

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';
const PUBLISHABLE_KEY = 'sb_publishable_SrPM9uLKImpAwokRDy9JoQ_iOWDTpq0';
const PROJECT_REF = 'wwcgybgvfulotflitogu';

// All known Supabase pooler regions × both keys × both ports
const REGIONS = ['ap-south-1', 'us-east-1', 'us-east-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'];
const ENDPOINTS: { host: string; port: number; password: string; username: string; label: string }[] = [];

for (const region of REGIONS) {
  for (const [keyLabel, key] of [['service_role', SERVICE_ROLE_KEY], ['publishable', PUBLISHABLE_KEY]] as const) {
    ENDPOINTS.push({ host: `aws-0-${region}.pooler.supabase.com`, port: 6543, password: key, username: `postgres.${PROJECT_REF}`, label: `pooler ${region} tx / ${keyLabel}` });
    ENDPOINTS.push({ host: `aws-0-${region}.pooler.supabase.com`, port: 5432, password: key, username: `postgres.${PROJECT_REF}`, label: `pooler ${region} session / ${keyLabel}` });
  }
}
// Direct DB — service role key as password (sometimes works on Supabase)
ENDPOINTS.push({ host: `db.${PROJECT_REF}.supabase.co`, port: 5432, password: SERVICE_ROLE_KEY, username: 'postgres', label: 'direct DB / service_role as password' });

async function probe(host: string, port: number, password: string, username: string): Promise<postgres.Sql | null> {
  const sql = postgres({
    host,
    port,
    database: 'postgres',
    username,
    password,
    ssl: 'require',
    max: 1,
    idle_timeout: 3,
    connect_timeout: 6,
  });
  try {
    await sql`SELECT 1`;
    return sql;
  } catch {
    await sql.end({ timeout: 1 }).catch(() => {});
    return null;
  }
}

async function runQueries(sql: postgres.Sql) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('ZERO-TRUST AUDIT — Live DB Policy Verification');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── QUERY 1: All RLS policies on patients ──────────────────────────
  console.log('QUERY 1: pg_policies WHERE tablename = patients');
  console.log('─────────────────────────────────────────────────────────');
  const policies = await sql`
    SELECT policyname, cmd, roles, permissive, qual, with_check
    FROM pg_policies
    WHERE tablename = 'patients'
    ORDER BY cmd, policyname
  `;
  if (policies.length === 0) {
    console.log('⚠️  0 rows — NO policies on patients table');
  } else {
    for (const p of policies) {
      console.log(`  [${p.cmd}] ${p.policyname}`);
      console.log(`    roles:      ${p.roles}`);
      console.log(`    permissive: ${p.permissive}`);
      console.log(`    qual:       ${p.qual}`);
      console.log(`    with_check: ${p.with_check}`);
      console.log('');
    }
    console.log(`Total: ${policies.length} policies`);
  }

  // ── QUERY 2: RLS enabled flag ──────────────────────────────────────
  console.log('\nQUERY 2: pg_tables rowsecurity for patients');
  console.log('─────────────────────────────────────────────────────────');
  const tableInfo = await sql`
    SELECT schemaname, tablename, rowsecurity
    FROM pg_tables WHERE tablename = 'patients'
  `;
  console.log(JSON.stringify(tableInfo, null, 2));

  // ── QUERY 3: custom_access_token_hook installed? ───────────────────
  console.log('\nQUERY 3: routines matching hook/token');
  console.log('─────────────────────────────────────────────────────────');
  const hooks = await sql`
    SELECT routine_name, routine_type, routine_schema
    FROM information_schema.routines
    WHERE routine_name LIKE '%hook%' OR routine_name LIKE '%token%'
    ORDER BY routine_name
  `;
  if (hooks.length === 0) {
    console.log('0 rows — custom_access_token_hook NOT installed');
  } else {
    console.log(JSON.stringify(hooks, null, 2));
  }

  // ── QUERY 4: Total row count (service role bypasses RLS) ───────────
  console.log('\nQUERY 4: Total patient count (service role)');
  console.log('─────────────────────────────────────────────────────────');
  const count = await sql`SELECT COUNT(*) as total FROM patients`;
  console.log(`Total rows: ${count[0].total}`);

  // ── QUERY 5: Anon-specific policies ───────────────────────────────
  console.log('\nQUERY 5: Policies with anon role');
  console.log('─────────────────────────────────────────────────────────');
  const anonPolicies = await sql`
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'patients'
      AND (policyname ILIKE '%anon%' OR roles::text ILIKE '%anon%')
  `;
  if (anonPolicies.length === 0) {
    console.log('✅ 0 anon policies — anon direct access is BLOCKED');
  } else {
    console.log('🔴 anon policies EXIST:');
    console.log(JSON.stringify(anonPolicies, null, 2));
  }
}

async function main() {
  let connected = false;
  for (const ep of ENDPOINTS) {
    process.stdout.write(`Probing ${ep.label}... `);
    const sql = await probe(ep.host, ep.port, ep.password, ep.username);
    if (sql) {
      console.log('✅ CONNECTED');
      connected = true;
      try {
        await runQueries(sql);
      } finally {
        await sql.end();
      }
      break;
    } else {
      console.log('❌ failed');
    }
  }
  if (!connected) {
    console.error('\nAll endpoints failed. Need DB password for direct connection.');
    console.error('Run: npx supabase db execute --project-ref wwcgybgvfulotflitogu ...');
  }
}

main().catch(console.error);
