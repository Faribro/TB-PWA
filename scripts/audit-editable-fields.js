// Audit editable fields mapping
const fs = require('fs');
const path = require('path');

// Read files
const carouselContent = fs.readFileSync(path.join(__dirname, '../components/DemographicsCarousel.tsx'), 'utf8');
const drawerContent = fs.readFileSync(path.join(__dirname, '../components/PatientDetailDrawer.tsx'), 'utf8');

// Extract all editable Field components
const editableFields = [];
// Match Field components with editable prop
const fieldMatches = carouselContent.matchAll(/<Field[^>]*fieldKey="([^"]+)"[^>]*label="([^"]*)"[^>]*editable/g);
for (const match of fieldMatches) {
  editableFields.push({
    fieldKey: match[1],
    label: match[2]
  });
}

// Extract payload mappings from drawer
const payloadMappings = {};
const payloadMatch = drawerContent.match(/const payload = \{([^}]+)\}/s);
if (payloadMatch) {
  const payloadStr = payloadMatch[1];
  const mappingMatches = payloadStr.matchAll(/(\w+):\s*demographicsToSave\.(\w+)/g);
  for (const match of mappingMatches) {
    payloadMappings[match[2]] = match[1];
  }
}

console.log('=== EDITABLE FIELDS AUDIT ===\n');
console.log(`Total editable fields found: ${editableFields.length}`);
console.log(`Total payload mappings: ${Object.keys(payloadMappings).length}\n`);

console.log('FIELDS MISSING FROM PAYLOAD:');
let missingCount = 0;
for (const field of editableFields) {
  const camelKey = field.fieldKey.replace(/_([a-z])/g, (_, letter) => letter.toLowerCase());
  if (!payloadMappings[camelKey]) {
    console.log(`❌ ${field.fieldKey} (${field.label})`);
    missingCount++;
  }
}

console.log(`\nMissing: ${missingCount} / ${editableFields.length} (${((missingCount/editableFields.length)*100).toFixed(1)}%)`);

console.log('\nFIELDS WITH MAPPING:');
for (const [camelKey, dbColumn] of Object.entries(payloadMappings)) {
  console.log(`✅ ${camelKey} → ${dbColumn}`);
}
