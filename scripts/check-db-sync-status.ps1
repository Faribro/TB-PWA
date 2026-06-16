# Check database sync status
$envPath = "C:\Users\farid\Desktop\TB-PWA-Clean\.env.local"

$secret = (Get-Content $envPath | `
    Select-String "SUPABASE_SERVICE_ROLE_KEY" | `
    Select-Object -First 1).ToString().Split("=", 2)[1].Trim()

$supabaseUrl = "https://fgtrkxadiszoyhslwesu.supabase.co"

$headers = @{
    "apikey" = $secret
    "Authorization" = "Bearer $secret"
    "Content-Type" = "application/json"
}

Write-Host "Checking database sync status..." -ForegroundColor Yellow
Write-Host ""

# Total patients
$totalUrl = "$supabaseUrl/rest/v1/patients?select=count"
$totalResponse = Invoke-RestMethod -Uri $totalUrl -Headers $headers -Method GET
$total = $totalResponse[0].count

Write-Host "Total patients: $total" -ForegroundColor White

# Synced patients
$syncedUrl = "$supabaseUrl/rest/v1/patients?select=count&synced_to_sheets=eq.true"
$syncedResponse = Invoke-RestMethod -Uri $syncedUrl -Headers $headers -Method GET
$synced = $syncedResponse[0].count

Write-Host "Synced to sheets: $synced" -ForegroundColor Green

# Unsynced patients
$unsyncedUrl = "$supabaseUrl/rest/v1/patients?select=count&or=(synced_to_sheets.is.null,synced_to_sheets.eq.false)"
$unsyncedResponse = Invoke-RestMethod -Uri $unsyncedUrl -Headers $headers -Method GET
$unsynced = $unsyncedResponse[0].count

Write-Host "Unsynced: $unsynced" -ForegroundColor Red

Write-Host ""
Write-Host "Sync percentage: $([math]::Round(($synced / $total) * 100, 2))%" -ForegroundColor Cyan
