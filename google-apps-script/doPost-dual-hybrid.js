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
      
      // Support both 'uuid' and 'uniqueId' field names
      var uniqueId = payload.uuid || 
                     payload.uniqueId || 
                     patientData.unique_id || 
                     patientData['Unique ID'] ||
                     patientData.uuid;
      
      if (!uniqueId) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Missing UUID - provide either uuid, uniqueId, or unique_id'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      return handleNextjsUpdate_({
        uniqueId: uniqueId,
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
    
    // Try multiple column names for UUID lookup
    var uniqueIdCol = headers.indexOf('KoboUUID');
    if (uniqueIdCol === -1) uniqueIdCol = headers.indexOf('Unique ID');
    if (uniqueIdCol === -1) uniqueIdCol = headers.indexOf('uuid');
    if (uniqueIdCol === -1) uniqueIdCol = headers.indexOf('_uuid');
    
    if (uniqueIdCol === -1) {
      Logger.log('Available headers: ' + JSON.stringify(headers));
      throw new Error('KoboUUID column not found. Available: ' + headers.join(', '));
    }
    
    Logger.log('Looking for UUID: ' + uniqueId + ' in column ' + uniqueIdCol);
    
    var rowIndex = -1;
    for (var i = 1; i < values.length; i++) {
      var cellValue = values[i][uniqueIdCol];
      // Convert to string for comparison and trim whitespace
      if (String(cellValue).trim() === String(uniqueId).trim()) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) {
      Logger.log('UUID not found in sheet. Checked ' + (values.length - 1) + ' rows');
      throw new Error('UUID not found in sheet: ' + uniqueId);
    }
    
    Logger.log('Found UUID at row: ' + (rowIndex + 1));
    
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
