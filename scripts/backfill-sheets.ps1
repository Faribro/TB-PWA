# SAMADHAAN - Backfill Google Sheets Script
# Triggers the admin backfill endpoint to sync stuck records

$ErrorActionPreference = "Stop"

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "SAMADHAAN - Google Sheets Backfill Utility" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""

# Read service role key from .env.local
$envPath = "C:\Users\farid\Desktop\TB-PWA-Clean\.env.local"

if (-not (Test-Path $envPath)) {
    Write-Host "Error: .env.local not found at $envPath" -ForegroundColor Red
    exit 1
}

$secret = (Get-Content $envPath | `
    Select-String "SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY" | `
    Select-Object -First 1).ToString().Split("=", 2)[1].Trim()

if (-not $secret) {
    Write-Host "Error: SUPABASE_SERVICE_ROLE_KEY not found in .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "Using secret: $($secret.Substring(0,20))..." -ForegroundColor Gray
Write-Host ""

# API endpoint
$apiUrl = "https://samadhaan.allianceindia.org/api/admin/backfill-sheets"

Write-Host "Triggering backfill endpoint..." -ForegroundColor Yellow
Write-Host "   URL: $apiUrl" -ForegroundColor Gray
Write-Host "   Mode: Retry stuck records" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod `
        -Uri $apiUrl `
        -Method POST `
        -Headers @{
            "x-admin-secret" = $secret
            "Content-Type" = "application/json"
        } `
        -Body '{"retry_stuck": true}'
    
    Write-Host "Backfill completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Results:" -ForegroundColor Cyan
    Write-Host "   Total Processed: $($response.totalProcessed)" -ForegroundColor White
    Write-Host "   Successful: $($response.successful)" -ForegroundColor Green
    Write-Host "   Failed: $($response.failed)" -ForegroundColor $(if ($response.failed -gt 0) { "Red" } else { "Gray" })
    Write-Host "   Duration: $($response.durationMs)ms" -ForegroundColor Gray
    Write-Host ""
    
    if ($response.errors -and $response.errors.Count -gt 0) {
        Write-Host "Errors encountered:" -ForegroundColor Yellow
        $response.errors | ForEach-Object {
            Write-Host "   - $_" -ForegroundColor Red
        }
        Write-Host ""
    }
    
} catch {
    Write-Host "Backfill failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error Details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "API Response:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    
    Write-Host ""
    exit 1
}

Write-Host "==========================================================================" -ForegroundColor Cyan
