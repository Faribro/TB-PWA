# Find missing UUIDs - records in Supabase but not in Google Sheets
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

Write-Host "Fetching unsynced records from Supabase..." -ForegroundColor Yellow

# Get 10 unsynced records with their UUIDs
$url = "$supabaseUrl/rest/v1/patients?select=id,kobo_uuid,inmate_name,synced_to_sheets&or=(synced_to_sheets.is.null,synced_to_sheets.eq.false)&limit=10"
$records = Invoke-RestMethod -Uri $url -Headers $headers -Method GET

Write-Host ""
Write-Host "Sample unsynced records:" -ForegroundColor Cyan
$records | ForEach-Object {
    Write-Host "  ID: $($_.id) | UUID: $($_.kobo_uuid) | Name: $($_.inmate_name) | Synced: $($_.synced_to_sheets)" -ForegroundColor White
}

Write-Host ""
Write-Host "These UUIDs should be checked in Google Sheet column 33 (KoboUUID)" -ForegroundColor Yellow
