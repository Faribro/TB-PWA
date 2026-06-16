// =============================================================================
// SUPABASE CONFIG — Production Credentials
// =============================================================================
var SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';
var SUPABASE_TABLE = 'patients';
var SHEET_NAME = 'Patient Linelist_TB';
var DATA_START = 2; // First data row (after header)

// Column indices (0-based)
var COL_SERIAL = 0, COL_STAFF = 1, COL_SUBMITTED = 2, COL_STATE = 3;
var COL_DISTRICT = 4, COL_FACILITY = 5, COL_FAC_TYPE = 6, COL_SCREEN_DATE = 7;
var COL_UNIQUE_ID = 8, COL_NAME = 9, COL_DOB = 11, COL_AGE = 12;
var COL_XRAY = 16, COL_UUID = 32;

// =============================================================================
// REAL-TIME SYNC TRIGGER — Syncs on every edit
// =============================================================================
function onEdit(e) {
  if (!e || !e.range) return;
  
  var sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  
  var row = e.range.getRow();
  if (row < DATA_START) return; // Skip header
  
  try {
    syncRowToSupabase_(sheet, row);
  } catch(err) {
    Logger.log('onEdit sync error: ' + err.message);
  }
}

// =============================================================================
// SYNC SINGLE ROW — Called by onEdit trigger
// =============================================================================
function syncRowToSupabase_(sheet, rowNum) {
  var rowData = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
  var record = buildSupabaseRecord_(rowData);
  
  if (!record) {
    Logger.log('Row ' + rowNum + ' skipped (invalid data)');
    return;
  }
  
  var resp = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/' + SUPABASE_TABLE, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    payload: JSON.stringify(record),
    muteHttpExceptions: true
  });
  
  var code = resp.getResponseCode();
  if (code === 200 || code === 201) {
    Logger.log('Row ' + rowNum + ' synced successfully');
  } else {
    Logger.log('Row ' + rowNum + ' sync failed: ' + resp.getContentText());
  }
}

// =============================================================================
// MANUAL SYNC BUTTON — Sync current row or selection
// =============================================================================
function SYNC_TO_SUPABASE() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  var activeRange = sheet.getActiveRange();
  var startRow = activeRange.getRow();
  var numRows = activeRange.getNumRows();
  
  if (startRow < DATA_START) {
    ss.toast('Please select a data row (not header)', 'Invalid Selection', 3);
    return;
  }
  
  var synced = 0;
  var failed = 0;
  
  for (var i = 0; i < numRows; i++) {
    var row = startRow + i;
    try {
      syncRowToSupabase_(sheet, row);
      synced++;
    } catch(e) {
      failed++;
      Logger.log('Row ' + row + ' error: ' + e.message);
    }
  }
  
  ss.toast('Synced: ' + synced + ' | Failed: ' + failed, 'Sync Complete', 5);
}

// =============================================================================
// RECORD BUILDER — Sheet row → patients table
// =============================================================================
function buildSupabaseRecord_(row) {
  try {
    var name = String(row[COL_NAME] || '').trim();
    if (!name || name.toLowerCase() === 'test') return null;
    
    var uuidRaw = String(row[COL_UUID] || '').replace(/^uuid:/i, '').trim();
    
    return {
      staff_name: String(row[COL_STAFF] || '').trim() || null,
      submitted_on: parseSubmittedOnISO_(String(row[COL_SUBMITTED] || '')),
      screening_state: String(row[COL_STATE] || '').trim() || null,
      screening_district: String(row[COL_DISTRICT] || '').trim() || null,
      facility_name: String(row[COL_FACILITY] || '').trim() || null,
      facility_type: String(row[COL_FAC_TYPE] || '').trim() || null,
      screening_date: formatDateForSupabase_(row[COL_SCREEN_DATE]),
      unique_id: String(row[COL_UNIQUE_ID] || '').trim() || null,
      inmate_name: name,
      inmate_type: String(row[9] || '').trim() || null,
      father_husband_name: String(row[10] || '').trim() || null,
      date_of_birth: formatDateForSupabase_(row[COL_DOB]),
      age: parseInt(row[COL_AGE]) || null,
      sex: String(row[13] || '').trim() || null,
      contact_number: String(row[14] || '').trim() || null,
      address: String(row[15] || '').trim() || null,
      xray_result: String(row[COL_XRAY] || '').trim() || null,
      symptoms_10s: String(row[17] || '').trim() || null,
      tb_past_history: String(row[18] || '').trim() || null,
      referral_date: formatDateForSupabase_(row[19]),
      referred_facility: String(row[20] || '').trim() || null,
      tb_diagnosed: String(row[21] || '').trim() || null,
      tb_diagnosis_date: formatDateForSupabase_(row[22]),
      tb_type: String(row[23] || '').trim() || null,
      att_start_date: formatDateForSupabase_(row[24]),
      att_completion_date: formatDateForSupabase_(row[25]),
      hiv_status: String(row[26] || '').trim() || null,
      art_status: String(row[27] || '').trim() || null,
      art_number: String(row[28] || '').trim() || null,
      nikshay_abha_id: String(row[29] || '').trim() || null,
      registration_date: formatDateForSupabase_(row[30]),
      remarks: String(row[31] || '').trim() || null,
      kobo_uuid: isValidUUID_(uuidRaw) ? uuidRaw : null,
      kobo_id: String(row[33] || '').trim() || null,
      serial_number: String(row[COL_SERIAL] || '').trim() || null,
      latitude: parseFloat(row[35]) || null,
      longitude: parseFloat(row[36]) || null,
      synced_to_sheets: true,
      sheets_sync_attempts: 1
    };
  } catch(e) {
    Logger.log('buildSupabaseRecord_ error: ' + e.message);
    return null;
  }
}

// =============================================================================
// BULK SYNC — All records in optimized batches
// =============================================================================
function SUPABASE_SEND_ALL_RECORDS() {
  var BATCH_SIZE = 500;
  var GROUP_SIZE = 10;
  var SLEEP_MS = 300;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  var data = sheet.getRange(DATA_START, 1,
    sheet.getLastRow() - DATA_START + 1,
    sheet.getLastColumn()).getValues();
  
  var records = [];
  var skipped = 0;
  
  for (var i = 0; i < data.length; i++) {
    var rec = buildSupabaseRecord_(data[i]);
    if (rec) records.push(rec);
    else skipped++;
  }
  
  Logger.log('Valid: ' + records.length + ' | Skipped: ' + skipped);
  
  var batches = [];
  for (var b = 0; b < records.length; b += BATCH_SIZE) {
    batches.push(records.slice(b, b + BATCH_SIZE));
  }
  
  var totalInserted = 0, totalFailed = 0, t0 = Date.now();
  
  for (var g = 0; g < batches.length; g += GROUP_SIZE) {
    var group = batches.slice(g, g + GROUP_SIZE);
    var requests = group.map(function(batch) {
      return {
        url: SUPABASE_URL + '/rest/v1/' + SUPABASE_TABLE,
        method: 'post',
        contentType: 'application/json',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        payload: JSON.stringify(batch),
        muteHttpExceptions: true
      };
    });
    
    var responses = UrlFetchApp.fetchAll(requests);
    
    for (var r = 0; r < responses.length; r++) {
      var code = responses[r].getResponseCode();
      if (code === 200 || code === 201) {
        totalInserted += group[r].length;
      } else {
        totalFailed += group[r].length;
      }
    }
    
    if (g + GROUP_SIZE < batches.length) Utilities.sleep(SLEEP_MS);
  }
  
  var elapsed = Math.round((Date.now() - t0) / 1000);
  
  Logger.log('Inserted: ' + totalInserted + ' | Failed: ' + totalFailed + ' | Time: ' + elapsed + 's');
  ss.toast('Inserted: ' + totalInserted + ' | Failed: ' + totalFailed + ' | ' + elapsed + 's', 'Bulk Sync Complete', 10);
}

// =============================================================================
// TEST SINGLE RECORD
// =============================================================================
function SUPABASE_TEST_ONE_RECORD() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  var row = sheet.getRange(DATA_START, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  var record = buildSupabaseRecord_(row);
  if (!record) {
    Logger.log('Record build failed');
    return;
  }
  
  Logger.log('Record:\n' + JSON.stringify(record, null, 2));
  
  var resp = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/' + SUPABASE_TABLE, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    payload: JSON.stringify(record),
    muteHttpExceptions: true
  });
  
  var code = resp.getResponseCode();
  Logger.log('Response: ' + code + ' - ' + resp.getContentText().substring(0, 500));
  
  ss.toast(code === 201 ? 'Test record inserted!' : 'Test failed: ' + code, 'Test Result', 5);
}

// =============================================================================
// HELPERS
// =============================================================================
function formatDateForSupabase_(val) {
  if (!val) return null;
  try {
    var d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd');
  } catch(e) {
    return null;
  }
}

function parseSubmittedOnISO_(text) {
  if (!text) return null;
  var m = text.match(/(\d{2})\/(\d{2})\/(\d{2})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (m) {
    var yr = 2000 + parseInt(m[3]);
    var mo = parseInt(m[2]) - 1;
    var dy = parseInt(m[1]);
    var hr = parseInt(m[4]);
    var min = parseInt(m[5]);
    var ap = m[6].toUpperCase();
    if (ap === 'PM' && hr !== 12) hr += 12;
    if (ap === 'AM' && hr === 12) hr = 0;
    return new Date(yr, mo, dy, hr, min).toISOString();
  }
  return null;
}

function isValidUUID_(str) {
  return str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// =============================================================================
// MENU — Add custom menu on open
// =============================================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 Supabase Sync')
    .addItem('📤 Sync Selected Rows', 'SYNC_TO_SUPABASE')
    .addItem('🚀 Bulk Sync All Records', 'SUPABASE_SEND_ALL_RECORDS')
    .addItem('🧪 Test Single Record', 'SUPABASE_TEST_ONE_RECORD')
    .addSeparator()
    .addItem('⚙️ Setup Auto-Sync Trigger', 'setupAutoSyncTrigger')
    .addToUi();
}

// =============================================================================
// TRIGGER SETUP — Install onEdit trigger programmatically
// =============================================================================
function setupAutoSyncTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  
  // Remove existing onEdit triggers
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onEdit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Create new onEdit trigger
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
  
  SpreadsheetApp.getActiveSpreadsheet()
    .toast('Auto-sync trigger installed! Every edit will sync to Supabase.', 'Trigger Setup Complete', 5);
}
