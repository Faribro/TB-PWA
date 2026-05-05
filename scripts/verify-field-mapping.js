// Verify all editable fields are properly mapped in the code
// Usage: node scripts/verify-field-mapping.js

const fs = require('fs');
const path = require('path');

// Expected field mappings from UI (camelCase) to API (snake_case)
const EXPECTED_MAPPINGS = {
  // Screening Details
  staffname: 'staff_name',
  submittedon: 'submitted_on',
  screeningstate: 'screening_state',
  screeningdistrict: 'screening_district',
  facilitycode: 'facility_name',
  facilitytype: 'facility_type',
  screeningdate: 'screening_date',
  uniqueid: 'unique_id',
  
  // Identity
  inmatename: 'inmate_name',
  inmatetype: 'inmate_type',
  fatherhusbandname: 'father_husband_name',
  dateofbirth: 'date_of_birth',
  age: 'age',
  sex: 'sex',
  contactnumber: 'contact_number',
  address: 'address',
  
  // TB Screening
  xrayresult: 'xray_result',
  symptoms10s: 'symptoms_10s',
  tbpasthistory: 'tb_past_history'
};

function checkFieldMappings() {
  console.log('🔍 Verifying field mappings in PatientDetailDrawer.tsx...\n');
  
  const drawerPath = path.join(__dirname, '../components/PatientDetailDrawer.tsx');
  const drawerContent = fs.readFileSync(drawerPath, 'utf8');
  
  const results = [];
  let allPassed = true;
  
  for (const [camelKey, snakeKey] of Object.entries(EXPECTED_MAPPINGS)) {
    // Check if the mapping exists in the payload
    const mappingPattern = new RegExp(`${snakeKey}:\\s*demographicsToSave\\.${camelKey}`, 'i');
    const found = mappingPattern.test(drawerContent);
    
    results.push({
      field: `${camelKey} → ${snakeKey}`,
      status: found ? '✅' : '❌',
      found
    });
    
    if (!found) {
      allPassed = false;
    }
  }
  
  // Display results
  console.log('Field Mappings:');
  console.log('─'.repeat(60));
  results.forEach(({ field, status, found }) => {
    console.log(`${status} ${field}`);
  });
  
  console.log('─'.repeat(60));
  console.log(`Total: ${results.length}`);
  console.log(`Found: ${results.filter(r => r.found).length}`);
  console.log(`Missing: ${results.filter(r => !r.found).length}`);
  
  if (!allPassed) {
    console.log('\n⚠️  Some field mappings are missing!');
    process.exit(1);
  } else {
    console.log('\n✅ All field mappings are correct!');
  }
}

function checkFieldConfig() {
  console.log('\n🔍 Verifying field configuration in DemographicsCarousel.tsx...\n');
  
  const carouselPath = path.join(__dirname, '../components/DemographicsCarousel.tsx');
  const carouselContent = fs.readFileSync(carouselPath, 'utf8');
  
  // Check if FIELD_CONFIG exists and has the right fields
  const fieldConfigMatch = carouselContent.match(/const FIELD_CONFIG = {([^}]+)}/s);
  
  if (!fieldConfigMatch) {
    console.log('❌ FIELD_CONFIG not found');
    return false;
  }
  
  const fieldConfigStr = fieldConfigMatch[1];
  const results = [];
  let allConfigured = true;
  
  // Check each field has a type defined
  for (const camelKey of Object.keys(EXPECTED_MAPPINGS)) {
    const hasType = new RegExp(`${camelKey}:\\s*{[^}]*type:`).test(fieldConfigStr);
    
    results.push({
      field: camelKey,
      status: hasType ? '✅' : '❌',
      hasType
    });
    
    if (!hasType) {
      allConfigured = false;
    }
  }
  
  // Display results
  console.log('Field Configuration:');
  console.log('─'.repeat(40));
  results.forEach(({ field, status }) => {
    console.log(`${status} ${field}`);
  });
  
  console.log('─'.repeat(40));
  console.log(`Total: ${results.length}`);
  console.log(`Configured: ${results.filter(r => r.hasType).length}`);
  console.log(`Missing: ${results.filter(r => !r.hasType).length}`);
  
  if (!allConfigured) {
    console.log('\n⚠️  Some fields are missing type configuration!');
    return false;
  } else {
    console.log('\n✅ All fields have type configuration!');
    return true;
  }
}

function checkEditableFields() {
  console.log('\n🔍 Verifying editable fields are rendered...\n');
  
  const carouselPath = path.join(__dirname, '../components/DemographicsCarousel.tsx');
  const carouselContent = fs.readFileSync(carouselPath, 'utf8');
  
  // Find all Field components with editable prop
  const editableFieldMatches = carouselContent.matchAll(/<Field[^>]*\beditable={true}\b[^>]*fieldKey="([^"]+)"/g);
  const editableFields = Array.from(editableFieldMatches, match => match[1]);
  
  console.log('Editable Fields Found:');
  console.log('─'.repeat(40));
  editableFields.forEach(field => {
    console.log(`✅ ${field}`);
  });
  
  console.log('─'.repeat(40));
  console.log(`Total editable fields: ${editableFields.length}`);
  
  // Check if all expected fields are editable
  const missingFields = Object.keys(EXPECTED_MAPPINGS).filter(key => !editableFields.includes(key));
  
  if (missingFields.length > 0) {
    console.log('\n⚠️  Some expected fields are not editable:');
    missingFields.forEach(field => console.log(`❌ ${field}`));
    return false;
  } else {
    console.log('\n✅ All expected fields are editable!');
    return true;
  }
}

function main() {
  console.log('🚀 Verifying all editable fields configuration\n');
  
  const mappingOk = checkFieldMappings();
  const configOk = checkFieldConfig();
  const editableOk = checkEditableFields();
  
  console.log('\n📊 OVERALL SUMMARY:');
  console.log('═'.repeat(60));
  console.log(`Field Mappings: ${mappingOk ? '✅' : '❌'}`);
  console.log(`Field Configuration: ${configOk ? '✅' : '❌'}`);
  console.log(`Editable Fields: ${editableOk ? '✅' : '❌'}`);
  
  if (mappingOk && configOk && editableOk) {
    console.log('\n🎉 All checks passed! Editable fields should work correctly.');
  } else {
    console.log('\n⚠️  Some checks failed. Please review the issues above.');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EXPECTED_MAPPINGS };
