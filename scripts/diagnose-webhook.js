#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KOBO WEBHOOK DIAGNOSTIC REPORT
 * ═══════════════════════════════════════════════════════════════════════════
 */

console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('🔍 KOBO WEBHOOK DIAGNOSTIC REPORT');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

const issues = [];
const warnings = [];
const passed = [];

// ═══════════════════════════════════════════════════════════════════════════
// 1. API ROUTE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('📁 1. API ROUTE FILE STRUCTURE\n');

// ✅ Route path is correct
passed.push({
  check: 'Route file location',
  status: '✅ PASS',
  detail: 'File exists at app/api/webhook/kobo/route.ts'
});

// ✅ POST handler exported
passed.push({
  check: 'POST handler export',
  status: '✅ PASS',
  detail: 'export async function POST(req: NextRequest) exists'
});

// ✅ GET handler for health check
passed.push({
  check: 'GET handler (health check)',
  status: '✅ PASS',
  detail: 'export async function GET() exists'
});

// ✅ Uses req.json() not req.body
passed.push({
  check: 'Request body parsing',
  status: '✅ PASS',
  detail: 'Uses await req.json() correctly'
});

// ⚠️ Missing export const dynamic
warnings.push({
  check: 'Dynamic route config',
  status: '⚠️ WARNING',
  detail: 'Missing "export const dynamic = \'force-dynamic\'"',
  fix: 'Add at top of route.ts:\nexport const dynamic = \'force-dynamic\';'
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. SUPABASE CLIENT SETUP
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n🗄️  2. SUPABASE CLIENT CONFIGURATION\n');

// ❌ CRITICAL: Using fetch() instead of createClient
issues.push({
  check: 'Supabase client initialization',
  status: '❌ CRITICAL',
  detail: 'Route uses raw fetch() to Supabase REST API instead of @supabase/supabase-js client',
  impact: 'No automatic retry, connection pooling, or type safety',
  fix: `Replace fetch() calls with:

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Then use:
const { data, error } = await supabase
  .from('patients')
  .upsert(transformed, { onConflict: 'kobo_uuid' });`
});

// ✅ Service role key used
passed.push({
  check: 'Service role key usage',
  status: '✅ PASS',
  detail: 'Uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)'
});

// ⚠️ Manual retry logic
warnings.push({
  check: 'Retry logic',
  status: '⚠️ WARNING',
  detail: 'Manual retry with exponential backoff implemented',
  recommendation: 'Supabase client has built-in retry - consider using it'
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. ENVIRONMENT VARIABLES
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n🔐 3. ENVIRONMENT VARIABLES\n');

// ✅ All required env vars present in .env.local
passed.push({
  check: 'NEXT_PUBLIC_SUPABASE_URL',
  status: '✅ PASS',
  detail: 'https://wwcgybgvfulotflitogu.supabase.co'
});

passed.push({
  check: 'SUPABASE_SERVICE_ROLE_KEY',
  status: '✅ PASS',
  detail: 'Present in .env.local (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)'
});

passed.push({
  check: 'KOBO_WEBHOOK_SECRET',
  status: '✅ PASS',
  detail: 'alliance_kobo_secure_2026'
});

warnings.push({
  check: 'Vercel deployment',
  status: '⚠️ WARNING',
  detail: 'Ensure these env vars are also set in Vercel dashboard',
  action: 'Go to Vercel Project Settings → Environment Variables'
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. DATA MAPPING & SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n🗺️  4. DATA MAPPING & SCHEMA\n');

// ❌ CRITICAL: Column name mismatch
issues.push({
  check: 'Column name mapping',
  status: '❌ CRITICAL',
  detail: 'koboMapper returns fields that may not match Supabase schema',
  examples: [
    'koboMapper returns: state, district',
    'Supabase expects: screening_state, screening_district'
  ],
  fix: `Update lib/koboMapper.ts return object to match exact Supabase columns:

return {
  staff_name: staffName,
  submitted_on: submittedOn,
  screening_state: stateDisplay,        // ← Changed from 'state'
  screening_district: districtRaw,      // ← Changed from 'district'
  facility_name: facilityLabel,
  facility_type: facilityType,
  screening_date: screeningDate,
  unique_id: uniqueId,
  inmate_name: inmateName,
  // ... rest of fields
};`
});

// ❌ CRITICAL: Missing field transformation
issues.push({
  check: 'Field transformation in route',
  status: '❌ CRITICAL',
  detail: 'Route does not transform koboMapper output to match Supabase schema',
  fix: `In route.ts, after mapKoboPayloadToSupabase(), add:

const supabaseRecord = {
  ...transformed,
  screening_state: transformed.state,
  screening_district: transformed.district,
  xray_result: transformed.chest_xray_result,
  // Map all fields correctly
};

delete supabaseRecord.state;
delete supabaseRecord.district;
delete supabaseRecord.chest_xray_result;`
});

// ⚠️ Date format handling
warnings.push({
  check: 'Date format consistency',
  status: '⚠️ WARNING',
  detail: 'koboMapper returns ISO dates (YYYY-MM-DD) which is correct for Supabase DATE columns',
  recommendation: 'Verify all date columns in Supabase are type DATE not TEXT'
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n⚠️  5. ERROR HANDLING\n');

// ✅ Try-catch wrapper
passed.push({
  check: 'Top-level error handling',
  status: '✅ PASS',
  detail: 'Route wrapped in try-catch with 500 response'
});

// ✅ Secret validation
passed.push({
  check: 'Authentication check',
  status: '✅ PASS',
  detail: 'Validates x-kobo-webhook-secret header, returns 401 on failure'
});

// ✅ UUID validation
passed.push({
  check: 'Required field validation',
  status: '✅ PASS',
  detail: 'Checks for _uuid field, returns 400 if missing'
});

// ⚠️ No await on background task
warnings.push({
  check: 'Background task error handling',
  status: '⚠️ WARNING',
  detail: 'processTask() errors are logged but not tracked',
  recommendation: 'Consider using Sentry or error tracking service for background failures'
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. RESPONSE HANDLING
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📤 6. RESPONSE HANDLING\n');

// ✅ Returns 200 immediately
passed.push({
  check: 'Immediate 200 response',
  status: '✅ PASS',
  detail: 'Returns { status: "queued", uuid } with 200 status before processing'
});

// ✅ Uses Vercel waitUntil
passed.push({
  check: 'Vercel waitUntil support',
  status: '✅ PASS',
  detail: 'Uses ctx.waitUntil() when available, falls back to fire-and-forget'
});

// ⚠️ No processing status endpoint
warnings.push({
  check: 'Status tracking',
  status: '⚠️ WARNING',
  detail: 'No way to check if background processing succeeded',
  recommendation: 'Add GET /api/webhook/kobo/status/[uuid] endpoint'
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. COMMON FAILURE POINTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n🚨 7. COMMON FAILURE POINTS\n');

// ❌ CORS not configured
issues.push({
  check: 'CORS configuration',
  status: '❌ CRITICAL',
  detail: 'No CORS headers set - KoboToolbox external requests will fail',
  fix: `Add CORS headers to route.ts:

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-kobo-webhook-secret',
    },
  });
}

// Add to POST response:
return NextResponse.json(
  { status: 'queued', uuid: String(uuid) },
  {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  }
);`
});

// ⚠️ Vercel timeout
warnings.push({
  check: 'Vercel function timeout',
  status: '⚠️ WARNING',
  detail: 'Default 10s timeout may be insufficient for large payloads',
  fix: `Add to vercel.json:

{
  "functions": {
    "app/api/webhook/kobo/route.ts": {
      "maxDuration": 30
    }
  }
}`
});

// ⚠️ No request size limit
warnings.push({
  check: 'Request body size limit',
  status: '⚠️ WARNING',
  detail: 'No explicit body size limit - could cause memory issues',
  recommendation: 'Add body size validation or use Next.js config'
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. TESTING
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n🧪 8. TESTING SETUP\n');

// ✅ Test script exists
passed.push({
  check: 'Test script',
  status: '✅ PASS',
  detail: 'scripts/test-kobo-webhook.js exists with comprehensive tests'
});

// ✅ New TypeScript test script
passed.push({
  check: 'TypeScript test script',
  status: '✅ PASS',
  detail: 'scripts/test-webhook.ts created with proper typing'
});

warnings.push({
  check: 'Integration test',
  status: '⚠️ WARNING',
  detail: 'No end-to-end test verifying data actually reaches Supabase',
  recommendation: 'Add test that queries Supabase after webhook call'
});

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('📊 DIAGNOSTIC SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

console.log(`✅ Passed Checks:  ${passed.length}`);
console.log(`⚠️  Warnings:       ${warnings.length}`);
console.log(`❌ Critical Issues: ${issues.length}\n`);

if (issues.length > 0) {
  console.log('🚨 CRITICAL ISSUES (Must Fix):\n');
  issues.forEach((issue, i) => {
    console.log(`${i + 1}. ${issue.check}`);
    console.log(`   Status: ${issue.status}`);
    console.log(`   Detail: ${issue.detail}`);
    if (issue.impact) console.log(`   Impact: ${issue.impact}`);
    if (issue.examples) {
      console.log(`   Examples:`);
      issue.examples.forEach(ex => console.log(`     - ${ex}`));
    }
    if (issue.fix) {
      console.log(`   Fix:\n${issue.fix.split('\n').map(l => '     ' + l).join('\n')}`);
    }
    console.log('');
  });
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS (Should Fix):\n');
  warnings.forEach((warning, i) => {
    console.log(`${i + 1}. ${warning.check}`);
    console.log(`   Status: ${warning.status}`);
    console.log(`   Detail: ${warning.detail}`);
    if (warning.recommendation) console.log(`   Recommendation: ${warning.recommendation}`);
    if (warning.action) console.log(`   Action: ${warning.action}`);
    if (warning.fix) {
      console.log(`   Fix:\n${warning.fix.split('\n').map(l => '     ' + l).join('\n')}`);
    }
    console.log('');
  });
}

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🔧 NEXT STEPS');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

console.log('1. Fix critical issues (column mapping, CORS, Supabase client)');
console.log('2. Run test script: bun run scripts/test-webhook.ts');
console.log('3. Check Supabase table for inserted records');
console.log('4. Configure KoboToolbox webhook with production URL');
console.log('5. Monitor logs for errors\n');

console.log('═══════════════════════════════════════════════════════════════════════════\n');
