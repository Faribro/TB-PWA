# 🚨 URGENT: Update Google Apps Script for Batch Support

## Problem
The current Google Apps Script doesn't support batch operations, so the 267 records we sent are not appearing in Google Sheets.

## Solution
Deploy the new batch-enabled script that handles:
- ✅ Batch operations (50+ records at once)
- ✅ Single record updates
- ✅ Upsert logic (update if exists, insert if new)

## Deployment Steps

### Step 1: Open Google Apps Script Editor

1. Open your Google Sheet: **Patient Linelist_TB**
2. Click **Extensions** → **Apps Script**
3. You should see the existing `doPost` function

### Step 2: Replace with New Code

1. **Select ALL existing code** in the editor (Ctrl+A)
2. **Delete it**
3. Open `google-apps-script/doPost-batch-enabled.js` from this repository
4. **Copy the entire contents**
5. **Paste** into the Apps Script editor

### Step 3: Verify Configuration

Check these lines at the top of the script:

```javascript
const SHEET_NAME = 'Patient Linelist_TB'; // ✅ Must match your sheet name EXACTLY
const WEBHOOK_SECRET = 'alliance_kobo_secure_2026';
```

### Step 4: Save and Deploy

1. Click **💾 Save** (or Ctrl+S)
2. Click **Deploy** → **Manage deployments**
3. Click the **✏️ Edit** icon (pencil) next to your existing deployment
4. Under "Version", select **New version**
5. Add description: "Added batch operation support"
6. Click **Deploy**
7. Click **Done**

### Step 5: Test the Deployment

Run this command to test:

```bash
bun run scripts/verify-last-sync.js
```

Expected output:
```
✅ WEBHOOK IS WORKING
✅ Data should appear in Google Sheets
```

### Step 6: Re-sync May 2026 Records

Once the script is deployed, run:

```bash
bun run scripts/sync-may-records.ts
```

This will send all 267 records again, and this time they should appear in Google Sheets!

## What Changed?

### NEW: Batch Operation Handler

```javascript
function handleBatchOperation_(payload) {
  // Processes array of records
  // Upserts based on KoboUUID
  // Returns stats: updated, inserted, errors
}
```

### Payload Format

The script now accepts:

```json
{
  "batch": [
    {
      "kobo_uuid": "abc-123",
      "inmate_name": "John Doe",
      "age": 30,
      ...
    },
    ...
  ],
  "batch_id": "manual-sync-may-1",
  "count": 50
}
```

## Troubleshooting

### Error: "Sheet not found"
- Check that `SHEET_NAME` matches your actual sheet name
- Sheet names are case-sensitive

### Error: "KoboUUID column not found"
- Ensure your sheet has a column named "KoboUUID" or "kobo_uuid"
- Check for extra spaces in the column header

### Script doesn't save
- Make sure you're logged in with the correct Google account
- Check that you have edit permissions on the sheet

### Deployment fails
- Try creating a **New deployment** instead of editing existing one
- Make sure "Execute as" is set to **Me**
- Make sure "Who has access" is set to **Anyone**

## Verification

After deployment, check the Apps Script execution logs:

1. In Apps Script editor, click **Executions** (clock icon)
2. Look for recent executions
3. Click on any execution to see logs
4. You should see: "Processing batch: manual-sync-may-X with Y records"

## Next Steps

1. ✅ Deploy the new script
2. ✅ Test with `verify-last-sync.js`
3. ✅ Re-run `sync-may-records.ts`
4. ✅ Check Google Sheet for 267 new records
5. ✅ Verify data appears correctly

## Support

If you encounter issues:
1. Check the Apps Script execution logs
2. Verify the webhook URL is correct in `.env.local`
3. Test with a single record first
4. Check that column names match between Supabase and Google Sheets
