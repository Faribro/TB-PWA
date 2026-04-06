@echo off
REM Triple Sync E2E Test Runner
REM Usage: run-e2e-test.bat

set USE_SERVICE_ROLE=true
set TEST_PATIENT_ID=72411
set TEST_KOBO_UUID=5b3ec782-71a6-4644-b1a8-34f7efb3f6dd

node scripts\test-triple-sync-e2e.js
