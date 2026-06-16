/**
 * Check how many records exist for Maharashtra vs total
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function checkCounts() {
  console.log('🔍 Checking record counts...\n');
  
  // Total count
  const { count: totalCount, error: totalError } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true });
  
  if (totalError) {
    console.error('❌ Error fetching total:', totalError);
    return;
  }
  
  // Maharashtra count (single state)
  const { count: maharashtraCount, error: maharashtraError } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('screening_state', 'Maharashtra');
  
  if (maharashtraError) {
    console.error('❌ Error fetching Maharashtra:', maharashtraError);
    return;
  }
  
  // Mumbai count
  const { count: mumbaiCount, error: mumbaiError } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('screening_state', 'Mumbai');
  
  if (mumbaiError) {
    console.error('❌ Error fetching Mumbai:', mumbaiError);
    return;
  }
  
  // Maharashtra OR Mumbai (what the API should return)
  const { count: combinedCount, error: combinedError } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .in('screening_state', ['Maharashtra', 'Mumbai']);
  
  if (combinedError) {
    console.error('❌ Error fetching combined:', combinedError);
    return;
  }
  
  console.log('📊 RESULTS:');
  console.log('─'.repeat(50));
  console.log(`Total records:              ${totalCount?.toLocaleString()}`);
  console.log(`Maharashtra only:           ${maharashtraCount?.toLocaleString()}`);
  console.log(`Mumbai only:                ${mumbaiCount?.toLocaleString()}`);
  console.log(`Maharashtra OR Mumbai:      ${combinedCount?.toLocaleString()}`);
  console.log('─'.repeat(50));
  
  if (maharashtraCount === 1000) {
    console.log('\n⚠️  FOUND THE BUG!');
    console.log('Maharashtra has exactly 1,000 records.');
    console.log('The API is correctly filtering by state.');
    console.log('The issue is that summary endpoint is NOT applying state filters!');
  }
}

checkCounts();
