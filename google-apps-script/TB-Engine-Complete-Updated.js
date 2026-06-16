/**
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * ðŸš€ TB INDUSTRIAL ENGINE v2.3 - PERFECT SYNC EDITION
 * - Added Column 1: Name of the Staff (With Triple Fallback Logic)
 * - Added Column 2: Formatted Submission Timestamp (Fixed UTC to IST)
 * - All other columns shifted by 2 positions (Total: 34 columns)
 * - CRITICAL FIX: bulkDelete separated into background trigger to prevent 
 * Kobo Webhook timeouts (Read timed out error resolved).
 * - EXPRESS LANE: doPost runs in milliseconds.
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 */

// -----------------------------
// GLOBAL CONFIGURATION
// -----------------------------
const CONF = {
  DATA_SHEET: 'Patient Linelist_TB',
  MASTER_SHEET: 'Master_Database_TB',
  LOG_SHEET: 'Deleted_Log',
  KOBO_ASSET_UID: 'aykaafTHUW8jwDrp365fUW',
  HEADER_ROW: 3
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SPOKE REGISTRY - Hub-and-Spoke Architecture
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const SPOKE_REGISTRY = {
  'MP': '1PrmSE3c8MO5OdFXWC1pdvclk-Yl3xqG50kt_tqvq0Zk',
  'Madhya Pradesh': '1PrmSE3c8MO5OdFXWC1pdvclk-Yl3xqG50kt_tqvq0Zk'
};

const STATE_CODE_MAP = {
  // PRIMARY: What Kobo sends (with underscores)
  "chandigarh": "CH",
  "dd___dnh": "DD",
  "goa": "GA",
  "gujarat": "GJ",
  "jammu_and_kashmir": "JK",
  "ladakh": "LD",
  "madhya_pradesh": "MP",
  "maharashtra": "MH",
  "manipur": "MN",
  "mizoram": "MZ",
  "mumbai": "MB",
  "uttarakhand": "UK",

  // FALLBACK: With spaces (manual entry compatibility)
  "dd & dnh": "DD",
  "dd and dnh": "DD",
  "jammu and kashmir": "JK",
  "madhya pradesh": "MP",

  // FALLBACK: Short codes
  "ch": "CH",
  "dd": "DD",
  "ga": "GA",
  "gj": "GJ",
  "jk": "JK",
  "ld": "LD",
  "mp": "MP",
  "mh": "MH",
  "mn": "MN",
  "mz": "MZ",
  "mb": "MB",
  "uk": "UK"
};

var PINCODE_CACHE = {};
var TRANSLATION_CACHE = {};

// -----------------------------
// UTIL: get API token
// -----------------------------
function getApiToken_() {
  try {
    var token = PropertiesService.getScriptProperties().getProperty('KOBO_API_TOKEN');
    if (!token) {
      throw new Error('KOBO_API_TOKEN not configured in Script Properties');
    }
    return token;
  } catch (e) {
    Logger.log('âŒ Token retrieval error: ' + e.message);
    return null;
  }
}

// =============================================================================
// 1. MAIN IMPORT (Safety Net - NO DELETION HERE)
// =============================================================================
function importKoboDataToRegister() {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) {
      Logger.log('Another import running');
      return { skipped: true };
    }

    var fetchResult = fetchAndFilterKoboData_();
    if (!fetchResult || !fetchResult.data || !fetchResult.data.length) {
      Logger.log('No new data');
      return { processed: 0 };
    }

    var results = fetchResult.data;
    var facilityCounters = getFacilityCountersFromProperties_();
    var mappings = getMappings_();
    var outputRows = [];

    for (var i = 0; i < results.length; i++) {
      try {
        var r = processSingleRow_(results[i], mappings, facilityCounters, {});
        if (r && r.length >= 37) outputRows.push(r);
      } catch (err) {
        Logger.log('Row ' + i + ' error: ' + err.message);
      }
    }

    if (outputRows.length === 0) {
      Logger.log('No valid rows');
      return { processed: 0 };
    }

    saveFacilityCountersToProperties_(facilityCounters);

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Write to Master DB
    var master = ss.getSheetByName(CONF.MASTER_SHEET);
    if (!master) {
      master = ss.insertSheet(CONF.MASTER_SHEET);
      master.hideSheet();
      master.getRange(1, 1, 1, 37).setValues([getHeaders_()]);
    }
    master.getRange(master.getLastRow() + 1, 1, outputRows.length, 37).setValues(outputRows);

    // Write to working sheet (FIX Bug #3: Write all 37 columns, not 35)
    var sheet = ss.getSheetByName(CONF.DATA_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(CONF.DATA_SHEET);
      sheet.getRange(CONF.HEADER_ROW, 1, 1, 37).setValues([getHeaders_()]);
    }
    var numCols = getHeaders_().length; // = 37
    sheet.getRange(sheet.getLastRow() + 1, 1, outputRows.length, numCols).setValues(outputRows);

    // Sync new rows to Supabase via Next.js relay
    try {
      var syncOptions = {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-kobo-webhook-secret': 'alliance_kobo_secure_2026' },
        payload: JSON.stringify({ rows: outputRows, source: 'import' }),
        muteHttpExceptions: true,
        timeout: 30000
      };
      var syncRes = UrlFetchApp.fetch(
        'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase',
        syncOptions
      );
      console.log('Supabase sync response: ' + syncRes.getResponseCode());
    } catch(syncErr) {
      console.warn('Supabase sync failed (sheet data is safe): ' + syncErr.message);
    }

    SpreadsheetApp.flush();
    
    // Update sync cursor so next run only fetches NEW records
    PropertiesService.getScriptProperties().setProperty(
      'LAST_KOBO_SYNC_TIME', 
      new Date().toISOString()
    );
    console.log('LAST_KOBO_SYNC_TIME updated: ' + new Date().toISOString());
    
    Logger.log('âœ… Added ' + outputRows.length + ' rows');
    return { processed: outputRows.length };

  } finally {
    if (lock) lock.releaseLock();
  }
}

// Ultra-fast caches
var SHEET_CACHE = {};
var MAPPINGS_CACHE = null;
var LAST_ROW_CACHE = 0;
var LAST_ROW_TIME = 0;

// =============================================================================
// 1B. BACKGROUND KOBO CLEANUP (Run via Time-Driven Trigger)
// =============================================================================
// =============================================================================
// 2. MASTER DB MANAGEMENT
// =============================================================================
/**
 * âœ… OPTIMIZED: Batch formatting for appended rows
 */
function appendNewRowsToWorkingSheet_(newRows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONF.DATA_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONF.DATA_SHEET);
    var headers = getHeaders_();
    var hRange = sheet.getRange(CONF.HEADER_ROW, 1, 1, headers.length);
    hRange.setValues([headers])
      .setFontWeight('bold')
      .setBackground('#4472C4')
      .setFontColor('white')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setTextRotation(90);
    sheet.setRowHeight(CONF.HEADER_ROW, 180);
    sheet.setFrozenRows(CONF.HEADER_ROW);
  }

  var blacklist = getBlacklistedUUIDs_();
  var toAppend = [];

  for (var i = 0; i < newRows.length; i++) {
    var row = newRows[i];
    var uuid = String(row[32] || '').trim();
    if (!uuid || blacklist.has(uuid)) continue;
    toAppend.push(row);
  }

  if (toAppend.length === 0) {
    console.log('No new rows to append after filtering.');
    return;
  }

  var lastRow = sheet.getLastRow();
  var startRow = lastRow + 1;
  var numCols = getHeaders_().length;

  sheet.getRange(startRow, 1, toAppend.length, numCols).setValues(toAppend);

  var newRange = sheet.getRange(startRow, 1, toAppend.length, numCols);
  newRange
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setFontFamily('Arial')
    .setFontSize(10)
    .setWrap(true);

  sheet.setRowHeights(startRow, toAppend.length, 35);

  // âœ… BATCH: Date formatting dynamically from headers
  var dateCols = [];
  var heads = getHeaders_();
  for (var hi = 0; hi < heads.length; hi++) {
    if (String(heads[hi] || '').toLowerCase().indexOf('date') > -1) {
      dateCols.push(hi + 1);
    }
  }
  if (dateCols.length === 0) dateCols = [7, 12, 20, 23, 25, 26, 31];

  dateCols.forEach(function (col) {
    try {
      sheet.getRange(startRow, col, toAppend.length, 1).setNumberFormat('dd/MM/yyyy');
    } catch (e) { }
  });

  // Hide UUID and ID columns (33, 34)
  try {
    sheet.hideColumns(33, 2);
  } catch (e) { }

  // âœ… BATCH: Alternating backgrounds using 2D array
  var bgColors = [];
  for (var r = 0; r < toAppend.length; r++) {
    var absRow = startRow + r;
    var bg = (absRow % 2 === 0) ? null : '#F5F5F5';
    bgColors.push(new Array(numCols).fill(bg));
  }
  newRange.setBackgrounds(bgColors);

  newRange.setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);

  console.log(' Appended ' + toAppend.length + ' new rows to working sheet.');

  try {
    ss.toast('âœ… ' + toAppend.length + ' new record(s) added!', 'Data Updated', 3);
  } catch (e) { }
}

// =============================================================================
// 3. KOBO FETCH + BULK DELETE
// =============================================================================
function getProcessedUUIDs_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var set = new Set();

  var master = ss.getSheetByName(CONF.MASTER_SHEET);
  if (master && master.getLastRow() > 1) {
    var masterData = master.getRange(2, 33, master.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < masterData.length; i++) {
      var id = String(masterData[i][0] || '').trim();
      if (id) set.add(id);
    }
  }

  var log = ss.getSheetByName(CONF.LOG_SHEET);
  if (log && log.getLastRow() > 1) {
    var logData = log.getRange(2, 5, log.getLastRow() - 1, 1).getValues();
    for (var j = 0; j < logData.length; j++) {
      var id = String(logData[j][0] || '').trim();
      if (id) set.add(id);
    }
  }
  return set;
}

function fetchAndFilterKoboData_() {
  var token = getApiToken_();
  if (!token) throw new Error('Token missing');

  // Paginated fetch: 1000 records per page
  var baseUrl = 'https://kf.kobotoolbox.org/api/v2/assets/' + CONF.KOBO_ASSET_UID + '/data.json';
  var pageSize = 1000;
  var offset = 0;
  var results = [];
  var totalCount = null;

  while (true) {
    var url = baseUrl + '?limit=' + pageSize + '&offset=' + offset;
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: 'Token ' + token },
      muteHttpExceptions: true,
      timeout: 60
    });

    if (res.getResponseCode() !== 200) {
      throw new Error('API error: ' + res.getResponseCode());
    }

    var json = JSON.parse(res.getContentText());
    var pageResults = Array.isArray(json.results) ? json.results : [];

    if (totalCount === null) {
      totalCount = json.count || 0;
      Logger.log('Total Kobo records reported: ' + totalCount);
    }

    if (pageResults.length === 0) break;

    results = results.concat(pageResults);
    Logger.log('Fetched page at offset=' + offset + ', got ' + pageResults.length + ' records (cumulative: ' + results.length + ')');

    offset += pageSize;
    if (results.length >= totalCount) break;
  }

  Logger.log('Total records fetched: ' + results.length);

  results.sort(function (a, b) {
    return new Date(a._submission_time) - new Date(b._submission_time);
  });

  var processedSet = getProcessedUUIDs_();
  var valid = [];

  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    var uuid = r._uuid || r.uuid;
    if (!uuid) continue;
    if (processedSet.has(String(uuid).trim())) continue;
    valid.push(r);
  }

  Logger.log('New records after filter: ' + valid.length);
  return { data: valid };
}

function getBlacklistedUUIDs_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = ss.getSheetByName(CONF.LOG_SHEET);
  var set = new Set();
  if (log && log.getLastRow() > 1) {
    var vals = log.getRange(2, 5, log.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < vals.length; i++) {
      var id = String(vals[i][0] || '').trim();
      if (id) set.add(id);
    }
  }
  return set;
}

// =============================================================================
// 4. SHEET WRITE / FORMAT
// =============================================================================
/**
 * âœ… OPTIMIZED: Batch formatting - single operation instead of row-by-row
 */
// =============================================================================
// 5. ROW MAPPING (Kobo JSON â†’ 34 columns)
// =============================================================================
function getHeaders_() {
  return [
    'Name of the Staff',
    'Submitted On',
    'State',
    'District',
    'Facility Name',
    'Facility type',
    'Date of Screening - CH-x ray (dd/mm/yy)',
    'Unique ID',
    'Inmate Name',
    'Inmate type (Under Trial/Convicted/Other)',
    "Father /Husband's Name",
    'Date of Birth',
    'Age',
    'Sex (Male/Female/TG)',
    'Contact Number',
    'Address',
    'Chest x ray Result (Abnormal/Normal/Not-detected)',
    '10s Symptoms Present? (You can select more than one symptoms)',
    'Whether any past history of TB? (Y/N)',
    'Date of referral for TB Examination (sputum) (dd/mm/yy)',
    'Name of facility where referred to (Give code/name of all facilities)',
    'TB diagnosed (Y/N)',
    'Date of TB Diagnosed (dd/mm/yy)',
    'Type of TB Diagnosed (P/EP)',
    'Date of starting ATT (dd/mm/yyyy)',
    'Date of Treatment Completion (dd/mm/yyyy)',
    'HIV Status (Positive/Negative/Unknown)',
    'Status at the time of referral (Pre ART/On ART) [If on ART at time of referral]',
    'ART Number (if on ART at the time of referral)',
    'NIKSHAY/ABHA ID',
    'Date of registration (dd/mm/yyyy)',
    'Remarks',
    'KoboUUID(hidden)',
    'KoboID(hidden)',
    'Serial Number',
    'Latitude',
    'Longitude'
  ];
}

// Cache for facility counters
var FC_CACHE = null;
var FC_CACHE_TIME = 0;

function getFacilityCountersFromProperties_() {
  var now = Date.now();
  if (FC_CACHE && (now - FC_CACHE_TIME) < 60000) return FC_CACHE; // 1 min cache
  
  var props = PropertiesService.getScriptProperties();
  var counters = {};
  var allProps = props.getProperties();

  for (var key in allProps) {
    if (key.indexOf('FAC_COUNTER_') === 0) {
      var code = key.replace('FAC_COUNTER_', '');
      counters[code] = parseInt(allProps[key], 10) || 0;
    }
  }
  
  FC_CACHE = counters;
  FC_CACHE_TIME = now;
  return counters;
}

function saveFacilityCountersToProperties_(counters) {
  var props = PropertiesService.getScriptProperties();
  var updates = {};
  for (var code in counters) {
    updates['FAC_COUNTER_' + code] = String(counters[code]);
  }
  props.setProperties(updates);
}

/**
 * ðŸ•’ FIXED: Force UTC to IST Conversion
 */
function formatSubmissionTimestamp_(isoTimestamp) {
  if (!isoTimestamp) return '';
  try {
    // 1. Clean the string and ensure it is treated as UTC (Zulu time)
    var cleanIso = isoTimestamp.replace(' ', 'T');
    if (cleanIso.indexOf('Z') === -1 && cleanIso.indexOf('+') === -1) {
      cleanIso += 'Z';
    }

    var date = new Date(cleanIso);
    if (isNaN(date.getTime())) return isoTimestamp;

    // 2. Use Google's internal formatter to force Asia/Kolkata
    return 'Submitted on ' + Utilities.formatDate(date, "Asia/Kolkata", "dd/MM/yy 'at' h:mm a 'IST'");
  } catch (e) {
    console.error('Timestamp Error: ' + e);
    return isoTimestamp;
  }
}

function processSingleRow_(row, m, facilityCounters, preserveMap) {
  var entry = [];

  function getField(obj, keys) {
    if (!obj) return "";
    for (var i = 0; i < keys.length; i++) {
      if (obj[keys[i]] !== undefined) return obj[keys[i]];
    }
    return "";
  }

  // CONSENT CHECK: Skip records where consent was declined
  var consentObtained = getField(row, ['grp_consent/consent_obtained', 'consent_obtained']);
  if (consentObtained === 'no' || consentObtained === 'No' || consentObtained === 'NO') {
    Logger.log('⚠️ Skipping record - consent declined: ' + (row._uuid || row.uuid));
    return null; // Return null to indicate this row should be skipped
  }

  // Column 0: Staff Name (4-way fallback)
  var staffName = getField(row, ['grp_screening/staff_name', 'staff_name', 'grp_screening/Name_of_the_Staff', 'Name_of_the_Staff']) ||
    getField(row, ['username', '_submitted_by']) ||
    "System Entry";
  entry.push(toProperCase_(staffName));

  // Column 1: Formatted Timestamp
  entry.push(formatSubmissionTimestamp_(getField(row, ['_submission_time'])));

  // Column 2: State (4-way fallback)
  var stateRaw = getField(row, ['grp_screening/screening_state', 'screening_state', 'grp_screening/State', 'State']);
  var stateNorm = String(stateRaw || "").toLowerCase().trim();
  var stateDisplay = m.stateMapping[stateNorm] || stateRaw;
  entry.push(translateMemoized_(stateDisplay));

  // Column 3: District (4-way fallback)
  var districtRaw = getField(row, ['grp_screening/screening_district', 'screening_district', 'grp_screening/District', 'District']);
  entry.push(translateMemoized_(districtRaw));

  // Column 4: Facility Name (4-way fallback)
  var facRaw = getField(row, ['grp_screening/facility_code', 'facility_code', 'grp_screening/facility_name', 'facility_name']);
  var facLabel = m.facilityNameMap[facRaw] || m.facilityNameMap[String(facRaw).toUpperCase()] || facRaw || "Unknown";
  entry.push(facLabel);

  // Column 5: Facility Type (4-way fallback)
  var facType = String(getField(row, ['grp_screening/facility_type', 'facility_type', 'grp_screening/Facility_type', 'Facility_type'])).toLowerCase();
  entry.push(m.facilityTypeMapping[facType] || facType);

  // Column 6: Screening Date (4-way fallback)
  entry.push(toDDMMYYYY_(getField(row, ['grp_screening/screening_date', 'screening_date', 'grp_screening/Date_of_Screening_CH_x_ray_dd_mm_yy', 'Date_of_Screening_CH_x_ray_dd_mm_yy'])));

  // Column 7: Unique ID - Always generate sequential (ignore Kobo's ID)
  var stateStr = String(stateRaw || "").toLowerCase().trim();
  var stateNorm1 = stateStr.replace(/\s+/g, '_');
  var stateNorm2 = stateStr;
  var stateNorm3 = stateStr.substring(0, 2);

  var sCode = STATE_CODE_MAP[stateNorm1] || STATE_CODE_MAP[stateNorm2] || STATE_CODE_MAP[stateNorm3] || 'XX';
  var dCode = String(districtRaw || "XX").substring(0, 2).toUpperCase();
  var fCode = m.facilityCodeMap[facLabel] || 'UNK';

  facilityCounters[fCode] = (facilityCounters[fCode] || 0) + 1;
  var seq = ('00000' + facilityCounters[fCode]).slice(-5);
  var newID = sCode + dCode + fCode + seq;
  entry.push(newID);

  // Column 8: Inmate Name (4-way fallback)
  entry.push(toProperCase_(getField(row, ['grp_identity/inmate_name', 'inmate_name', 'grp_identity/Inmate_Name', 'Inmate_Name'])));

  // Column 9: Inmate Type (4-way fallback)
  entry.push(m.inmateTypeMapping[getField(row, ['grp_identity/inmate_type', 'inmate_type', 'grp_identity/Inmate_type_Under_Trial_Convicted_Other', 'Inmate_type_Under_Trial_Convicted_Other'])] || "Other");

  // Column 10: Father/Husband Name (4-way fallback)
  entry.push(toProperCase_(getField(row, ['grp_identity/father_husband_name', 'father_husband_name', 'grp_identity/Father_Husband_s_Name', 'Father_Husband_s_Name'])));

  // Column 11: Date of Birth (4-way fallback)
  entry.push(toDDMMYYYY_(getField(row, ['grp_demo/date_of_birth', 'date_of_birth', 'grp_demo/Date_of_Birth', 'Date_of_Birth'])));

  // Column 12: Age (4-way fallback)
  entry.push(getField(row, ['grp_demo/age', 'age']));

  // Column 13: Sex (4-way fallback)
  var sexRaw = String(getField(row, ['grp_demo/sex', 'sex', 'grp_demo/Sex_Male_Female_TG', 'Sex_Male_Female_TG'])).toLowerCase();
  entry.push(m.sexMapping[sexRaw] || sexRaw);

  // Column 14: Contact Number (4-way fallback)
  entry.push(getField(row, ['grp_demo/contact_number', 'contact_number', 'grp_demo/Contact_Number', 'Contact_Number']));

  // Column 15: Address (4-way fallback for each component)
  var addr = [
    getField(row, ['grp_address/address_block_house', 'address_block_house', 'grp_address/Block_House_no', 'Block_House_no']),
    getField(row, ['grp_address/address_street', 'address_street', 'grp_address/Street_Locality_Name', 'Street_Locality_Name']),
    getField(row, ['grp_address/address_city', 'address_city', 'grp_address/City', 'City']),
    getField(row, ['grp_address/address_district', 'address_district', 'grp_address/inmate_district_india', 'inmate_district_india']),
    getField(row, ['grp_address/address_state', 'address_state', 'grp_address/inmate_state_india', 'inmate_state_india']),
    getField(row, ['grp_address/address_country', 'address_country', 'grp_address/inmate_country', 'inmate_country']),
    getField(row, ['grp_address/address_pin_code', 'address_pin_code', 'grp_address/Pin_Code', 'Pin_Code'])
  ].filter(Boolean).join(", ");
  entry.push(addr);

  // Column 16: X-Ray Result (4-way fallback)
  var cxr = getField(row, ['grp_tb/xray_result', 'xray_result', 'grp_tb/Chest_x_ray_Result_Active_Lat', 'Chest_x_ray_Result_Active_Lat']).toString().trim();
  entry.push(m.chestXrayMapping[cxr.toLowerCase()] || cxr);

  // Column 17: Symptoms (4-way fallback)
  var symRaw = getField(row, ['grp_tb/symptoms_10s', 'symptoms_10s', 'grp_tb/_10s_Symptoms_Present_You_can', '_10s_Symptoms_Present_You_can']);
  if (!symRaw || symRaw === '') {
    entry.push("");
  } else {
    var symptoms = [];
    if (typeof symRaw === 'string') {
      symRaw = symRaw.trim();
      if (symRaw.indexOf(',') > -1) {
        var parts = symRaw.split(',');
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i].trim();
          var keyUnderscore = part.toLowerCase().replace(/\s+/g, '_');
          var keyDirect = part.toLowerCase().trim();
          if (m.symptomsCodeMapping[keyUnderscore]) {
            symptoms.push(m.symptomsCodeMapping[keyUnderscore]);
          } else if (m.symptomsCodeMapping[keyDirect]) {
            symptoms.push(m.symptomsCodeMapping[keyDirect]);
          } else {
            symptoms.push(part);
          }
        }
      } else if (symRaw.indexOf('_') > -1 && symRaw.indexOf(' ') > -1) {
        var codes = symRaw.split(/\s+/);
        for (var j = 0; j < codes.length; j++) {
          var key = codes[j].toLowerCase().trim();
          symptoms.push(m.symptomsCodeMapping[key] || codes[j]);
        }
      } else {
        var keyUnderscore = symRaw.toLowerCase().replace(/\s+/g, '_');
        var keyDirect = symRaw.toLowerCase().trim();
        if (m.symptomsCodeMapping[keyUnderscore]) {
          symptoms.push(m.symptomsCodeMapping[keyUnderscore]);
        } else if (m.symptomsCodeMapping[keyDirect]) {
          symptoms.push(m.symptomsCodeMapping[keyDirect]);
        } else {
          symptoms.push(symRaw);
        }
      }
    } else if (Array.isArray(symRaw)) {
      for (var k = 0; k < symRaw.length; k++) {
        var item = String(symRaw[k]).trim();
        var keyUnderscore = item.toLowerCase().replace(/\s+/g, '_');
        var keyDirect = item.toLowerCase().trim();
        if (m.symptomsCodeMapping[keyUnderscore]) {
          symptoms.push(m.symptomsCodeMapping[keyUnderscore]);
        } else if (m.symptomsCodeMapping[keyDirect]) {
          symptoms.push(m.symptomsCodeMapping[keyDirect]);
        } else {
          symptoms.push(item);
        }
      }
    }
    var uniqueSymptoms = [];
    for (var s = 0; s < symptoms.length; s++) {
      if (symptoms[s] && uniqueSymptoms.indexOf(symptoms[s]) === -1) {
        uniqueSymptoms.push(symptoms[s]);
      }
    }
    entry.push(uniqueSymptoms.join(", "));
  }

  // Column 18: TB Past History (4-way fallback)
  entry.push(m.yesNoMapping[getField(row, ['grp_tb/tb_past_history', 'tb_past_history', 'grp_tb/Whether_any_past_history_of_TB_Y_N', 'Whether_any_past_history_of_TB_Y_N'])] || "No");

  // Column 19: Referral Date (4-way fallback)
  entry.push(toDDMMYYYY_(getField(row, ['grp_referral/referral_date', 'referral_date', 'grp_referral/Date_of_referral_for_ion_sputum_dd_mm_yy', 'Date_of_referral_for_ion_sputum_dd_mm_yy'])));

  // Column 20: Referred Facility (4-way fallback)
  entry.push(m.referredFacilityMapping[getField(row, ['grp_referral/referred_facility', 'referred_facility', 'grp_referral/Name_of_facility_whe_me_of_all_facilities', 'Name_of_facility_whe_me_of_all_facilities'])] || "");

  // Column 21: TB Diagnosed (4-way fallback)
  entry.push(m.yesNoMapping[getField(row, ['grp_referral/tb_diagnosed', 'tb_diagnosed', 'grp_referral/TB_diagnosed', 'TB_diagnosed'])] || "No");

  // Column 22: Diagnosis Date (4-way fallback)
  entry.push(toDDMMYYYY_(getField(row, ['grp_referral/tb_diagnosis_date', 'tb_diagnosis_date', 'grp_referral/Date_of_TB_Diagnosed_dd_mm_yy', 'Date_of_TB_Diagnosed_dd_mm_yy'])));

  // Column 23: TB Type (4-way fallback)
  entry.push(m.tbTypeMapping[getField(row, ['grp_referral/tb_type', 'tb_type', 'grp_referral/Type_of_TB_Diagnosed_P_EP', 'Type_of_TB_Diagnosed_P_EP'])] || "");

  // Column 24: ATT Start Date (4-way fallback)
  entry.push(toDDMMYYYY_(getField(row, ['grp_referral/att_start_date', 'att_start_date', 'grp_referral/Date_of_starting_ATT_dd_mm_yyyy', 'Date_of_starting_ATT_dd_mm_yyyy'])));

  // Column 25: ATT Completion Date (4-way fallback)
  entry.push(toDDMMYYYY_(getField(row, ['grp_referral/att_completion_date', 'att_completion_date', 'grp_referral/Date_of_Treatment_Completion_dd_mm_yyyy', 'Date_of_Treatment_Completion_dd_mm_yyyy'])));

  // Column 26: HIV Status (4-way fallback)
  entry.push(m.hivMapping[getField(row, ['grp_hiv/hiv_status', 'hiv_status', 'grp_hiv/HIV_Status_Positive_Negative_', 'HIV_Status_Positive_Negative_'])] || "Unknown");

  // Column 27: ART Status (4-way fallback)
  entry.push(m.artStatusMapping[getField(row, ['grp_hiv/art_status_at_referral', 'art_status_at_referral', 'grp_hiv/Status_at_the_time_o_at_time_of_referral', 'Status_at_the_time_o_at_time_of_referral'])] || "");

  // Column 28: ART Number (4-way fallback)
  entry.push(String(getField(row, ['grp_hiv/art_number', 'art_number', 'grp_hiv/ART_Number_if_on_ART_the_time_of_referral', 'ART_Number_if_on_ART_the_time_of_referral'])).toUpperCase());

  // Column 29: Nikshay ID (4-way fallback)
  entry.push(String(getField(row, ['grp_reg/nikshay_abha_id', 'nikshay_abha_id', 'grp_reg/NIKSHAY_ABHA_ID', 'NIKSHAY_ABHA_ID'])).toUpperCase());

  // Column 30: Nikshay Registration Date (4-way fallback)
  entry.push(toDDMMYYYY_(getField(row, ['grp_reg/nikshay_registration_date', 'nikshay_registration_date', 'grp_reg/Date_of_registration_dd_mm_yyyy', 'Date_of_registration_dd_mm_yyyy'])));

  // Column 31: Remarks (4-way fallback)
  entry.push(getField(row, ['grp_reg/remarks', 'remarks', 'grp_reg/Remarks', 'Remarks']));

  // Column 32: KoboUUID
  entry.push(row._uuid || row.uuid || "");

  // Column 33: KoboID
  entry.push(row._id || row.id || "");

  // Column 34: Serial Number (4-way fallback)
  entry.push(getField(row, ['grp_screening/Serial_Number', 'Serial_Number', 'grp_screening/SERIAL_NUMBER', 'SERIAL_NUMBER']));

  // Column 35: Latitude (GPS extraction)
  var geo = row._geolocation || [];
  var lat = geo[0] ? parseFloat(geo[0]) : null;
  entry.push(lat);

  // Column 36: Longitude (GPS extraction)
  var lng = geo[1] ? parseFloat(geo[1]) : null;
  entry.push(lng);

  return entry;
}

// =============================================================================
// 6. MAPPINGS + HELPERS
// =============================================================================
function getMappings_() {
  return {
    facilityNameMap: {
      'SJ': 'Sub Jail', 'CJ': 'Central Jail', 'DJ': 'District Jail', 'SPJ': 'Special Jail', 'OJ': 'Open Jail',
      'BJ': 'Borstal Jail', 'WJ': 'Women Jail', 'OTJ': 'Other Jail', 'OT': 'Others', 'SS': 'Shakti Sadan',
      'SG': 'Swadhar Greh', 'UH': 'Ujjawala Home', 'NN': 'Nari Niketan', 'OSC': 'One Stope Center',
      'OSRH': 'Other State Run Home', 'JHCCI': 'Juvenile Homes & CCI', 'DDRC': 'DDRC/DDAC/Pvt. DAC',
      'Central Jail': 'Central Jail', 'District Jail': 'District Jail', 'Sub Jail': 'Sub Jail',
      'Special Jail': 'Special Jail', 'Open Jail': 'Open Jail', 'Borstal Jail': 'Borstal Jail',
      'Women Jail': 'Women Jail', 'Other Jail': 'Other Jail', 'Others': 'Others', 'Shakti Sadan': 'Shakti Sadan',
      'Swadhar Greh': 'Swadhar Greh', 'Ujjawala Home': 'Ujjawala Home', 'Nari Niketan': 'Nari Niketan',
      'One Stope Center': 'One Stope Center', 'Other State Run Home': 'Other State Run Home',
      'Juvenile Homes & CCI': 'Juvenile Homes & CCI', 'DDRC/DDAC/Pvt. DAC': 'DDRC/DDAC/Pvt. DAC'
    },
    facilityCodeMap: {
      'Central Jail': 'CJ', 'District Jail': 'DJ', 'Sub Jail': 'SJ', 'Special Jail': 'SPJ', 'Open Jail': 'OJ',
      'Borstal Jail': 'BJ', 'Women Jail': 'WJ', 'Other Jail': 'OTJ', 'Others': 'OT', 'Shakti Sadan': 'SS',
      'Swadhar Greh': 'SG', 'Ujjawala Home': 'UH', 'Nari Niketan': 'NN', 'One Stope Center': 'OSC',
      'Other State Run Home': 'OSRH', 'Juvenile Homes & CCI': 'JHCCI', 'DDRC/DDAC/Pvt. DAC': 'DDRC'
    },
    facilityTypeMapping: {
      'prison': 'Prison', 'other_closed_setting': 'Other Closed Setting', 'jh_cci': 'JH-CCI', 'ddrc': 'DDRC'
    },
    stateMapping: {
      'chandigarh': 'Chandigarh', 'dd___dnh': 'DD & DNH', 'goa': 'Goa', 'gujarat': 'Gujarat',
      'jammu_and_kashmir': 'Jammu and Kashmir', 'ladakh': 'Ladakh', 'madhya_pradesh': 'Madhya Pradesh',
      'maharashtra': 'Maharashtra', 'mumbai': 'Mumbai', 'uttarakhand': 'Uttarakhand',
      'mizoram': 'Mizoram', 'manipur': 'Manipur'
    },
    chestXrayMapping: {
      'suspected tb case': 'Suspected TB CASE',
      'abnormal': 'ABNORMAL - (REQUIRED FURTHER INVESTIGATION)',
      'normal': 'NORMAL',
      'suspected_tb_case': 'Suspected TB CASE',
      'not_detected': 'NORMAL',
      'not-detected': 'NORMAL',
      'a': 'ABNORMAL - (REQUIRED FURTHER INVESTIGATION)',
      'active': 'ABNORMAL - (REQUIRED FURTHER INVESTIGATION)',
      'l': 'NORMAL',
      'latent': 'NORMAL'
    },
    tbTypeMapping: {
      'pulmonary': 'Pulmonary', 'extrapulmonary': 'Extrapulmonary',
      'Pulmonary_tuberculosis_(PTB)': 'Pulmonary', 'Extrapulmonary_tuberculosis_(EPTB)': 'Extrapulmonary'
    },
    inmateTypeMapping: { 'under_trial': 'Under Trial', 'convicted': 'Convicted', 'other': 'Other' },
    sexMapping: { 'male': 'Male', 'female': 'Female', 'tg': 'TG' },
    referredFacilityMapping: {
      'dmc_designated_microscopy_centre': 'DMC-Designated Microscopy Centre',
      'tdc_tb_diagnostic_centre': 'TDC-TB Diagnostic Centre', 'cbnaat': 'CBNAAT',
      'dst_drug_susceptibility_testing': 'DST-Drug Susceptibility Testing',
      'radiology': 'Radiology', 'histopathology': 'Histopathology', 'art_centre': 'ART Centre',
      'pvt____others': 'Pvt. & Others', 'others': 'Others'
    },
    symptomsCodeMapping: {
      'no_symptomps': 'No Symptoms',
      'cough_of_any_duration': 'Cough of any duration',
      'haemoptysis': 'Haemoptysis',
      'chest_pain': 'Chest Pain',
      'fever': 'Fever',
      'night_sweats': 'Night Sweats',
      'loss_of_appetite': 'Loss of Appetite',
      'weight_loss': 'Weight Loss',
      'weight_loss_2': 'Weight Loss',
      'dyspnoea': 'Dyspnoea',
      'dyspnea': 'Dyspnoea',
      'fatigue': 'Fatigue',
      'reduced_physical_activity': 'Reduced Physical Activity',
      'lymph_nodes': 'Lymph Nodes',
      'no_symptoms': 'No Symptoms',
      'anorexia': 'Loss of Appetite',
      'others': 'Others',
      'others:_specify': 'Others',
      'others: specify': 'Others',

      'cough of any duration': 'Cough of any duration',
      'haemoptysis': 'Haemoptysis',
      'chest pain': 'Chest Pain',
      'fever': 'Fever',
      'night sweats': 'Night Sweats',
      'loss of appetite': 'Loss of Appetite',
      'weight loss': 'Weight Loss',
      'dyspnoea': 'Dyspnoea',
      'fatigue': 'Fatigue',
      'reduced physical activity': 'Reduced Physical Activity',
      'lymph nodes': 'Lymph Nodes',
      'no symptoms': 'No Symptoms',

      'cough': 'Cough of any duration',
      'rpa': 'Reduced Physical Activity',
      'wl': 'Weight Loss',
      'cp': 'Chest Pain'
    },
    yesNoMapping: { 'yes': 'Yes', 'no': 'No', '1': 'Yes', '0': 'No', 'unknown': 'Unknown' },
    hivMapping: { 'positive': 'Positive', 'negative': 'Negative', 'unknown': 'Unknown' },
    artStatusMapping: { 'pre_art': 'Pre ART', 'on_art': 'On ART' }
  };
}

function translateMemoized_(text) {
  if (!text) return '';
  var t = String(text).trim();
  if (!t) return '';
  if (t.length > 500 || /^[\x00-\x7F]*$/.test(t)) return t;
  if (TRANSLATION_CACHE[t]) return TRANSLATION_CACHE[t];
  try {
    var out = LanguageApp.translate(t, '', 'en').trim();
    TRANSLATION_CACHE[t] = out;
    return out;
  } catch (e) {
    TRANSLATION_CACHE[t] = t;
    return t;
  }
}

function toDDMMYYYY_(val) {
  if (!val) return '';
  var d = (val instanceof Date) ? val : new Date(String(val));
  if (isNaN(d.getTime())) {
    // Fallback: try regex for YYYY-MM-DD strings
    var m = String(val).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return m[3] + '/' + m[2] + '/' + m[1];
    if (String(val).match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) return String(val);
    return String(val);
  }
  var dd = ('0' + d.getDate()).slice(-2);
  var mm = ('0' + (d.getMonth() + 1)).slice(-2);
  var yyyy = d.getFullYear();
  return dd + '/' + mm + '/' + yyyy;
}

function toProperCase_(s) {
  if (!s) return '';
  return String(s).toLowerCase().replace(/\b(\w)/g, function (m) { return m.toUpperCase(); });
}

// =============================================================================
// 7. GRAVEYARD HELPER FOR SAFE DELETE
// =============================================================================
// =============================================================================
// 9. EXCEL BACKUP SYSTEM
// =============================================================================
function generateDailyExcelBackup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('BACKUP_FOLDER_ID');

  if (!folderId) {
    console.error('âš ï¸ BACKUP_FOLDER_ID not set in Script Properties.');
    return;
  }

  try {
    var folder = DriveApp.getFolderById(folderId);
    var url = "https://docs.google.com/spreadsheets/d/" + ss.getId() + "/export?format=xlsx";
    var token = ScriptApp.getOAuthToken();

    var response = UrlFetchApp.fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      var timestamp = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd_HH-mm");
      var fileName = "TB_Full_Backup_" + timestamp + ".xlsx";
      var file = folder.createFile(response.getBlob()).setName(fileName);

      console.log('âœ… Excel Backup Created: ' + fileName);
      cleanOldBackups_(folder);
      return file.getId();
    } else {
      console.error('âŒ Export failed with status: ' + response.getResponseCode());
    }
  } catch (e) {
    console.error('âŒ Excel Backup Error: ' + e.toString());
  }
}

function cleanOldBackups_(folder) {
  try {
    var files = folder.getFiles();
    var thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    var deleted = 0;

    while (files.hasNext()) {
      var file = files.next();
      var fileName = file.getName();

      if (fileName.indexOf('TB_Full_Backup_') === 0 && fileName.endsWith('.xlsx')) {
        if (file.getDateCreated() < thirtyDaysAgo) {
          file.setTrashed(true);
          deleted++;
        }
      }
    }

    if (deleted > 0) {
      console.log('ðŸ—‘ï¸ Cleaned up ' + deleted + ' old backup(s)');
    }
  } catch (e) {
    console.warn('âš ï¸ Cleanup error: ' + e.toString());
  }
}

// =============================================================================
// 10. SHEET HEALTH MONITOR (Cell Count Audit)
// =============================================================================


// =============================================================================
// WEBHOOK & BIDIRECTIONAL SYNC
// =============================================================================

function doPost(e) {
  try {
    if (!e || !e.postData) return ContentService.createTextOutput('Error: No postData');
    var rawPayload = e.postData.contents;
    var payload = JSON.parse(rawPayload);

    // 1. Catch Reverse Sync from Next.js Dashboard (handle immediately)
    if (payload.action === 'update_patient') return handleNextjsUpdate_(payload);

    // 2. Ignore invalid Kobo payloads
    if (!payload._uuid && !payload.uuid) return ContentService.createTextOutput('OK');

    // 3. Store-and-fire: stash payload, schedule background processing
    PropertiesService.getScriptProperties().setProperty(
      'PENDING_' + Date.now(),
      rawPayload
    );

    // 4. Create a 1-minute time-based trigger for background processing
    ScriptApp.newTrigger('processWebhookQueue_')
      .timeBased()
      .after(60 * 1000)
      .create();

    // 5. Return immediately -- no sheet reads/writes in doPost
    return ContentService.createTextOutput('OK');
  } catch (err) {
    console.error('doPost Error: ' + err.message);
    return ContentService.createTextOutput('OK');
  }
}

// =============================================================================
// WEBHOOK QUEUE PROCESSOR (Background, triggered by doPost)
// =============================================================================
function processWebhookQueue_() {
  // 1. Clean up the trigger that fired this function
  var triggers = ScriptApp.getProjectTriggers();
  for (var t = 0; t < triggers.length; t++) {
    if (triggers[t].getHandlerFunction() === 'processWebhookQueue_') {
      ScriptApp.deleteTrigger(triggers[t]);
    }
  }

  // 2. Acquire lock to prevent concurrent runs
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log('processWebhookQueue_: Could not acquire lock, will retry.');
    ScriptApp.newTrigger('processWebhookQueue_')
      .timeBased()
      .after(60 * 1000)
      .create();
    return;
  }

  try {
    var props = PropertiesService.getScriptProperties();
    var allProps = props.getProperties();
    var pendingKeys = [];

    for (var key in allProps) {
      if (key.indexOf('PENDING_') === 0) {
        pendingKeys.push(key);
      }
    }

    if (pendingKeys.length === 0) {
      Logger.log('processWebhookQueue_: No pending payloads.');
      return;
    }

    // Sort by timestamp so oldest are processed first
    pendingKeys.sort();
    Logger.log('processWebhookQueue_: Processing ' + pendingKeys.length + ' pending webhook(s).');

    var mappings = getMappings_();
    var facilityCounters = getFacilityCountersFromProperties_();
    var outputRows = [];
    var processedKeys = [];

    for (var i = 0; i < pendingKeys.length; i++) {
      try {
        var payload = JSON.parse(allProps[pendingKeys[i]]);
        var row = processSingleRow_(payload, mappings, facilityCounters, {});
        if (row && row.length >= 37) {
          outputRows.push(row);
        }
        processedKeys.push(pendingKeys[i]);
      } catch (rowErr) {
        Logger.log('processWebhookQueue_: Error on ' + pendingKeys[i] + ': ' + rowErr.message);
        processedKeys.push(pendingKeys[i]);
      }
    }

    if (outputRows.length > 0) {
      // Write to Master DB
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var master = ss.getSheetByName(CONF.MASTER_SHEET);
      if (!master) {
        master = ss.insertSheet(CONF.MASTER_SHEET);
        master.hideSheet();
        master.getRange(1, 1, 1, 37).setValues([getHeaders_()]);
      }
      master.getRange(master.getLastRow() + 1, 1, outputRows.length, 37).setValues(outputRows);

      // Write to working sheet
      appendNewRowsToWorkingSheet_(outputRows);

      saveFacilityCountersToProperties_(facilityCounters);
      SpreadsheetApp.flush();

      // Forward each row to Next.js
      for (var j = 0; j < outputRows.length; j++) {
        try { forwardToNextjs_(outputRows[j]); } catch (e) {}
      }
    }

    // Delete processed property keys
    for (var k = 0; k < processedKeys.length; k++) {
      props.deleteProperty(processedKeys[k]);
    }

    Logger.log('processWebhookQueue_: Done. Wrote ' + outputRows.length + ' row(s) from ' + processedKeys.length + ' payload(s).');

  } finally {
    lock.releaseLock();
  }
}

function forwardToNextjs_(rowArray) {
  try {
    var headers = getHeaders_();
    var payloadObj = {};
    // FIX Bug #4: Remove artificial 34-column cap to include Lat/Lng/Serial
    var maxCols = Math.min(rowArray.length, headers.length);
    for (var i = 0; i < maxCols; i++) {
      payloadObj[headers[i]] = rowArray[i] !== undefined ? rowArray[i] : "";
    }
    var options = {
      'method': 'post',
      'contentType': 'application/json',
      'headers': { 'x-kobo-webhook-secret': 'alliance_kobo_secure_2026' },
      'payload': JSON.stringify(payloadObj),
      'muteHttpExceptions': true,
      'timeout': 10000
    };
    UrlFetchApp.fetch('https://hhxr-tb-engine.vercel.app/api/webhook/kobo', options);
  } catch (e) {
    console.warn('Next.js Relay Error: ' + e.message);
  }
}

function handleNextjsUpdate_(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = [ss.getSheetByName(CONF.DATA_SHEET), ss.getSheetByName(CONF.MASTER_SHEET)];
  var headers = getHeaders_();
  
  // 1. Identify the Anchor (KoboUUID is the most unique)
  var anchorKey = 'KoboUUID(hidden)';
  var anchorValue = payload.updates[anchorKey] || payload.koboUuid;
  
  if (!anchorValue) {
    console.error('❌ Sync Failed: No KoboUUID found in payload');
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'No Anchor ID'}));
  }

  // 🛡️ Clean the ID
  var cleanId = String(anchorValue).replace(/^uuid:/i, '').trim();
  var updatedCount = 0;

  sheets.forEach(function(sheet) {
    if (!sheet) return;
    
    // 2. Automatically find which column holds 'KoboUUID(hidden)'
    var sheetHeaders = sheet.getRange(CONF.HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
    var anchorColIndex = sheetHeaders.indexOf(anchorKey) + 1;
    
    if (anchorColIndex <= 0) {
      console.warn('⚠️ Column "' + anchorKey + '" not found in sheet: ' + sheet.getName());
      return;
    }

    // 3. Search in the CORRECT column (Column 33 - KoboUUID)
    var finder = sheet.getRange(1, anchorColIndex, sheet.getMaxRows(), 1).createTextFinder(cleanId).matchEntireCell(true);
    var cell = finder.findNext();
    
    if (cell) {
      var rowNum = cell.getRow();
      // 4. Update the fields
      for (var key in payload.updates) {
        var colIndex = headers.indexOf(key) + 1;
        if (colIndex > 0) {
          sheet.getRange(rowNum, colIndex).setValue(payload.updates[key]);
        }
      }
      updatedCount++;
    }
  });

  SpreadsheetApp.flush();
  console.log('✅ Update Complete. Rows modified: ' + updatedCount);
  return ContentService.createTextOutput(JSON.stringify({success: true, updated: updatedCount}));
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('\ud83c\udfe5 TB Engine')
      .addItem('\ud83d\ude80 Pull All Data to Supabase', 'PULL_MISSING_DATA_TO_SUPABASE')
      .addItem('\ud83d\udd04 Sync Selected Row', 'syncManualEditsToSupabase')
      .addSeparator()
      .addItem('\ud83d\udd0d Audit Cell Usage', 'AUDIT_WORKBOOK_CELL_USAGE')
      .addItem('\ud83e\uddf9 Remove Duplicates', 'REMOVE_DUPLICATE_ROWS')
      .addItem('\u2702\ufe0f Trim Empty Cells', 'TRIM_SHEET_TO_DATA')
      .addToUi();
}

/**
 * ⚡ REAL-TIME SENSOR: Detects manual edits in the sheet 
 * and pushes that specific row to Supabase instantly.
 * 
 * FIX Bug #2: This is now an INSTALLABLE trigger (not simple trigger)
 * to avoid UI blocking and UrlFetchApp restrictions.
 * 
 * TO INSTALL:
 * 1. Go to Apps Script Editor → Triggers
 * 2. Add Trigger → onEditInstallable → From spreadsheet → On edit
 */
function onEditInstallable(e) {
  var sheet = e.source.getActiveSheet();
  
  // Only trigger if we are on the Data Sheet or Master Sheet
  if (sheet.getName() !== CONF.DATA_SHEET && sheet.getName() !== CONF.MASTER_SHEET) return;
  
  var rowNum = e.range.getRow();
  
  // Don't sync if they are editing the header rows
  if (rowNum <= CONF.HEADER_ROW) return;

  // Queue the edit for async processing (no UI blocking)
  var props = PropertiesService.getScriptProperties();
  var editQueue = JSON.parse(props.getProperty('EDIT_QUEUE') || '[]');
  editQueue.push({ sheet: sheet.getName(), row: rowNum, timestamp: new Date().getTime() });
  props.setProperty('EDIT_QUEUE', JSON.stringify(editQueue));

  // Create a one-time trigger to process the queue after 2 seconds
  var triggers = ScriptApp.getProjectTriggers();
  var workerExists = false;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processEditQueue') {
      workerExists = true;
      break;
    }
  }
  
  if (!workerExists) {
    ScriptApp.newTrigger('processEditQueue').timeBased().after(2000).create();
  }
}

/**
 * Background worker to process queued edits
 */
function processEditQueue() {
  // Clean up the trigger that fired this
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'processEditQueue') ScriptApp.deleteTrigger(t);
  });

  var props = PropertiesService.getScriptProperties();
  var editQueue = JSON.parse(props.getProperty('EDIT_QUEUE') || '[]');
  if (editQueue.length === 0) return;
  
  props.setProperty('EDIT_QUEUE', '[]'); // Clear queue
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var headers = getHeaders_();
  
  editQueue.forEach(function(edit) {
    try {
      var sheet = ss.getSheetByName(edit.sheet);
      if (!sheet) return;
      
      var rowData = sheet.getRange(edit.row, 1, 1, headers.length).getValues()[0];
      var payloadObj = {};
      
      for (var i = 0; i < headers.length; i++) {
        var val = rowData[i] || "";
        
        // Clean UUID prefix
        if ((headers[i] === 'KoboUUID(hidden)' || headers[i] === 'KoboID(hidden)') && typeof val === 'string') {
          val = val.replace(/^uuid:/i, '').trim();
        }
        
        // Convert timestamp if needed
        if (headers[i] === 'Submitted On' && typeof val === 'string' && val.indexOf('Submitted on') === 0) {
          val = convertSubmittedOnToISO_(val);
        }
        
        payloadObj[headers[i]] = val;
      }

      // Push to Next.js API
      var options = {
        'method': 'post',
        'contentType': 'application/json',
        'headers': { 'x-kobo-webhook-secret': 'alliance_kobo_secure_2026' },
        'payload': JSON.stringify([payloadObj]),
        'muteHttpExceptions': true,
        'timeout': 10000
      };

      UrlFetchApp.fetch('https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase', options);
      Logger.log('✅ Row ' + edit.row + ' synced to Supabase');
    } catch (err) {
      Logger.log('❌ Sync failed for row ' + edit.row + ': ' + err.message);
    }
  });
}
function syncManualEditsToSupabase() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  if (sheet.getName() !== CONF.DATA_SHEET && sheet.getName() !== CONF.MASTER_SHEET) {
    ui.alert('Error', 'Please run this from the Patient Linelist or Master Database.', ui.ButtonSet.OK);
    return;
  }

  var activeRowIndex = sheet.getActiveCell().getRow();
  
  if (activeRowIndex <= CONF.HEADER_ROW) {
    ui.alert('Error', 'Please select a valid patient row to sync.', ui.ButtonSet.OK);
    return;
  }

  var response = ui.alert('Confirm Sync', 'Do you want to instantly sync Row ' + activeRowIndex + ' to Supabase?', ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;

  try {
    var headers = getHeaders_();
    var rowData = sheet.getRange(activeRowIndex, 1, 1, headers.length).getValues()[0];
    
    var payloadObj = {};
    for (var i = 0; i < headers.length; i++) {
      payloadObj[headers[i]] = rowData[i] !== undefined ? rowData[i] : "";
    }

    var options = {
      'method': 'post',
      'contentType': 'application/json',
      'headers': { 'x-kobo-webhook-secret': 'alliance_kobo_secure_2026' },
      'payload': JSON.stringify([payloadObj]), 
      'muteHttpExceptions': true,
      'timeout': 10000
    };

    var nextjsUrl = 'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase'; 
    var res = UrlFetchApp.fetch(nextjsUrl, options);

    if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
      ui.alert('Success', 'Row ' + activeRowIndex + ' synced to Supabase instantly!', ui.ButtonSet.OK);
    } else {
      ui.alert('Sync Failed', 'Error: ' + res.getContentText(), ui.ButtonSet.OK);
    }
  } catch (e) {
    ui.alert('Error', 'Failed to connect to Next.js: ' + e.message, ui.ButtonSet.OK);
  }
}



function convertSubmittedOnToISO_(text) {
  try {
    // Parse: "Submitted on 16/02/26 at 8:16 AM IST"
    var match = text.match(/Submitted on (\d{2})\/(\d{2})\/(\d{2}) at (\d{1,2}):(\d{2}) (AM|PM) IST/);
    if (!match) return text; // Return original if parsing fails
    
    var day = match[1];
    var month = match[2];
    var year = '20' + match[3]; // Convert 26 to 2026
    var hour = parseInt(match[4], 10);
    var minute = match[5];
    var ampm = match[6];
    
    // Convert to 24-hour format
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    
    // Format as ISO 8601 with IST timezone (+05:30)
    var isoDate = year + '-' + month + '-' + day + 'T' + 
                  ('0' + hour).slice(-2) + ':' + minute + ':00+05:30';
    
    return isoDate;
  } catch (e) {
    Logger.log('Timestamp conversion error: ' + e.message);
    return text; // Return original on error
  }
}

// Find duplicate UUIDs in the sheet
function FIND_DUPLICATE_UUIDS() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONF.DATA_SHEET);
  var fullData = sheet.getDataRange().getValues();
  var rowsToProcess = fullData.slice(CONF.HEADER_ROW);
  
  var uuidCount = {};
  var duplicates = [];
  
  rowsToProcess.forEach(function(row, index) {
    var uuid = String(row[32] || '').replace(/^uuid:/i, '').trim();
    if (uuid) {
      if (!uuidCount[uuid]) {
        uuidCount[uuid] = [];
      }
      uuidCount[uuid].push(index + CONF.HEADER_ROW + 1); // Actual row number
    }
  });
  
  for (var uuid in uuidCount) {
    if (uuidCount[uuid].length > 1) {
      duplicates.push({
        uuid: uuid,
        rows: uuidCount[uuid],
        count: uuidCount[uuid].length
      });
    }
  }
  
  Logger.log('=== DUPLICATE UUID REPORT ===');
  Logger.log('Found ' + duplicates.length + ' duplicate UUIDs in sheet:');
  duplicates.forEach(function(dup) {
    Logger.log('UUID: ' + dup.uuid + ' appears ' + dup.count + ' times in rows: ' + dup.rows.join(', '));
  });
  
  return duplicates;
}



// =============================================================================
// SUPABASE SYNC ENGINE â€” Cursor-based, self-chaining, time-guarded
// Handles 20,000+ records safely within Apps Script 6-min limit.
// Run PULL_MISSING_DATA_TO_SUPABASE() to start. It will schedule itself
// automatically until all rows are synced.
// Run RESET_SUPABASE_SYNC_CURSOR() to restart from row 0.
// =============================================================================

var SUPABASE_SYNC_CONFIG = {
  // 10 rows/batch: minimal size to avoid Vercel cold start timeouts
  BATCH_SIZE:      10,
  // Stop at 4m30s â€” leaves 90s margin before Apps Script's 6-min kill
  MAX_RUNTIME_MS:  5 * 60000,
  // Only retry true network errors â€” never retry server 5xx (they waste time)
  RETRY_LIMIT:     1,
  RETRY_DELAY_MS:  1000,
  // Minimal throttle â€” small batches are fast enough already
  INTER_BATCH_MS:  0,
  CURSOR_KEY:      'SUPABASE_SYNC_CURSOR',
  TOTAL_KEY:       'SUPABASE_SYNC_TOTAL',
  SYNCED_KEY:      'SUPABASE_SYNC_TOTAL_SYNCED',
  FAILED_KEY:      'SUPABASE_SYNC_TOTAL_FAILED',
  SUPABASE_URL:    'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase',
  SECRET:          'alliance_kobo_secure_2026'
};

/** Entry point â€” call this from the menu or trigger */
function PULL_MISSING_DATA_TO_SUPABASE() {
  var cfg = SUPABASE_SYNC_CONFIG;
  var props = PropertiesService.getScriptProperties();

  // â”€â”€ 1. Prevent concurrent runs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    Logger.log('[SyncEngine] Another run is active â€” aborting.');
    return;
  }

  var startTime = Date.now();

  try {
    // â”€â”€ 2. Clean up any stale continuation triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _cleanSyncTriggers_();

    // â”€â”€ 3. Load sheet data once â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var ss  = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONF.DATA_SHEET);
    if (!sheet) { Logger.log('[SyncEngine] Sheet not found.'); return; }

    var headers      = getHeaders_();
    var allData      = sheet.getDataRange().getValues();
    var dataRows     = allData.slice(CONF.HEADER_ROW); // header rows excluded

    // â”€â”€ 4. Build a valid-UUID-only index (skip blanks + bad format) â”€
    var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    var validRows = dataRows.filter(function(row) {
      var uuid = String(row[32] || '').replace(/^uuid:/i, '').trim();
      return uuid && UUID_PATTERN.test(uuid);
    });

    Logger.log('[SyncEngine] Total valid rows to sync: ' + validRows.length);


    // â”€â”€ 5. Resume from saved cursor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var cursor      = parseInt(props.getProperty(cfg.CURSOR_KEY)  || '0', 10);
    var totalSynced = parseInt(props.getProperty(cfg.SYNCED_KEY)  || '0', 10);
    var totalFailed = parseInt(props.getProperty(cfg.FAILED_KEY)  || '0', 10);
    var grandTotal  = validRows.length;

    // Save grand total so continuation runs know it
    props.setProperty(cfg.TOTAL_KEY, String(grandTotal));

    var pct = grandTotal > 0 ? Math.round((cursor / grandTotal) * 100) : 0;
    Logger.log('[SyncEngine] START â€” Total valid rows: ' + grandTotal +
               ' | Cursor: ' + cursor + ' (' + pct + '%)',
               ' | Already synced: ' + totalSynced);

    var batchNum = Math.floor(cursor / cfg.BATCH_SIZE) + 1;
    var totalBatches = Math.ceil(grandTotal / cfg.BATCH_SIZE);

    // â”€â”€ 6. Batch loop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var i = cursor;
    while (i < grandTotal) {

      // Time guard
      if (Date.now() - startTime >= cfg.MAX_RUNTIME_MS) {
        Logger.log('[SyncEngine] TIME GUARD at row ' + i + '. Saving cursor and scheduling continuation...');
        props.setProperty(cfg.CURSOR_KEY,  String(i));
        props.setProperty(cfg.SYNCED_KEY, String(totalSynced));
        props.setProperty(cfg.FAILED_KEY,  String(totalFailed));
        // Self-chain: schedule next run in 2 minutes
        ScriptApp.newTrigger('PULL_MISSING_DATA_TO_SUPABASE')
          .timeBased().after(2 * 60 * 1000).create();
        Logger.log('[SyncEngine] Continuation trigger created. Will resume at row ' + i + '.');
        return;
      }

      // Build batch payload
      var chunk = validRows.slice(i, i + cfg.BATCH_SIZE);
      var payload = _buildPayload_(chunk, headers);

      if (payload.length > 0) {
        var sent = _sendBatchWithRetry_(payload, batchNum, totalBatches, cfg);
        if (sent) { totalSynced += payload.length; }
        else       { totalFailed += payload.length; }
      }

      i += cfg.BATCH_SIZE;
      batchNum++;

      // Throttle
      if (i < grandTotal) Utilities.sleep(cfg.INTER_BATCH_MS);
    }

    // â”€â”€ 7. All done â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var elapsed = Math.round((Date.now() - startTime) / 1000);
    Logger.log('[SyncEngine] COMPLETE in ' + elapsed + 's.',
               ' Synced: ' + totalSynced + ' | Failed: ' + totalFailed + ' / ' + grandTotal);

    // Clear cursor so next manual run starts fresh
    props.deleteProperty(cfg.CURSOR_KEY);
    props.deleteProperty(cfg.SYNCED_KEY);
    props.deleteProperty(cfg.FAILED_KEY);
    props.setProperty('LAST_SUPABASE_SYNC_TIME', new Date().toISOString());

    try {
      SpreadsheetApp.getUi().alert(
        'Sync Complete',
        'Synced: ' + totalSynced + ' | Failed: ' + totalFailed + ' / ' + grandTotal + ' records.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch(uiErr) { /* headless / trigger context */ }

  } finally {
    lock.releaseLock();
  }
}

/** Cancel any in-flight sync and reset cursor to row 0 */
function RESET_SUPABASE_SYNC_CURSOR() {
  _cleanSyncTriggers_();
  var props = PropertiesService.getScriptProperties();
  var cfg = SUPABASE_SYNC_CONFIG;
  props.deleteProperty(cfg.CURSOR_KEY);
  props.deleteProperty(cfg.SYNCED_KEY);
  props.deleteProperty(cfg.FAILED_KEY);
  props.deleteProperty(cfg.TOTAL_KEY);
  
  var lock = LockService.getScriptLock();
  try {
    lock.tryLock(1);
    lock.releaseLock();
  } catch(e) {}
  
  Utilities.sleep(2000);
  
  Logger.log('[SyncEngine] Cursor reset. Run PULL_MISSING_DATA_TO_SUPABASE() to start fresh.');
  try {
    SpreadsheetApp.getUi().alert('Reset', 'Sync cursor cleared and lock released. Start a fresh sync now.', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch(e) {}
}

/** Build a clean payload array from raw sheet rows */
function _buildPayload_(rows, headers) {
  var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // Map sheet headers to API field names (snake_case)
  var HEADER_MAP = {
    'KoboUUID(hidden)': 'kobo_uuid',
    'KoboID(hidden)': 'kobo_id',
    'Name of the Staff': 'staff_name',
    'Submitted On': 'submission_time',
    'State': 'state',
    'District': 'district',
    'Facility Name': 'facility_name',
    'Facility type': 'facility_type',
    'Date of Screening - CH-x ray (dd/mm/yy)': 'screening_date',
    'Unique ID': 'unique_id',
    'Inmate Name': 'inmate_name',
    'Inmate type (Under Trial/Convicted/Other)': 'inmate_type',
    "Father /Husband's Name": 'father_husband_name',
    'Date of Birth': 'date_of_birth',
    'Age': 'age',
    'Sex (Male/Female/TG)': 'sex',
    'Contact Number': 'contact_number',
    'Address': 'address',
    'Chest x ray Result (Abnormal/Normal/Not-detected)': 'xray_result',
    '10s Symptoms Present? (You can select more than one symptoms)': 'symptoms',
    'Whether any past history of TB? (Y/N)': 'tb_past_history',
    'Date of referral for TB Examination (sputum) (dd/mm/yy)': 'referral_date',
    'Name of facility where referred to (Give code/name of all facilities)': 'referred_facility',
    'TB diagnosed (Y/N)': 'tb_diagnosed',
    'Date of TB Diagnosed (dd/mm/yy)': 'tb_diagnosis_date',
    'Type of TB Diagnosed (P/EP)': 'tb_type',
    'Date of starting ATT (dd/mm/yyyy)': 'att_start_date',
    'Date of Treatment Completion (dd/mm/yyyy)': 'att_completion_date',
    'HIV Status (Positive/Negative/Unknown)': 'hiv_status',
    'Status at the time of referral (Pre ART/On ART) [If on ART at time of referral]': 'art_status',
    'ART Number (if on ART at the time of referral)': 'art_number',
    'NIKSHAY/ABHA ID': 'nikshay_id',
    'Date of registration (dd/mm/yyyy)': 'nikshay_registration_date',
    'Remarks': 'remarks',
    'Serial Number': 'serial_number',
    'Latitude': 'latitude',
    'Longitude': 'longitude'
  };
  
  var seen = {};
  var payload = [];
  
  rows.forEach(function(row) {
    var obj = {};
    var rowUuid = null;
    
    headers.forEach(function(header, idx) {
      var value = row[idx] !== undefined ? row[idx] : '';
      
      // Clean UUID/ID fields
      if ((header === 'KoboUUID(hidden)' || header === 'KoboID(hidden)') && typeof value === 'string') {
        value = value.replace(/^uuid:/i, '').trim();
      }
      
      // Convert timestamp format
      if (header === 'Submitted On' && typeof value === 'string' && value.indexOf('Submitted on') === 0) {
        value = convertSubmittedOnToISO_(value);
      }
      
      // Track UUID for validation
      if (header === 'KoboUUID(hidden)') rowUuid = value;
      
      // Map to API field name (snake_case)
      var apiFieldName = HEADER_MAP[header] || header;
      obj[apiFieldName] = value;
    });
    
    // Debug first record
    if (payload.length === 0 && rowUuid) {
      Logger.log('[DEBUG] First record kobo_uuid: ' + rowUuid);
      Logger.log('[DEBUG] UUID valid: ' + UUID_PATTERN.test(rowUuid));
      Logger.log('[DEBUG] Sample payload keys: ' + Object.keys(obj).slice(0, 10).join(', '));
    }
    
    // Only add valid, unique UUIDs
    if (rowUuid && UUID_PATTERN.test(rowUuid) && !seen[rowUuid]) {
      seen[rowUuid] = true;
      payload.push(obj);
    }
  });
  
  Logger.log('[DEBUG] Built payload with ' + payload.length + ' records');
  if (payload.length > 0) {
    Logger.log('[DEBUG] First payload record has kobo_uuid: ' + (payload[0].kobo_uuid || 'MISSING'));
  }
  
  return payload;
}

/**
 * Send one batch to Supabase.
 * Strategy:
 *   - 5xx (Vercel timeout/cold-start) -> SKIP immediately, no retry.
 *   - 4xx (client/auth error)         -> SKIP immediately, no retry.
 *   - Network exception               -> retry once after a short delay.
 *   - 2xx                             -> success.
 */
function _sendBatchWithRetry_(payload, batchNum, totalBatches, cfg) {
  var networkAttempt = 0;
  var maxNetworkRetries = cfg.RETRY_LIMIT;

  while (networkAttempt <= maxNetworkRetries) {
    try {
      var t0  = Date.now();
      var reqOpts = {
        method:             'post',
        contentType:        'application/json',
        headers:            { 'x-kobo-webhook-secret': cfg.SECRET },
        payload:            JSON.stringify(payload),
        muteHttpExceptions: true
      };
      var res = UrlFetchApp.fetch(cfg.SUPABASE_URL, reqOpts);
      var ms   = Date.now() - t0;
      var code = res.getResponseCode();

      if (code >= 200 && code < 300) {
        Logger.log('[SyncEngine] Batch ' + batchNum + '/' + totalBatches +
                   ' OK (' + payload.length + ' rows, ' + ms + 'ms)');
        return true;
      }

      if (code >= 500) {
        Logger.log('[SyncEngine] Batch ' + batchNum + ' SKIPPED â€” server ' + code +
                   ' (Vercel timeout/cold-start). Moving on.');
        return false;
      }

      Logger.log('[SyncEngine] Batch ' + batchNum + ' SKIPPED â€” client error ' + code +
                 ': ' + res.getContentText().substring(0, 150));
      return false;

    } catch (err) {
      networkAttempt++;
      Logger.log('[SyncEngine] Batch ' + batchNum + ' network error (attempt ' +
                 networkAttempt + '/' + (maxNetworkRetries + 1) + '): ' + err.message);
      if (networkAttempt <= maxNetworkRetries) {
        Utilities.sleep(cfg.RETRY_DELAY_MS);
      }
    }
  }

  Logger.log('[SyncEngine] Batch ' + batchNum + ' FAILED after network retries.');
  return false;
}

/** Delete all pending continuation triggers for the sync engine */
function _cleanSyncTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'PULL_MISSING_DATA_TO_SUPABASE') {
      ScriptApp.deleteTrigger(t);
    }
  });
}

/** Fetch existing UUIDs from Supabase to enable delta sync */
function _fetchExistingUuids_(cfg) {
  try {
    var url = 'https://hhxr-tb-engine.vercel.app/api/sync/get-existing-uuids';
    var options = {
      method: 'get',
      headers: { 'x-kobo-webhook-secret': cfg.SECRET },
      muteHttpExceptions: true,
      timeout: 30000
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    
    if (code >= 200 && code < 300) {
      var data = JSON.parse(response.getContentText());
      var uuidSet = new Set();
      
      if (data.uuids && Array.isArray(data.uuids)) {
        data.uuids.forEach(function(uuid) {
          if (uuid) uuidSet.add(String(uuid).trim());
        });
      }
      
      return uuidSet;
    } else {
      Logger.log('[DeltaSync] API returned ' + code + ', falling back to full sync');
      return new Set();
    }
  } catch (err) {
    Logger.log('[DeltaSync] Error fetching UUIDs: ' + err.message + ', falling back to full sync');
    return new Set();
  }
}


// =============================================================================
// EMERGENCY DIAGNOSTICS - Cell Usage Audit
// =============================================================================
function AUDIT_WORKBOOK_CELL_USAGE() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var totalCells = 0;
  var report = [];
  
  Logger.log('=== WORKBOOK CELL USAGE AUDIT ===\n');
  
  sheets.forEach(function(sheet) {
    var rows = sheet.getMaxRows();
    var cols = sheet.getMaxColumns();
    var cells = rows * cols;
    totalCells += cells;
    
    var info = {
      name: sheet.getName(),
      rows: rows,
      cols: cols,
      cells: cells,
      dataRows: sheet.getLastRow(),
      dataCols: sheet.getLastColumn(),
      usedCells: sheet.getLastRow() * sheet.getLastColumn(),
      wastedCells: cells - (sheet.getLastRow() * sheet.getLastColumn()),
      percentUsed: ((sheet.getLastRow() * sheet.getLastColumn()) / cells * 100).toFixed(2)
    };
    
    report.push(info);
    
    Logger.log('Sheet: ' + info.name);
    Logger.log('  Max Rows: ' + info.rows.toLocaleString());
    Logger.log('  Max Cols: ' + info.cols);
    Logger.log('  Total Cells: ' + info.cells.toLocaleString());
    Logger.log('  Used Cells: ' + info.usedCells.toLocaleString() + ' (' + info.percentUsed + '%)');
    Logger.log('  Wasted Cells: ' + info.wastedCells.toLocaleString());
    Logger.log('');
  });
  
  Logger.log('=== SUMMARY ===');
  Logger.log('Total Sheets: ' + sheets.length);
  Logger.log('Total Cells: ' + totalCells.toLocaleString() + ' / 10,000,000');
  Logger.log('Percentage Used: ' + (totalCells / 10000000 * 100).toFixed(2) + '%');
  Logger.log('Cells Remaining: ' + (10000000 - totalCells).toLocaleString());
  
  if (totalCells > 9000000) {
    Logger.log('\n⚠️ CRITICAL: Over 90% capacity!');
  } else if (totalCells > 8000000) {
    Logger.log('\n⚠️ WARNING: Over 80% capacity!');
  }
  
  return report;
}

// =============================================================================
// EMERGENCY FIX - Remove Duplicate Rows
// =============================================================================
function REMOVE_DUPLICATE_ROWS() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    'Remove Duplicates',
    'This will remove ALL duplicate UUIDs, keeping only the FIRST occurrence of each.\n\n' +
    'Estimated: ~1,124 duplicate rows will be deleted.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    Logger.log('User cancelled duplicate removal');
    return;
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONF.DATA_SHEET);
  var fullData = sheet.getDataRange().getValues();
  var rowsToProcess = fullData.slice(CONF.HEADER_ROW);
  
  var seenUuids = new Set();
  var rowsToDelete = [];
  
  // Identify duplicate rows (keep first occurrence)
  rowsToProcess.forEach(function(row, index) {
    var uuid = String(row[32] || '').replace(/^uuid:/i, '').trim();
    if (uuid) {
      if (seenUuids.has(uuid)) {
        rowsToDelete.push(index + CONF.HEADER_ROW + 1); // Actual row number
      } else {
        seenUuids.add(uuid);
      }
    }
  });
  
  Logger.log('Found ' + rowsToDelete.length + ' duplicate rows to delete');
  
  if (rowsToDelete.length === 0) {
    ui.alert('No Duplicates', 'No duplicate UUIDs found!', ui.ButtonSet.OK);
    return;
  }
  
  // Delete rows in reverse order (bottom to top) to avoid row number shifts
  rowsToDelete.reverse().forEach(function(rowNum) {
    sheet.deleteRow(rowNum);
  });
  
  Logger.log('✅ Deleted ' + rowsToDelete.length + ' duplicate rows');
  ui.alert('Success', 'Removed ' + rowsToDelete.length + ' duplicate rows!', ui.ButtonSet.OK);
}

// =============================================================================
// EMERGENCY FIX - Trim Sheet to Actual Data Size
// =============================================================================
function TRIM_SHEET_TO_DATA() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONF.DATA_SHEET);
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var maxRows = sheet.getMaxRows();
  var maxCols = sheet.getMaxColumns();
  
  var rowsToDelete = maxRows - lastRow - 100; // Keep 100 buffer rows
  var colsToDelete = maxCols - lastCol - 5; // Keep 5 buffer cols
  
  Logger.log('Current: ' + maxRows + ' rows × ' + maxCols + ' cols = ' + (maxRows * maxCols).toLocaleString() + ' cells');
  Logger.log('Used: ' + lastRow + ' rows × ' + lastCol + ' cols');
  Logger.log('Will delete: ' + rowsToDelete + ' rows, ' + colsToDelete + ' cols');
  
  if (rowsToDelete > 0) {
    sheet.deleteRows(lastRow + 101, rowsToDelete);
    Logger.log('✅ Deleted ' + rowsToDelete + ' empty rows');
  }
  
  if (colsToDelete > 0) {
    sheet.deleteColumns(lastCol + 6, colsToDelete);
    Logger.log('✅ Deleted ' + colsToDelete + ' empty columns');
  }
  
  var newMaxRows = sheet.getMaxRows();
  var newMaxCols = sheet.getMaxColumns();
  var newCells = newMaxRows * newMaxCols;
  
  Logger.log('New: ' + newMaxRows + ' rows × ' + newMaxCols + ' cols = ' + newCells.toLocaleString() + ' cells');
  Logger.log('Saved: ' + ((maxRows * maxCols) - newCells).toLocaleString() + ' cells');
}
