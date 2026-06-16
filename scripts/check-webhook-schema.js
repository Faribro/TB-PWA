/**
 * Webhook Schema Diagnostic Script
 * Checks actual table structure and recent webhook activity
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wwcgybgvfulotflitogu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🔍 WEBHOOK SCHEMA DIAGNOSTIC');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`Project: ${SUPABASE_URL}`);
console.log('');

async function checkSchema() {
  try {
    // 1. Get table structure
    console.log('📋 STEP 1: Checking patients table structure...\n');
    
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      ORDER BY ordinal_position
    `;
    
    const schemaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: schemaQuery }),
      }
    );

    // Alternative: Direct query to patients table to infer columns
    console.log('Fetching sample record to infer schema...\n');
    const sampleRes = await fetch(
      `${SUPABASE_URL}/rest/v1/patients?limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (sampleRes.ok) {
      const sample = await sampleRes.json();
      if (sample.length > 0) {
        console.log('✅ Table Columns Found:\n');
        const columns = Object.keys(sample[0]);
        columns.forEach((col, idx) => {
          console.log(`  ${idx + 1}. ${col}`);
        });
        console.log(`\n  Total: ${columns.length} columns\n`);
        
        // Check for webhook-related columns
        const webhookCols = columns.filter(c => 
          c.includes('webhook') || 
          c.includes('kobo') || 
          c.includes('sync') ||
          c.includes('sheets')
        );
        
        if (webhookCols.length > 0) {
          console.log('🔗 Webhook-Related Columns:');
          webhookCols.forEach(col => console.log(`  - ${col}`));
          console.log('');
        }
      }
    }

    // 2. Check recent webhook activity
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 STEP 2: Checking recent webhook activity (last 6 hours)...\n');
    
    const webhookRes = await fetch(
      `${SUPABASE_URL}/rest/v1/patients?select=kobo_uuid,inmate_name,facility_name,webhook_received_at,created_at&webhook_received_at=not.is.null&order=webhook_received_at.desc&limit=10`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (webhookRes.ok) {
      const webhookData = await webhookRes.json();
      if (webhookData.length > 0) {
        console.log(`✅ Found ${webhookData.length} webhook-triggered records:\n`);
        webhookData.forEach((record, idx) => {
          console.log(`  ${idx + 1}. UUID: ${record.kobo_uuid || 'N/A'}`);
          console.log(`     Name: ${record.inmate_name || 'N/A'}`);
          console.log(`     Facility: ${record.facility_name || 'N/A'}`);
          console.log(`     Webhook Time: ${record.webhook_received_at || 'N/A'}`);
          console.log(`     Created: ${record.created_at || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('⚠️  No webhook-triggered records found (webhook_received_at is null for all records)\n');
      }
    } else {
      console.log('⚠️  Could not query webhook_received_at column (may not exist)\n');
    }

    // 3. Check for test entries
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🧪 STEP 3: Checking for test entries...\n');
    
    const testRes = await fetch(
      `${SUPABASE_URL}/rest/v1/patients?select=kobo_uuid,inmate_name,facility_name,created_at&or=(inmate_name.ilike.*test*,inmate_name.ilike.*debug*)&order=created_at.desc&limit=5`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (testRes.ok) {
      const testData = await testRes.json();
      if (testData.length > 0) {
        console.log(`✅ Found ${testData.length} test entries:\n`);
        testData.forEach((record, idx) => {
          console.log(`  ${idx + 1}. UUID: ${record.kobo_uuid || 'N/A'}`);
          console.log(`     Name: ${record.inmate_name || 'N/A'}`);
          console.log(`     Created: ${record.created_at || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('⚠️  No test entries found\n');
      }
    }

    // 4. Check for specific UUID from submission
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🎯 STEP 4: Checking for submission MHTHCJ20260414133331...\n');
    
    const specificRes = await fetch(
      `${SUPABASE_URL}/rest/v1/patients?select=*&kobo_uuid=eq.MHTHCJ20260414133331`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (specificRes.ok) {
      const specificData = await specificRes.json();
      if (specificData.length > 0) {
        console.log('✅ Found submission MHTHCJ20260414133331:\n');
        console.log(JSON.stringify(specificData[0], null, 2));
        console.log('');
      } else {
        console.log('❌ Submission MHTHCJ20260414133331 NOT FOUND in database\n');
        console.log('   This confirms the 401 error blocked the insert completely.\n');
      }
    }

    // 5. Summary
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('📝 DIAGNOSTIC SUMMARY\n');
    console.log('Next Steps:');
    console.log('1. Verify KoboToolbox webhook header: x-kobo-webhook-secret');
    console.log('2. Check Vercel env var: KOBO_WEBHOOK_SECRET = alliance_kobo_secure_2026');
    console.log('3. Test manually: curl -H "x-kobo-webhook-secret: alliance_kobo_secure_2026" ...');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
