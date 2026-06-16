# Check unsynced patients count
$envPath = "C:\Users\farid\Desktop\TB-PWA-Clean\.env.local"

$serviceKey = (Get-Content $envPath | `
    Select-String "SUPABASE_SERVICE_ROLE_KEY" | `
    Select-Object -First 1).ToString().Split("=", 2)[1].Trim()

$supabaseUrl = "https://wwcgybgvfulotflitogu.supabase.co"

Write-Host "Checking unsynced patients..." -ForegroundColor Yellow
Write-Host ""

# Query unsynced patients
$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
}

# Count all patients
$allPatientsUrl = "$supabaseUrl/rest/v1/patients?select=id&limit=1"
$allResponse = Invoke-RestMethod -Uri $allPatientsUrl -Headers $headers -Method HEAD
$totalPatients = $allResponse.Headers.'Content-Range'.Split('/')[1]

Write-Host "Total patients in database: $totalPatients" -ForegroundColor White

# Count synced patients
$syncedUrl = "$supabaseUrl/rest/v1/patients?select=id&synced_to_sheets=eq.true"
$syncedResponse = Invoke-RestMethod -Uri $syncedUrl -Headers $headers
$syncedCount = $syncedResponse.Count

Write-Host "Synced to sheets: $syncedCount" -ForegroundColor Green

# Count unsynced patients
$unsyncedUrl = "$supabaseUrl/rest/v1/patients?select=id,inmate_name,synced_to_sheets,sheets_sync_attempts&or=(synced_to_sheets.is.null,synced_to_sheets.eq.false)&limit=10"
$unsyncedResponse = Invoke-RestMethod -Uri $unsyncedUrl -Headers $headers

Write-Host "Unsynced patients: $($unsyncedResponse.Count)" -ForegroundColor $(if ($unsyncedResponse.Count -gt 0) { "Red" } else { "Green" })

if ($unsyncedResponse.Count -gt 0) {
    Write-Host ""
    Write-Host "Sample unsynced patients:" -ForegroundColor Yellow
    $unsyncedResponse | ForEach-Object {
        Write-Host "  - $($_.inmate_name) (ID: $($_.id), Attempts: $($_.sheets_sync_attempts))" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "===========================================================================" -ForegroundColor Cyan
Write-Host "SYNC STATUS" -ForegroundColor Cyan
Write-Host "===========================================================================" -ForegroundColor Cyan
Write-Host "Total: $totalPatients" -ForegroundColor White
Write-Host "Synced: $syncedCount ($([math]::Round(($syncedCount / $totalPatients) * 100, 1))%)" -ForegroundColor Green
Write-Host "Unsynced: $($unsyncedResponse.Count)" -ForegroundColor $(if ($unsyncedResponse.Count -gt 0) { "Red" } else { "Green" })
Write-Host "===========================================================================" -ForegroundColor Cyan
