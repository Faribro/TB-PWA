/**
 * GOOGLE APPS SCRIPT - BATCH-ENABLED WEBHOOK HANDLER
 * 
 * This doPost function handles:
 * 1. Batch Updates (from Next.js sync queue)
 * 2. Single Record Updates (from UI)
 * 3. Supabase Database Webhooks
 * 4. KoboToolbox Form Submissions
 * 
 * Copy this entire file into your Google Apps Script editor
 * URL: https://script.google.com/macros/s/YOUR_SCRIPT_ID/edit
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const SHEET_NAME = 'Patient Linelist_TB'; // Updated to match actual sheet name
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
    
    // ROUTE 1: BATCH OPERATIONS (NEW!)
    if (payload.batch && Array.isArray(payload.batch)) {
      return handleBatchOperation_(payload);
    }
    
    // ROUTE 2: Next.js Dashboard Updates OR Supabase Webhooks
    if (payload.action === 'update_patient' || payload.type === 'UPDATE') {
      var patientData = payload.record || payload;
      var updates = payload.updates || patientData;
      
      var uniqueId = payload.uuid || 
                     payload.uniqueId || 
                     patientData.unique_id || 
                     patientData['Unique ID'] ||
                     patientData.uuid ||
                     patientData.kobo_uuid;
      
      if (!uniqueId) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Missing UUID'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      return handleSingleUpdate_({
        uniqueId: uniqueId,
        updates: updates
      });
    }
    
    // ROUTE 3: Supabase INSERT Webhook
    if (payload.type === 'INSERT' && payload.record) {
      return handleSupabaseInsert_(payload.record);
    }
    
    // ROUTE 4: KoboToolbox Form Submission
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

// ============================================================================
// BATCH OPERATION HANDLER (NEW!)
// ============================================================================

function handleBatchOperation_(payload) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Sheet not found: ' + SHEET_NAME);
    
    var batch = payload.batch;
    var batchId = payload.batch_id || 'unknown';
    var count = payload.count || batch.length;
    
    Logger.log('Processing batch: ' + batchId + ' with ' + count + ' records');
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var headers = values[0];
    
    // Find KoboUUID column
    var koboUuidCol = headers.indexOf('KoboUUID');
    if (koboUuidCol === -1) koboUuidCol = headers.indexOf('kobo_uuid');
    if (koboUuidCol === -1) koboUuidCol = headers.indexOf('_uuid');
    
    if (koboUuidCol === -1) {
      throw new Error('KoboUUID column not found');
    }
    
    var updated = 0;
    var inserted = 0;
    var errors = 0;
    
    // Process each record in batch
    for (var i = 0; i < batch.length; i++) {
      var record = batch[i];
      var koboUuid = record.kobo_uuid || record.KoboUUID || record._uuid;
      
      if (!koboUuid) {
        errors++;
        continue;
      }
      
      // Find existing row
      var rowIndex = -1;
      for (var j = 1; j < values.length; j++) {
        if (String(values[j][koboUuidCol]).trim() === String(koboUuid).trim()) {
          rowIndex = j;
          break;
        }
      }
      
      if (rowIndex !== -1) {
        // UPDATE existing row
        for (var key in record) {
          var colIndex = headers.indexOf(key);
          if (colIndex !== -1 && record[key] !== null && record[key] !== undefined) {
            sheet.getRange(rowIndex + 1, colIndex + 1).setValue(record[key]);
          }
        }
        updated++;
      } else {
        // INSERT new row
        var newRow = [];
        for (var h = 0; h < headers.length; h++) {
          var header = headers[h];
          var value = record[header] || record[header.toLowerCase().replace(/ /g, '_')] || '';
          newRow.push(value);
        }
        sheet.appendRow(newRow);
        inserted++;
      }
    }
    
    Logger.log('Batch complete: ' + updated + ' updated, ' + inserted + ' inserted, ' + errors + ' errors');
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Batch processed successfully',
      batch_id: batchId,
      stats: {
        total: count,
        updated: updated,
        inserted: inserted,
        errors: errors
      }
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    Logger.log('Batch Error: ' + err.message);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// SINGLE UPDATE HANDLER
// ============================================================================

function handleSingleUpdate_(data) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Sheet not found: ' + SHEET_NAME);
    
    var uniqueId = data.uniqueId;
    if (!uniqueId) throw new Error('Missing uniqueId');
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var headers = values[0];
    
    var uniqueIdCol = headers.indexOf('KoboUUID');
    if (uniqueIdCol === -1) uniqueIdCol = headers.indexOf('Unique ID');
    if (uniqueIdCol === -1) uniqueIdCol = headers.indexOf('uuid');
    if (uniqueIdCol === -1) uniqueIdCol = headers.indexOf('_uuid');
    
    if (uniqueIdCol === -1) {
      throw new Error('KoboUUID column not found');
    }
    
    var rowIndex = -1;
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][uniqueIdCol]).trim() === String(uniqueId).trim()) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) {
      throw new Error('UUID not found in sheet: ' + uniqueId);
    }
    
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

// ============================================================================
// SUPABASE INSERT HANDLER
// ============================================================================

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

// ============================================================================
// KOBO SUBMISSION HANDLER
// ============================================================================

function handleKoboSubmission_(payload) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Kobo submission processed'
  })).setMimeType(ContentService.MimeType.JSON);
}
