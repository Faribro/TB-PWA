const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProfile() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: node scripts/check-profile.js your-email@gmail.com');
    process.exit(1);
  }

  console.log(`\n🔍 Checking profile for: ${email}\n`);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.log('❌ Profile NOT found');
    console.log('Error:', error.message);
    console.log('\n💡 Add this user to profiles table in Supabase dashboard');
    return;
  }

  console.log('✅ Profile found:');
  console.log(JSON.stringify(data, null, 2));
  
  if (!data.is_active) {
    console.log('\n⚠️  User is INACTIVE - set is_active = true');
  }
}

checkProfile();
