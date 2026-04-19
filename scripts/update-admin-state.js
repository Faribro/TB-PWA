/**
 * Update admin user's state to 'All' for national access
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

async function updateAdminState() {
  const adminEmail = 'faridsayyed1010@gmail.com';
  
  console.log('🔧 Updating admin user state...\n');
  
  // Find the user
  const { data: user, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', adminEmail)
    .single();
  
  if (fetchError || !user) {
    console.error('❌ User not found:', fetchError?.message);
    return;
  }
  
  console.log('📋 Current user data:');
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   State: ${user.state}`);
  console.log('');
  
  // Update state to 'All'
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ state: 'All' })
    .eq('email', adminEmail)
    .select()
    .single();
  
  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    return;
  }
  
  console.log('✅ User updated successfully!');
  console.log('📋 New user data:');
  console.log(`   Email: ${updated.email}`);
  console.log(`   Role: ${updated.role}`);
  console.log(`   State: ${updated.state}`);
  console.log('');
  console.log('🎉 Admin now has national access!');
  console.log('⚠️  Please log out and log back in for changes to take effect.');
}

updateAdminState();
