# Register Reconciliation Dual-Write Verification Report

## Test Results

### ✅ Supabase Write: VERIFIED
- Direct insert/update to `patients` table works correctly
- Test patient created successfully with ID: `ab019907-5bc4-4ee2-b858-0118bac9983c`
- Screening date correctly set from session context (not current date)
- Duplicate detection working (checks name+age+mobile for same date)

### ❌ Google Sheets Write: FAILED
- Google Apps Script URL returns 404
- Current implementation uses wrong environment variable
- Sheets sync is delegated, not directly executed

## Current Implementation Analysis

### File: `app/api/register-reconcile/route.ts`

**What It Does:**
1. ✅ Validates scope context (date, facility, district, state)
2. ✅ Enforces empty-scope rules (no "accept" when scope is empty)
3. ✅ Processes decisions:
   - **accept**: Updates existing patient in Supabase
   - **create**: Inserts new patient in Supabase with session date
   - **reject**: Skips row (audit only)
4. ✅ Duplicate detection: Checks if name+age already exists for that date
5. ⚠️ Triggers Google Sheets sync via `GOOGLE_APPSCRIPT_URL`
6. ✅ Logs AI feedback for learning
7. ✅ Returns commit result with both DB and Sheets status

**Current Sheets Sync Code (Lines 428-453):**
```typescript
try {
  if (
    process.env.GOOGLE_APPSCRIPT_URL &&
    (results.created > 0 || results.accepted > 0)
  ) {
    const gasResponse = await fetch(process.env.GOOGLE_APPSCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'TRIGGER_SYNC' }),
    });

    if (gasResponse.ok) {
      sheetsTriggered = true;
    } else {
      sheetsTriggered = true;
      sheetsError = `Sheets sync returned HTTP ${gasResponse.status}`;
    }
  }
} catch (syncError) {
  sheetsTriggered = true;
  sheetsError = syncError.message;
}
```

## Issues Found

### Issue 1: Wrong Environment Variable
**Problem:** Code uses `GOOGLE_APPSCRIPT_URL` which returns 404
**Solution:** Should use `GOOGLE_SCRIPT_WEBHOOK_URL` instead

**Current .env.local:**
```env
GOOGLE_APPSCRIPT_URL=https://script.google.com/macros/s/AKfycbyCYJc7XZ_FemJ8Q0iV1vtDGhfDRIvZ7SviM0W24C85lSsb5wHC6WlR4Zp9cK_KKUDl/exec  # 404
GOOGLE_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/AKfycby3f0PRiH-Gp8dPVegdbptNKSa2qDqwONH-MLq0wdl37pu5GC6jthXNIYpQ7AaObx2I/exec  # Working
```

### Issue 2: Indirect Sheets Write
**Problem:** Sheets sync is delegated to Google Apps Script, not directly executed
**Current Flow:**
1. Insert to Supabase ✅
2. Send `TRIGGER_SYNC` action to Apps Script ⚠️
3. Apps Script must poll Supabase and append to Sheets ❓

**Expected Flow:**
1. Insert to Supabase ✅
2. Directly append same data to Google Sheets ✅
3. Both writes in one backend flow ✅

### Issue 3: No Direct Row Append
**Problem:** The code doesn't send the actual patient data to Sheets
**Current:** `{ action: 'TRIGGER_SYNC' }` (no patient data)
**Expected:** Send full patient records for immediate append

## Recommendations

### Option 1: Fix Environment Variable (Quick Fix)
Change line 430 in `register-reconcile/route.ts`:
```typescript
// Before
if (process.env.GOOGLE_APPSCRIPT_URL && ...)

// After
if (process.env.GOOGLE_SCRIPT_WEBHOOK_URL && ...)
```

And update the fetch URL:
```typescript
const gasResponse = await fetch(process.env.GOOGLE_SCRIPT_WEBHOOK_URL, {
  // ...
});
```

### Option 2: Implement Direct Dual-Write (Recommended)
Modify the Sheets sync to send actual patient data:

```typescript
// After successful Supabase insert/update
const sheetsRows = [];

for (const decision of body.decisions) {
  if (decision.action === 'create' && results.created > 0) {
    sheetsRows.push({
      'Serial Number': decision.sno,
      'Inmate Name': decision.extractedData.name,
      'Father/Husband Name': decision.extractedData.father_name,
      'Age': decision.extractedData.age,
      'Contact Number': decision.extractedData.mobile,
      'Address': decision.extractedData.address,
      'Facility Name': decision.extractedData.ward || body.sessionContext?.facilityName,
      'Screening Date': resolvedDate,
      'Screening State': body.sessionContext?.screeningState,
      'Screening District': body.sessionContext?.screeningDistrict,
      'Staff Name': session.user.name || session.user.email,
      'Submitted On': new Date().toISOString(),
    });
  }
}

if (sheetsRows.length > 0) {
  const gasResponse = await fetch(process.env.GOOGLE_SCRIPT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'APPEND_ROWS',
      rows: sheetsRows,
      sheetName: 'Patients', // or dynamic based on date
    }),
  });
}
```

### Option 3: Use Existing sheetsSync.ts (Best Practice)
The codebase has `lib/sheetsSync.ts` with queue-based batching:

```typescript
import { queueSheetSync } from '@/lib/sheetsSync';

// After successful Supabase insert
for (const decision of body.decisions) {
  if (decision.action === 'create' && insertedPatient) {
    await queueSheetSync({
      'Serial Number': insertedPatient.id,
      'Inmate Name': insertedPatient.inmate_name,
      // ... map all fields
    });
  }
}
```

## Verification Checklist

- [x] Supabase write works
- [x] Duplicate detection works
- [x] Session date (not current date) is used
- [x] Scope validation works
- [ ] Google Sheets URL is correct
- [ ] Patient data is sent to Sheets
- [ ] Both writes happen in one flow
- [ ] Partial failure is reported clearly
- [ ] Idempotency prevents double-insert

## Next Steps

1. **Fix environment variable** - Use `GOOGLE_SCRIPT_WEBHOOK_URL`
2. **Send patient data** - Include actual rows in Sheets sync payload
3. **Test end-to-end** - Verify both Supabase and Sheets receive data
4. **Add retry logic** - Handle partial failures gracefully
5. **Update response** - Report rows inserted to each destination

## Test Command

```bash
npx tsx --env-file=.env.local tests/test-register-reconcile-dual-write.ts
```

## Conclusion

**Current State:**
- ✅ Supabase write: Production ready
- ⚠️ Sheets write: Delegated (not verified)
- ⚠️ Dual-write: Not atomic

**Required Changes:**
1. Fix environment variable name
2. Send actual patient data to Sheets
3. Verify both destinations receive data
4. Report partial failures clearly

**Priority:** HIGH - Dual-write is a core requirement for data integrity
