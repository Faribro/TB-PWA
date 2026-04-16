/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 SEND TO SUPABASE - Standalone Sync Script
 * Maps 37-column Google Sheets data to Supabase patients table
 * ═══════════════════════════════════════════════════════════════════════════
 */

const SUPABASE_CONFIG = {
  ENDPOINT: 'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase',
  SECRET: 'alliance_kobo_secure_2026',
  BATCH_SIZE: 500,
  SHEET_NAME: 'Patient Linelist_TB',
  HEADER_ROW: 3
};

/**
 * Maps the 37-column array from TB Industrial Engine to Supabase-ready JSON
 * ✅ Verified against actual Supabase schema (43 columns)
 * ✅ id = UUID (auto-generated), unique_id = MPGWCJ00001 (PRIMARY IDENTIFIER)
 * Column indices match your sheet structure exactly
 */
function mapRowToSupabaseJson_(row) {
  // Clean and validate identifiers
  var cleanUuid = String(row[32] || '').replace(/^uuid:/i, '').trim();
  var uniqueId = String(row[7] || '').trim();
  
  return {
    // Core identifiers
    // NOTE: 'id' is auto-generated UUID in Supabase - DO NOT send it
    unique_id: uniqueId,                         // Unique ID (MPGWCJ00001) - PRIMARY IDENTIFIER
    kobo_uuid: cleanUuid || null,                // KoboUUID (5b3ec782...) - May be empty for some records
    
    // Staff & submission
    staff_name: row[0] || null,                  // Name of the Staff
    submitted_on: row[1] || null,                // Submitted On
    
    // Location
    screening_state: row[2] || null,             // State
    screening_district: row[3] || null,          // District
    facility_name: row[4] || null,               // Facility Name
    facility_type: row[5] || null,               // Facility type
    
    // Screening
    screening_date: row[6] || null,              // Date of Screening
    
    // Patient demographics
    inmate_name: row[8] || null,                 // Inmate Name
    inmate_type: row[9] || null,                 // Inmate type
    father_husband_name: row[10] || null,        // Father/Husband's Name
    date_of_birth: row[11] || null,              // Date of Birth
    age: row[12] || null,                        // Age
    sex: row[13] || null,                        // Sex
    contact_number: row[14] || null,             // Contact Number
    address: row[15] || null,                    // Address
    
    // Clinical data
    xray_result: row[16] || null,                // Chest x ray Result (primary)
    chest_x_ray_result: row[16] || null,         // Chest x ray Result (alias)
    symptoms_present: row[17] || null,           // 10s Symptoms Present (primary)
    symptoms_10s: row[17] || null,               // 10s Symptoms Present (alias)
    tb_past_history: row[18] || null,            // Past history of TB
    
    // Referral
    referral_date: row[19] || null,              // Date of referral
    referred_facility: row[20] || null,          // Name of facility referred to
    
    // Diagnosis
    tb_diagnosed: row[21] || null,               // TB diagnosed (Y/N)
    tb_diagnosis_date: row[22] || null,          // Date of TB Diagnosed
    tb_type: row[23] || null,                    // Type of TB Diagnosed
    
    // Treatment
    att_start_date: row[24] || null,             // Date of starting ATT
    att_completion_date: row[25] || null,        // Date of Treatment Completion
    
    // HIV/ART
    hiv_status: row[26] || null,                 // HIV Status
    art_status: row[27] || null,                 // Status at time of referral
    art_number: row[28] || null,                 // ART Number
    
    // Registration
    nikshay_abha_id: row[29] || null,            // NIKSHAY/ABHA ID
    registration_date: row[30] || null,          // Date of registration
    
    // Notes
    remarks: row[31] || null                     // Remarks
    
    // Note: 'id' is auto-generated UUID by Supabase - not sent from Apps Script
    // Note: kobo_id, serial_number, latitude, longitude are NOT in Supabase schema
  };
}

/**
 * Main function - Send all data to Supabase
 * Run this from the menu: TB Engine → 🚀 Pull All Data to Supabase
 */
function sendAllDataToSupabase() {
  var ui = SpreadsheetApp.getUi();
  
  // Confirmation dialog
  var response = ui.alert(
    'Send to Supabase',
    'This will send ALL patient records to Supabase.\n\n' +
    'The endpoint will handle duplicates via upsert on the "id" field.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    Logger.log('User cancelled sync');
    return;
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SUPABASE_CONFIG.SHEET_NAME);
    
    if (!sheet) {
      ui.alert('Error', 'Sheet "' + SUPABASE_CONFIG.SHEET_NAME + '" not found!', ui.ButtonSet.OK);
      return;
    }
    
    // Get all data (skip header rows)
    var allData = sheet.getDataRange().getValues();
    var dataRows = allData.slice(SUPABASE_CONFIG.HEADER_ROW); // Skip first 3 rows
    
    Logger.log('Total rows to sync: ' + dataRows.length);
    
    // Debug: Check kobo_uuid distribution
    var withUuid = 0;
    var withoutUuid = 0;
    for (var i = 0; i < Math.min(dataRows.length, 100); i++) {
      var uuid = String(dataRows[i][32] || '').replace(/^uuid:/i, '').trim();
      if (uuid) {
        withUuid++;
      } else {
        withoutUuid++;
      }
    }
    Logger.log('Sample check (first 100 rows): ' + withUuid + ' with UUID, ' + withoutUuid + ' without UUID');
    Logger.log('Column 32 sample values: ' + dataRows[0][32] + ', ' + dataRows[100][32] + ', ' + dataRows[1000][32]);
    
    // Convert to JSON objects
    var patientsData = [];
    for (var i = 0; i < dataRows.length; i++) {
      var row = dataRows[i];
      
      // Skip empty rows (check if kobo_uuid exists - this is the primary identifier)
      if (!row[32] || String(row[32]).trim() === '') {
        continue;
      }
      
      patientsData.push(mapRowToSupabaseJson_(row));
    }
    
    Logger.log('Valid records to sync: ' + patientsData.length);
    
    if (patientsData.length === 0) {
      ui.alert('No Data', 'No valid records found to sync!', ui.ButtonSet.OK);
      return;
    }
    
    // Send in batches
    var totalBatches = Math.ceil(patientsData.length / SUPABASE_CONFIG.BATCH_SIZE);
    var successCount = 0;
    var failCount = 0;
    
    for (var i = 0; i < patientsData.length; i += SUPABASE_CONFIG.BATCH_SIZE) {
      var batch = patientsData.slice(i, i + SUPABASE_CONFIG.BATCH_SIZE);
      var batchNum = Math.floor(i / SUPABASE_CONFIG.BATCH_SIZE) + 1;
      
      Logger.log('Sending batch ' + batchNum + '/' + totalBatches + ' (' + batch.length + ' records)...');
      
      var options = {
        method: 'post',
        contentType: 'application/json',
        headers: { 
          'x-kobo-webhook-secret': SUPABASE_CONFIG.SECRET
        },
        payload: JSON.stringify({ 
          patients: batch,
          source: 'TB_ENGINE_V2.3_GSheets'
        }),
        muteHttpExceptions: true
      };
      
      try {
        var response = UrlFetchApp.fetch(SUPABASE_CONFIG.ENDPOINT, options);
        var responseCode = response.getResponseCode();
        var responseBody = response.getContentText();
        
        Logger.log('Batch ' + batchNum + ' response: ' + responseCode);
        
        if (responseCode === 200) {
          successCount += batch.length;
          Logger.log('✅ Batch ' + batchNum + ' synced successfully');
        } else if (responseCode === 207) {
          // Partial success - log the error details
          Logger.log('⚠️ Batch ' + batchNum + ' partial failure: ' + responseBody);
          try {
            var errorData = JSON.parse(responseBody);
            if (errorData.message) {
              Logger.log('Error message: ' + errorData.message);
            }
            if (errorData.errors) {
              Logger.log('Errors: ' + JSON.stringify(errorData.errors));
            }
          } catch (e) {
            Logger.log('Could not parse error response');
          }
          failCount += batch.length;
        } else {
          failCount += batch.length;
          Logger.log('❌ Batch ' + batchNum + ' failed: ' + responseBody);
        }
      } catch (e) {
        failCount += batch.length;
        Logger.log('❌ Batch ' + batchNum + ' error: ' + e.message);
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + SUPABASE_CONFIG.BATCH_SIZE < patientsData.length) {
        Utilities.sleep(500);
      }
    }
    
    // Final report
    var message = 'Sync Complete!\n\n' +
                  'Total Records: ' + patientsData.length + '\n' +
                  '✅ Synced: ' + successCount + '\n' +
                  '❌ Failed: ' + failCount;
    
    Logger.log(message);
    ui.alert('Sync Complete', message, ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('Fatal error: ' + error.message);
    ui.alert('Error', 'Sync failed: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * Test function - Send only first 10 rows
 */
function testSyncToSupabase() {
  var ui = SpreadsheetApp.getUi();
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SUPABASE_CONFIG.SHEET_NAME);
    
    if (!sheet) {
      ui.alert('Error', 'Sheet not found!', ui.ButtonSet.OK);
      return;
    }
    
    // Get first 10 data rows
    var allData = sheet.getDataRange().getValues();
    var testRows = allData.slice(SUPABASE_CONFIG.HEADER_ROW, SUPABASE_CONFIG.HEADER_ROW + 10);
    
    var testData = [];
    for (var i = 0; i < testRows.length; i++) {
      if (testRows[i][7]) { // Has Unique ID
        testData.push(mapRowToSupabaseJson_(testRows[i]));
      }
    }
    
    Logger.log('Test data: ' + JSON.stringify(testData[0], null, 2));
    
    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 
        'x-kobo-webhook-secret': SUPABASE_CONFIG.SECRET
      },
      payload: JSON.stringify({ 
        patients: testData,
        source: 'TB_ENGINE_TEST'
      }),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(SUPABASE_CONFIG.ENDPOINT, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    Logger.log('Response: ' + responseCode);
    Logger.log('Body: ' + responseText);
    
    if (responseCode === 200 || responseCode === 207) {
      ui.alert('Test Success', 'Test sync completed!\n\nResponse: ' + responseCode, ui.ButtonSet.OK);
    } else {
      ui.alert('Test Failed', 'Response: ' + responseCode + '\n\n' + responseText, ui.ButtonSet.OK);
    }
    
  } catch (error) {
    Logger.log('Test error: ' + error.message);
    ui.alert('Error', 'Test failed: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * Add menu to spreadsheet
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Supabase Sync')
    .addItem('📤 Send All Data', 'sendAllDataToSupabase')
    .addItem('🧪 Test Sync (10 rows)', 'testSyncToSupabase')
    .addToUi();
}
