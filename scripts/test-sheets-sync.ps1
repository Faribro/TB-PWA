# ═══════════════════════════════════════════════════════════════════════════
# GOOGLE SHEETS SYNC TEST - PowerShell Version
# ═══════════════════════════════════════════════════════════════════════════
# Quick test using curl to verify complete patient data sync
# Run: .\scripts\test-sheets-sync.ps1

Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🧪 GOOGLE SHEETS SYNC TEST - Complete Patient Data" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Load environment variables
$envFile = ".env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY
$apiUrl = if ($env:NEXT_PUBLIC_API_URL) { $env:NEXT_PUBLIC_API_URL } else { "http://localhost:3000" }

Write-Host "🔧 Configuration:" -ForegroundColor Yellow
Write-Host "  API URL: $apiUrl"
Write-Host "  Service Key: $(if ($serviceKey) { 'SET ✅' } else { 'MISSING ❌' })`n"

if (-not $serviceKey) {
    Write-Host "❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local" -ForegroundColor Red
    exit 1
}

# Test payload with ALL clinical fields
$payload = @{
    patientId = "8ee307a8-cbc4-42cf-bd52-3f4c53edcb77"
    updates = @{
        # Demographics
        inmate_name = "Chaitu Wadde"
        age = 65
        sex = "Male"
        contact_number = "8788554035"
        address = "Test Address, Maharashtra"
        
        # Screening
        screening_date = "2026-04-05"
        screening_state = "Maharashtra"
        screening_district = "Mumbai"
        facility_name = "Test Facility"
        
        # CLINICAL FIELDS - These should sync to Google Sheets
        referral_date = "2026-04-06"
        referred_facility = "DMC-Designated microscopy centre"
        tb_diagnosed = "Y"
        tb_diagnosis_date = "2026-04-10"
        tb_type = "Pulmonary"
        att_start_date = "2026-04-12"
        att_completion_date = "2026-10-12"
        hiv_status = "Negative"
        art_status = "Pre ART"
        art_number = "ART123456"
        nikshay_abha_id = "NIKSHAY789"
        registration_date = "2026-04-11"
        remarks = "Test patient - PowerShell test - all fields populated"
    }
} | ConvertTo-Json -Depth 10

Write-Host "📋 Sending update with ALL clinical fields..." -ForegroundColor Yellow
Write-Host "  Patient: Chaitu Wadde"
Write-Host "  KoboUUID: 8ee307a8-cbc4-42cf-bd52-3f4c53edcb77"
Write-Host "  Clinical fields: 13 fields`n"

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $serviceKey"
}

try {
    $response = Invoke-WebRequest -Uri "$apiUrl/api/patient-sync" `
        -Method POST `
        -Headers $headers `
        -Body $payload `
        -UseBasicParsing
    
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Response Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "✅ Success: $($result.success)`n" -ForegroundColor Green
    
    if ($result.success) {
        Write-Host "📊 Supabase Update: SUCCESS" -ForegroundColor Green
        Write-Host "  Patient ID: $($result.patient.id)"
        Write-Host "  Updated At: $($result.patient.updated_at)`n"
        
        Write-Host "🔍 Clinical Fields in Response:" -ForegroundColor Yellow
        $clinicalFields = @(
            'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
            'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status',
            'art_status', 'art_number', 'nikshay_abha_id', 'registration_date', 'remarks'
        )
        
        foreach ($field in $clinicalFields) {
            $value = $result.patient.$field
            $status = if ($value) { "✅" } else { "❌" }
            Write-Host "  $status $field`: `"$value`""
        }
        
        Write-Host "`n⏳ Google Sheets Sync: QUEUED" -ForegroundColor Yellow
        Write-Host "  Wait 30-60 seconds for sync to complete"
        Write-Host "  Check Vercel logs for [ProcessSync] messages`n"
        
        Write-Host "📋 Verification Steps:" -ForegroundColor Cyan
        Write-Host "  1. Open Google Sheets"
        Write-Host "  2. Find row with KoboUUID: 8ee307a8-cbc4-42cf-bd52-3f4c53edcb77"
        Write-Host "  3. Verify ALL clinical columns are populated (not empty)"
        Write-Host "  4. Check columns: Referral Date, TB Diagnosed, ATT Start, etc."
    }
    
} catch {
    Write-Host "❌ Request Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
