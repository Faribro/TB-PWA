// Test demographics sync with authentication
// This script will login and test all editable fields

const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://samadhaan-84h0rkpmz-faribros-projects.vercel.app'
  : 'http://localhost:3000';

// Test data for each field group
const TEST_DATA = {
  // Group 1: Identity & Contact
  identity: {
    father_husband_name: 'Auth Test Father',
    date_of_birth: '1985-06-15',
    age: 38,
    sex: 'Female',
    inmate_type: 'Convicted',
    contact_number: '8888888888',
    address: 'Auth Test Address',
    inmate_name: 'Auth Test Patient'
  },
  
  // Group 2: Screening Encounter
  screening: {
    screening_date: '2026-05-06',
    facility_name: 'Auth Test Facility',
    facility_type: 'District Jail',
    screening_state: 'Maharashtra',
    screening_district: 'Mumbai',
    staff_name: 'Auth Test Staff',
    submitted_on: '2026-05-06'
  },
  
  // Group 3: Diagnostics & Treatment
  diagnostics: {
    xray_result: 'Suspected TB Case',
    tb_past_history: 'Yes',
    tb_diagnosed_select: 'Inconclusive',
    diagnosis_date: '2026-05-06',
    att_start_date: '2026-05-06',
    referral_date: '2026-05-06',
    referred_to_facility: 'CBNAAT',
    treatment_regimen: '2HRZE/4HR'
  },
  
  // Group 4: HIV / ART Status
  hiv: {
    hiv_status: 'Positive',
    art_started: 'Yes',
    art_center: 'Auth Test ART Center',
    cpt_given: true
  },
  
  // Group 5: Registration & System
  registration: {
    unique_id: 'AUTH-TEST-' + Date.now(),
    nikshay_id: 'NIK-AUTH-' + Date.now(),
    abha_id: 'ABHA-AUTH-' + Date.now()
  }
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login(page, email, password) {
  console.log('🔐 Logging in...');
  
  // Navigate to login page
  await page.goto(`${BASE_URL}/login`);
  await sleep(2000);
  
  // Fill login form
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for login to complete
  await sleep(5000);
  
  // Check if logged in successfully
  const currentUrl = page.url();
  if (!currentUrl.includes('/dashboard') && !currentUrl.includes('/vertex')) {
    throw new Error('Login failed - not redirected to dashboard');
  }
  
  console.log('✅ Logged in successfully');
  return true;
}

async function navigateToPatient(page, patientId) {
  console.log(`📋 Navigating to patient: ${patientId}`);
  
  await page.goto(`${BASE_URL}/dashboard/vertex/${patientId}`);
  await sleep(3000);
  
  // Wait for patient details to load
  await page.waitForSelector('[data-testid="patient-details"]', { timeout: 10000 });
  
  console.log('✅ Patient page loaded');
  return true;
}

async function unlockEditing(page) {
  console.log('🔓 Unlocking editing...');
  
  // Click unlock button
  const unlockButton = await page.$('button:has-text("Unlock to Edit")');
  if (unlockButton) {
    await unlockButton.click();
    await sleep(1000);
    console.log('✅ Editing unlocked');
  } else {
    console.log('⚠️ Already unlocked or button not found');
  }
}

async function fillFields(page, fields) {
  console.log(`📝 Filling ${Object.keys(fields).length} fields...`);
  
  for (const [fieldName, value] of Object.entries(fields)) {
    try {
      // Find the input field by various selectors
      let input = await page.$(`input[data-field="${fieldName}"]`) ||
                  await page.$(`input[name="${fieldName}"]`) ||
                  await page.$(`#${fieldName}`) ||
                  await page.$(`input[placeholder*="${fieldName}"]`);
      
      // If not found, try to find by label
      if (!input) {
        const labels = await page.$$('label');
        for (const label of labels) {
          const labelText = await label.textContent();
          if (labelText && labelText.toLowerCase().includes(fieldName.toLowerCase().replace(/_/g, ' '))) {
            input = await page.evaluateHandle(label => {
              const inputId = label.getAttribute('for');
              return inputId ? document.getElementById(inputId) : label.nextElementSibling;
            }, label);
            break;
          }
        }
      }
      
      if (input) {
        const inputType = await page.evaluate(el => el.type || 'text', input);
        
        if (inputType === 'checkbox') {
          const isChecked = await page.evaluate(el => el.checked, input);
          if ((value === true || value === 'Yes') && !isChecked) {
            await input.click();
          } else if ((value === false || value === 'No') && isChecked) {
            await input.click();
          }
        } else if (inputType === 'select-one') {
          await page.select(fieldName, value);
        } else {
          // Clear and type new value
          await input.click({ clickCount: 3 });
          await input.type(value.toString());
        }
        
        console.log(`  ✅ ${fieldName}: ${value}`);
      } else {
        console.log(`  ❌ ${fieldName}: Input not found`);
      }
      
      // Small delay between fields
      await sleep(100);
    } catch (error) {
      console.log(`  ❌ ${fieldName}: Error - ${error.message}`);
    }
  }
}

async function saveChanges(page) {
  console.log('💾 Saving changes...');
  
  // Click save button
  const saveButton = await page.$('button:has-text("Save Changes")');
  if (saveButton) {
    await saveButton.click();
    
    // Wait for save to complete
    await sleep(3000);
    
    // Check for success message or error
    const successMessage = await page.$('text=Changes saved') || 
                          await page.$('text=Success') ||
                          await page.$('.success-message');
    
    if (successMessage) {
      console.log('✅ Changes saved successfully');
      return true;
    } else {
      console.log('⚠️ No success message found');
      return false;
    }
  } else {
    console.log('❌ Save button not found');
    return false;
  }
}

async function verifyFields(page, fields) {
  console.log('🔍 Verifying saved values...');
  
  const results = {};
  
  for (const [fieldName, expectedValue] of Object.entries(fields)) {
    try {
      // Find the input or display element
      let element = await page.$(`input[data-field="${fieldName}"]`) ||
                   await page.$(`input[name="${fieldName}"]`) ||
                   await page.$(`#${fieldName}`) ||
                   await page.$(`[data-testid="${fieldName}"]`);
      
      if (element) {
        const elementType = await page.evaluate(el => {
          if (el.tagName === 'INPUT') return el.type;
          if (el.tagName === 'SELECT') return 'select';
          return 'text';
        }, element);
        
        let actualValue;
        if (elementType === 'checkbox') {
          actualValue = await page.evaluate(el => el.checked, element);
        } else {
          actualValue = await page.evaluate(el => el.value || el.textContent, element);
        }
        
        const matches = actualValue == expectedValue || 
                       (typeof expectedValue === 'boolean' && actualValue === expectedValue);
        
        results[fieldName] = {
          expected: expectedValue,
          actual: actualValue,
          matches: matches
        };
        
        console.log(`  ${matches ? '✅' : '❌'} ${fieldName}: "${actualValue}"`);
      } else {
        results[fieldName] = {
          expected: expectedValue,
          actual: 'NOT FOUND',
          matches: false
        };
        console.log(`  ❌ ${fieldName}: Element not found`);
      }
    } catch (error) {
      results[fieldName] = {
        expected: expectedValue,
        actual: `ERROR: ${error.message}`,
        matches: false
      };
      console.log(`  ❌ ${fieldName}: Error - ${error.message}`);
    }
  }
  
  return results;
}

async function runAuthenticatedTest() {
  console.log('🚀 AUTHENTICATED DEMOGRAPHICS SYNC TEST');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  
  // Get credentials from environment
  const TEST_EMAIL = process.env.TEST_EMAIL;
  const TEST_PASSWORD = process.env.TEST_PASSWORD;
  const TEST_PATIENT_ID = process.env.TEST_PATIENT_ID || 'fdf26115-5782-4afc-aba4-2ac44585508f';
  
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error('❌ Please set TEST_EMAIL and TEST_PASSWORD in your .env.local file');
    process.exit(1);
  }
  
  let browser;
  let page;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: false, // Set to true for headless mode
      defaultViewport: { width: 1920, height: 1080 }
    });
    page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 Browser Error:', msg.text());
      } else if (msg.type() === 'warning') {
        console.log('🟡 Browser Warning:', msg.text());
      } else if (msg.text().includes('DemographicsCarousel') || 
                 msg.text().includes('PatientDetailDrawer') ||
                 msg.text().includes('PAYLOAD')) {
        console.log('📋 Browser Log:', msg.text());
      }
    });
    
    // Login
    await login(page, TEST_EMAIL, TEST_PASSWORD);
    
    // Navigate to patient
    await navigateToPatient(page, TEST_PATIENT_ID);
    
    // Test each field group
    const allResults = {};
    
    for (const [groupName, fields] of Object.entries(TEST_DATA)) {
      console.log(`\n🧪 Testing ${groupName.toUpperCase()} group:`);
      
      // Unlock editing
      await unlockEditing(page);
      
      // Fill fields
      await fillFields(page, fields);
      
      // Save changes
      const saved = await saveChanges(page);
      
      if (saved) {
        // Verify fields
        const results = await verifyFields(page, fields);
        allResults[groupName] = results;
        
        // Count matches
        const matches = Object.values(results).filter(r => r.matches).length;
        const total = Object.keys(results).length;
        console.log(`  📊 Verified: ${matches}/${total} fields`);
      }
      
      // Wait before next group
      await sleep(2000);
    }
    
    // Generate summary
    console.log('\n📊 TEST SUMMARY:');
    console.log('═'.repeat(80));
    
    let totalFields = 0;
    let totalMatches = 0;
    
    for (const [groupName, results] of Object.entries(allResults)) {
      const matches = Object.values(results).filter(r => r.matches).length;
      const total = Object.keys(results).length;
      totalFields += total;
      totalMatches += matches;
      
      console.log(`${groupName}: ${matches}/${total} fields verified`);
    }
    
    console.log('═'.repeat(80));
    console.log(`Overall: ${totalMatches}/${totalFields} fields verified`);
    console.log(`Success rate: ${((totalMatches / totalFields) * 100).toFixed(1)}%`);
    
    if (totalMatches === totalFields) {
      console.log('\n🎉 ALL FIELDS VERIFIED SUCCESSFULLY!');
    } else {
      console.log('\n⚠️ Some fields failed verification');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
if (require.main === module) {
  runAuthenticatedTest().catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = { runAuthenticatedTest, TEST_DATA };
