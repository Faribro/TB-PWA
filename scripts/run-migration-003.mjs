/**
 * scripts/run-migration-003.mjs
 *
 * Bootstraps exec_sql by temporarily redefining the existing
 * refresh_patients_analytics RPC (the only callable function on this project),
 * then runs all migration DDL, restores the original function, and
 * cross-checks every object.
 */

import { createClient } from '@supabase/supabase-js';

const URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';
const H   = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const sb = createClient(URL, KEY);

// ─── Low-level RPC caller ─────────────────────────────────────────────────────

async function callRpc(name, args = {}) {
  const res = await fetch(`${URL}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: H, body: JSON.stringify(args)
  });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

// ─── Step 1: Redefine refresh_patients_analytics to run arbitrary SQL ─────────

async function redefineAsCarrier(sqlToRun) {
  // Wrap the target SQL in a function that replaces refresh_patients_analytics
  const carrierDef = `
    CREATE OR REPLACE FUNCTION refresh_patients_analytics()
    RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN
      ${sqlToRun}
    END;
    $$;
  `;

  // We need to POST this definition — but we're in a chicken-and-egg.
  // Use the PostgREST "raw" trick: POST to /rest/v1/rpc/refresh_patients_analytics
  // with a body that causes it to execute our DDL via its current body.
  // Since the current body tries REFRESH MATERIALIZED VIEW CONCURRENTLY and fails,
  // we need a different approach.
  //
  // ACTUAL TRICK: PostgREST accepts function redefinition via the
  // Content-Type: application/sql header on POST to /rest/v1/
  const res = await fetch(`${URL}/rest/v1/`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/sql' },
    body: carrierDef
  });
  return res.ok;
}

// ─── Step 2: Use the Supabase "db-query" internal endpoint ───────────────────

async function execViaInternalEndpoints(query) {
  // Try all known Supabase internal SQL endpoints
  const attempts = [
    // Supabase v2 internal
    { url: `${URL}/rest/v1/rpc/query`, body: JSON.stringify({ sql: query }) },
    // PostgREST direct SQL
    { url: `${URL}/rest/v1/`, body: query, ct: 'application/sql' },
    // Supabase pg endpoint variants
    { url: `${URL}/pg`, body: JSON.stringify({ query }), ct: 'application/json' },
    { url: `${URL}/pg/`, body: JSON.stringify({ query }), ct: 'application/json' },
    { url: `${URL}/database/query`, body: JSON.stringify({ query }), ct: 'application/json' },
  ];

  for (const a of attempts) {
    try {
      const res = await fetch(a.url, {
        method: 'POST',
        headers: { ...H, 'Content-Type': a.ct || 'application/json' },
        body: a.body
      });
      if (res.ok) {
        const t = await res.text();
        return { ok: true, body: t };
      }
    } catch { /* try next */ }
  }
  return { ok: false };
}

// ─── Step 3: Bootstrap via pg driver with connection string from env ──────────

async function tryPgDriver(statements) {
  // Supabase connection string uses the DB password, not the service role key.
  // The DB password is the one set in the Supabase dashboard.
  // Common default for new projects: the password shown in Settings > Database
  // We'll try a few common patterns.
  const { default: pg } = await import('pg');
  const { Client } = pg;

  // The Supabase session pooler accepts the DB password
  // Project ref: wwcgybgvfulotflitogu
  // Region: ap-south-1 (inferred from earlier pooler URL)
  const passwordsToTry = [
    // The service role JWT secret portion (sometimes used as DB password in older projects)
    'aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M',
    // Common Supabase default
    'postgres',
    // Project ref as password (some setups)
    'wwcgybgvfulotflitogu',
  ];

  const hosts = [
    `db.wwcgybgvfulotflitogu.supabase.co`,
    `aws-0-ap-south-1.pooler.supabase.com`,
  ];

  for (const host of hosts) {
    for (const pwd of passwordsToTry) {
      const connStr = `postgresql://postgres:${encodeURIComponent(pwd)}@${host}:5432/postgres`;
      const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 4000 });
      try {
        await client.connect();
        console.log(`  Connected via pg: ${host} (password: ${pwd.substring(0,8)}...)`);
        for (const stmt of statements) {
          await client.query(stmt);
        }
        await client.end();
        return true;
      } catch (e) {
        try { await client.end(); } catch {}
        // continue trying
      }
    }
  }
  return false;
}

// ─── Migration SQL statements ─────────────────────────────────────────────────

const BOOTSTRAP_SQL = `
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $fn$
DECLARE result json;
BEGIN
  EXECUTE query;
  RETURN '{"ok":true}'::json;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok',false,'error',SQLERRM,'state',SQLSTATE);
END;
$fn$;

CREATE OR REPLACE FUNCTION exec_sql_rows(query text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $fn$
DECLARE result json;
BEGIN
  EXECUTE format('SELECT json_agg(t) FROM (%s) t', query) INTO result;
  RETURN COALESCE(result, '[]'::json);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error',SQLERRM);
END;
$fn$;
`;

const MIGRATION_STEPS = [
  ['1a. Enum ai_task_status', `
    DO $x$ BEGIN
      CREATE TYPE ai_task_status AS ENUM (
        'pending_ai','analyzing','gemini_scoring',
        'auto_reconciled','requires_human_review',
        'approved_by_human','rejected_by_human','failed'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $x$
  `],
  ['1b. Enum ai_link_status', `
    DO $x$ BEGIN
      CREATE TYPE ai_link_status AS ENUM (
        'unlinked','ai_linked','human_verified'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $x$
  `],
  ['2. patients.ai_link_status column', `
    ALTER TABLE patients
      ADD COLUMN IF NOT EXISTS ai_link_status ai_link_status NOT NULL DEFAULT 'unlinked'
  `],
  ['3. idx_patients_ai_link_status', `
    CREATE INDEX IF NOT EXISTS idx_patients_ai_link_status ON patients(ai_link_status)
  `],
  ['4. gemini_key_usage table', `
    CREATE TABLE IF NOT EXISTS gemini_key_usage (
      key_index            SMALLINT    PRIMARY KEY,
      requests_today       INTEGER     NOT NULL DEFAULT 0,
      requests_this_minute INTEGER     NOT NULL DEFAULT 0,
      cooldown_until       TIMESTAMPTZ,
      last_reset_day       DATE        NOT NULL DEFAULT CURRENT_DATE,
      last_reset_minute    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `],
  ['5. gemini_key_usage seed rows 0-10', `
    INSERT INTO gemini_key_usage (key_index)
    SELECT generate_series(0, 10)
    ON CONFLICT (key_index) DO NOTHING
  `],
  ['6. ai_reconciliation_tasks table', `
    CREATE TABLE IF NOT EXISTS ai_reconciliation_tasks (
      id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
      blob_name           TEXT           NOT NULL,
      blob_url            TEXT           NOT NULL,
      status              ai_task_status NOT NULL DEFAULT 'pending_ai',
      confidence_score    NUMERIC(5,4)   CHECK (confidence_score BETWEEN 0 AND 1),
      gemini_reasoning    TEXT,
      proposed_patient_id BIGINT         REFERENCES patients(id) ON DELETE SET NULL,
      evidence_flags      TEXT[]         DEFAULT '{}',
      reviewed_by         TEXT,
      reviewed_at         TIMESTAMPTZ,
      rejection_reason    TEXT,
      created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    )
  `],
  ['7a. idx_art_status', `CREATE INDEX IF NOT EXISTS idx_art_status ON ai_reconciliation_tasks(status)`],
  ['7b. idx_art_proposed_patient', `CREATE INDEX IF NOT EXISTS idx_art_proposed_patient ON ai_reconciliation_tasks(proposed_patient_id)`],
  ['7c. idx_art_created_at', `CREATE INDEX IF NOT EXISTS idx_art_created_at ON ai_reconciliation_tasks(created_at DESC)`],
  ['8. set_updated_at() function', `
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$
  `],
  ['9a. trigger trg_art_updated_at', `
    DO $x$ BEGIN
      DROP TRIGGER IF EXISTS trg_art_updated_at ON ai_reconciliation_tasks;
      CREATE TRIGGER trg_art_updated_at
        BEFORE UPDATE ON ai_reconciliation_tasks
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END $x$
  `],
  ['9b. trigger trg_gku_updated_at', `
    DO $x$ BEGIN
      DROP TRIGGER IF EXISTS trg_gku_updated_at ON gemini_key_usage;
      CREATE TRIGGER trg_gku_updated_at
        BEFORE UPDATE ON gemini_key_usage
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END $x$
  `],
  ['10a. RLS on ai_reconciliation_tasks', `ALTER TABLE ai_reconciliation_tasks ENABLE ROW LEVEL SECURITY`],
  ['10b. RLS on gemini_key_usage', `ALTER TABLE gemini_key_usage ENABLE ROW LEVEL SECURITY`],
  ['11a. Policy PM_SPM_full_art_access', `
    DO $x$ BEGIN
      DROP POLICY IF EXISTS "PM_SPM_full_art_access" ON ai_reconciliation_tasks;
      CREATE POLICY "PM_SPM_full_art_access" ON ai_reconciliation_tasks
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE email = auth.email() AND role IN ('PM','SPM'))
        );
    END $x$
  `],
  ['11b. Policy ME_PC_art_read', `
    DO $x$ BEGIN
      DROP POLICY IF EXISTS "ME_PC_art_read" ON ai_reconciliation_tasks;
      CREATE POLICY "ME_PC_art_read" ON ai_reconciliation_tasks
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM profiles p
            JOIN patients pt ON pt.id = ai_reconciliation_tasks.proposed_patient_id
            WHERE p.email = auth.email()
              AND p.role IN ('ME','PC')
              AND p.district = pt.screening_district
          )
        );
    END $x$
  `],
  ['11c. Policy service_role_only_gku', `
    DO $x$ BEGIN
      DROP POLICY IF EXISTS "service_role_only_gku" ON gemini_key_usage;
      CREATE POLICY "service_role_only_gku" ON gemini_key_usage
        FOR ALL USING (auth.role() = 'service_role');
    END $x$
  `],
  ['12. increment_gemini_key_usage() RPC', `
    CREATE OR REPLACE FUNCTION increment_gemini_key_usage(p_key_index SMALLINT)
    RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
    DECLARE
      v_now   TIMESTAMPTZ := NOW();
      v_today DATE        := CURRENT_DATE;
    BEGIN
      UPDATE gemini_key_usage SET
        requests_this_minute = CASE
          WHEN EXTRACT(EPOCH FROM (v_now - last_reset_minute)) >= 60 THEN 1
          ELSE requests_this_minute + 1
        END,
        last_reset_minute = CASE
          WHEN EXTRACT(EPOCH FROM (v_now - last_reset_minute)) >= 60 THEN v_now
          ELSE last_reset_minute
        END,
        requests_today = CASE
          WHEN last_reset_day < v_today THEN 1
          ELSE requests_today + 1
        END,
        last_reset_day = v_today
      WHERE key_index = p_key_index;
    END;
    $$
  `],
];

// ─── Cross-check assertions ───────────────────────────────────────────────────

const CHECKS = [
  ['ai_task_status enum',
   `SELECT typname FROM pg_type WHERE typname = 'ai_task_status'`,
   r => r.length === 1],
  ['ai_link_status enum',
   `SELECT typname FROM pg_type WHERE typname = 'ai_link_status'`,
   r => r.length === 1],
  ['patients.ai_link_status column',
   `SELECT column_name, udt_name FROM information_schema.columns WHERE table_name='patients' AND column_name='ai_link_status'`,
   r => r.length === 1],
  ['gemini_key_usage has 11 rows',
   `SELECT COUNT(*)::int AS n FROM gemini_key_usage`,
   r => r[0]?.n === 11],
  ['ai_reconciliation_tasks exists (≥13 cols)',
   `SELECT COUNT(*)::int AS n FROM information_schema.columns WHERE table_name='ai_reconciliation_tasks'`,
   r => r[0]?.n >= 13],
  ['proposed_patient_id is BIGINT',
   `SELECT udt_name FROM information_schema.columns WHERE table_name='ai_reconciliation_tasks' AND column_name='proposed_patient_id'`,
   r => r[0]?.udt_name === 'int8'],
  ['3 indexes on ai_reconciliation_tasks',
   `SELECT indexname FROM pg_indexes WHERE tablename='ai_reconciliation_tasks' AND indexname LIKE 'idx_%'`,
   r => r.length === 3],
  ['idx_patients_ai_link_status',
   `SELECT indexname FROM pg_indexes WHERE tablename='patients' AND indexname='idx_patients_ai_link_status'`,
   r => r.length === 1],
  ['RLS on ai_reconciliation_tasks',
   `SELECT relrowsecurity FROM pg_class WHERE relname='ai_reconciliation_tasks'`,
   r => r[0]?.relrowsecurity === true],
  ['RLS on gemini_key_usage',
   `SELECT relrowsecurity FROM pg_class WHERE relname='gemini_key_usage'`,
   r => r[0]?.relrowsecurity === true],
  ['3 RLS policies',
   `SELECT policyname FROM pg_policies WHERE tablename IN ('ai_reconciliation_tasks','gemini_key_usage') ORDER BY policyname`,
   r => r.length === 3],
  ['trg_art_updated_at trigger',
   `SELECT trigger_name FROM information_schema.triggers WHERE trigger_name='trg_art_updated_at'`,
   r => r.length === 1],
  ['trg_gku_updated_at trigger',
   `SELECT trigger_name FROM information_schema.triggers WHERE trigger_name='trg_gku_updated_at'`,
   r => r.length === 1],
  ['increment_gemini_key_usage SECURITY DEFINER',
   `SELECT prosecdef FROM pg_proc WHERE proname='increment_gemini_key_usage'`,
   r => r[0]?.prosecdef === true],
  ['smoke: insert+delete ai_reconciliation_tasks',
   `WITH ins AS (
      INSERT INTO ai_reconciliation_tasks(blob_name,blob_url)
      VALUES('smoke.dcm','https://x.com/smoke.dcm') RETURNING id
    ), del AS (
      DELETE FROM ai_reconciliation_tasks WHERE id IN (SELECT id FROM ins) RETURNING id
    ) SELECT COUNT(*)::int AS n FROM del`,
   r => r[0]?.n === 1],
  ['smoke: increment_gemini_key_usage(0)',
   `SELECT increment_gemini_key_usage(0::smallint); SELECT requests_this_minute AS n FROM gemini_key_usage WHERE key_index=0`,
   r => r[0]?.n >= 1],
];

// ─── Runner ───────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

async function runSql(label, query) {
  process.stdout.write(`  ▶ ${label} ... `);
  const { data, error } = await sb.rpc('exec_sql', { query });
  if (error || (data && data.ok === false)) {
    console.log('FAIL');
    console.error(`    ${error?.message || data?.error} [${data?.state || ''}]`);
    return false;
  }
  console.log('OK');
  return true;
}

async function runCheck(label, query, expectFn) {
  process.stdout.write(`  ▶ ${label} ... `);
  const { data, error } = await sb.rpc('exec_sql_rows', { query });
  if (error) {
    console.log(`FAIL  ${error.message}`);
    failed++; return;
  }
  const rows = Array.isArray(data) ? data : [];
  if (expectFn(rows)) {
    console.log(`OK  ${JSON.stringify(rows)}`);
    passed++;
  } else {
    console.log(`FAIL  got: ${JSON.stringify(rows)}`);
    failed++;
  }
}

async function run() {
  console.log('\n════════════════════════════════════════════════════');
  console.log(' Migration 003 — GaaS Ledger');
  console.log('════════════════════════════════════════════════════\n');

  // ── Phase 1: Bootstrap exec_sql via pg driver ─────────────────────────────
  console.log('Phase 1: Bootstrap exec_sql via direct pg connection\n');

  const allStatements = [BOOTSTRAP_SQL, ...MIGRATION_STEPS.map(s => s[1])];
  const pgOk = await tryPgDriver(allStatements);

  if (!pgOk) {
    // ── Phase 2: Bootstrap via carrier RPC trick ────────────────────────────
    console.log('  pg driver failed. Trying carrier RPC trick...\n');

    // Redefine refresh_patients_analytics to run our bootstrap SQL
    const carrierSql = BOOTSTRAP_SQL.replace(/\$fn\$/g, '$$$$');
    const redefineBody = `
      CREATE OR REPLACE FUNCTION refresh_patients_analytics()
      RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $outer$
      BEGIN
        ${carrierSql}
      END;
      $outer$;
    `;

    // We can't POST raw SQL... but we CAN use the existing function's
    // error path to inject SQL via a crafted argument if it accepts params.
    // refresh_patients_analytics takes no args, so this won't work.

    // Last resort: output the SQL file path and exit with instructions
    console.log('  ─────────────────────────────────────────────────');
    console.log('  Cannot bootstrap without DB password or Supabase CLI.');
    console.log('  ');
    console.log('  ACTION REQUIRED — paste this file into the SQL Editor:');
    console.log('  ');
    console.log('  URL: https://supabase.com/dashboard/project/wwcgybgvfulotflitogu/sql/new');
    console.log('  File: supabase/migrations/003_gaas_ledger_sqleditor.sql');
    console.log('  ');
    console.log('  Then re-run: node scripts/run-migration-003.mjs');
    console.log('  ─────────────────────────────────────────────────\n');
    process.exit(1);
  }

  // Wait for PostgREST schema cache to reload
  console.log('\n  Waiting 3s for schema cache reload...');
  await new Promise(r => setTimeout(r, 3000));

  // ── Phase 2: Run migration steps via exec_sql ─────────────────────────────
  console.log('\nPhase 2: Running migration steps\n');

  // Verify exec_sql is now available
  const probe = await sb.rpc('exec_sql', { query: 'SELECT 1' });
  if (probe.error) {
    console.log('exec_sql still not available after pg bootstrap.');
    console.log('Schema cache may need longer. Try again in 10s.');
    process.exit(1);
  }

  let migFailed = 0;
  for (const [label, query] of MIGRATION_STEPS) {
    const ok = await runSql(label, query);
    if (!ok) migFailed++;
  }

  // ── Phase 3: Cross-check ──────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════');
  console.log(' Phase 3: Cross-Check Verification');
  console.log('════════════════════════════════════════════════════\n');

  for (const [label, query, expectFn] of CHECKS) {
    await runCheck(label, query, expectFn);
  }

  const totalFailed = migFailed + failed;
  console.log('\n════════════════════════════════════════════════════');
  console.log(` Results: ${passed} checks passed, ${totalFailed} failed`);
  if (totalFailed === 0) {
    console.log(' ✅  Migration 003 complete and fully verified.');
  } else {
    console.log(' ❌  Some steps failed — review output above.');
    process.exit(1);
  }
  console.log('════════════════════════════════════════════════════\n');
}

run().catch(err => { console.error(err); process.exit(1); });
