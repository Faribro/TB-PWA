// Verify the fix for all editable fields
const fs = require('fs');
const path = require('path');

// Read the updated PatientDetailDrawer
const drawerContent = fs.readFileSync(path.join(__dirname, '../components/PatientDetailDrawer.tsx'), 'utf8');

// Extract the canonical mapping
const mappingMatch = drawerContent.match(/const DEMOGRAPHICS_EDITABLE_FIELDS: Record<string, string> = \{([^}]+)\}/s);
if (!mappingMatch) {
  console.error('❌ Could not find DEMOGRAPHICS_EDITABLE_FIELDS mapping');
  process.exit(1);
}

const mappingStr = mappingMatch[1];
const mappings = {};
const mappingMatches = mappingStr.matchAll(/(\S[^:]+):\s*'([^']+)'/g);
for (const match of mappingMatches) {
  const key = match[1].trim().replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').trim();
  const value = match[2];
  if (key && !key.startsWith('//')) {
    mappings[key] = value;
  }
}

console.log('=== VERIFICATION OF FIX ===\n');
console.log(`Total fields in canonical mapping: ${Object.keys(mappings).length}\n`);

// Previously broken fields that should now be fixed
const previouslyBroken = [
  'father_husband_name',
  'date_of_birth',
  'sex',
  'inmate_type',
  'facility_name',
  'inmate_name',
  'inmate_type_other',
  'screening_state_other',
  'screening_district_other',
  'Date of referral for TB Examination (sputum) (dd/mm/yy)',
  'Name of facility where referred to (Give code/name of all facilities)',
  'tb_diagnosed_select',
  'diagnosis_date',
  'att_start_date',
  'referral_date',
  'referred_to_facility',
  'referred_to_facility_other',
  'treatment_regimen',
  'hiv_status',
  'art_started',
  'art_center',
  'cpt_given',
  'nikshay_id',
  'abha_id'
];

console.log('PREVIOUSLY BROKEN FIELDS - NOW FIXED:');
let fixedCount = 0;
for (const field of previouslyBroken) {
  if (mappings[field]) {
    console.log(`✅ ${field} → ${mappings[field]}`);
    fixedCount++;
  } else {
    console.log(`❌ ${field} - STILL MISSING`);
  }
}

console.log(`\nFixed: ${fixedCount} / ${previouslyBroken.length}`);

// Previously working fields that should still work
const previouslyWorking = [
  'screening_date',
  'age',
  'contact_number',
  'address',
  'facility_type',
  'screening_state',
  'screening_district',
  'staff_name',
  'submitted_on',
  'xray_result',
  'tb_past_history',
  'unique_id'
];

console.log('\nPREVIOUSLY WORKING FIELDS - SHOULD STILL WORK:');
let stillWorkingCount = 0;
for (const field of previouslyWorking) {
  if (mappings[field]) {
    console.log(`✅ ${field} → ${mappings[field]}`);
    stillWorkingCount++;
  } else {
    console.log(`❌ ${field} - NOW BROKEN`);
  }
}

console.log(`\nStill working: ${stillWorkingCount} / ${previouslyWorking.length}`);

console.log('\n=== SUMMARY ===');
console.log(`Total fields mapped: ${Object.keys(mappings).length}`);
console.log(`Previously broken: ${fixedCount}/${previouslyBroken.length} fixed`);
console.log(`Previously working: ${stillWorkingCount}/${previouslyWorking.length} preserved`);

if (fixedCount === previouslyBroken.length && stillWorkingCount === previouslyWorking.length) {
  console.log('\n🎉 ALL FIELDS ARE NOW PROPERLY MAPPED!');
} else {
  console.log('\n⚠️  Some fields may still have issues.');
}
