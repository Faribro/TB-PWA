/**
 * scripts/migrate.mjs  <db-password>
 *
 * Usage:
 *   node scripts/migrate.mjs YOUR_DB_PASSWORD
 *
 * Get the password from:
 *   https://supabase.com/dashboard/project/wwcgybgvfulotflitogu/settings/database
 *   → "Database password" field (or reset it there if forgotten)
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const pwd = process.argv[2];
if (!pwd) {
  console.error('\nUsage: node scripts/migrate.mjs YOUR_DB_PASSWORD\n');
  console.error('Get it from: https://supabase.com/dashboard/project/wwcgybgvfulotflitogu/settings/database\n');
  process.exit(1);
}

const DB_URL = `postgresql://postgres:${encodeURIComponent(pwd)}@db.wwcgybgvfulotflitogu.supabase.co:5432/postgres`;

let passed = 0, failed = 0;

function run(label, sql) {
  process.stdout.write(`  ▶ ${label} ... `);
  // Write SQL to a temp file (avoids shell escaping issues)
  const tmp = join(tmpdir(), `mig_${Date.now()}.sql`);
  writeFileSync(tmp, sql, 'utf8');
  try {
    const out = execSync(
      `npx supabase db query --db-url "${DB_URL}" --file "${tmp}" --output json`,
      { timeout: 30000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    console.log('OK');
    unlinkSync(tmp);
    return { ok: true, out };
  } catch (e) {
    const msg = (e.stderr || e.stdout || e.message || '').replace(/\n/g, ' ').substring(0, 120);
    console.log(`FAIL  ${msg}`);
    unlinkSync(tmp);
    return { ok: false };
  }
}

function check(label, sql, expectFn) {
  process.stdout.write(`  ▶ ${label} ... `);
  const tmp = join(tmpdir(), `chk_${Date.now()}.sql`);
  writeFileSync(tmp, sql, 'utf8');
  try {
    const out = execSync(
      `npx supabase db query --db-url "${DB_URL}" --file "${tmp}" --output json`,
      { timeout: 15000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    unlinkSync(tmp);
    let rows = [];
    try {
      const parsed = JSON.parse(out);
      // CLI wraps in { data: [...] } when --agent is detected
      rows = Array.isArray(parsed) ? parsed : (parsed.data ?? parsed.rows ?? []);
    } catch { rows = []; }

    if (expectFn(rows)) {
      console.log(`OK   ${JSON.stringify(rows)}`);
      passed++;
    } else {
      console.log(`FAIL  got: ${JSON.stringify(rows)}`);
      failed++;
    }
  } catch (e) {
    const msg = (e.stderr || e.stdout || e.message || '').replace(/\n/g, ' ').substring(0, 120);
    console.log(`FAIL  ${msg}`);
    unlinkSync(tmp);
    failed++;
  }
}

// ─── Verify connection first ──────────────────────────────────────────────────

console.log('\n════════════════════════════════════════════════════');
console.log(' Migration 003 — GaaS Ledger');
console.log('════════════════════════════════════════════════════\n');

process.stdout.write('  ▶ Testing DB connection ... ');
try {
  execSync(
    `npx supabase db query --db-url "${DB_URL}" "SELECT 1 AS ok" --output json`,
    { timeout: 10000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  console.log('OK\n');
} catch (e) {
  console.log('FAIL');
  console.error(`\n  Wrong password or DB unreachable.`);
  console.error(`  Error: ${(e.stderr || e.message || '').substring(0, 200)}\n`);
  process.exit(1);
}

// ─── Migration steps ──────────────────────────────────────────────────────────

const steps = [

['Bootstrap exec_sql + exec_sql_rows helpers', `
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
`],

['1a. Enum ai_task_status', `
DO $x$ BEGIN
  CREATE TYPE ai_task_status AS ENUM (
    'pending_ai','analyzing','gemini_scoring',
    'auto_reconciled','requires_human_review',
    'approved_by_human','rejected_by_human','failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $x$;
`],

['1b. Enum ai_link_status', `
DO $x$ BEGIN
  CREATE TYPE ai_link_status AS ENUM (
    'unlinked','ai_linked','human_verified'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $x$;
`],

['2. patients.ai_link_status column', `
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS ai_link_status ai_link_status NOT NULL DEFAULT 'unlinked';
`],

['3. idx_patients_ai_link_status', `
CREATE INDEX IF NOT EXISTS idx_patients_ai_link_status ON patients(ai_link_status);
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
);
`],

['5. gemini_key_usage seed rows 0-10', `
INSERT INTO gemini_key_usage (key_index)
SELECT generate_series(0, 10)
ON CONFLICT (key_index) DO NOTHING;
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
);
`],

['7a. idx_art_status', `
CREATE INDEX IF NOT EXISTS idx_art_status ON ai_reconciliation_tasks(status);
`],

['7b. idx_art_proposed_patient', `
CREATE INDEX IF NOT EXISTS idx_art_proposed_patient ON ai_reconciliation_tasks(proposed_patient_id);
`],

['7c. idx_art_created_at', `
CREATE INDEX IF NOT EXISTS idx_art_created_at ON ai_reconciliation_tasks(created_at DESC);
`],

['8. set_updated_at() trigger function', `
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
`],

['9a. trigger trg_art_updated_at', `
DROP TRIGGER IF EXISTS trg_art_updated_at ON ai_reconciliation_tasks;
CREATE TRIGGER trg_art_updated_at
  BEFORE UPDATE ON ai_reconciliation_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`],

['9b. trigger trg_gku_updated_at', `
DROP TRIGGER IF EXISTS trg_gku_updated_at ON gemini_key_usage;
CREATE TRIGGER trg_gku_updated_at
  BEFORE UPDATE ON gemini_key_usage
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`],

['10a. RLS on ai_reconciliation_tasks', `
ALTER TABLE ai_reconciliation_tasks ENABLE ROW LEVEL SECURITY;
`],

['10b. RLS on gemini_key_usage', `
ALTER TABLE gemini_key_usage ENABLE ROW LEVEL SECURITY;
`],

['11a. Policy PM_SPM_full_art_access', `
DROP POLICY IF EXISTS "PM_SPM_full_art_access" ON ai_reconciliation_tasks;
CREATE POLICY "PM_SPM_full_art_access" ON ai_reconciliation_tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE email = auth.email() AND role IN ('PM','SPM'))
  );
`],

['11b. Policy ME_PC_art_read', `
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
`],

['11c. Policy service_role_only_gku', `
DROP POLICY IF EXISTS "service_role_only_gku" ON gemini_key_usage;
CREATE POLICY "service_role_only_gku" ON gemini_key_usage
  FOR ALL USING (auth.role() = 'service_role');
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
$$;
`],

];

// ─── Run migration ────────────────────────────────────────────────────────────

let migFailed = 0;
for (const [label, sql] of steps) {
  const { ok } = run(label, sql);
  if (!ok) migFailed++;
}

// ─── Cross-checks ─────────────────────────────────────────────────────────────

console.log('\n════════════════════════════════════════════════════');
console.log(' Cross-Check Verification');
console.log('════════════════════════════════════════════════════\n');

check('ai_task_status enum',
  `SELECT typname FROM pg_type WHERE typname = 'ai_task_status'`,
  r => r.length === 1);

check('ai_link_status enum',
  `SELECT typname FROM pg_type WHERE typname = 'ai_link_status'`,
  r => r.length === 1);

check('patients.ai_link_status column',
  `SELECT column_name, udt_name FROM information_schema.columns
   WHERE table_name='patients' AND column_name='ai_link_status'`,
  r => r.length === 1);

check('gemini_key_usage has 11 rows',
  `SELECT COUNT(*)::int AS n FROM gemini_key_usage`,
  r => r[0]?.n === 11);

check('ai_reconciliation_tasks has ≥13 columns',
  `SELECT COUNT(*)::int AS n FROM information_schema.columns
   WHERE table_name='ai_reconciliation_tasks'`,
  r => r[0]?.n >= 13);

check('proposed_patient_id is BIGINT (int8)',
  `SELECT udt_name FROM information_schema.columns
   WHERE table_name='ai_reconciliation_tasks' AND column_name='proposed_patient_id'`,
  r => r[0]?.udt_name === 'int8');

check('3 custom indexes on ai_reconciliation_tasks',
  `SELECT indexname FROM pg_indexes
   WHERE tablename='ai_reconciliation_tasks' AND indexname LIKE 'idx_%'
   ORDER BY indexname`,
  r => r.length === 3);

check('idx_patients_ai_link_status exists',
  `SELECT indexname FROM pg_indexes
   WHERE tablename='patients' AND indexname='idx_patients_ai_link_status'`,
  r => r.length === 1);

check('RLS enabled on ai_reconciliation_tasks',
  `SELECT relrowsecurity FROM pg_class WHERE relname='ai_reconciliation_tasks'`,
  r => r[0]?.relrowsecurity === true);

check('RLS enabled on gemini_key_usage',
  `SELECT relrowsecurity FROM pg_class WHERE relname='gemini_key_usage'`,
  r => r[0]?.relrowsecurity === true);

check('3 RLS policies created',
  `SELECT policyname FROM pg_policies
   WHERE tablename IN ('ai_reconciliation_tasks','gemini_key_usage')
   ORDER BY policyname`,
  r => r.length === 3);

check('trg_art_updated_at trigger',
  `SELECT trigger_name FROM information_schema.triggers
   WHERE trigger_name='trg_art_updated_at'`,
  r => r.length === 1);

check('trg_gku_updated_at trigger',
  `SELECT trigger_name FROM information_schema.triggers
   WHERE trigger_name='trg_gku_updated_at'`,
  r => r.length === 1);

check('increment_gemini_key_usage is SECURITY DEFINER',
  `SELECT prosecdef FROM pg_proc WHERE proname='increment_gemini_key_usage'`,
  r => r[0]?.prosecdef === true);

check('exec_sql_rows RPC exists',
  `SELECT proname FROM pg_proc WHERE proname='exec_sql_rows'`,
  r => r.length === 1);

check('smoke: insert + delete ai_reconciliation_tasks',
  `WITH ins AS (
     INSERT INTO ai_reconciliation_tasks(blob_name,blob_url)
     VALUES('smoke.dcm','https://x.com/smoke.dcm') RETURNING id
   ), del AS (
     DELETE FROM ai_reconciliation_tasks
     WHERE id IN (SELECT id FROM ins) RETURNING id
   ) SELECT COUNT(*)::int AS n FROM del`,
  r => r[0]?.n === 1);

check('smoke: increment_gemini_key_usage(0)',
  `SELECT increment_gemini_key_usage(0::smallint);
   SELECT requests_this_minute AS n FROM gemini_key_usage WHERE key_index=0`,
  r => r[0]?.n >= 1);

// ─── Summary ──────────────────────────────────────────────────────────────────

const totalFailed = migFailed + failed;
console.log('════════════════════════════════════════════════════');
console.log(` Results: ${passed} checks passed, ${totalFailed} failed`);
if (totalFailed === 0) {
  console.log(' ✅  Migration 003 complete and fully verified.');
} else {
  console.log(' ❌  Some steps failed — review output above.');
  process.exit(1);
}
console.log('════════════════════════════════════════════════════\n');
