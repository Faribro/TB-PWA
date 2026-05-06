// Browser Console Test Script for Demographics Sync
// Copy and paste this into the browser console on a patient page

(function() {
  console.log('🚀 BROWSER CONSOLE DEMOGRAPHICS SYNC TEST');
  
  // Test data for each field group
  const fieldTests = [
    {
      name: 'Identity & Contact',
      fields: {
        father_husband_name: 'Console Test Father',
        date_of_birth: '1985-06-15',
        age: 38,
        sex: 'Female',
        inmate_type: 'Convicted',
        contact_number: '8888888888',
        address: 'Console Test Address',
        inmate_name: 'Console Test Patient'
      }
    },
    {
      name: 'Screening Encounter',
      fields: {
        screening_date: '2026-05-06',
        facility_name: 'Console Test Facility',
        facility_type: 'District Jail',
        screening_state: 'Maharashtra',
        screening_district: 'Mumbai',
        staff_name: 'Console Test Staff',
        submitted_on: '2026-05-06'
      }
    },
    {
      name: 'Diagnostics & Treatment',
      fields: {
        xray_result: 'Suspected TB Case',
        tb_past_history: 'Yes',
        tb_diagnosed_select: 'Inconclusive',
        diagnosis_date: '2026-05-06',
        att_start_date: '2026-05-06',
        referral_date: '2026-05-06',
        referred_to_facility: 'CBNAAT',
        treatment_regimen: '2HRZE/4HR'
      }
    },
    {
      name: 'HIV / ART Status',
      fields: {
        hiv_status: 'Positive',
        art_started: 'Yes',
        art_center: 'Console Test ART Center',
        cpt_given: true
      }
    },
    {
      name: 'Registration & System',
      fields: {
        unique_id: 'CONSOLE-' + Date.now(),
        nikshay_id: 'NIK-CONSOLE-' + Date.now(),
        abha_id: 'ABHA-CONSOLE-' + Date.now()
      }
    }
  ];
  
  // Get current patient ID from URL
  const pathParts = window.location.pathname.split('/');
  const patientId = pathParts[pathParts.length - 1];
  
  console.log(`📋 Patient ID: ${patientId}`);
  
  // Function to test a field group
  async function testFieldGroup(group) {
    console.log(`\n🧪 Testing: ${group.name}`);
    
    // Unlock editing if needed
    const unlockButton = document.querySelector('button:has-text("Unlock to Edit")');
    if (unlockButton) {
      unlockButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Fill fields
    for (const [fieldName, value] of Object.entries(group.fields)) {
      const input = document.querySelector(`input[data-field="${fieldName}"]`) ||
                   document.querySelector(`input[name="${fieldName}"]`) ||
                   document.querySelector(`#${fieldName}`) ||
                   document.querySelector(`input[placeholder*="${fieldName}"]`);
      
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = value;
        } else if (input.type === 'select-one') {
          input.value = value;
        } else {
          input.value = value;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`  ✅ ${fieldName}: ${value}`);
      } else {
        console.log(`  ❌ ${fieldName}: Input not found`);
      }
    }
    
    // Save changes
    const saveButton = document.querySelector('button:has-text("Save Changes")');
    if (saveButton) {
      saveButton.click();
      console.log('  💾 Save clicked');
      
      // Wait for save to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check for success
      const successMsg = document.querySelector('text=Changes saved') ||
                        document.querySelector('.success-message');
      if (successMsg) {
        console.log('  ✅ Save successful');
      } else {
        console.log('  ⚠️ No success message detected');
      }
    }
  }
  
  // Run all tests
  async function runAllTests() {
    for (const group of fieldTests) {
      await testFieldGroup(group);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 All tests completed!');
    console.log('📋 Refresh the page to verify persistence');
  }
  
  // Start the test
  runAllTests().catch(console.error);
  
})();
