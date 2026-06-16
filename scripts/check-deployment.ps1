# Check if deployment is ready
Write-Host "Checking deployment status..." -ForegroundColor Yellow

$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $attempt++
    
    try {
        # Check if endpoint responds (deployment complete)
        $response = Invoke-WebRequest `
            -Uri "https://samadhaan.allianceindia.org/api/auth/session" `
            -Method GET `
            -TimeoutSec 5 `
            -UseBasicParsing
        
        if ($response.StatusCode -eq 200) {
            Write-Host "Deployment is live! Ready to test." -ForegroundColor Green
            exit 0
        }
    } catch {
        # Ignore errors, keep checking
    }
    
    Write-Host "  Attempt $attempt/$maxAttempts - waiting..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
}

Write-Host "Timeout waiting for deployment" -ForegroundColor Red
exit 1
