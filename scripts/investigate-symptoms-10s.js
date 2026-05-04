// ═══════════════════════════════════════════════════════════════════════════
// BUG 3 INVESTIGATION: symptoms_10s DATA CHECK
// ═══════════════════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function investigateSymptoms10s() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 BUG 3 INVESTIGATION: symptoms_10s DATA CHECK');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // CHECK 1: Count total patients
  console.log('📊 CHECK 1: Total patient count');
  console.log('─────────────────────────────────────────────────────────────────────────');
  const { count: totalCount, error: countError } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting patients:', countError);
    return;
  }

  console.log(`Total patients in database: ${totalCount}\n`);

  // CHECK 2: Count patients with symptoms_10s data
  console.log('📊 CHECK 2: Patients with symptoms_10s data');
  console.log('─────────────────────────────────────────────────────────────────────────');
  const { count: withSymptomsCount, error: symptomsCountError } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .not('symptoms_10s', 'is', null)
    .neq('symptoms_10s', '');

  if (symptomsCountError) {
    console.error('❌ Error counting patients with symptoms_10s:', symptomsCountError);
    return;
  }

  console.log(`Patients with symptoms_10s data: ${withSymptomsCount}`);
  console.log(`Patients WITHOUT symptoms_10s data: ${totalCount - withSymptomsCount}`);
  console.log(`Percentage with data: ${((withSymptomsCount / totalCount) * 100).toFixed(2)}%\n`);

  // CHECK 3: Sample records with symptoms_10s data
  console.log('📋 CHECK 3: Sample records with symptoms_10s data (first 10)');
  console.log('─────────────────────────────────────────────────────────────────────────');
  const { data: sampleData, error: sampleError } = await supabase
    .from('patients')
    .select('id, inmate_name, symptoms_10s, screening_date, submitted_on')
    .not('symptoms_10s', 'is', null)
    .neq('symptoms_10s', '')
    .limit(10);

  if (sampleError) {
    console.error('❌ Error fetching sample data:', sampleError);
    return;
  }

  if (sampleData && sampleData.length > 0) {
    console.log(`Found ${sampleData.length} records with symptoms_10s data:\n`);
    sampleData.forEach((record, idx) => {
      console.log(`${idx + 1}. ${record.inmate_name || 'N/A'}`);
      console.log(`   symptoms_10s: "${record.symptoms_10s}"`);
      console.log(`   screening_date: ${record.screening_date || 'N/A'}`);
      console.log(`   submitted_on: ${record.submitted_on || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('⚠️  No records found with symptoms_10s data\n');
  }

  // CHECK 4: Check for alternative column names
  console.log('📋 CHECK 4: Checking for alternative symptom column names');
  console.log('─────────────────────────────────────────────────────────────────────────');
  const { data: firstRecord, error: firstRecordError } = await supabase
    .from('patients')
    .select('*')
    .limit(1)
    .single();

  if (firstRecordError) {
    console.error('❌ Error fetching first record:', firstRecordError);
    return;
  }

  if (firstRecord) {
    const symptomRelatedColumns = Object.keys(firstRecord).filter(key => 
      key.toLowerCase().includes('symptom') || key.includes('10s') || key.includes('10_s')
    );
    
    if (symptomRelatedColumns.length > 0) {
      console.log('Found symptom-related columns:');
      symptomRelatedColumns.forEach(col => {
        console.log(`  - ${col}: ${firstRecord[col] || 'NULL'}`);
      });
    } else {
      console.log('⚠️  No symptom-related columns found in patient record');
    }
    console.log('');
  }

  // CHECK 5: Check distinct values in symptoms_10s
  console.log('📋 CHECK 5: Distinct values in symptoms_10s column');
  console.log('─────────────────────────────────────────────────────────────────────────');
  const { data: distinctValues, error: distinctError } = await supabase
    .from('patients')
    .select('symptoms_10s')
    .not('symptoms_10s', 'is', null)
    .neq('symptoms_10s', '');

  if (distinctError) {
    console.error('❌ Error fetching distinct values:', distinctError);
    return;
  }

  if (distinctValues && distinctValues.length > 0) {
    const valueCounts = {};
    distinctValues.forEach(record => {
      const val = record.symptoms_10s;
      valueCounts[val] = (valueCounts[val] || 0) + 1;
    });

    console.log('Distinct values and their counts:');
    Object.entries(valueCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([value, count]) => {
        console.log(`  "${value}": ${count} records`);
      });
  } else {
    console.log('⚠️  No distinct values found');
  }
  console.log('');

  // CHECK 6: Sample records WITHOUT symptoms_10s data
  console.log('📋 CHECK 6: Sample records WITHOUT symptoms_10s data (first 5)');
  console.log('─────────────────────────────────────────────────────────────────────────');
  const { data: nullSampleData, error: nullSampleError } = await supabase
    .from('patients')
    .select('id, inmate_name, symptoms_10s, kobo_uuid, screening_date')
    .or('symptoms_10s.is.null,symptoms_10s.eq.')
    .limit(5);

  if (nullSampleError) {
    console.error('❌ Error fetching null sample data:', nullSampleError);
    return;
  }

  if (nullSampleData && nullSampleData.length > 0) {
    console.log(`Found ${nullSampleData.length} records WITHOUT symptoms_10s data:\n`);
    nullSampleData.forEach((record, idx) => {
      console.log(`${idx + 1}. ${record.inmate_name || 'N/A'}`);
      console.log(`   symptoms_10s: ${record.symptoms_10s === null ? 'NULL' : '""'}`);
      console.log(`   kobo_uuid: ${record.kobo_uuid || 'N/A'}`);
      console.log(`   screening_date: ${record.screening_date || 'N/A'}`);
      console.log('');
    });
  }

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ INVESTIGATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════════════');
}

investigateSymptoms10s().catch(console.error);
