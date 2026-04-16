#!/usr/bin/env node

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('✅ TB-PWA ENTERPRISE STABILIZATION - PRE-DEPLOYMENT CHECKLIST');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const fs = require('fs');
const path = require('path');

const checks = [];

function check(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    checks.push({ name, passed: true });
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    checks.push({ name, passed: false, error: error.message });
  }
}

// File existence checks
check('Global Supabase singleton exists', () => {
  const file = path.join(__dirname, '..', 'lib', 'supabase-browser.ts');
  if (!fs.existsSync(file)) throw new Error('File not found');
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('getSupabaseBrowserClient')) throw new Error('Missing export');
});

check('Circuit breaker utility exists', () => {
  const file = path.join(__dirname, '..', 'lib', 'circuit-breaker.ts');
  if (!fs.existsSync(file)) throw new Error('File not found');
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('withCircuitBreaker')) throw new Error('Missing export');
});

check('Patients API updated', () => {
  const file = path.join(__dirname, '..', 'app', 'api', 'patients', 'route.ts');
  if (!fs.existsSync(file)) throw new Error('File not found');
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('maxDuration = 15')) throw new Error('Missing maxDuration');
  if (!content.includes('Math.min(requestedPageSize, 100)')) throw new Error('Missing hard limit');
});

check('Vertex metrics API updated', () => {
  const file = path.join(__dirname, '..', 'app', 'api', 'vertex', 'metrics', 'route.ts');
  if (!fs.existsSync(file)) throw new Error('File not found');
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('maxDuration = 15')) throw new Error('Missing maxDuration');
  if (!content.includes('Promise.race')) throw new Error('Missing circuit breaker');
});

check('SWR hook updated', () => {
  const file = path.join(__dirname, '..', 'hooks', 'useSWRPatients.ts');
  if (!fs.existsSync(file)) throw new Error('File not found');
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('pageSize: number = 100')) throw new Error('Missing hard limit');
});

check('RLS fix endpoint exists', () => {
  const file = path.join(__dirname, '..', 'app', 'api', 'admin', 'fix-rls', 'route.ts');
  if (!fs.existsSync(file)) throw new Error('File not found');
});

check('SQL migration exists', () => {
  const file = path.join(__dirname, '..', 'supabase', 'migrations', '20250122_service_role_rls.sql');
  if (!fs.existsSync(file)) throw new Error('File not found');
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('service_role_all_patients')) throw new Error('Missing policy');
});

check('Vercel config updated', () => {
  const file = path.join(__dirname, '..', 'vercel.json');
  if (!fs.existsSync(file)) throw new Error('File not found');
  const content = fs.readFileSync(file, 'utf8');
  const config = JSON.parse(content);
  if (!config.functions['app/api/patients/route.ts']) throw new Error('Missing patients config');
  if (config.functions['app/api/patients/route.ts'].maxDuration !== 15) throw new Error('Wrong maxDuration');
});

check('Test scripts exist', () => {
  const stabilization = path.join(__dirname, 'test-stabilization.js');
  const loadTest = path.join(__dirname, 'load-test.ts');
  if (!fs.existsSync(stabilization)) throw new Error('test-stabilization.js not found');
  if (!fs.existsSync(loadTest)) throw new Error('load-test.ts not found');
});

check('Documentation exists', () => {
  const deployment = path.join(__dirname, '..', 'docs', 'DEPLOYMENT_GUIDE.md');
  const emergency = path.join(__dirname, '..', 'docs', 'EMERGENCY_FIXES.md');
  if (!fs.existsSync(deployment)) throw new Error('DEPLOYMENT_GUIDE.md not found');
  if (!fs.existsSync(emergency)) throw new Error('EMERGENCY_FIXES.md not found');
});

check('Package.json scripts added', () => {
  const file = path.join(__dirname, '..', 'package.json');
  const content = fs.readFileSync(file, 'utf8');
  const pkg = JSON.parse(content);
  if (!pkg.scripts['test:stabilization']) throw new Error('Missing test:stabilization');
  if (!pkg.scripts['load:test']) throw new Error('Missing load:test');
});

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('📊 SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════');

const passed = checks.filter(c => c.passed).length;
const failed = checks.filter(c => !c.passed).length;

console.log(`Total Checks: ${checks.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('');

if (failed > 0) {
  console.log('❌ PRE-DEPLOYMENT CHECKS FAILED');
  console.log('');
  console.log('Fix the errors above before deploying.');
  process.exit(1);
} else {
  console.log('✅ ALL PRE-DEPLOYMENT CHECKS PASSED');
  console.log('');
  console.log('🚀 Ready to deploy!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. bun run build');
  console.log('  2. bun run test:stabilization');
  console.log('  3. vercel --prod');
  console.log('');
}

console.log('═══════════════════════════════════════════════════════════════════════════');
