const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wwcgybgvfulotflitogu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M'
);

async function checkAndAddUser() {
  const email = 'faridsayyed1010@gmail.com';
  
  console.log(`\n🔍 Checking profile for: ${email}\n`);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) {
    console.log('❌ Profile NOT found. Adding user...\n');
    
    const { data: newUser, error: insertError } = await supabase
      .from('profiles')
      .insert({
        email: email,
        name: 'Farid Sayyed',
        role: 'admin',
        state: 'All',
        district: 'All',
        is_active: true
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Failed to add user:', insertError);
    } else {
      console.log('✅ User added successfully:');
      console.log(JSON.stringify(newUser, null, 2));
    }
    return;
  }

  console.log('✅ Profile found:');
  console.log(JSON.stringify(data, null, 2));
  
  if (!data.is_active) {
    console.log('\n⚠️  User is INACTIVE. Activating...');
    await supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('email', email);
    console.log('✅ User activated');
  }
}

checkAndAddUser();
