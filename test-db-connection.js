const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5YmdmdWxvdGZsaXRvZ3UiLCJpYXQiOjE3MzQwMzE0MTQsImV4cCI6MjA0OTYwNzQxNH0.wYJ2zQgJlCuKFYFvLxIFJ0xsBVD6-JJdGOuJ-iMVdgI';

async function testDatabaseConnection() {
  console.log('🔍 Testing Supabase database connection...\n');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
    });

    // Test 1: Simple read operation
    console.log('📖 Test 1: Reading a patient record...');
    const { data: patient, error: readError } = await supabase
      .from('patients')
      .select('id, inmate_name, screening_state')
      .limit(1)
      .single();
    
    if (readError) {
      console.error('❌ Read test failed:', readError);
      return;
    }
    console.log('✅ Read test passed:', patient?.inmate_name || 'No patient found');

    // Test 2: Test write operation with minimal data
    console.log('\n✏️ Test 2: Testing write operation...');
    
    // First, get a valid patient ID to update
    const { data: testPatient } = await supabase
      .from('patients')
      .select('id')
      .limit(1)
      .single();
    
    if (!testPatient) {
      console.error('❌ No patient found to test update');
      return;
    }

    const testUpdates = {
      // Use a field that definitely exists and won't cause issues
      contact_number: `test-${Date.now()}`
    };

    console.log(`📝 Updating patient ${testPatient.id} with:`, testUpdates);
    
    const { data: updatedPatient, error: updateError } = await supabase
      .from('patients')
      .update(testUpdates)
      .eq('id', testPatient.id)
      .select('id, contact_number')
      .single();

    if (updateError) {
      console.error('❌ Update test failed:');
      console.error('   Error:', updateError);
      console.error('   Code:', updateError.code);
      console.error('   Details:', updateError.details);
      console.error('   Message:', updateError.message);
      console.error('   Hint:', updateError.hint);
      return;
    }

    console.log('✅ Update test passed:', updatedPatient);

    // Test 3: Check schema for problematic fields
    console.log('\n🏗️ Test 3: Checking database schema...');
    const { data: schemaInfo, error: schemaError } = await supabase
      .from('patients')
      .select('*')
      .limit(1);
    
    if (schemaError) {
      console.error('❌ Schema test failed:', schemaError);
    } else {
      console.log('✅ Schema test passed - available fields:', Object.keys(schemaInfo[0] || {}));
    }

    console.log('\n🎉 All database tests passed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDatabaseConnection();
