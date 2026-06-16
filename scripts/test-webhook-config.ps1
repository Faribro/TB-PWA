# Test webhook configuration
$envPath = "C:\Users\farid\Desktop\TB-PWA-Clean\.env.local"

Write-Host "Checking environment variables..." -ForegroundColor Yellow
Write-Host ""

# Check webhook URL
$webhookUrl = (Get-Content $envPath | Select-String "GOOGLE_SCRIPT_WEBHOOK_URL").ToString().Split("=", 2)[1].Trim()

if ($webhookUrl) {
    Write-Host "GOOGLE_SCRIPT_WEBHOOK_URL: Found" -ForegroundColor Green
    Write-Host "  URL: $webhookUrl" -ForegroundColor Gray
} else {
    Write-Host "GOOGLE_SCRIPT_WEBHOOK_URL: NOT FOUND" -ForegroundColor Red
}

Write-Host ""

# Check service account key
$serviceKey = (Get-Content $envPath | Select-String "GOOGLE_SERVICE_ACCOUNT_KEY").ToString()

if ($serviceKey) {
    Write-Host "GOOGLE_SERVICE_ACCOUNT_KEY: Found" -ForegroundColor Green
} else {
    Write-Host "GOOGLE_SERVICE_ACCOUNT_KEY: NOT FOUND (will use webhook fallback)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Testing webhook..." -ForegroundColor Yellow

# Test webhook with sample data
$testData = @{
    id = 999999
    inmate_name = "TEST PATIENT"
    kobo_uuid = "test-webhook-$(Get-Date -Format 'yyyyMMddHHmmss')"
    screening_state = "Test State"
    screening_district = "Test District"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod `
        -Uri $webhookUrl `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $testData `
        -TimeoutSec 10
    
    Write-Host "Webhook test: SUCCESS" -ForegroundColor Green
    Write-Host "Response: $response" -ForegroundColor Gray
} catch {
    Write-Host "Webhook test: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
