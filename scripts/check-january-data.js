// Check if there's any patient data for January 2025
const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

async function checkJanuaryData() {
  console.log('🔍 Checking for January 2025 patient data...\n');
  
  // Fetch all patients
  const res = await fetch(`${SUPABASE_URL}/rest/v1/patients?select=id,inmate_name,screening_date,submitted_on&limit=1000`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  
  const patients = await res.json();
  console.log(`📊 Total patients fetched: ${patients.length}\n`);
  
  // Check all unique year-month combinations
  const monthCounts = {};
  patients.forEach(p => {
    const dateStr = p.screening_date || p.submitted_on;
    if (!dateStr) return;
    
    const date = new Date(dateStr);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  });
  
  const sorted = Object.entries(monthCounts).sort((a, b) => b[0].localeCompare(a[0]));
  console.log('All months with data (most recent first):');
  sorted.forEach(([month, count]) => {
    console.log(`  ${month}: ${count} patients`);
  });
  
  // Filter for January 2025
  const januaryPatients = patients.filter(p => {
    const dateStr = p.screening_date || p.submitted_on;
    if (!dateStr) return false;
    
    const date = new Date(dateStr);
    return date.getFullYear() === 2025 && date.getMonth() === 0; // January = 0
  });
  
  console.log(`✅ Patients with January 2025 screening dates: ${januaryPatients.length}\n`);
  
  if (januaryPatients.length > 0) {
    console.log('Sample January 2025 patients:');
    januaryPatients.slice(0, 5).forEach(p => {
      console.log(`  - ID ${p.id}: ${p.inmate_name} (${p.screening_date || p.submitted_on})`);
    });
  } else {
    console.log('❌ No patients found with January 2025 screening dates');
    console.log('\n📅 Checking date distribution across all months...\n');
    
    const monthCounts = {};
    patients.forEach(p => {
      const dateStr = p.screening_date || p.submitted_on;
      if (!dateStr) return;
      
      const date = new Date(dateStr);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    });
    
    const sorted = Object.entries(monthCounts).sort((a, b) => b[0].localeCompare(a[0]));
    console.log('Recent months with data:');
    sorted.slice(0, 6).forEach(([month, count]) => {
      console.log(`  ${month}: ${count} patients`);
    });
  }
}

checkJanuaryData().catch(console.error);
