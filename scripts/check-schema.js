#!/usr/bin/env node

const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

async function checkSchema() {
  console.log('Fetching patients table schema...\n');
  
  const url = `${SUPABASE_URL}/rest/v1/patients?limit=1`;
  
  const response = await fetch(url, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    }
  });

  if (!response.ok) {
    console.error('Error:', await response.text());
    process.exit(1);
  }

  const data = await response.json();
  
  if (data.length > 0) {
    console.log('Available columns in patients table:');
    console.log('═══════════════════════════════════════\n');
    Object.keys(data[0]).sort().forEach(col => {
      console.log(`  - ${col}`);
    });
  } else {
    console.log('No data in patients table');
  }
}

checkSchema();
