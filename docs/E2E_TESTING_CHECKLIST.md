# 🧪 COMPREHENSIVE E2E TESTING CHECKLIST

## Prerequisites
- ✅ Dev server running on localhost:3000 OR deployed to production
- ✅ Test patient ID: `fdf26115-5782-4afc-aba4-2ac44585508f`
- ✅ Browser DevTools open (Console tab)

---

## TEST 1: Date Input Fix Verification

### Steps:
1. Navigate to `/dashboard/vertex` or `/dashboard/follow-up`
2. Click on test patient "Riyaz mansuri"
3. Click "Demographics" tab
4. Click "Unlock to Edit" button
5. Change **screening_date** from `2026-05-01` to `2026-05-02`
6. Click "Save Changes"

### Expected Results:
✅ Browser console shows:
```
[PatientDetailDrawer] 🔍 BEFORE SAVE - editedDemographics.screeningdate: 2026-05-02
[patient-sync] 🔍 PAYLOAD screening_date: 2026-05-02
[PatientDetailDrawer] ✅ Demographics save successful
[PatientDetailDrawer] 🔍 RESPONSE patient screening_date: 2026-05-02
```

✅ Date persists as `2026-05-02` (does NOT revert to `2026-05-01`)

❌ **FAIL if**: Date reverts to old value after save

---

## TEST 2: All Field Types Update

### Steps:
1. With patient drawer still open, unlock editing
2. Update the following fields:

**Text Fields:**
- inmate_name: "Test Patient E2E"
- father_husband_name: "Test Father"
- contact_number: "9876543210"
- address: "123 Test Street, Test City"

**Date Fields:**
- date_of_birth: "1990-01-15"
- referral_date: "2026-05-03"
- diagnosis_date: "2026-05-04"

**Number Fields:**
- age: 34

**Select Fields:**
- sex: "male"
- screening_state: "Gujarat"
- xray_result: "Suspected TB Case"

**Checkbox Fields:**
- tb_diagnosed: Toggle to "Yes"

3. Click "Save Changes"

### Expected Results:
✅ All fields save successfully
✅ Console shows `✅ Demographics save successful`
✅ No errors in console
✅ All fields persist after save (don't revert)

---

## TEST 3: Supabase Verification

### Steps:
1. Open Supabase Dashboard: https://supabase.com/dashboard/project/fgtrkxadiszoyhslwesu
2. Navigate to Table Editor → `patients` table
3. Find patient with ID: `fdf26115-5782-4afc-aba4-2ac44585508f`
4. Verify the following fields match your updates:

### Expected Results:
✅ `screening_date` = `2026-05-02` (not ISO timestamp)
✅ `inmate_name` = "Test Patient E2E"
✅ `date_of_birth` = `1990-01-15`
✅ `age` = 34
✅ `sex` = "male"
✅ `xray_result` = "Suspected TB Case"
✅ `tb_diagnosed` = "Yes" or "Y"

❌ **FAIL if**: Any field doesn't match or shows old value

---

## TEST 4: Google Sheets Sync Verification

### Steps:
1. Open Google Sheets (TB Screening Register)
2. Find row with KoboUUID: `bcbfffbf-2853-4da3-a9be-20077e28f45a`
3. Verify fields match Supabase

### Expected Results:
✅ All updated fields appear in Google Sheets
✅ Dates are in correct format (yyyy-MM-dd or dd/mm/yyyy depending on sheet format)
✅ No sync errors in sheet

⏱️ **Note**: Sheets sync may take 2-5 seconds. Refresh if needed.

---

## TEST 5: Vertex Data Source (Screening Date)

### Steps:
1. Navigate to `/dashboard/vertex`
2. Open browser DevTools → Network tab
3. Find request to `/api/patients` or `/api/vertex/metrics`
4. Check the response JSON

### Expected Results:
✅ Patient record includes `screening_date` field
✅ `screening_date` = `2026-05-02` (matches your update)
✅ Vertex timeline/calendar uses `screening_date` (not `submitted_on`)

### Verification:
```javascript
// In browser console, run:
fetch('/api/patients')
  .then(r => r.json())
  .then(data => {
    const patient = data.patients.find(p => p.id === 'fdf26115-5782-4afc-aba4-2ac44585508f');
    console.log('screening_date:', patient.screening_date);
    console.log('submitted_on:', patient.submitted_on);
  });
```

✅ `screening_date` should be present and correct
✅ Vertex should use `screening_date` for timeline positioning

---

## TEST 6: Real-time Update Propagation

### Steps:
1. Open `/dashboard/vertex` in Browser Window 1
2. Open same patient in Browser Window 2
3. In Window 2: Update a field (e.g., contact_number)
4. Click "Save Changes" in Window 2
5. Watch Window 1 for real-time update

### Expected Results:
✅ Window 1 receives real-time update notification
✅ Patient data refreshes automatically in Window 1
✅ Console shows: `⚠️ Realtime update received`

⏱️ **Note**: Update should appear within 1-2 seconds

---

## TEST 7: Date Format Consistency

### Steps:
1. Check all date fields in patient drawer
2. Verify format is consistent

### Expected Results:
✅ All date inputs show `yyyy-MM-dd` format
✅ No ISO timestamps visible in UI (e.g., `2026-05-01T00:00:00+00:00`)
✅ Date pickers work correctly (can select dates)

---

## TEST 8: Multiple Field Updates (Stress Test)

### Steps:
1. Unlock editing
2. Update 10+ fields simultaneously
3. Save changes
4. Verify all fields persist

### Expected Results:
✅ All fields save successfully
✅ No fields revert to old values
✅ No console errors
✅ Supabase shows all updates
✅ Google Sheets syncs all updates

---

## AUTOMATED TEST (Optional)

If dev server is running on localhost:3000:

```bash
npm run test:e2e:comprehensive
```

### Expected Output:
```
📊 RESULTS: 5/5 tests passed (100.0%)
🎉 ALL TESTS PASSED! System is working correctly.
```

---

## TROUBLESHOOTING

### Issue: Date reverts after save
**Cause**: Real-time subscription overwriting change
**Fix**: Check console for `⚠️ Realtime update received` - may need to disable realtime during save

### Issue: Fields don't save
**Cause**: API error or validation failure
**Fix**: Check console for error messages, verify all required fields

### Issue: Sheets not syncing
**Cause**: Webhook failure or network issue
**Fix**: Check `/api/sync-sheets` endpoint, verify `GOOGLE_SCRIPT_WEBHOOK_URL`

### Issue: Vertex shows wrong date
**Cause**: Using `submitted_on` instead of `screening_date`
**Fix**: Verify API response includes `screening_date` field

---

## SUCCESS CRITERIA

✅ **All 8 tests pass**
✅ **No console errors**
✅ **Data persists in Supabase**
✅ **Google Sheets syncs correctly**
✅ **Vertex uses screening_date**
✅ **Real-time updates work**
✅ **All field types update correctly**

---

## REPORTING ISSUES

If any test fails, provide:
1. Test number that failed
2. Browser console logs (full output)
3. Network tab screenshot (API requests)
4. Supabase table screenshot (patient row)
5. Expected vs actual behavior

---

**Last Updated**: 2026-05-05
**Test Patient**: Riyaz mansuri (ID: fdf26115-5782-4afc-aba4-2ac44585508f)
