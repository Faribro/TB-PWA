/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔍 DIAGNOSTIC FUNCTION - Analyze Sheet Data
 * Run this to see exactly what's in your columns and identify sync issues
 * ═══════════════════════════════════════════════════════════════════════════
 */

function DIAGNOSE_SHEET_DATA() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Patient Linelist_TB');
  
  if (!sheet) {
    Logger.log('❌ Sheet not found!');
    return;
  }
  
  var allData = sheet.getDataRange().getValues();
  var dataRows = allData.slice(3); // Skip first 3 header rows
  
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('📊 SHEET DATA DIAGNOSTIC REPORT');
  Logger.log('═══════════════════════════════════════════════════════════════\n');
  
  Logger.log('📋 BASIC STATS:');
  Logger.log('Total rows (including headers): ' + allData.length);
  Logger.log('Data rows (excluding headers): ' + dataRows.length);
  Logger.log('Total columns: ' + (allData[0] ? allData[0].length : 0));
  Logger.log('');
  
  // Check column 7 (Unique ID)
  Logger.log('🔑 COLUMN 7 - UNIQUE ID (MPGWCJ00001):');
  var uniqueIdCount = 0;
  var uniqueIdEmpty = 0;
  var uniqueIdSamples = [];
  
  for (var i = 0; i < dataRows.length; i++) {
    var uniqueId = String(dataRows[i][7] || '').trim();
    if (uniqueId) {
      uniqueIdCount++;
      if (uniqueIdSamples.length < 5) {
        uniqueIdSamples.push(uniqueId);
      }
    } else {
      uniqueIdEmpty++;
    }
  }
  
  Logger.log('  ✅ With Unique ID: ' + uniqueIdCount + ' (' + (uniqueIdCount/dataRows.length*100).toFixed(1) + '%)');
  Logger.log('  ❌ Empty Unique ID: ' + uniqueIdEmpty + ' (' + (uniqueIdEmpty/dataRows.length*100).toFixed(1) + '%)');
  Logger.log('  📝 Sample values: ' + uniqueIdSamples.join(', '));
  Logger.log('');
  
  // Check column 32 (KoboUUID)
  Logger.log('🔑 COLUMN 32 - KOBO UUID (5b3ec782...):');
  var koboUuidCount = 0;
  var koboUuidEmpty = 0;
  var koboUuidSamples = [];
  
  for (var i = 0; i < dataRows.length; i++) {
    var koboUuid = String(dataRows[i][32] || '').replace(/^uuid:/i, '').trim();
    if (koboUuid) {
      koboUuidCount++;
      if (koboUuidSamples.length < 5) {
        koboUuidSamples.push(koboUuid);
      }
    } else {
      koboUuidEmpty++;
    }
  }
  
  Logger.log('  ✅ With Kobo UUID: ' + koboUuidCount + ' (' + (koboUuidCount/dataRows.length*100).toFixed(1) + '%)');
  Logger.log('  ❌ Empty Kobo UUID: ' + koboUuidEmpty + ' (' + (koboUuidEmpty/dataRows.length*100).toFixed(1) + '%)');
  Logger.log('  📝 Sample values: ' + koboUuidSamples.join(', ').substring(0, 100) + '...');
  Logger.log('');
  
  // Check for duplicates in Unique ID
  Logger.log('🔍 DUPLICATE CHECK - UNIQUE ID:');
  var uniqueIdMap = {};
  var duplicateUniqueIds = [];
  
  for (var i = 0; i < dataRows.length; i++) {
    var uniqueId = String(dataRows[i][7] || '').trim();
    if (uniqueId) {
      if (uniqueIdMap[uniqueId]) {
        uniqueIdMap[uniqueId]++;
        if (duplicateUniqueIds.indexOf(uniqueId) === -1) {
          duplicateUniqueIds.push(uniqueId);
        }
      } else {
        uniqueIdMap[uniqueId] = 1;
      }
    }
  }
  
  if (duplicateUniqueIds.length > 0) {
    Logger.log('  ⚠️ Found ' + duplicateUniqueIds.length + ' duplicate Unique IDs!');
    Logger.log('  📝 Examples: ' + duplicateUniqueIds.slice(0, 5).join(', '));
    for (var i = 0; i < Math.min(5, duplicateUniqueIds.length); i++) {
      Logger.log('     - ' + duplicateUniqueIds[i] + ' appears ' + uniqueIdMap[duplicateUniqueIds[i]] + ' times');
    }
  } else {
    Logger.log('  ✅ No duplicate Unique IDs found');
  }
  Logger.log('');
  
  // Check for duplicates in Kobo UUID
  Logger.log('🔍 DUPLICATE CHECK - KOBO UUID:');
  var koboUuidMap = {};
  var duplicateKoboUuids = [];
  
  for (var i = 0; i < dataRows.length; i++) {
    var koboUuid = String(dataRows[i][32] || '').replace(/^uuid:/i, '').trim();
    if (koboUuid) {
      if (koboUuidMap[koboUuid]) {
        koboUuidMap[koboUuid]++;
        if (duplicateKoboUuids.indexOf(koboUuid) === -1) {
          duplicateKoboUuids.push(koboUuid);
        }
      } else {
        koboUuidMap[koboUuid] = 1;
      }
    }
  }
  
  if (duplicateKoboUuids.length > 0) {
    Logger.log('  ⚠️ Found ' + duplicateKoboUuids.length + ' duplicate Kobo UUIDs!');
    Logger.log('  📝 Examples: ' + duplicateKoboUuids.slice(0, 3).join(', ').substring(0, 100));
  } else {
    Logger.log('  ✅ No duplicate Kobo UUIDs found');
  }
  Logger.log('');
  
  // Check key columns
  Logger.log('📊 KEY COLUMN POPULATION:');
  var columnChecks = [
    { index: 0, name: 'Staff Name' },
    { index: 1, name: 'Submitted On' },
    { index: 2, name: 'State' },
    { index: 3, name: 'District' },
    { index: 4, name: 'Facility Name' },
    { index: 8, name: 'Inmate Name' },
    { index: 16, name: 'X-Ray Result' },
    { index: 21, name: 'TB Diagnosed' }
  ];
  
  for (var c = 0; c < columnChecks.length; c++) {
    var col = columnChecks[c];
    var populated = 0;
    var empty = 0;
    
    for (var i = 0; i < dataRows.length; i++) {
      var value = String(dataRows[i][col.index] || '').trim();
      if (value) {
        populated++;
      } else {
        empty++;
      }
    }
    
    var pct = (populated / dataRows.length * 100).toFixed(1);
    var status = pct > 90 ? '✅' : pct > 50 ? '⚠️' : '❌';
    Logger.log('  ' + status + ' Column ' + col.index + ' (' + col.name + '): ' + populated + '/' + dataRows.length + ' (' + pct + '%)');
  }
  Logger.log('');
  
  // Sample first row
  Logger.log('📝 SAMPLE ROW (Row 4 - First Data Row):');
  if (dataRows.length > 0) {
    var sampleRow = dataRows[0];
    Logger.log('  Col 0 (Staff): ' + sampleRow[0]);
    Logger.log('  Col 1 (Submitted): ' + sampleRow[1]);
    Logger.log('  Col 2 (State): ' + sampleRow[2]);
    Logger.log('  Col 3 (District): ' + sampleRow[3]);
    Logger.log('  Col 7 (Unique ID): ' + sampleRow[7]);
    Logger.log('  Col 8 (Inmate Name): ' + sampleRow[8]);
    Logger.log('  Col 32 (Kobo UUID): ' + String(sampleRow[32]).substring(0, 50));
  }
  Logger.log('');
  
  // Recommendations
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('💡 RECOMMENDATIONS:');
  Logger.log('═══════════════════════════════════════════════════════════════');
  
  if (uniqueIdCount === dataRows.length) {
    Logger.log('✅ All rows have Unique ID - USE unique_id for sync');
  } else {
    Logger.log('⚠️ ' + uniqueIdEmpty + ' rows missing Unique ID');
  }
  
  if (koboUuidCount === dataRows.length) {
    Logger.log('✅ All rows have Kobo UUID - USE kobo_uuid for sync');
  } else {
    Logger.log('⚠️ Only ' + koboUuidCount + '/' + dataRows.length + ' rows have Kobo UUID');
    Logger.log('   → Recommend using unique_id instead');
  }
  
  if (duplicateUniqueIds.length > 0) {
    Logger.log('❌ CRITICAL: ' + duplicateUniqueIds.length + ' duplicate Unique IDs found!');
    Logger.log('   → Must fix duplicates before syncing');
  }
  
  Logger.log('');
  Logger.log('🎯 SYNC STRATEGY:');
  if (uniqueIdCount === dataRows.length && duplicateUniqueIds.length === 0) {
    Logger.log('✅ Use unique_id as primary identifier');
    Logger.log('✅ Add UNIQUE constraint: ALTER TABLE patients ADD CONSTRAINT patients_unique_id_key UNIQUE (unique_id);');
    Logger.log('✅ Expected sync count: ' + uniqueIdCount + ' records');
  } else if (koboUuidCount === dataRows.length && duplicateKoboUuids.length === 0) {
    Logger.log('✅ Use kobo_uuid as primary identifier');
    Logger.log('✅ Add UNIQUE constraint: ALTER TABLE patients ADD CONSTRAINT patients_kobo_uuid_key UNIQUE (kobo_uuid);');
    Logger.log('✅ Expected sync count: ' + koboUuidCount + ' records');
  } else {
    Logger.log('⚠️ Data quality issues detected - fix before syncing');
  }
  
  Logger.log('═══════════════════════════════════════════════════════════════');
}

/**
 * Add to menu
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Supabase Sync')
    .addItem('📤 Send All Data', 'sendAllDataToSupabase')
    .addItem('🧪 Test Sync (10 rows)', 'testSyncToSupabase')
    .addSeparator()
    .addItem('🔍 Diagnose Sheet Data', 'DIAGNOSE_SHEET_DATA')
    .addToUi();
}
