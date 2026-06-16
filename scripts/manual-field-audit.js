// Manual audit of editable fields based on code inspection
console.log('=== MANUAL EDITABLE FIELDS AUDIT ===\n');

// From DemographicsCarousel.tsx - all editable Field components
const editableFields = [
  // Identity & Contact
  { fieldKey: 'father_husband_name', label: 'Father / Husband', section: 'Identity & Contact' },
  { fieldKey: 'date_of_birth', label: 'Date of Birth', section: 'Identity & Contact' },
  { fieldKey: 'age', label: 'Age', section: 'Identity & Contact' },
  { fieldKey: 'sex', label: 'Sex', section: 'Identity & Contact' },
  { fieldKey: 'inmate_type', label: 'Inmate Type', section: 'Identity & Contact' },
  { fieldKey: 'contact_number', label: 'Contact', section: 'Identity & Contact' },
  { fieldKey: 'address', label: 'Full Address', section: 'Identity & Contact' },
  { fieldKey: 'inmate_type_other', label: 'Specify Type', section: 'Identity & Contact' },
  
  // Screening Encounter
  { fieldKey: 'screening_date', label: 'Screening Date', section: 'Screening Encounter' },
  { fieldKey: 'facility_name', label: 'Facility Name', section: 'Screening Encounter' },
  { fieldKey: 'facility_type', label: 'Facility Type', section: 'Screening Encounter' },
  { fieldKey: 'screening_state', label: 'Screening State', section: 'Screening Encounter' },
  { fieldKey: 'screening_district', label: 'Screening District', section: 'Screening Encounter' },
  { fieldKey: 'staff_name', label: 'Staff Name', section: 'Screening Encounter' },
  { fieldKey: 'submitted_on', label: 'Submitted On', section: 'Screening Encounter' },
  { fieldKey: 'screening_state_other', label: 'Specify State', section: 'Screening Encounter' },
  { fieldKey: 'screening_district_other', label: 'Specify District', section: 'Screening Encounter' },
  
  // Diagnostics & Treatment
  { fieldKey: 'xray_result', label: 'X-Ray Result', section: 'Diagnostics & Treatment' },
  { fieldKey: 'Date of referral for TB Examination (sputum) (dd/mm/yy)', label: 'Date of referral for TB Examination (sputum)', section: 'Diagnostics & Treatment' },
  { fieldKey: 'Name of facility where referred to (Give code/name of all facilities)', label: 'Name of facility where referred to', section: 'Diagnostics & Treatment' },
  { fieldKey: 'tb_past_history', label: 'TB Past History', section: 'Diagnostics & Treatment' },
  { fieldKey: 'tb_diagnosed_select', label: 'TB Diagnosed', section: 'Diagnostics & Treatment' },
  { fieldKey: 'diagnosis_date', label: 'Diagnosis Date', section: 'Diagnostics & Treatment' },
  { fieldKey: 'att_start_date', label: 'ATT Start Date', section: 'Diagnostics & Treatment' },
  { fieldKey: 'referral_date', label: 'Referral Date', section: 'Diagnostics & Treatment' },
  { fieldKey: 'referred_to_facility', label: 'Referred To', section: 'Diagnostics & Treatment' },
  { fieldKey: 'referred_to_facility_other', label: 'Specify Facility', section: 'Diagnostics & Treatment' },
  { fieldKey: 'treatment_regimen', label: 'Treatment Regimen', section: 'Diagnostics & Treatment' },
  
  // HIV / ART Status
  { fieldKey: 'hiv_status', label: 'HIV Status', section: 'HIV / ART Status' },
  { fieldKey: 'art_started', label: 'ART Started', section: 'HIV / ART Status' },
  { fieldKey: 'art_center', label: 'ART Center', section: 'HIV / ART Status' },
  { fieldKey: 'cpt_given', label: 'CPT Given', section: 'HIV / ART Status' },
  
  // Registration & System
  { fieldKey: 'unique_id', label: 'Unique ID', section: 'Registration & System' },
  { fieldKey: 'nikshay_id', label: 'Nikshay ID', section: 'Registration & System' },
  { fieldKey: 'abha_id', label: 'ABHA ID', section: 'Registration & System' }
];

// From PatientDetailDrawer.tsx - payload mappings (lines 542-567)
const payloadMappings = {
  staffname: 'staff_name',
  submittedon: 'submitted_on',
  screeningstate: 'screening_state',
  screeningdistrict: 'screening_district',
  facilitycode: 'facility_name',
  facilitytype: 'facility_type',
  screeningdate: 'screening_date',
  uniqueid: 'unique_id',
  inmatename: 'inmate_name',
  inmatetype: 'inmate_type',
  fatherhusbandname: 'father_husband_name',
  dateofbirth: 'date_of_birth',
  age: 'age',
  sex: 'sex',
  contactnumber: 'contact_number',
  address: 'address',
  xrayresult: 'xray_result',
  symptoms10s: 'symptoms_10s',
  tbpasthistory: 'tb_past_history'
};

console.log(`Total editable fields: ${editableFields.length}`);
console.log(`Fields with payload mapping: ${Object.keys(payloadMappings).length}\n`);

console.log('FIELDS MISSING FROM PAYLOAD:');
let missingCount = 0;
for (const field of editableFields) {
  const camelKey = field.fieldKey.replace(/_([a-z])/g, (_, letter) => letter.toLowerCase());
  if (!payloadMappings[camelKey]) {
    console.log(`❌ ${field.fieldKey} → ${camelKey} (${field.section})`);
    missingCount++;
  }
}

console.log(`\nMissing: ${missingCount} / ${editableFields.length} (${((missingCount/editableFields.length)*100).toFixed(1)}%)`);

console.log('\nFIELDS WITH CORRECT MAPPING:');
let correctCount = 0;
for (const field of editableFields) {
  const camelKey = field.fieldKey.replace(/_([a-z])/g, (_, letter) => letter.toLowerCase());
  if (payloadMappings[camelKey]) {
    console.log(`✅ ${field.fieldKey} → ${camelKey} → ${payloadMappings[camelKey]}`);
    correctCount++;
  }
}

console.log(`\nCorrect: ${correctCount} / ${editableFields.length} (${((correctCount/editableFields.length)*100).toFixed(1)}%)`);
