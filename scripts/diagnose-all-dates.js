/**
 * Comprehensive Date Column Diagnostic
 * Checks ALL date columns for January 2025 data
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function diagnoseAllDateColumns() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📅 COMPREHENSIVE JANUARY 2025 DATE COLUMN ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Get table schema first
  console.log('🔍 1. FETCHING TABLE SCHEMA...\n');
  const { data: sample } = await supabase
    .from('patients')
    .select('*')
    .limit(1);
  
  if (!sample || sample.length === 0) {
    console.error('❌ No data found in patients table');
    return;
  }

  // Find all date-like columns
  const allColumns = Object.keys(sample[0]);
  const dateColumns = allColumns.filter(col => 
    col.includes('date') || 
    col.includes('Date') || 
    col.includes('_at') || 
    col.includes('created') || 
    col.includes('updated') ||
    col.includes('screening') ||
    col.includes('referral') ||
    col.includes('diagnosis') ||
    col.includes('treatment') ||
    col.includes('att')
  );

  console.log('📋 Found date-related columns:', dateColumns);
  console.log('\n═══════════════════════════════════════════════════════════════════════════\n');

  // Check each date column for January 2025 data
  for (const column of dateColumns) {
    console.log(`📅 Checking: ${column}`);
    
    try {
      const { count, error } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .gte(column, '2025-01-01')
        .lt(column, '2025-02-01');
      
      if (error) {
        console.log(`   ⚠️  Error: ${error.message}`);
      } else {
        console.log(`   ✅ January 2025 count: ${count}`);
        
        // If we found data, show samples
        if (count > 0) {
          const { data: samples } = await supabase
            .from('patients')
            .select(`id, inmate_name, ${column}, screening_state, screening_district`)
            .gte(column, '2025-01-01')
            .lt(column, '2025-02-01')
            .order(column, { ascending: false })
            .limit(5);
          
          console.log(`   📊 Sample records:`);
          console.table(samples);
        }
      }
    } catch (err) {
      console.log(`   ⚠️  Cannot query: ${err.message}`);
    }
    console.log('');
  }

  // Check for records with created_at or updated_at in January
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🕐 CHECKING SYSTEM TIMESTAMPS (created_at, updated_at)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  if (allColumns.includes('created_at')) {
    const { count } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', '2025-01-01')
      .lt('created_at', '2025-02-01');
    
    console.log(`✅ Records CREATED in January 2025: ${count}`);
    
    if (count > 0) {
      const { data: samples } = await supabase
        .from('patients')
        .select('id, inmate_name, created_at, screening_date, screening_state')
        .gte('created_at', '2025-01-01')
        .lt('created_at', '2025-02-01')
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log('\n📊 Sample records created in January:');
      console.table(samples);
    }
  }

  if (allColumns.includes('updated_at')) {
    const { count } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', '2025-01-01')
      .lt('updated_at', '2025-02-01');
    
    console.log(`\n✅ Records UPDATED in January 2025: ${count}`);
  }

  // Check for NULL screening_date but other dates present
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 CHECKING RECORDS WITH NULL screening_date');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const { count: nullScreeningCount } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .is('screening_date', null);
  
  console.log(`⚠️  Records with NULL screening_date: ${nullScreeningCount}`);

  // Sample records with null screening_date
  const { data: nullSamples } = await supabase
    .from('patients')
    .select('id, inmate_name, screening_date, created_at, updated_at, screening_state')
    .is('screening_date', null)
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('\n📊 Sample records with NULL screening_date:');
  console.table(nullSamples);

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ COMPREHENSIVE DIAGNOSTIC COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════════════');
}

diagnoseAllDateColumns().catch(console.error);
