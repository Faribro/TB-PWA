@echo off
REM ============================================================================
REM GOOGLE SHEETS SYNC TEST - Complete Real Data (19 Fields)
REM ============================================================================
REM Tests demographic fields 1-19, then you can update clinical fields
REM Run: scripts\test-real-data.bat

echo ============================================================================
echo GOOGLE SHEETS SYNC TEST - Complete Real Data
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

echo Creating test patient with COMPLETE demographic data (19 fields)...
echo.
echo Field Mapping:
echo   1. Name of the Staff: Dr. Rajesh Kumar
echo   2. Submitted On: 2026-05-04
echo   3. State: Maharashtra
echo   4. District: Nagpur
echo   5. Facility Name: Central Jail Nagpur
echo   6. Facility type: Prison
echo   7. Date of Screening: 2026-05-04
echo   8. Unique ID: TEST-CJ-NGP-001
echo   9. Inmate Name: Ramesh Patil
echo   10. Inmate type: Convicted
echo   11. Father/Husband Name: Shankar Patil
echo   12. Date of Birth: 1985-03-15
echo   13. Age: 41
echo   14. Sex: Male
echo   15. Contact Number: 9876543210
echo   16. Address: Village Kamptee, Nagpur, Maharashtra
echo   17. Chest X-ray Result: Suspected TB Case
echo   18. 10s Symptoms Present: Cough of any duration, Fever
echo   19. Past history of TB: No
echo.

REM Create temp JSON file with COMPLETE demographic data
echo { > temp_payload.json
echo   "patientId": "TEST-REAL-DATA-001", >> temp_payload.json
echo   "updates": { >> temp_payload.json
echo     "kobo_uuid": "TEST-REAL-DATA-001", >> temp_payload.json
echo     "staff_name": "Dr. Rajesh Kumar", >> temp_payload.json
echo     "submitted_on": "2026-05-04", >> temp_payload.json
echo     "screening_state": "Maharashtra", >> temp_payload.json
echo     "screening_district": "Nagpur", >> temp_payload.json
echo     "facility_name": "Central Jail Nagpur", >> temp_payload.json
echo     "facility_type": "Prison", >> temp_payload.json
echo     "screening_date": "2026-05-04", >> temp_payload.json
echo     "unique_id": "TEST-CJ-NGP-001", >> temp_payload.json
echo     "inmate_name": "Ramesh Patil", >> temp_payload.json
echo     "inmate_type": "Convicted", >> temp_payload.json
echo     "father_husband_name": "Shankar Patil", >> temp_payload.json
echo     "date_of_birth": "1985-03-15", >> temp_payload.json
echo     "age": 41, >> temp_payload.json
echo     "sex": "Male", >> temp_payload.json
echo     "contact_number": "9876543210", >> temp_payload.json
echo     "address": "Village Kamptee, Nagpur, Maharashtra", >> temp_payload.json
echo     "xray_result": "Suspected TB Case", >> temp_payload.json
echo     "symptoms_10s": "Cough of any duration, Fever", >> temp_payload.json
echo     "tb_past_history": "No" >> temp_payload.json
echo   } >> temp_payload.json
echo } >> temp_payload.json

echo Sending to /api/patient-sync...
echo.

REM Send request
curl -X POST http://localhost:3000/api/patient-sync ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -d @temp_payload.json ^
  --silent ^
  --show-error ^
  --write-out "\n\nHTTP Status: %%{http_code}\n" ^
  > response.json

echo Response saved to response.json
echo.

REM Show response
type response.json
echo.

REM Cleanup
del temp_payload.json

echo ============================================================================
echo VERIFICATION STEPS:
echo ============================================================================
echo.
echo 1. Check Google Sheets "Patient Linelist_TB"
echo 2. Find row with:
echo    - Unique ID: TEST-CJ-NGP-001
echo    - Inmate Name: Ramesh Patil
echo    - KoboUUID: TEST-REAL-DATA-001
echo.
echo 3. Verify these 19 demographic fields are populated:
echo    [1] Name of the Staff: Dr. Rajesh Kumar
echo    [2] Submitted On: 2026-05-04
echo    [3] State: Maharashtra
echo    [4] District: Nagpur
echo    [5] Facility Name: Central Jail Nagpur
echo    [6] Facility type: Prison
echo    [7] Date of Screening: 2026-05-04
echo    [8] Unique ID: TEST-CJ-NGP-001
echo    [9] Inmate Name: Ramesh Patil
echo    [10] Inmate type: Convicted
echo    [11] Father/Husband Name: Shankar Patil
echo    [12] Date of Birth: 1985-03-15
echo    [13] Age: 41
echo    [14] Sex: Male
echo    [15] Contact Number: 9876543210
echo    [16] Address: Village Kamptee, Nagpur, Maharashtra
echo    [17] Chest X-ray Result: Suspected TB Case
echo    [18] 10s Symptoms: Cough of any duration, Fever
echo    [19] Past history of TB: No
echo.
echo 4. NOW update clinical fields in the app and verify they sync:
echo    - Date of referral for TB Examination
echo    - Name of facility where referred to
echo    - TB diagnosed (Y/N)
echo    - Date of TB Diagnosed
echo    - Type of TB Diagnosed (P/EP)
echo    - Date of starting ATT
echo    - Date of Treatment Completion
echo    - HIV Status
echo    - ART Status
echo    - ART Number
echo    - NIKSHAY/ABHA ID
echo    - Date of registration
echo    - Remarks
echo.
echo ============================================================================
