# SAMADHAAN - Batched Backfill Script
# Processes records in small batches to avoid timeout

$ErrorActionPreference = "Stop"

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "SAMADHAAN - Batched Google Sheets Backfill" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$envPath = "C:\Users\farid\Desktop\TB-PWA-Clean\.env.local"
$apiUrl = "https://samadhaan.allianceindia.org/api/admin/backfill-sheets"
$batchSize = 10  # Process 10 records per batch (under 10s timeout)
$maxBatches = 10  # Safety limit
$delayBetweenBatches = 2  # Seconds between batches

# Read service role key
if (-not (Test-Path $envPath)) {
    Write-Host "Error: .env.local not found" -ForegroundColor Red
    exit 1
}

$secret = (Get-Content $envPath | `
    Select-String "SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY" | `
    Select-Object -First 1).ToString().Split("=", 2)[1].Trim()

if (-not $secret) {
    Write-Host "Error: Service key not found" -ForegroundColor Red
    exit 1
}

Write-Host "Using secret: $($secret.Substring(0,20))..." -ForegroundColor Gray
Write-Host "Batch size: $batchSize records" -ForegroundColor Gray
Write-Host "Max batches: $maxBatches" -ForegroundColor Gray
Write-Host ""

# Totals
$totalProcessed = 0
$totalSuccessful = 0
$totalFailed = 0
$batchCount = 0

# Process batches
while ($batchCount -lt $maxBatches) {
    $batchCount++
    
    Write-Host "Batch $batchCount/$maxBatches" -ForegroundColor Yellow
    Write-Host "  Triggering backfill..." -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod `
            -Uri $apiUrl `
            -Method POST `
            -Headers @{
                "x-admin-secret" = $secret
                "Content-Type" = "application/json"
            } `
            -Body "{`"retry_stuck`": true, `"limit`": $batchSize}" `
            -TimeoutSec 50
        
        if ($response.total -eq 0) {
            Write-Host "  No more records to process" -ForegroundColor Green
            Write-Host ""
            break
        }
        
        $totalProcessed += $response.total
        $totalSuccessful += $response.synced
        $totalFailed += $response.failed
        
        Write-Host "  Processed: $($response.total)" -ForegroundColor White
        Write-Host "  Successful: $($response.synced)" -ForegroundColor Green
        Write-Host "  Failed: $($response.failed)" -ForegroundColor $(if ($response.failed -gt 0) { "Red" } else { "Gray" })
        Write-Host "  Duration: $($response.duration)" -ForegroundColor Gray
        Write-Host ""
        
        # If we processed fewer than batch size, we're done
        if ($response.total -lt $batchSize) {
            Write-Host "  Processed fewer than batch size - all done!" -ForegroundColor Green
            Write-Host ""
            break
        }
        
        # Delay between batches
        if ($batchCount -lt $maxBatches) {
            Write-Host "  Waiting $delayBetweenBatches seconds..." -ForegroundColor Gray
            Start-Sleep -Seconds $delayBetweenBatches
            Write-Host ""
        }
        
    } catch {
        Write-Host "  Batch failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        
        # If timeout, continue to next batch
        if ($_.Exception.Message -like "*timeout*" -or $_.Exception.Message -like "*504*") {
            Write-Host "  Timeout detected - continuing to next batch..." -ForegroundColor Yellow
            Write-Host ""
            Start-Sleep -Seconds $delayBetweenBatches
            continue
        }
        
        # Other errors - stop
        break
    }
}

# Summary
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "BACKFILL SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "Total Batches: $batchCount" -ForegroundColor White
Write-Host "Total Processed: $totalProcessed" -ForegroundColor White
Write-Host "Total Successful: $totalSuccessful" -ForegroundColor Green
Write-Host "Total Failed: $totalFailed" -ForegroundColor $(if ($totalFailed -gt 0) { "Red" } else { "Gray" })
Write-Host "Success Rate: $(if ($totalProcessed -gt 0) { [math]::Round(($totalSuccessful / $totalProcessed) * 100, 1) } else { 0 })%" -ForegroundColor White
Write-Host "==========================================================================" -ForegroundColor Cyan
