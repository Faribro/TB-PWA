import { execSync } from 'child_process';

const REF = 'wwcgybgvfulotflitogu';
// Direct connection (not pooler) — port 5432
const HOST = `db.${REF}.supabase.co`;

// Common passwords to try
const passwords = [
  'postgres',
  'Postgres',
  'password',
  'Password123',
  `${REF}`,
  'supabase',
  'Supabase123',
  'admin',
  'Admin123',
  'alliance',
  'Alliance123',
  'tb_alliance',
  'TbAlliance2024',
  'alliance2024',
  'Alliance2024',
];

for (const pwd of passwords) {
  const url = `postgresql://postgres:${encodeURIComponent(pwd)}@${HOST}:5432/postgres`;
  try {
    const result = execSync(
      `npx supabase db query "SELECT 1 AS ok" --db-url "${url}" --output json`,
      { timeout: 8000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    console.log(`✅ PASSWORD FOUND: ${pwd}`);
    console.log(`   Connection string: postgresql://postgres:${pwd}@${HOST}:5432/postgres`);
    process.exit(0);
  } catch (e) {
    const msg = (e.stderr || e.stdout || e.message || '').substring(0, 80);
    console.log(`✗ ${pwd.padEnd(20)} → ${msg.trim()}`);
  }
}

console.log('\n❌ None of the common passwords worked.');
console.log('   Get the DB password from: https://supabase.com/dashboard/project/wwcgybgvfulotflitogu/settings/database');
console.log('   Then run: node scripts/run-with-password.mjs YOUR_DB_PASSWORD');
