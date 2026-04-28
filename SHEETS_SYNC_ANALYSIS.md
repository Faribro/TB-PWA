# Google Sheets Sync Timeout - Root Cause Analysis

## 🔴 Critical Issue
Google Sheets sync consistently timing out after 15-30 seconds, causing data sync failures.

## 🔍 Deep Analysis

### Root Cause #1: Wrong Environment Variable Name
**Problem:** Code expects `GOOGLE_SCRIPT_WEBHOOK_URL` but `.env.production` has `GOOGLE_APPSCRIPT_URL`

**Evidence:**
```typescript
// lib/sheetsSync.ts line 30
const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;

// .env.production (WRONG)
GOOGLE_APPSCRIPT_URL=https://script.google.com/...

// Should be:
GOOGLE_SCRIPT_WEBHOOK_URL=https://script.google.com/...
```

**Impact:** `webhookUrl` is `undefined`, causing the function to skip sync entirely OR use a fallback URL.

### Root Cause #2: Wrong Webhook URL
**Problem:** Even if the variable name was correct, the URL points to the wrong Google Apps Script deployment.

**Current (WRONG):**
```
AKfycbyCYJc7XZ_FemJ8Q0iV1vtDGhfDRIvZ7SviM0W24C85lSsb5wHC6WlR4Zp9cK_KKUDl
```

**Correct (PRODUCTION):**
```
AKfycby3f0PRiH-Gp8dPVegdbptNKSa2qDqwONH-MLq0wdl37pu5GC6jthXNIYpQ7AaObx2I
```

**Impact:** Requests go to an old/inactive deployment that either:
- Times out (no response)
- Returns errors
- Has outdated code

### Root Cause #3: Google Apps Script Performance
**Problem:** Even with correct URL, Google Apps Script can be slow due to:

1. **Cold Start Penalty** (5-10s)
   - Script hasn't run recently
   - Google needs to spin up execution environment
   - First request after idle period is always slow

2. **Sheets API Latency** (2-5s per operation)
   - Reading existing data to find matching row
   - Writing/updating cells
   - Formatting operations

3. **Script Complexity** (variable)
   - Row scanning logic
   - Data transformation
   - Error handling

4. **Google Quota Limits**
   - 6 minutes execution time per script
   - 30 seconds per HTTP request
   - Rate limiting on Sheets API

### Root Cause #4: Network Latency
**Problem:** Round-trip time from Vercel → Google Apps Script → Google Sheets

**Typical Flow:**
```
Next.js API (Vercel US)
  ↓ 100-200ms
Google Apps Script (Google Cloud)
  ↓ 500-1000ms
Google Sheets API
  ↓ 500-1000ms
Write to Sheet
  ↓ 500-1000ms
Return response
  ↓ 100-200ms
Back to Next.js

Total: 1.7s - 3.4s (best case)
Cold start: +5-10s
Large dataset: +5-15s
```

## 📊 Timeline Analysis

From production logs:
```
12:48:32 - Attempt 1 starts (15s timeout)
12:48:47 - Timeout (15s elapsed)
12:48:49 - Attempt 2 starts (after 2s backoff)
12:49:04 - Timeout (15s elapsed)
12:49:06 - Attempt 3 starts (after 2s backoff)
12:49:21 - Timeout (15s elapsed)
12:49:21 - All attempts failed
```

**Total time wasted:** 49 seconds per save operation

## ✅ Solution Implemented

### Fix #1: Correct Environment Variable
```bash
# Added to .env.production
GOOGLE_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/AKfycby3f0PRiH-Gp8dPVegdbptNKSa2qDqwONH-MLq0wdl37pu5GC6jthXNIYpQ7AaObx2I/exec
```

### Fix #2: Increased Timeout
```typescript
// Changed from 15s to 30s
signal: AbortSignal.timeout(30000)
```

### Fix #3: Reduced Retries
```typescript
// Changed from 2 retries to 1 retry
const maxRetries = 1;
```

**Rationale:** 
- 30s timeout gives Google Apps Script enough time for cold starts
- 1 retry (2 total attempts) = max 62s total (30s + 2s + 30s)
- Prevents excessive delays while still providing resilience

### Fix #4: Better Error Logging
```typescript
console.error(`[sheetsSync] ⏱️ Timeout on attempt ${attempt + 1}/${maxRetries + 1} (30s limit)`);
```

## 🎯 Expected Outcome

**Before:**
- ❌ 100% timeout rate
- ❌ 49s wasted per save
- ❌ No data synced to Sheets
- ❌ Wrong webhook URL

**After:**
- ✅ 90%+ success rate (with correct URL)
- ✅ 2-5s average sync time
- ✅ 30s max wait (acceptable for background sync)
- ✅ Correct production webhook

## 🔧 Verification Steps

1. **Check environment variable in Vercel:**
   ```bash
   vercel env ls
   # Should show GOOGLE_SCRIPT_WEBHOOK_URL
   ```

2. **Test webhook directly:**
   ```bash
   curl -X POST https://script.google.com/macros/s/AKfycby3f0PRiH-Gp8dPVegdbptNKSa2qDqwONH-MLq0wdl37pu5GC6jthXNIYpQ7AaObx2I/exec \
     -H "Content-Type: application/json" \
     -d '{"batch":[{"id":"test","inmate_name":"Test"}],"batch_id":"test-123"}'
   ```

3. **Monitor production logs:**
   ```
   [sheetsSync] ✅ Mirror sync update: <kobo_uuid>
   ```

4. **Check Google Sheets:**
   - Open sheet: https://docs.google.com/spreadsheets/d/1fxIkpJokvzUR9_IPEzyGbivEXpNgS5JbzWopLhCYaTs
   - Verify recent updates appear

## 🚨 If Still Timing Out

### Option A: Optimize Google Apps Script
```javascript
// Add caching
const cache = CacheService.getScriptCache();

// Batch operations
sheet.getRange(startRow, 1, numRows, numCols).setValues(data);

// Use filter instead of loop
const matchingRows = data.filter(row => row[0] === koboUuid);
```

### Option B: Use Supabase Webhook Instead
```typescript
// Create Supabase webhook function
// Trigger on INSERT/UPDATE
// Call Google Apps Script from Supabase edge function
// Benefit: Runs in background, never blocks main save
```

### Option C: Queue System
```typescript
// Use Vercel Queue or Upstash QStash
// Push sync jobs to queue
// Process asynchronously
// Retry with exponential backoff
```

### Option D: Disable Sheets Sync
```typescript
// If Sheets is not critical, disable temporarily
if (!webhookUrl || process.env.DISABLE_SHEETS_SYNC === 'true') {
  console.log('[sheetsSync] Sheets sync disabled');
  return;
}
```

## 📈 Performance Metrics to Monitor

1. **Success Rate:** Target >95%
2. **Average Latency:** Target <5s
3. **P95 Latency:** Target <15s
4. **P99 Latency:** Target <30s
5. **Timeout Rate:** Target <5%

## 🔗 Related Files

- `lib/sheetsSync.ts` - Sync implementation
- `.env.production` - Production environment variables
- `app/api/patient-sync/route.ts` - API that calls sync
- `google-apps-script/` - Apps Script source code

## 📝 Action Items

- [x] Add correct `GOOGLE_SCRIPT_WEBHOOK_URL` to `.env.production`
- [x] Increase timeout to 30s
- [x] Reduce retries to 1
- [ ] Update Vercel environment variables
- [ ] Deploy and test in production
- [ ] Monitor logs for 24 hours
- [ ] Optimize Google Apps Script if still slow
- [ ] Consider queue system for long-term solution
