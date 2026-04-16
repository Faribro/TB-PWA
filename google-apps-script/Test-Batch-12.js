/**
 * Test what's in the 207 response from batch 12
 */
function testBatch12Response() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Patient Linelist_TB');
  var allData = sheet.getDataRange().getValues();
  var dataRows = allData.slice(3);
  
  // Get batch 12 data (rows 5500-5999)
  var batch12Rows = dataRows.slice(5500, 6000);
  
  Logger.log('Testing batch 12 (500 records starting at row 5500)');
  Logger.log('First row kobo_uuid: ' + batch12Rows[0][32]);
  Logger.log('Last row kobo_uuid: ' + batch12Rows[499][32]);
  
  // Map to JSON
  var batch12Data = [];
  for (var i = 0; i < batch12Rows.length; i++) {
    var row = batch12Rows[i];
    var cleanUuid = String(row[32] || '').replace(/^uuid:/i, '').trim();
    
    if (!cleanUuid) {
      Logger.log('⚠️ Row ' + (5500 + i) + ' has no kobo_uuid!');
      continue;
    }
    
    batch12Data.push({
      unique_id: String(row[7] || '').trim(),
      kobo_uuid: cleanUuid,
      inmate_name: row[8] || null,
      screening_state: row[2] || null,
      screening_district: row[3] || null,
      facility_name: row[4] || null,
      facility_type: row[5] || null,
      age: row[12] || null,
      sex: row[13] || null
    });
  }
  
  Logger.log('Batch 12 valid records: ' + batch12Data.length);
  
  // Send to endpoint
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 
      'x-kobo-webhook-secret': 'alliance_kobo_secure_2026'
    },
    payload: JSON.stringify({ 
      patients: batch12Data,
      source: 'BATCH_12_TEST'
    }),
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(
    'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase',
    options
  );
  
  var code = response.getResponseCode();
  var body = response.getContentText();
  
  Logger.log('═══════════════════════════════════════════════════════════════');
  Logger.log('Response Code: ' + code);
  Logger.log('Response Body: ' + body);
  Logger.log('═══════════════════════════════════════════════════════════════');
  
  if (code === 207) {
    try {
      var errorData = JSON.parse(body);
      Logger.log('\n📊 PARSED ERROR DATA:');
      Logger.log('Message: ' + errorData.message);
      if (errorData.errors) {
        Logger.log('Errors:');
        for (var i = 0; i < errorData.errors.length; i++) {
          Logger.log('  ' + (i+1) + '. ' + errorData.errors[i]);
        }
      }
      if (errorData.stats) {
        Logger.log('Stats: ' + JSON.stringify(errorData.stats));
      }
    } catch (e) {
      Logger.log('Could not parse JSON: ' + e.message);
    }
  }
}
