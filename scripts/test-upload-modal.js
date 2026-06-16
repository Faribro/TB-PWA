/**
 * Test Script: Register Upload Modal Integration
 * 
 * Verifies:
 * 1. Component imports are valid
 * 2. Dependencies (xlsx) are installed
 * 3. API routes exist
 */

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🧪 REGISTER UPLOAD MODAL INTEGRATION TEST');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

// Test 1: Check RegisterUploadModal component exists
console.log('📋 TEST 1: RegisterUploadModal Component');
try {
  const componentPath = path.join(__dirname, '..', 'components', 'RegisterUploadModal.tsx');
  if (fs.existsSync(componentPath)) {
    const content = fs.readFileSync(componentPath, 'utf8');
    if (content.includes('RegisterUploadModal') && content.includes('xlsx')) {
      console.log('✅ PASSED: Component exists with xlsx import\n');
      passed++;
    } else {
      console.log('❌ FAILED: Component missing required imports\n');
      failed++;
    }
  } else {
    console.log('❌ FAILED: Component file not found\n');
    failed++;
  }
} catch (error) {
  console.log(`❌ FAILED: ${error.message}\n`);
  failed++;
}

// Test 2: Check Vertex component integration
console.log('📋 TEST 2: Vertex Component Integration');
try {
  const vertexPath = path.join(__dirname, '..', 'components', 'Vertex.tsx');
  if (fs.existsSync(vertexPath)) {
    const content = fs.readFileSync(vertexPath, 'utf8');
    if (content.includes('RegisterUploadModal') && content.includes('isUploadModalOpen')) {
      console.log('✅ PASSED: Vertex component integrated with upload modal\n');
      passed++;
    } else {
      console.log('❌ FAILED: Vertex component missing upload modal integration\n');
      failed++;
    }
  } else {
    console.log('❌ FAILED: Vertex component not found\n');
    failed++;
  }
} catch (error) {
  console.log(`❌ FAILED: ${error.message}\n`);
  failed++;
}

// Test 3: Check API routes exist
console.log('📋 TEST 3: API Routes');
try {
  const extractPath = path.join(__dirname, '..', 'app', 'api', 'register-extract', 'route.ts');
  const reconcilePath = path.join(__dirname, '..', 'app', 'api', 'register-reconcile', 'route.ts');
  
  const extractExists = fs.existsSync(extractPath);
  const reconcileExists = fs.existsSync(reconcilePath);
  
  if (extractExists && reconcileExists) {
    console.log('✅ PASSED: Both API routes exist');
    console.log('   - /api/register-extract ✓');
    console.log('   - /api/register-reconcile ✓\n');
    passed++;
  } else {
    console.log('❌ FAILED: Missing API routes');
    if (!extractExists) console.log('   - /api/register-extract ✗');
    if (!reconcileExists) console.log('   - /api/register-reconcile ✗');
    console.log('');
    failed++;
  }
} catch (error) {
  console.log(`❌ FAILED: ${error.message}\n`);
  failed++;
}

// Test 4: Check package.json dependencies
console.log('📋 TEST 4: Dependencies');
try {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const hasXlsx = packageJson.dependencies['xlsx'];
  const hasFramerMotion = packageJson.dependencies['framer-motion'];
  const hasSonner = packageJson.dependencies['sonner'];
  
  if (hasXlsx && hasFramerMotion && hasSonner) {
    console.log('✅ PASSED: All required dependencies installed');
    console.log(`   - xlsx: ${hasXlsx}`);
    console.log(`   - framer-motion: ${hasFramerMotion}`);
    console.log(`   - sonner: ${hasSonner}\n`);
    passed++;
  } else {
    console.log('❌ FAILED: Missing dependencies');
    if (!hasXlsx) console.log('   - xlsx ✗');
    if (!hasFramerMotion) console.log('   - framer-motion ✗');
    if (!hasSonner) console.log('   - sonner ✗');
    console.log('');
    failed++;
  }
} catch (error) {
  console.log(`❌ FAILED: ${error.message}\n`);
  failed++;
}

// Summary
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('📊 TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`Total Tests:  ${passed + failed}`);
console.log(`✅ Passed:    ${passed}`);
console.log(`❌ Failed:    ${failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('═══════════════════════════════════════════════════════════════════════════\n');

if (failed === 0) {
  console.log('🎉 ALL TESTS PASSED - Upload modal integration is ready!\n');
  console.log('📝 Usage Instructions:');
  console.log('   1. Navigate to the Vertex page (Patient List)');
  console.log('   2. Click "Upload Register" button in the header');
  console.log('   3. Drag & drop images (.jpg, .png) or Excel files (.xlsx, .csv)');
  console.log('   4. Images → OCR extraction via /api/register-extract');
  console.log('   5. Excel → Direct reconciliation via /api/register-reconcile\n');
} else {
  console.log('⚠️  SOME TESTS FAILED - Please review the errors above\n');
  process.exit(1);
}
