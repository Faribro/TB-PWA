/**
 * scripts/test-hybrid-ocr.js
 * 
 * Comprehensive test suite for Hybrid Routing OCR Architecture.
 * Tests Tesseract fast lane, Gemini fallback, and validation logic.
 * 
 * Usage: node scripts/test-hybrid-ocr.js
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

const API_URL = 'http://localhost:3000/api/register-extract';
const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tesseractSuccess: 0,
  geminiFallback: 0,
  tests: [],
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
  results.tests.push({ name: testName, passed, details });
}

function printInfo(label, value) {
  console.log(`${COLORS.blue}${label}:${COLORS.reset} ${value}`);
}

async function verifyExtraction(extractionId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/register_extractions?id=eq.${extractionId}`,
      {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );
    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.error(`${COLORS.red}Query error:${COLORS.reset}`, error.message);
    return null;
  }
}

async function cleanupExtraction(extractionId) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/register_extractions?id=eq.${extractionId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
  } catch (error) {
    console.error(`${COLORS.yellow}Cleanup warning:${COLORS.reset}`, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1: Typed Register (Tesseract Fast Lane)
// ═══════════════════════════════════════════════════════════════════════════
async function test1_TypedRegister() {
  printHeader('TEST 1: Typed Register (Tesseract Fast Lane Expected)');
  
  // Create a simple typed register image with Canvas
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext('2d');
  
  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 800, 400);
  
  // Black text
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  
  // Header
  ctx.fillText('S.No  Name           Age  Mobile', 50, 50);
  ctx.fillText('─────────────────────────────────────', 50, 70);
  
  // Patient rows (typed, clear)
  ctx.fillText('1     Rajesh Kumar    35   9876543210', 50, 100);
  ctx.fillText('2     Priya Sharma    28   9876543211', 50, 130);
  ctx.fillText('3     Amit Singh      42   9876543212', 50, 160);
  
  const imageBuffer = canvas.toBuffer('image/png');
  
  try {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('image', blob, 'typed-register.png');
    
    printInfo('Image Size', `${imageBuffer.length} bytes`);
    printInfo('Image Type', 'PNG (typed text)');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: formData,
    });
    
    const result = await response.json();
    printInfo('Response Status', response.status);
    console.log(`\n${COLORS.blue}Response:${COLORS.reset}`);
    console.log(JSON.stringify(result, null, 2));
    
    const apiSuccess = response.ok && result.extractionId;
    printResult('API Response', apiSuccess, 
      apiSuccess ? `Extraction ID: ${result.extractionId}` : `Error: ${result.error}`
    );
    
    if (apiSuccess) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const extraction = await verifyExtraction(result.extractionId);
      
      if (extraction) {
        const engine = extraction.metadata?.engine;
        const cost = extraction.metadata?.cost;
        const model = extraction.metadata?.model;
        
        printInfo('Engine Used', engine);
        printInfo('Cost', cost);
        printInfo('Model', model);
        
        const usedTesseract = engine === 'tesseract';
        printResult('Tesseract Fast Lane', usedTesseract,
          usedTesseract 
            ? '✅ Used free Tesseract (cost: 0)'
            : `⚠️ Used Gemini fallback (reason: ${extraction.metadata?.fallbackReason})`
        );
        
        if (usedTesseract) results.tesseractSuccess++;
        else results.geminiFallback++;
        
        const zeroCost = cost === 0;
        printResult('Zero Cost', zeroCost, `Cost: ${cost}`);
        
        const hasRows = result.totalRows > 0;
        printResult('Extracted Rows', hasRows, `Total rows: ${result.totalRows}`);
        
        await cleanupExtraction(result.extractionId);
      } else {
        printResult('Database Verification', false, 'Extraction not found');
      }
    }
  } catch (error) {
    printResult('Test Execution', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 2: Handwritten Register (Gemini Fallback Expected)
// ═══════════════════════════════════════════════════════════════════════════
async function test2_HandwrittenRegister() {
  printHeader('TEST 2: Handwritten Register (Gemini Fallback Expected)');
  
  // Create a handwritten-style register (simulated with cursive-like rendering)
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext('2d');
  
  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 800, 400);
  
  // Black text with rotation and skew (simulate handwriting)
  ctx.fillStyle = 'black';
  ctx.font = 'italic 18px cursive';
  
  // Messy handwritten text
  ctx.save();
  ctx.rotate(-0.05);
  ctx.fillText('S.No  Name  Age  Mobile', 50, 60);
  ctx.restore();
  
  ctx.save();
  ctx.rotate(0.03);
  ctx.fillText('1  Rjsh Kmr  35  987654321O', 50, 110); // Note: O instead of 0
  ctx.restore();
  
  ctx.save();
  ctx.rotate(-0.02);
  ctx.fillText('2  Prya Shrm  2B  9B76543211', 50, 150); // Note: B instead of 8
  ctx.restore();
  
  const imageBuffer = canvas.toBuffer('image/png');
  
  try {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('image', blob, 'handwritten-register.png');
    
    printInfo('Image Size', `${imageBuffer.length} bytes`);
    printInfo('Image Type', 'PNG (handwritten-style)');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: formData,
    });
    
    const result = await response.json();
    printInfo('Response Status', response.status);
    console.log(`\n${COLORS.blue}Response:${COLORS.reset}`);
    console.log(JSON.stringify(result, null, 2));
    
    const apiSuccess = response.ok && result.extractionId;
    printResult('API Response', apiSuccess);
    
    if (apiSuccess) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const extraction = await verifyExtraction(result.extractionId);
      
      if (extraction) {
        const engine = extraction.metadata?.engine;
        const cost = extraction.metadata?.cost;
        const fallbackReason = extraction.metadata?.fallbackReason;
        
        printInfo('Engine Used', engine);
        printInfo('Cost', cost);
        if (fallbackReason) printInfo('Fallback Reason', fallbackReason);
        
        const usedGemini = engine === 'gemini';
        printResult('Gemini Fallback', usedGemini,
          usedGemini 
            ? `✅ Correctly fell back to Gemini (reason: ${fallbackReason})`
            : '⚠️ Tesseract succeeded (unexpected for handwritten)'
        );
        
        if (usedGemini) results.geminiFallback++;
        else results.tesseractSuccess++;
        
        const hasFallbackReason = !!fallbackReason;
        printResult('Fallback Reason Recorded', hasFallbackReason,
          hasFallbackReason ? `Reason: ${fallbackReason}` : 'No reason recorded'
        );
        
        await cleanupExtraction(result.extractionId);
      }
    }
  } catch (error) {
    printResult('Test Execution', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 3: Empty Register (Validation Failure)
// ═══════════════════════════════════════════════════════════════════════════
async function test3_EmptyRegister() {
  printHeader('TEST 3: Empty Register (Validation Failure Expected)');
  
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext('2d');
  
  // White background only (no text)
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 800, 400);
  
  const imageBuffer = canvas.toBuffer('image/png');
  
  try {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('image', blob, 'empty-register.png');
    
    printInfo('Image Size', `${imageBuffer.length} bytes`);
    printInfo('Image Type', 'PNG (blank)');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: formData,
    });
    
    const result = await response.json();
    printInfo('Response Status', response.status);
    
    const apiSuccess = response.ok && result.extractionId;
    printResult('API Response', apiSuccess);
    
    if (apiSuccess) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const extraction = await verifyExtraction(result.extractionId);
      
      if (extraction) {
        const engine = extraction.metadata?.engine;
        const fallbackReason = extraction.metadata?.fallbackReason;
        
        printInfo('Engine Used', engine);
        if (fallbackReason) printInfo('Fallback Reason', fallbackReason);
        
        const usedGemini = engine === 'gemini';
        printResult('Gemini Fallback (Expected)', usedGemini,
          usedGemini 
            ? 'Correctly fell back to Gemini for blank image'
            : 'Tesseract succeeded (unexpected)'
        );
        
        if (usedGemini) results.geminiFallback++;
        else results.tesseractSuccess++;
        
        await cleanupExtraction(result.extractionId);
      }
    }
  } catch (error) {
    printResult('Test Execution', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 4: Metadata Validation
// ═══════════════════════════════════════════════════════════════════════════
async function test4_MetadataValidation() {
  printHeader('TEST 4: Metadata Schema Validation');
  
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(800, 200);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 800, 200);
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.fillText('1  Test Patient  30  9876543210', 50, 100);
  
  const imageBuffer = canvas.toBuffer('image/png');
  
  try {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('image', blob, 'metadata-test.png');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: formData,
    });
    
    const result = await response.json();
    
    if (response.ok && result.extractionId) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const extraction = await verifyExtraction(result.extractionId);
      
      if (extraction && extraction.metadata) {
        const metadata = extraction.metadata;
        
        printInfo('Metadata', JSON.stringify(metadata, null, 2));
        
        const hasEngine = 'engine' in metadata;
        printResult('Has "engine" field', hasEngine, 
          hasEngine ? `engine: ${metadata.engine}` : 'Missing'
        );
        
        const hasCost = 'cost' in metadata;
        printResult('Has "cost" field', hasCost,
          hasCost ? `cost: ${metadata.cost}` : 'Missing'
        );
        
        const validEngine = metadata.engine === 'tesseract' || metadata.engine === 'gemini';
        printResult('Valid engine value', validEngine,
          validEngine ? `Valid: ${metadata.engine}` : `Invalid: ${metadata.engine}`
        );
        
        const validCost = metadata.cost === 0 || metadata.cost === 1;
        printResult('Valid cost value', validCost,
          validCost ? `Valid: ${metadata.cost}` : `Invalid: ${metadata.cost}`
        );
        
        if (metadata.engine === 'gemini') {
          const hasFallbackReason = 'fallbackReason' in metadata;
          printResult('Has fallback reason (Gemini)', hasFallbackReason,
            hasFallbackReason ? `Reason: ${metadata.fallbackReason}` : 'Missing'
          );
        }
        
        await cleanupExtraction(result.extractionId);
      } else {
        printResult('Metadata Verification', false, 'Extraction or metadata not found');
      }
    } else {
      printResult('API Response', false, result.error || 'Unknown error');
    }
  } catch (error) {
    printResult('Test Execution', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 5: Cost Tracking Query
// ═══════════════════════════════════════════════════════════════════════════
async function test5_CostTracking() {
  printHeader('TEST 5: Cost Tracking & Analytics');
  
  try {
    // Query recent extractions
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/register_extractions?order=created_at.desc&limit=10`,
      {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );
    
    const extractions = await response.json();
    
    if (Array.isArray(extractions) && extractions.length > 0) {
      printInfo('Recent Extractions', extractions.length);
      
      let tesseractCount = 0;
      let geminiCount = 0;
      let totalCost = 0;
      
      extractions.forEach(ext => {
        if (ext.metadata?.engine === 'tesseract') tesseractCount++;
        if (ext.metadata?.engine === 'gemini') geminiCount++;
        totalCost += ext.metadata?.cost || 0;
      });
      
      printInfo('Tesseract Usage', `${tesseractCount}/${extractions.length} (${((tesseractCount/extractions.length)*100).toFixed(1)}%)`);
      printInfo('Gemini Usage', `${geminiCount}/${extractions.length} (${((geminiCount/extractions.length)*100).toFixed(1)}%)`);
      printInfo('Total Cost', `${totalCost} units`);
      printInfo('Cost Savings', `${((tesseractCount/extractions.length)*100).toFixed(1)}%`);
      
      const hasMetadata = extractions.every(ext => ext.metadata?.engine);
      printResult('All Extractions Have Metadata', hasMetadata,
        hasMetadata ? 'All records have engine metadata' : 'Some records missing metadata'
      );
      
      const validEngines = extractions.every(ext => 
        ext.metadata?.engine === 'tesseract' || ext.metadata?.engine === 'gemini'
      );
      printResult('All Engines Valid', validEngines);
      
    } else {
      printResult('Query Extractions', false, 'No extractions found');
    }
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
  console.log('🧪 HYBRID ROUTING OCR - COMPREHENSIVE TEST SUITE');
  console.log('═'.repeat(80));
  console.log(`${COLORS.reset}\n`);

  console.log(`${COLORS.blue}Configuration:${COLORS.reset}`);
  console.log(`  API URL: ${API_URL}`);
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log(`  Service Role Key: ✅ Configured\n`);

  // Check if canvas is available
  try {
    require('canvas');
  } catch (error) {
    console.log(`${COLORS.red}ERROR: canvas module not found${COLORS.reset}`);
    console.log(`${COLORS.yellow}Install with: npm install canvas${COLORS.reset}\n`);
    process.exit(1);
  }

  await test1_TypedRegister();
  await test2_HandwrittenRegister();
  await test3_EmptyRegister();
  await test4_MetadataValidation();
  await test5_CostTracking();

  printHeader('TEST SUMMARY');
  console.log(`Total Tests:  ${results.total}`);
  console.log(`${COLORS.green}✅ Passed:    ${results.passed}${COLORS.reset}`);
  console.log(`${COLORS.red}❌ Failed:    ${results.failed}${COLORS.reset}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);
  
  console.log(`${COLORS.cyan}Engine Usage:${COLORS.reset}`);
  console.log(`  Tesseract: ${results.tesseractSuccess} extractions (FREE)`);
  console.log(`  Gemini:    ${results.geminiFallback} extractions (PAID)`);
  console.log(`  Cost Savings: ${((results.tesseractSuccess / (results.tesseractSuccess + results.geminiFallback)) * 100).toFixed(1)}%\n`);

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
  process.exit(1);
});
