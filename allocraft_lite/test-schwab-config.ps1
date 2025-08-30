# Test script to verify Schwab configuration
Write-Host "Testing Schwab Backend Configuration..." -ForegroundColor Cyan

# Test 1: Health Check
Write-Host ""
Write-Host "1. Checking backend health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "https://allocraft-backend.onrender.com/schwab/health" -Method GET | ConvertFrom-Json
    Write-Host "Backend Status: $($health.status)" -ForegroundColor Green
    if($health.schwab_config.client_id_configured) {
        Write-Host "Client ID Configured: $($health.schwab_config.client_id_configured)" -ForegroundColor Green
    } else {
        Write-Host "Client ID Configured: $($health.schwab_config.client_id_configured)" -ForegroundColor Red
    }
    if($health.schwab_config.client_secret_configured) {
        Write-Host "Client Secret Configured: $($health.schwab_config.client_secret_configured)" -ForegroundColor Green
    } else {
        Write-Host "Client Secret Configured: $($health.schwab_config.client_secret_configured)" -ForegroundColor Red
    }
    Write-Host "Redirect URI: $($health.schwab_config.redirect_uri)" -ForegroundColor Cyan
} catch {
    Write-Host "Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Auth URL Generation
Write-Host ""
Write-Host "2. Testing auth URL generation..." -ForegroundColor Yellow
try {
    $authResponse = Invoke-WebRequest -Uri "https://allocraft-backend.onrender.com/schwab/auth-url" -Method GET | ConvertFrom-Json
    Write-Host "Auth URL generated successfully!" -ForegroundColor Green
    Write-Host "Auth URL: $($authResponse.auth_url.Substring(0, 60))..." -ForegroundColor Cyan
} catch {
    Write-Host "Auth URL generation failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 500) {
        Write-Host "This likely means environment variables are not configured yet." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Configuration test complete!" -ForegroundColor Magenta
