/**
 * GOOGLE APPS SCRIPT - DUAL-HYBRID WEBHOOK HANDLER
 * 
 * This doPost function handles:
 * 1. Next.js Dashboard Updates (reverse sync from UI)
 * 2. Supabase Database Webhooks (real-time triggers)
 * 3. KoboToolbox Form Submissions (original functionality)
 * 
 * Copy this entire file into your Google Apps Script editor
 * URL: https://script.google.com/macros/s/YOUR_SCRIPT_ID/edit
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const SHEET_NAME = 'TB Screening Data'; // Your Google Sheet name
const WEBHOOK_SECRET = 'alliance_kobo_secure_2026';

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    if (!e || !e.postData) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'No postData received'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var payload = JSON.parse(e.postData.contents);
    
    // ROUTE 1: Next.js Dashboard Updates OR Supabase Webhooks
    if (payload.action === 'update_patient' || payload.type === 'UPDATE') {
      var patientData = payload.record || payload;
      var updates = payload.updates || patientData;
      
      return handleNextjsUpdate_({
        uniqueId: patientData.unique_id || patientData['Unique ID'] || payload.uniqueId,
        updates: updates
      });
    }
    
    // ROUTE 2: Supabase INSERT Webhook
    if (payload.type === 'INSERT' && payload.record) {
      return handleSupabaseInsert_(payload.record);
    }
    
    // ROUTE 3: KoboToolbox Form Submission
    if (payload._uuid || payload.uuid) {
      return handleKoboSubmission_(payload);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unknown payload type'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    Logger.log('Webhook Error: ' + err.message);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (lock) lock.releaseLock();
  }
}

function handleNextjsUpdate_(data) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Sheet not found: ' + SHEET_NAME);
    
    var uniqueId = data.uniqueId;
    if (!uniqueId) throw new Error('Missing uniqueId');
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var headers = values[0];
    var uniqueIdCol = headers.indexOf('Unique ID');
    
    if (uniqueIdCol === -1) throw new Error('Unique ID column not found');
    
    var rowIndex = -1;
    for (var i = 1; i < values.length; i++) {
      if (values[i][uniqueIdCol] === uniqueId) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) throw new Error('Patient not found: ' + uniqueId);
    
    var updates = data.updates;
    var updatedColumns = [];
    
    for (var columnName in updates) {
      var colIndex = headers.indexOf(columnName);
      if (colIndex !== -1) {
        sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updates[columnName]);
        updatedColumns.push(columnName);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Patient updated successfully',
      uniqueId: uniqueId,
      updatedColumns: updatedColumns
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleSupabaseInsert_(record) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Sheet not found');
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newRow = [];
    
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      var value = record[header] || record[header.toLowerCase().replace(/ /g, '_')] || '';
      newRow.push(value);
    }
    
    sheet.appendRow(newRow);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Patient inserted successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleKoboSubmission_(payload) {
  // Your existing Kobo processing logic here
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Kobo submission processed'
  })).setMimeType(ContentService.MimeType.JSON);
}
