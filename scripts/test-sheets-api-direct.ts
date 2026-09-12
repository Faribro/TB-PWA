import { google } from 'googleapis';

async function inspectSheets() {
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
  const credentials = JSON.parse(keyRaw);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // 1. PC Sheet
  const pcSheetId = '1DAlZODhgi1qT6cmEdYYdubvLjQERyhenfUPJ85BO2cU';
  const pcRes = await sheets.spreadsheets.values.get({
    spreadsheetId: pcSheetId,
    range: `'Jan 26 '!A1:Z5`,
  });

  console.log('═══════════════ MAHARASHTRA PC SHEET (Jan 26 ) ═══════════════');
  pcRes.data.values?.forEach((row, i) => {
    console.log(`Row ${i + 1}:`, JSON.stringify(row));
  });

  // 2. SPM Sheet
  const spmSheetId = '1WVQmeHAF9dmDgOZPBDep5AgdcahCL-DuTC_76pagvxg';
  const spmMeta = await sheets.spreadsheets.get({ spreadsheetId: spmSheetId });
  console.log(`\n═══════════════ MAHARASHTRA SPM SHEET ═══════════════`);
  console.log(`Title: "${spmMeta.data.properties?.title}"`);
  console.log('Tabs:', spmMeta.data.sheets?.map(s => s.properties?.title));

  const spmTab = spmMeta.data.sheets?.[0]?.properties?.title || 'Sheet1';
  const spmRes = await sheets.spreadsheets.values.get({
    spreadsheetId: spmSheetId,
    range: `'${spmTab}'!A1:AF4`,
  });
  spmRes.data.values?.forEach((row, i) => {
    console.log(`Row ${i + 1}:`, JSON.stringify(row));
  });
}

inspectSheets().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
