/**
 * SYNC RECOVERY TOOLKIT - SCREENING DATE BACKFILL
 * 
 * This script patches submitted_on and screening_date in Supabase
 * from the "Patient Linelist_TB" Google Sheet.
 * 
 * USAGE:
 * 1. Open Google Apps Script editor
 * 2. Copy this entire file
 * 3. Run PATCH_SUPABASE_SUBMITTED_ON() from the editor
 * 4. Monitor execution logs
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const SHEET_NAME = 'Patient Linelist_TB';
const API_ENDPOINT = 'https://hhxr-tb-engine.vercel.app/api/patch-screening-dates';
const WEBHOOK_SECRET = 'alliance_kobo_secure_2026';
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

function PATCH_SUPABASE_SUBMITTED_ON() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('📊 SCREENING DATE BACKFILL - STARTING');
  Logger.log('═══════════════════════════════════════════════════════════');
  
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error('Sheet not found: ' + SHEET_NAME);
    }
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var headers = values[0];
    
    Logger.log('📋 Sheet: ' + SHEET_NAME);
    Logger.log('📊 Total rows (including header): ' + values.length);
    
    // Find column indexes
    var submittedOnCol = 1; // Column 2 (index 1)
    var koboUuidCol = 32;   // Column 33 (index 32)
    
    Logger.log('📍 Submitted On column: ' + (submittedOnCol + 1));
    Logger.log('📍 KoboUUID column: ' + (koboUuidCol + 1));
    
    var patches = [];
    var skipped = 0;
    var processed = 0;
    
    // Process all rows (skip header)
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var koboUuid = row[koboUuidCol];
      var submittedOnText = row[submittedOnCol];
      
      // Skip if UUID is empty
      if (!koboUuid || String(koboUuid).trim() === '') {
        skipped++;
        continue;
      }
      
      // Parse submitted_on date
      var parsedDate = parseSubmittedOn(submittedOnText);
      if (!parsedDate) {
        skipped++;
        continue;
      }
      
      // Extract screening_date (YYYY-MM-DD)
      var screeningDate = parsedDate.substring(0, 10);
      
      patches.push({
        kobo_uuid: String(koboUuid).trim(),
        submitted_on: parsedDate,
        screening_date: screeningDate
      });
      
      processed++;
      
      // Log progress every 500 rows
      if (processed % 500 === 0) {
        Logger.log('⏳ Processed ' + processed + '/' + (values.length - 1) + ' rows...');
      }
    }
    
    Logger.log('');
    Logger.log('📊 PROCESSING SUMMARY:');
    Logger.log('   Total rows read: ' + (values.length - 1));
    Logger.log('   Valid patches: ' + patches.length);
    Logger.log('   Skipped: ' + skipped);
    Logger.log('');
    
    if (patches.length === 0) {
      Logger.log('⚠️  No patches to send. Exiting.');
      return;
    }
    
    // Send patches in batches
    var totalBatches = Math.ceil(patches.length / BATCH_SIZE);
    var successfulBatches = 0;
    var totalUpdated = 0;
    var totalErrors = 0;
    
    Logger.log('📤 Sending ' + totalBatches + ' batches to Supabase...');
    Logger.log('');
    
    for (var batchNum = 0; batchNum < totalBatches; batchNum++) {
      var start = batchNum * BATCH_SIZE;
      var end = Math.min(start + BATCH_SIZE, patches.length);
      var batch = patches.slice(start, end);
      
      Logger.log('📦 Batch ' + (batchNum + 1) + '/' + totalBatches + ': Sending ' + batch.length + ' patches...');
      
      try {
        var response = UrlFetchApp.fetch(API_ENDPOINT, {
          method: 'post',
          contentType: 'application/json',
          headers: {
            'x-kobo-webhook-secret': WEBHOOK_SECRET
          },
          payload: JSON.stringify({ patches: batch }),
          muteHttpExceptions: true
        });
        
        var responseCode = response.getResponseCode();
        var responseText = response.getContentText();
        
        if (responseCode === 200) {
          var result = JSON.parse(responseText);
          totalUpdated += result.updated || 0;
          totalErrors += result.errors || 0;
          successfulBatches++;
          Logger.log('   ✅ Success: ' + result.updated + ' updated, ' + result.errors + ' errors');
        } else {
          Logger.log('   ❌ Failed: HTTP ' + responseCode + ' - ' + responseText);
          totalErrors += batch.length;
        }
        
      } catch (err) {
        Logger.log('   ❌ Error: ' + err.message);
        totalErrors += batch.length;
      }
      
      // Delay between batches (except last one)
      if (batchNum < totalBatches - 1) {
        Utilities.sleep(BATCH_DELAY_MS);
      }
    }
    
    Logger.log('');
    Logger.log('═══════════════════════════════════════════════════════════');
    Logger.log('✅ BACKFILL COMPLETE');
    Logger.log('═══════════════════════════════════════════════════════════');
    Logger.log('📊 FINAL SUMMARY:');
    Logger.log('   Total rows read: ' + (values.length - 1));
    Logger.log('   Valid patches built: ' + patches.length);
    Logger.log('   Total batches sent: ' + totalBatches);
    Logger.log('   Successful batches: ' + successfulBatches);
    Logger.log('   Total updated: ' + totalUpdated);
    Logger.log('   Total errors: ' + totalErrors);
    Logger.log('═══════════════════════════════════════════════════════════');
    
  } catch (error) {
    Logger.log('');
    Logger.log('❌ FATAL ERROR: ' + error.message);
    Logger.log('Stack trace: ' + error.stack);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse "Submitted on DD/MM/YY at H:MM AM/PM IST" format
 * Returns ISO string with IST offset: YYYY-MM-DDTHH:MM:SS+05:30
 */
function parseSubmittedOn(text) {
  if (!text) return null;
  
  var s = String(text).trim();
  
  // Match DD/MM/YY or DD/MM/YYYY at H:MM AM/PM
  var m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  
  if (!m) return null;
  
  var day = m[1].padStart(2, '0');
  var month = m[2].padStart(2, '0');
  var year = m[3].length === 2 ? '20' + m[3] : m[3];
  var hours = parseInt(m[4]);
  var mins = m[5];
  var ampm = m[6].toUpperCase();
  
  // Convert to 24-hour format
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  var hh = String(hours).padStart(2, '0');
  
  // Return ISO with IST offset
  return year + '-' + month + '-' + day + 'T' + hh + ':' + mins + ':00+05:30';
}

/**
 * Test the date parser with sample inputs
 */
function TEST_DATE_PARSER() {
  var testCases = [
    'Submitted on 15/01/24 at 2:30 PM IST',
    'Submitted on 5/3/24 at 9:15 AM IST',
    'Submitted on 25/12/2024 at 11:45 PM IST',
    'Invalid format',
    null,
    ''
  ];
  
  Logger.log('Testing date parser:');
  Logger.log('');
  
  testCases.forEach(function(testCase) {
    var result = parseSubmittedOn(testCase);
    Logger.log('Input:  ' + testCase);
    Logger.log('Output: ' + result);
    if (result) {
      Logger.log('Date:   ' + result.substring(0, 10));
    }
    Logger.log('');
  });
}
