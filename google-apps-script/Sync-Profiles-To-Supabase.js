/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 PROFILES SYNC TO SUPABASE
 * Syncs user profiles from Google Sheet to Supabase profiles table
 * ═══════════════════════════════════════════════════════════════════════════
 */

const PROFILES_CONFIG = {
  ENDPOINT: 'https://hhxr-tb-engine.vercel.app/api/sync/profiles-to-supabase',
  SECRET: 'alliance_kobo_secure_2026',
  BATCH_SIZE: 100,
  SHEET_NAME: 'Sheet1', // Change this to your actual sheet name
  HEADER_ROW: 1 // Row number where headers are (usually 1)
};

/**
 * Maps Google Sheet row to Supabase profiles schema
 * Sheet columns: Email Address | Name | Designation | State
 * Supabase columns: id | email | role | state | district | staff_name | created_at | updated_at
 */
function mapProfileRowToSupabase_(row) {
  var email = String(row[0] || '').trim().toLowerCase();
  var name = String(row[1] || '').trim();
  var designation = String(row[2] || '').trim();
  var state = String(row[3] || '').trim();
  
  // Map designation to role
  var roleMapping = {
    'PC': 'PC',
    'SPM': 'SPM',
    'ME': 'ME',
    'PM': 'PM',
    'Admin': 'Admin',
    'Programme Coordinator': 'PC',
    'State Programme Manager': 'SPM',
    'M&E Officer': 'ME',
    'Programme Manager': 'PM'
  };
  
  var role = roleMapping[designation] || designation || 'PC';
  
  return {
    email: email,
    staff_name: name,
    role: role,
    state: state,
    district: null // Not in sheet, will be null
  };
}

/**
 * Main sync function - Send all profiles to Supabase
 */
function syncProfilesToSupabase() {
  var ui = SpreadsheetApp.getUi();
  
  // Confirmation dialog
  var response = ui.alert(
    'Sync Profiles to Supabase',
    'This will sync all user profiles to Supabase.\n\n' +
    'Existing profiles will be updated by email.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    Logger.log('User cancelled sync');
    return;
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(PROFILES_CONFIG.SHEET_NAME);
    
    if (!sheet) {
      ui.alert('Error', 'Sheet "' + PROFILES_CONFIG.SHEET_NAME + '" not found!', ui.ButtonSet.OK);
      return;
    }
    
    // Get all data (skip header row)
    var allData = sheet.getDataRange().getValues();
    var dataRows = allData.slice(PROFILES_CONFIG.HEADER_ROW);
    
    Logger.log('Total rows to sync: ' + dataRows.length);
    
    // Convert to JSON objects
    var profilesData = [];
    for (var i = 0; i < dataRows.length; i++) {
      var row = dataRows[i];
      
      // Skip empty rows (check if email exists)
      var email = String(row[0] || '').trim();
      if (!email || email === '') {
        continue;
      }
      
      profilesData.push(mapProfileRowToSupabase_(row));
    }
    
    Logger.log('Valid profiles to sync: ' + profilesData.length);
    
    if (profilesData.length === 0) {
      ui.alert('No Data', 'No valid profiles found to sync!', ui.ButtonSet.OK);
      return;
    }
    
    // Send in batches
    var totalBatches = Math.ceil(profilesData.length / PROFILES_CONFIG.BATCH_SIZE);
    var successCount = 0;
    var failCount = 0;
    
    for (var i = 0; i < profilesData.length; i += PROFILES_CONFIG.BATCH_SIZE) {
      var batch = profilesData.slice(i, i + PROFILES_CONFIG.BATCH_SIZE);
      var batchNum = Math.floor(i / PROFILES_CONFIG.BATCH_SIZE) + 1;
      
      Logger.log('Sending batch ' + batchNum + '/' + totalBatches + ' (' + batch.length + ' profiles)...');
      
      var options = {
        method: 'post',
        contentType: 'application/json',
        headers: { 
          'x-kobo-webhook-secret': PROFILES_CONFIG.SECRET
        },
        payload: JSON.stringify({ 
          profiles: batch,
          source: 'PROFILES_GOOGLE_SHEET'
        }),
        muteHttpExceptions: true
      };
      
      try {
        var response = UrlFetchApp.fetch(PROFILES_CONFIG.ENDPOINT, options);
        var responseCode = response.getResponseCode();
        var responseBody = response.getContentText();
        
        Logger.log('Batch ' + batchNum + ' response: ' + responseCode);
        
        if (responseCode === 200) {
          successCount += batch.length;
          Logger.log('✅ Batch ' + batchNum + ' synced successfully');
        } else if (responseCode === 207) {
          Logger.log('⚠️ Batch ' + batchNum + ' partial failure: ' + responseBody);
          try {
            var errorData = JSON.parse(responseBody);
            if (errorData.stats && errorData.stats.synced) {
              successCount += errorData.stats.synced;
              failCount += (batch.length - errorData.stats.synced);
            } else {
              failCount += batch.length;
            }
          } catch (e) {
            failCount += batch.length;
          }
        } else {
          failCount += batch.length;
          Logger.log('❌ Batch ' + batchNum + ' failed: ' + responseBody);
        }
      } catch (e) {
        failCount += batch.length;
        Logger.log('❌ Batch ' + batchNum + ' error: ' + e.message);
      }
      
      // Small delay between batches
      if (i + PROFILES_CONFIG.BATCH_SIZE < profilesData.length) {
        Utilities.sleep(500);
      }
    }
    
    // Final report
    var message = 'Sync Complete!\n\n' +
                  'Total Profiles: ' + profilesData.length + '\n' +
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
 * Test function - Send only first 5 profiles
 */
function testProfilesSync() {
  var ui = SpreadsheetApp.getUi();
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(PROFILES_CONFIG.SHEET_NAME);
    
    if (!sheet) {
      ui.alert('Error', 'Sheet not found!', ui.ButtonSet.OK);
      return;
    }
    
    // Get first 5 data rows
    var allData = sheet.getDataRange().getValues();
    var testRows = allData.slice(PROFILES_CONFIG.HEADER_ROW, PROFILES_CONFIG.HEADER_ROW + 5);
    
    var testData = [];
    for (var i = 0; i < testRows.length; i++) {
      var email = String(testRows[i][0] || '').trim();
      if (email) {
        testData.push(mapProfileRowToSupabase_(testRows[i]));
      }
    }
    
    Logger.log('Test data: ' + JSON.stringify(testData[0], null, 2));
    
    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 
        'x-kobo-webhook-secret': PROFILES_CONFIG.SECRET
      },
      payload: JSON.stringify({ 
        profiles: testData,
        source: 'PROFILES_TEST'
      }),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(PROFILES_CONFIG.ENDPOINT, options);
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
 * Diagnostic function - Check sheet data
 */
function diagnoseProfilesSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PROFILES_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    Logger.log('❌ Sheet not found!');
    return;
  }
  
  var allData = sheet.getDataRange().getValues();
  var headers = allData[PROFILES_CONFIG.HEADER_ROW - 1];
  var dataRows = allData.slice(PROFILES_CONFIG.HEADER_ROW);
  
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('📊 PROFILES SHEET DIAGNOSTIC');
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('Sheet Name: ' + PROFILES_CONFIG.SHEET_NAME);
  Logger.log('Total Rows: ' + allData.length);
  Logger.log('Data Rows: ' + dataRows.length);
  Logger.log('Headers: ' + headers.join(' | '));
  Logger.log('');
  
  var withEmail = 0;
  var withoutEmail = 0;
  
  for (var i = 0; i < dataRows.length; i++) {
    var email = String(dataRows[i][0] || '').trim();
    if (email) {
      withEmail++;
    } else {
      withoutEmail++;
    }
  }
  
  Logger.log('✅ Rows with email: ' + withEmail);
  Logger.log('❌ Rows without email: ' + withoutEmail);
  Logger.log('');
  
  if (dataRows.length > 0) {
    Logger.log('📝 Sample Row:');
    Logger.log('  Email: ' + dataRows[0][0]);
    Logger.log('  Name: ' + dataRows[0][1]);
    Logger.log('  Designation: ' + dataRows[0][2]);
    Logger.log('  State: ' + dataRows[0][3]);
  }
  
  Logger.log('═══════════════════════════════════════════════════════════════');
}

/**
 * Add menu to spreadsheet
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Profiles Sync')
    .addItem('📤 Sync All Profiles', 'syncProfilesToSupabase')
    .addItem('🧪 Test Sync (5 profiles)', 'testProfilesSync')
    .addSeparator()
    .addItem('🔍 Diagnose Sheet', 'diagnoseProfilesSheet')
    .addToUi();
}
