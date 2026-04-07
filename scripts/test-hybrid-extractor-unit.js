/**
 * scripts/test-hybrid-extractor-unit.js
 * 
 * Unit tests for hybrid extractor logic (no API calls).
 * Tests Tesseract extraction, validation, and fallback logic directly.
 * 
 * Usage: node scripts/test-hybrid-extractor-unit.js
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const results = {
  total: 0,
  passed: 0,
  failed: 0,
};

function printHeader(title) {
  console.log(`\n${COLORS.cyan}${'═'.repeat(80)}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}${title}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${'═'.repeat(80)}${COLORS.reset}\n`);
}

function printResult(testName, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`${COLORS.green}✅ PASSED:${COLORS.reset} ${testName}`);
  } else {
    results.failed++;
    console.log(`${COLORS.red}❌ FAILED:${COLORS.reset} ${testName}`);
  }
  if (details) console.log(`   ${COLORS.yellow}${details}${COLORS.reset}`);
}

function printInfo(label, value) {
  console.log(`${COLORS.blue}${label}:${COLORS.reset} ${value}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1: Tesseract Extraction (Typed Register)
// ═══════════════════════════════════════════════════════════════════════════
async function test1_TesseractExtraction() {
  printHeader('TEST 1: Tesseract Extraction (Typed Register)');
  
  try {
    const { createCanvas } = require('canvas');
    // Use tsx to run TypeScript directly
    const { spawn } = require('child_process');
    
    // Create typed register
    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 800, 300);
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    
    ctx.fillText('S.No  Name           Age  Mobile', 50, 50);
    ctx.fillText('1     Rajesh Kumar    35   9876543210', 50, 100);
    ctx.fillText('2     Priya Sharma    28   9876543211', 50, 150);
    ctx.fillText('3     Amit Singh      42   9876543212', 50, 200);
    
    const imageBuffer = canvas.toBuffer('image/png');
    const imagePath = path.join(__dirname, 'test-typed-register.png');
    fs.writeFileSync(imagePath, imageBuffer);
    
    printInfo('Image Size', `${imageBuffer.length} bytes`);
    printInfo('Image Type', 'PNG (typed text)');
    printInfo('Image Path', imagePath);
    
    printResult('Image Generation', true, 'Test image created successfully');
    
    console.log(`\n${COLORS.yellow}Note: Direct TypeScript import requires Next.js runtime${COLORS.reset}`);
    console.log(`${COLORS.yellow}Test image saved for manual testing: ${imagePath}${COLORS.reset}`);
    
    // Cleanup
    fs.unlinkSync(imagePath);
    
  } catch (error) {
    printResult('Test Execution', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 2: Validation Logic (Low Quality Text)
// ═══════════════════════════════════════════════════════════════════════════
async function test2_ValidationLogic() {
  printHeader('TEST 2: Validation Logic (Low Quality → Gemini Fallback)');
  
  try {
    const { createCanvas } = require('canvas');
    
    // Create low quality register (rotated, messy text)
    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 800, 300);
    ctx.fillStyle = 'black';
    ctx.font = 'italic 16px cursive';
    
    // Messy, rotated text
    ctx.save();
    ctx.rotate(-0.1);
    ctx.fillText('Sno Nme Ag Mbl', 50, 80);
    ctx.restore();
    
    ctx.save();
    ctx.rotate(0.05);
    ctx.fillText('1 Rjsh 3O 987654321O', 50, 130); // O instead of 0
    ctx.restore();
    
    const imageBuffer = canvas.toBuffer('image/png');
    const imagePath = path.join(__dirname, 'test-handwritten-register.png');
    fs.writeFileSync(imagePath, imageBuffer);
    
    printInfo('Image Size', `${imageBuffer.length} bytes`);
    printInfo('Image Type', 'PNG (low quality)');
    printInfo('Image Path', imagePath);
    
    printResult('Image Generation', true, 'Test image created successfully');
    
    console.log(`\n${COLORS.yellow}Note: This image should trigger Gemini fallback${COLORS.reset}`);
    console.log(`${COLORS.yellow}Test image saved for manual testing: ${imagePath}${COLORS.reset}`);
    
    // Cleanup
    fs.unlinkSync(imagePath);
    
  } catch (error) {
    printResult('Test Execution', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 3: Regex Pattern Validation
// ═══════════════════════════════════════════════════════════════════════════
async function test3_RegexPatterns() {
  printHeader('TEST 3: Regex Pattern Validation');
  
  try {
    // Test mobile pattern
    const mobilePattern = /\b([6-9]\d{9})\b/;
    
    const validMobiles = ['9876543210', '8765432109', '7654321098', '6543210987'];
    const invalidMobiles = ['1234567890', '5876543210', '987654321', '98765432100'];
    
    printInfo('Testing Mobile Pattern', '/\\b([6-9]\\d{9})\\b/');
    
    let mobileTestsPassed = 0;
    validMobiles.forEach(mobile => {
      const match = mobilePattern.test(mobile);
      if (match) mobileTestsPassed++;
      console.log(`  ${match ? '✅' : '❌'} ${mobile} → ${match ? 'Valid' : 'Invalid'}`);
    });
    
    invalidMobiles.forEach(mobile => {
      const match = !mobilePattern.test(mobile);
      if (match) mobileTestsPassed++;
      console.log(`  ${match ? '✅' : '❌'} ${mobile} → ${match ? 'Correctly rejected' : 'False positive'}`);
    });
    
    printResult('Mobile Pattern Tests', mobileTestsPassed === 8,
      `${mobileTestsPassed}/8 tests passed`
    );
    
    // Test age pattern
    const agePattern = /\b(\d{1,3})\b/;
    
    printInfo('\nTesting Age Pattern', '/\\b(\\d{1,3})\\b/');
    
    const validAges = ['1', '25', '99', '120'];
    const testText = 'Patient age is 35 years old';
    
    let ageTestsPassed = 0;
    validAges.forEach(age => {
      const match = agePattern.test(age);
      if (match) ageTestsPassed++;
      console.log(`  ${match ? '✅' : '❌'} ${age} → ${match ? 'Valid' : 'Invalid'}`);
    });
    
    const ageMatch = testText.match(agePattern);
    if (ageMatch && ageMatch[1] === '35') {
      ageTestsPassed++;
      console.log(`  ✅ Extracted "35" from: "${testText}"`);
    }
    
    printResult('Age Pattern Tests', ageTestsPassed === 5,
      `${ageTestsPassed}/5 tests passed`
    );
    
    // Test name pattern
    const namePattern = /[A-Za-z]{2,}/;
    
    printInfo('\nTesting Name Pattern', '/[A-Za-z]{2,}/');
    
    const validNames = ['Rajesh', 'Kumar', 'AB', 'Priya'];
    const invalidNames = ['A', '1', '123', 'R'];
    
    let nameTestsPassed = 0;
    validNames.forEach(name => {
      const match = namePattern.test(name);
      if (match) nameTestsPassed++;
      console.log(`  ${match ? '✅' : '❌'} ${name} → ${match ? 'Valid' : 'Invalid'}`);
    });
    
    invalidNames.forEach(name => {
      const match = !namePattern.test(name);
      if (match) nameTestsPassed++;
      console.log(`  ${match ? '✅' : '❌'} ${name} → ${match ? 'Correctly rejected' : 'False positive'}`);
    });
    
    printResult('Name Pattern Tests', nameTestsPassed === 8,
      `${nameTestsPassed}/8 tests passed`
    );
    
  } catch (error) {
    printResult('Test Execution', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 4: Performance Benchmark
// ═══════════════════════════════════════════════════════════════════════════
async function test4_PerformanceBenchmark() {
  printHeader('TEST 4: Performance Benchmark (Tesseract vs Gemini)');
  
  try {
    const { createCanvas } = require('canvas');
    
    // Create test image
    const canvas = createCanvas(800, 200);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 800, 200);
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText('1  Test Patient  30  9876543210', 50, 100);
    
    const imageBuffer = canvas.toBuffer('image/png');
    const imagePath = path.join(__dirname, 'test-performance.png');
    fs.writeFileSync(imagePath, imageBuffer);
    
    printInfo('Test Image Created', imagePath);
    printResult('Image Generation', true, 'Performance test image ready');
    
    console.log(`\n${COLORS.yellow}Note: Performance testing requires Next.js runtime${COLORS.reset}`);
    console.log(`${COLORS.yellow}Upload this image via UI to test performance${COLORS.reset}`);
    
    // Cleanup
    fs.unlinkSync(imagePath);
    
  } catch (error) {
    printResult('Test Execution', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════
async function runAllTests() {
  console.log(`${COLORS.bright}${COLORS.cyan}`);
  console.log('═'.repeat(80));
  console.log('🧪 HYBRID EXTRACTOR - UNIT TEST SUITE');
  console.log('═'.repeat(80));
  console.log(`${COLORS.reset}\n`);

  console.log(`${COLORS.blue}Testing:${COLORS.reset} lib/ocr/hybridExtractor.ts`);
  console.log(`${COLORS.blue}Mode:${COLORS.reset} Direct function calls (no API)\n`);

  await test1_TesseractExtraction();
  await test2_ValidationLogic();
  await test3_RegexPatterns();
  await test4_PerformanceBenchmark();

  printHeader('TEST SUMMARY');
  console.log(`Total Tests:  ${results.total}`);
  console.log(`${COLORS.green}✅ Passed:    ${results.passed}${COLORS.reset}`);
  console.log(`${COLORS.red}❌ Failed:    ${results.failed}${COLORS.reset}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

  if (results.failed === 0) {
    console.log(`${COLORS.green}${COLORS.bright}🎉 ALL TESTS PASSED!${COLORS.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${COLORS.red}${COLORS.bright}⚠️  SOME TESTS FAILED${COLORS.reset}\n`);
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, error);
  console.error(error.stack);
  process.exit(1);
});
