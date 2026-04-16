/**
 * Find the duplicate kobo_uuid in batch 39 (rows 19000-19499)
 */
function findDuplicateInBatch39() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Patient Linelist_TB');
  var allData = sheet.getDataRange().getValues();
  var dataRows = allData.slice(3); // Skip headers
  
  // Get batch 39 (rows 19000-19499)
  var batch39Start = 19000;
  var batch39End = 19500;
  var batch39Rows = dataRows.slice(batch39Start, batch39End);
  
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('🔍 FINDING DUPLICATE IN BATCH 39');
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('Checking rows ' + (batch39Start + 4) + ' to ' + (batch39End + 3) + ' (sheet row numbers)');
  Logger.log('');
  
  var uuidMap = {};
  var duplicates = [];
  
  for (var i = 0; i < batch39Rows.length; i++) {
    var uuid = String(batch39Rows[i][32] || '').replace(/^uuid:/i, '').trim();
    var sheetRow = batch39Start + i + 4; // +4 for header rows
    
    if (uuid) {
      if (uuidMap[uuid]) {
        duplicates.push({
          uuid: uuid,
          firstRow: uuidMap[uuid],
          secondRow: sheetRow,
          firstUniqueId: dataRows[uuidMap[uuid] - 4][7],
          secondUniqueId: batch39Rows[i][7],
          firstName: dataRows[uuidMap[uuid] - 4][8],
          secondName: batch39Rows[i][8]
        });
      } else {
        uuidMap[uuid] = sheetRow;
      }
    }
  }
  
  if (duplicates.length > 0) {
    Logger.log('❌ Found ' + duplicates.length + ' duplicate(s) in batch 39:');
    Logger.log('');
    
    for (var i = 0; i < duplicates.length; i++) {
      var dup = duplicates[i];
      Logger.log('Duplicate #' + (i + 1) + ':');
      Logger.log('  Kobo UUID: ' + dup.uuid);
      Logger.log('  First occurrence:');
      Logger.log('    - Sheet Row: ' + dup.firstRow);
      Logger.log('    - Unique ID: ' + dup.firstUniqueId);
      Logger.log('    - Name: ' + dup.firstName);
      Logger.log('  Second occurrence:');
      Logger.log('    - Sheet Row: ' + dup.secondRow);
      Logger.log('    - Unique ID: ' + dup.secondUniqueId);
      Logger.log('    - Name: ' + dup.secondName);
      Logger.log('');
      Logger.log('  💡 ACTION: Delete row ' + dup.secondRow + ' or change its kobo_uuid');
      Logger.log('');
    }
  } else {
    Logger.log('✅ No duplicates found in batch 39');
  }
  
  Logger.log('═══════════════════════════════════════════════════════════════');
  
  return duplicates;
}

/**
 * Find ALL duplicates in the entire sheet
 */
function findAllDuplicates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Patient Linelist_TB');
  var allData = sheet.getDataRange().getValues();
  var dataRows = allData.slice(3);
  
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('🔍 FINDING ALL DUPLICATES IN SHEET');
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('Total data rows: ' + dataRows.length);
  Logger.log('');
  
  var uuidMap = {};
  var duplicates = [];
  
  for (var i = 0; i < dataRows.length; i++) {
    var uuid = String(dataRows[i][32] || '').replace(/^uuid:/i, '').trim();
    var sheetRow = i + 4; // +4 for header rows
    
    if (uuid) {
      if (uuidMap[uuid]) {
        duplicates.push({
          uuid: uuid,
          firstRow: uuidMap[uuid],
          secondRow: sheetRow,
          firstUniqueId: dataRows[uuidMap[uuid] - 4][7],
          secondUniqueId: dataRows[i][7],
          firstName: dataRows[uuidMap[uuid] - 4][8],
          secondName: dataRows[i][8]
        });
      } else {
        uuidMap[uuid] = sheetRow;
      }
    }
  }
  
  if (duplicates.length > 0) {
    Logger.log('❌ Found ' + duplicates.length + ' duplicate kobo_uuid(s):');
    Logger.log('');
    
    for (var i = 0; i < duplicates.length; i++) {
      var dup = duplicates[i];
      Logger.log('Duplicate #' + (i + 1) + ':');
      Logger.log('  Kobo UUID: ' + dup.uuid);
      Logger.log('  Row ' + dup.firstRow + ': ' + dup.firstUniqueId + ' - ' + dup.firstName);
      Logger.log('  Row ' + dup.secondRow + ': ' + dup.secondUniqueId + ' - ' + dup.secondName);
      Logger.log('  💡 Delete row ' + dup.secondRow + ' or regenerate its kobo_uuid');
      Logger.log('');
    }
    
    Logger.log('═══════════════════════════════════════════════════════════════');
    Logger.log('📋 SUMMARY:');
    Logger.log('Total duplicates: ' + duplicates.length);
    Logger.log('Rows to fix: ' + duplicates.map(function(d) { return d.secondRow; }).join(', '));
    Logger.log('═══════════════════════════════════════════════════════════════');
  } else {
    Logger.log('✅ No duplicates found!');
  }
  
  return duplicates;
}
