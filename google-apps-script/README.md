# Google Apps Script - Dual-Hybrid Webhook Handler

## Overview

This Apps Script handles three types of webhooks:
1. **Next.js Dashboard Updates** - Reverse sync from UI to Google Sheets
2. **Supabase Database Webhooks** - Real-time triggers from database
3. **KoboToolbox Form Submissions** - Original form data sync

## Deployment Instructions

### Step 1: Open Google Apps Script Editor

1. Open your Google Sheet
2. Click **Extensions** → **Apps Script**
3. Delete any existing code in `Code.gs`

### Step 2: Copy the Code

1. Open `doPost-dual-hybrid.js` in this folder
2. Copy the entire contents
3. Paste into the Apps Script editor

### Step 3: Update Configuration

Update these constants at the top of the file:

```javascript
const SHEET_NAME = 'TB Screening Data'; // Your actual sheet name
const WEBHOOK_SECRET = 'alliance_kobo_secure_2026';
```

### Step 4: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ → Select **Web app**
3. Configure:
   - **Description**: "TB PWA Dual-Hybrid Webhook Handler"
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
4. Click **Deploy**
5. **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/AKfycby.../exec`)

### Step 5: Update Environment Variables

Add the Web App URL to your `.env.local`:

```env
GOOGLE_APPSCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

## Testing

### Test 1: Next.js Update (Reverse Sync)

```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_patient",
    "uniqueId": "MPDJCJ00001",
    "updates": {
      "Date of starting ATT (dd/mm/yyyy)": "25/03/2026",
      "Remarks": "Patient started treatment"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Patient updated successfully",
  "uniqueId": "MPDJCJ00001",
  "updatedColumns": ["Date of starting ATT (dd/mm/yyyy)", "Remarks"]
}
```

### Test 2: Supabase Webhook (INSERT)

```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "record": {
      "unique_id": "TEST001",
      "inmate_name": "Test Patient",
      "age": 30
    }
  }'
```

### Test 3: Get Existing UUIDs

```bash
curl -X GET "YOUR_WEB_APP_URL?x-kobo-webhook-secret=alliance_kobo_secure_2026"
```

**Expected Response:**
```json
[
  "6a6f4feb-2504-49ca-8fad-e7cff33ea481",
  "8b7c5dea-3615-5acb-9fbe-f8d0f44fb592",
  ...
]
```

## Webhook Routes

### Route 1: Next.js Dashboard Update
**Trigger:** `payload.action === 'update_patient'`
**Handler:** `handleNextjsUpdate_()`
**Purpose:** Sync UI changes back to Google Sheets

### Route 2: Supabase INSERT Webhook
**Trigger:** `payload.type === 'INSERT'`
**Handler:** `handleSupabaseInsert_()`
**Purpose:** Add new Supabase records to Google Sheets

### Route 3: Supabase UPDATE Webhook
**Trigger:** `payload.type === 'UPDATE'`
**Handler:** `handleNextjsUpdate_()`
**Purpose:** Update existing records from Supabase triggers

### Route 4: KoboToolbox Submission
**Trigger:** `payload._uuid || payload.uuid`
**Handler:** `handleKoboSubmission_()`
**Purpose:** Process form submissions from KoboToolbox

## Troubleshooting

### Error: "Sheet not found"
- Check that `SHEET_NAME` matches your actual sheet name exactly
- Sheet names are case-sensitive

### Error: "Unique ID column not found"
- Ensure your sheet has a column named "Unique ID"
- Check for extra spaces in the column header

### Error: "Patient not found"
- The `uniqueId` doesn't exist in the sheet
- Check the "Unique ID" column for the value

### Error: "Unauthorized"
- The webhook secret doesn't match
- Check that you're sending the correct secret

## Logs

View execution logs:
1. In Apps Script editor, click **Executions** (clock icon)
2. Click on any execution to see detailed logs
3. Look for `Logger.log()` messages

## Security

- ✅ Protected by webhook secret
- ✅ Script lock prevents concurrent modifications
- ✅ Error handling with detailed logging
- ✅ Timeout protection (30 seconds)

## Next Steps

1. ✅ Deploy the script
2. ✅ Update `.env.local` with Web App URL
3. ✅ Test with curl commands
4. ✅ Update a patient in Next.js UI
5. ✅ Verify the change appears in Google Sheets

## Support

If you encounter issues:
1. Check the Apps Script execution logs
2. Verify the webhook secret matches
3. Test with curl commands first
4. Check that column names match exactly
