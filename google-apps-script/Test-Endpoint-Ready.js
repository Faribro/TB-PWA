/**
 * Quick test to verify endpoint is ready for full sync
 */
function testEndpointReady() {
  var testData = [{
    unique_id: 'TEST001',
    kobo_uuid: 'test-uuid-' + new Date().getTime(),
    inmate_name: 'Test Patient',
    screening_state: 'Test State',
    screening_district: 'Test District',
    facility_name: 'Test Facility',
    facility_type: 'Prison',
    age: 30,
    sex: 'Male'
  }];
  
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 
      'x-kobo-webhook-secret': 'alliance_kobo_secure_2026'
    },
    payload: JSON.stringify({ 
      patients: testData,
      source: 'ENDPOINT_TEST'
    }),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(
      'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase',
      options
    );
    
    var code = response.getResponseCode();
    var body = response.getContentText();
    
    Logger.log('Response Code: ' + code);
    Logger.log('Response Body: ' + body);
    
    if (code === 200) {
      Logger.log('✅ Endpoint is ready! You can run the full sync now.');
      return true;
    } else {
      Logger.log('⚠️ Endpoint returned ' + code + ' - wait 1 more minute');
      return false;
    }
  } catch (e) {
    Logger.log('❌ Error: ' + e.message);
    return false;
  }
}
