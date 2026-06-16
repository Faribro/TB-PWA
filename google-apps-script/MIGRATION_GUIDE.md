# 🔄 Google Apps Script Migration Guide

## ✅ Changes Required (3 URLs to Update)

### 1. Update SUPABASE_SYNC_CONFIG (Line ~1089)

**Find:**
```javascript
var SUPABASE_SYNC_CONFIG = {
  SUPABASE_URL: 'https://hhxr-tb-engine.vercel.app/api/webhook/kobo',
  SECRET: 'alliance_kobo_secure_2026'
};
```

**Replace with:**
```javascript
var SUPABASE_SYNC_CONFIG = {
  SUPABASE_URL: 'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase',
  SECRET: 'alliance_kobo_secure_2026'
};
```

---

### 2. Update forwardToNextjs_ (Line ~1006)

**Find:**
```javascript
function forwardToNextjs_(rowArray) {
  // ... code ...
  UrlFetchApp.fetch('https://hhxr-tb-engine.vercel.app/api/webhook/kobo', options);
}
```

**Replace with:**
```javascript
function forwardToNextjs_(rowArray) {
  // ... code ...
  var payloadObj = {}; // existing code
  // ... build payloadObj ...
  
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
```

---

### 3. Update processEditQueue (Line ~1131)

**Find:**
```javascript
UrlFetchApp.fetch('https://hhxr-tb-engine.vercel.app/api/webhook/kobo', options);
```

**Replace with:**
```javascript
UrlFetchApp.fetch('https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase', options);
```

---

### 4. Update syncManualEditsToSupabase (Line ~1156)

**Find:**
```javascript
var nextjsUrl = 'https://hhxr-tb-engine.vercel.app/api/webhook/kobo';
```

**Replace with:**
```javascript
var nextjsUrl = 'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase';
```

---

## 🚀 Deployment Steps

### Step 1: Update Script (5 min)
1. Open Google Sheets → Extensions → Apps Script
2. Find and replace all 4 URLs above
3. Save (Ctrl+S)

### Step 2: Test Connection (2 min)
```javascript
// Run this test function in Apps Script
function TEST_NEW_SUPABASE() {
  var testPayload = [{
    "KoboUUID(hidden)": "test-" + new Date().getTime(),
    "Inmate Name": "Test Patient",
    "State": "Test State"
  }];
  
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': { 'x-kobo-webhook-secret': 'alliance_kobo_secure_2026' },
    'payload': JSON.stringify(testPayload),
    'muteHttpExceptions': true
  };
  
  var res = UrlFetchApp.fetch(
    'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase',
    options
  );
  
  Logger.log('Status: ' + res.getResponseCode());
  Logger.log('Response: ' + res.getContentText());
}
```

### Step 3: Full Data Migration (30-60 min)
```javascript
// Run from sheet menu: TB Engine → Pull All Data to Supabase
PULL_MISSING_DATA_TO_SUPABASE();
```

**Expected Output:**
```
[SyncEngine] START – Total valid rows: 5000 | Cursor: 0 (0%)
[SyncEngine] Batch 1/20 OK (250 rows, 2500ms)
[SyncEngine] Batch 2/20 OK (250 rows, 2300ms)
...
[SyncEngine] COMPLETE in 180s. Synced: 5000 | Failed: 0 / 5000
```

---

## 🔍 Verification Checklist

### 1. Check Vercel Logs
```bash
vercel logs --prod | grep "sheets-to-supabase"
```

**Expected:**
```
[POST] /api/sync/sheets-to-supabase - 200 (2.5s)
✅ Synced 250 rows to Supabase
```

### 2. Check Supabase Database
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) FROM patients;
-- Expected: 5000+ rows

SELECT * FROM patients ORDER BY created_at DESC LIMIT 5;
-- Verify recent data
```

### 3. Test Manual Edit Sync
1. Open Google Sheet
2. Edit any cell in a patient row
3. Wait 2 seconds
4. Check Vercel logs for sync confirmation

---

## ⚠️ Troubleshooting

### Issue: "Sync Failed - 401 Unauthorized"
**Fix:** Verify webhook secret in Apps Script matches Vercel env:
```javascript
// Apps Script
'x-kobo-webhook-secret': 'alliance_kobo_secure_2026'

// Vercel .env
KOBO_WEBHOOK_SECRET=alliance_kobo_secure_2026
```

### Issue: "Sync Failed - 500 Internal Server Error"
**Fix:** Check Prisma schema matches sheet columns:
```bash
# Verify schema
bunx prisma db pull
bunx prisma generate
```

### Issue: "Duplicate UUID errors"
**Fix:** Run deduplication in sheet:
```javascript
// Apps Script menu: TB Engine → Remove Duplicates
REMOVE_DUPLICATE_ROWS();
```

---

## 📊 Migration Progress Tracking

**Script Properties to Monitor:**
- `SUPABASE_SYNC_CURSOR` - Current row being processed
- `SUPABASE_SYNC_TOTAL_SYNCED` - Successfully synced rows
- `SUPABASE_SYNC_TOTAL_FAILED` - Failed rows
- `LAST_SUPABASE_SYNC_TIME` - Last successful sync timestamp

**View in Apps Script:**
```javascript
function CHECK_SYNC_STATUS() {
  var props = PropertiesService.getScriptProperties();
  Logger.log('Cursor: ' + props.getProperty('SUPABASE_SYNC_CURSOR'));
  Logger.log('Synced: ' + props.getProperty('SUPABASE_SYNC_TOTAL_SYNCED'));
  Logger.log('Failed: ' + props.getProperty('SUPABASE_SYNC_TOTAL_FAILED'));
  Logger.log('Last Sync: ' + props.getProperty('LAST_SUPABASE_SYNC_TIME'));
}
```

---

## ✅ Success Criteria

- [ ] All 4 URLs updated in Apps Script
- [ ] Test function returns 200 status
- [ ] Full migration completes without errors
- [ ] Supabase row count matches sheet row count
- [ ] Manual edit sync works in real-time
- [ ] No duplicate UUIDs in database

**Status:** Ready for production migration 🚀
