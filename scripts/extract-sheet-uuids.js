/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GOOGLE SHEETS UUID EXTRACTOR
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Extract all valid UUIDs from Google Sheets
 * Output: JavaScript array ready to paste into hard-sync-deletions.js
 * 
 * Usage:
 *   1. Run: node scripts/extract-sheet-uuids.js
 *   2. Copy the output array
 *   3. Paste into VALID_UUIDS in hard-sync-deletions.js
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { google } = require('googleapis');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1fxIkpJokvzUR9_IPEzyGbivEXpNgS5JbzWopLhCYaTs';
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

if (!SERVICE_ACCOUNT_KEY) {
  console.error('❌ Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function extractUUIDs() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 GOOGLE SHEETS UUID EXTRACTOR');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    // Parse service account credentials
    const credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
    
    // Authenticate with Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('🔐 Authenticating with Google Sheets API...');
    console.log(`📄 Sheet ID: ${SHEET_ID}\n`);

    // Fetch all data from the sheet
    console.log('📥 Fetching data from Google Sheets...');
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:A', // Adjust range if UUID is in a different column
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.error('❌ No data found in sheet');
      process.exit(1);
    }

    console.log(`✅ Fetched ${rows.length.toLocaleString()} rows\n`);

    // Extract UUIDs (skip header row)
    const uuids = rows
      .slice(1) // Skip header
      .map(row => row[0]) // Get first column
      .filter(uuid => uuid && uuid.trim() !== '') // Remove empty values
      .filter(uuid => uuid.toLowerCase() !== 'test') // Remove "test" entries
      .filter(uuid => uuid.toLowerCase() !== 'blank'); // Remove "blank" entries

    console.log('📊 Extraction Results:');
    console.log(`   • Total rows:        ${rows.length.toLocaleString()}`);
    console.log(`   • Valid UUIDs:       ${uuids.length.toLocaleString()}`);
    console.log(`   • Filtered out:      ${(rows.length - 1 - uuids.length).toLocaleString()}\n`);

    // Output as JavaScript array
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('📋 COPY THE ARRAY BELOW AND PASTE INTO hard-sync-deletions.js');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    
    console.log('const VALID_UUIDS = [');
    
    // Output in chunks of 5 for readability
    for (let i = 0; i < uuids.length; i += 5) {
      const chunk = uuids.slice(i, i + 5);
      const line = chunk.map(uuid => `  '${uuid}'`).join(',\n');
      console.log(line + (i + 5 < uuids.length ? ',' : ''));
    }
    
    console.log('];\n');

    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ EXTRACTION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN SCRIPT
// ═══════════════════════════════════════════════════════════════════════════

extractUUIDs();
