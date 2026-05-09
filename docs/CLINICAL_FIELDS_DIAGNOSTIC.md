# Clinical Fields Not Persisting - Diagnostic Guide

## Problem
Clinical fields (referral_date, tb_diagnosed, etc.) are being saved via the form but returning as `null` in the API response.

## Evidence from Console Logs

```javascript
// User fills form:
watchedReferralDate: 2026-05-21
watchedFacility: DMC-Designated microscopy centre
watchedTbDiagnosed: Y

// API response shows:
referral_date: null
referred_facility: null
tb_diagnosed: null
```

## Root Cause Analysis

The issue is that the **database columns don't exist** or the **field mapping is incorrect**.

## Diagnostic Steps

### Step 1: Check Browser Network Tab

1. Open DevTools → Network tab
2. Click "Submit Clinical Update"
3. Find the `/api/patient-sync` request
4. Check the **Request Payload**:
   ```json
   {
     "patientId": "...",
     "updates": {
       "referral_date": "2026-05-21",
       "referred_facility": "DMC-Designated microscopy centre",
       ...
     }
   }
   ```
5. Check the **Response**:
   ```json
   {
     "success": true,
     "patient": {
       "referral_date": null,  ← Should be "2026-05-21"
       "referred_facility": null,  ← Should be "DMC-Designated microscopy centre"
       ...
     }
   }
   ```

### Step 2: Check Server Logs

Look for these log lines in the terminal running `bun run dev`:

```
[patient-sync] STEP 4 - FINAL DB UPDATES:
  dbUpdates keys: [...]
  "referral_date": "2026-05-21"
  "referred_facility": "DMC-Designated microscopy centre"

[patient-sync] STEP 5 - SUPABASE WRITE RESULT:
  dbError: null  ← Should be null (no error)
  updatedPatient fields:
    "referral_date": null  ← BUG: Should be "2026-05-21"
```

### Step 3: Verify Database Schema

Run this SQL in Supabase SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' 
AND column_name IN (
  'referral_date',
  'referred_facility',
  'tb_diagnosed',
  'tb_diagnosis_date',
  'tb_type',
  'att_start_date',
  'hiv_status',
  'art_status',
  'nikshay_abha_id'
);
```

Expected output: All 9 columns should exist.

If columns are missing, run:

```sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referral_date DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referred_facility TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS tb_diagnosed TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS tb_diagnosis_date DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS tb_type TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS att_start_date DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS hiv_status TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS art_status TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS nikshay_abha_id TEXT;
```

### Step 4: Test Direct Database Write

Run this SQL to test if columns can be written:

```sql
UPDATE patients 
SET 
  referral_date = '2026-05-21',
  referred_facility = 'DMC-Designated microscopy centre',
  tb_diagnosed = 'Y'
WHERE id = 'b1a63138-d973-4fe9-b7bc-075b2bc5a1fa';

-- Verify
SELECT 
  id,
  referral_date,
  referred_facility,
  tb_diagnosed
FROM patients 
WHERE id = 'b1a63138-d973-4fe9-b7bc-075b2bc5a1fa';
```

## Expected Findings

One of these will be true:

1. **Columns don't exist** → Add them with ALTER TABLE
2. **Columns exist but RLS blocks writes** → Check RLS policies
3. **Columns exist and write succeeds** → Bug is in API field mapping
4. **API uses wrong patient ID** → Check id vs kobo_uuid consistency

## Next Steps

Based on the diagnostic results, apply the appropriate fix:

- **Missing columns**: Run ALTER TABLE statements
- **RLS issue**: Update RLS policies to allow service role writes
- **Field mapping**: Fix FIELD_MAPPING in `app/api/patient-sync/route.ts`
- **ID mismatch**: Ensure consistent use of database `id` field
