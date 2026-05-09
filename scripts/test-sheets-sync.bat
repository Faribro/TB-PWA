@echo off
REM ============================================================================
REM GOOGLE SHEETS SYNC TEST - Windows Batch Version
REM ============================================================================
REM Quick test to verify complete patient data sync
REM Run: scripts\test-sheets-sync.bat

echo ============================================================================
echo GOOGLE SHEETS SYNC TEST - Complete Patient Data
echo ============================================================================
echo.

REM Check if dev server is running
echo Checking if dev server is running...
curl -s http://localhost:3000/api/health >nul 2>&1
if errorlevel 1 (
    echo ERROR: Dev server not running on http://localhost:3000
    echo Please run: bun run dev
    exit /b 1
)
echo Dev server is running
echo.

REM Load service key from .env.local
for /f "tokens=1,2 delims==" %%a in (.env.local) do (
    if "%%a"=="SUPABASE_SERVICE_ROLE_KEY" set SERVICE_KEY=%%b
)

if "%SERVICE_KEY%"=="" (
    echo ERROR: SUPABASE_SERVICE_ROLE_KEY not found in .env.local
    exit /b 1
)

echo Configuration:
echo   API URL: http://localhost:3000
echo   Service Key: SET
echo.

echo Sending update with ALL clinical fields...
echo   Patient: Chaitu Wadde
echo   KoboUUID: 8ee307a8-cbc4-42cf-bd52-3f4c53edcb77
echo   Clinical fields: 13 fields
echo.

REM Create temp JSON file
echo { > temp_payload.json
echo   "patientId": "8ee307a8-cbc4-42cf-bd52-3f4c53edcb77", >> temp_payload.json
echo   "updates": { >> temp_payload.json
echo     "inmate_name": "Chaitu Wadde", >> temp_payload.json
echo     "age": 65, >> temp_payload.json
echo     "sex": "Male", >> temp_payload.json
echo     "contact_number": "8788554035", >> temp_payload.json
echo     "screening_date": "2026-04-05", >> temp_payload.json
echo     "screening_state": "Maharashtra", >> temp_payload.json
echo     "screening_district": "Mumbai", >> temp_payload.json
echo     "facility_name": "Test Facility", >> temp_payload.json
echo     "referral_date": "2026-04-06", >> temp_payload.json
echo     "referred_facility": "DMC-Designated microscopy centre", >> temp_payload.json
echo     "tb_diagnosed": "Y", >> temp_payload.json
echo     "tb_diagnosis_date": "2026-04-10", >> temp_payload.json
echo     "tb_type": "Pulmonary", >> temp_payload.json
echo     "att_start_date": "2026-04-12", >> temp_payload.json
echo     "att_completion_date": "2026-10-12", >> temp_payload.json
echo     "hiv_status": "Negative", >> temp_payload.json
echo     "art_status": "Pre ART", >> temp_payload.json
echo     "art_number": "ART123456", >> temp_payload.json
echo     "nikshay_abha_id": "NIKSHAY789", >> temp_payload.json
echo     "registration_date": "2026-04-11", >> temp_payload.json
echo     "remarks": "Test - all clinical fields populated" >> temp_payload.json
echo   } >> temp_payload.json
echo } >> temp_payload.json

REM Send request
curl -X POST http://localhost:3000/api/patient-sync ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -d @temp_payload.json ^
  --silent ^
  --show-error ^
  --write-out "\n\nHTTP Status: %%{http_code}\n" ^
  > response.json

echo.
echo Response saved to response.json
echo.

REM Show response
type response.json
echo.

REM Cleanup
del temp_payload.json

echo ============================================================================
echo Next Steps:
echo   1. Wait 30-60 seconds for Google Sheets sync
echo   2. Check Google Sheets for KoboUUID: 8ee307a8-cbc4-42cf-bd52-3f4c53edcb77
echo   3. Verify ALL clinical columns are populated
echo   4. Check Vercel logs for [ProcessSync] messages
echo ============================================================================
