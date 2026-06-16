/**
 * CHANGES REQUIRED FOR NEW SUPABASE PROJECT (fgtrkxadiszoyhslwesu)
 * 
 * 1. Update SUPABASE_SYNC_CONFIG.SUPABASE_URL (Line 1089)
 * 2. Update forwardToNextjs_ URL (Line 1006)
 * 3. Update syncManualEditsToSupabase URL (Line 1156)
 * 4. Update processEditQueue URL (Line 1131)
 * 5. No other changes needed - Prisma handles the rest
 */

// =============================================================================
// UPDATED CONFIGURATION FOR NEW SUPABASE PROJECT
// =============================================================================

var SUPABASE_SYNC_CONFIG = {
  BATCH_SIZE:      250,
  MAX_RUNTIME_MS:  5 * 60000,
  RETRY_LIMIT:     1,
  RETRY_DELAY_MS:  1000,
  INTER_BATCH_MS:  0,
  CURSOR_KEY:      'SUPABASE_SYNC_CURSOR',
  TOTAL_KEY:       'SUPABASE_SYNC_TOTAL',
  SYNCED_KEY:      'SUPABASE_SYNC_TOTAL_SYNCED',
  FAILED_KEY:      'SUPABASE_SYNC_TOTAL_FAILED',
  
  // ✅ UPDATED: New Supabase project endpoint
  SUPABASE_URL:    'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase',
  SECRET:          'alliance_kobo_secure_2026'
};

// =============================================================================
// FUNCTION UPDATES (Search and replace these in your script)
// =============================================================================

/**
 * Line ~1006: forwardToNextjs_
 * BEFORE: 'https://hhxr-tb-engine.vercel.app/api/webhook/kobo'
 * AFTER:  'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase'
 */
function forwardToNextjs_(rowArray) {
  try {
    var headers = getHeaders_();
    var payloadObj = {};
    var maxCols = Math.min(rowArray.length, headers.length);
    for (var i = 0; i < maxCols; i++) {
      payloadObj[headers[i]] = rowArray[i] !== undefined ? rowArray[i] : "";
    }
    var options = {
      'method': 'post',
      'contentType': 'application/json',
      'headers': { 'x-kobo-webhook-secret': 'alliance_kobo_secure_2026' },
      'payload': JSON.stringify([payloadObj]), // ✅ WRAP IN ARRAY
      'muteHttpExceptions': true,
      'timeout': 10000
    };
    // ✅ UPDATED URL
    UrlFetchApp.fetch('https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase', options);
  } catch (e) {
    console.warn('Next.js Relay Error: ' + e.message);
  }
}

/**
 * Line ~1131: processEditQueue
 * BEFORE: 'https://hhxr-tb-engine.vercel.app/api/webhook/kobo'
 * AFTER:  'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase'
 */
function processEditQueue() {
  // ... existing code ...
  
  // ✅ UPDATED URL
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': { 'x-kobo-webhook-secret': 'alliance_kobo_secure_2026' },
    'payload': JSON.stringify([payloadObj]), // ✅ WRAP IN ARRAY
    'muteHttpExceptions': true,
    'timeout': 10000
  };

  UrlFetchApp.fetch('https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase', options);
}

/**
 * Line ~1156: syncManualEditsToSupabase
 * BEFORE: 'https://hhxr-tb-engine.vercel.app/api/webhook/kobo'
 * AFTER:  'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase'
 */
function syncManualEditsToSupabase() {
  // ... existing code ...
  
  // ✅ UPDATED URL
  var nextjsUrl = 'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase';
  var res = UrlFetchApp.fetch(nextjsUrl, options);
}

// =============================================================================
// SUMMARY OF CHANGES
// =============================================================================
/**
 * ✅ WHAT CHANGED:
 * 1. All webhook URLs now point to /api/sync/sheets-to-supabase
 * 2. Payload format: MUST be wrapped in array [payloadObj]
 * 3. No schema changes needed - Prisma auto-maps columns
 * 
 * ✅ WHAT STAYS THE SAME:
 * - Secret key: alliance_kobo_secure_2026
 * - Header format: x-kobo-webhook-secret
 * - All 37 columns (Name of Staff → Longitude)
 * - UUID-based deduplication
 * 
 * ✅ TESTING:
 * 1. Run: PULL_MISSING_DATA_TO_SUPABASE()
 * 2. Check Vercel logs: vercel logs --prod
 * 3. Verify Supabase: SELECT COUNT(*) FROM patients;
 * 4. Test manual edit sync from sheet
 */
