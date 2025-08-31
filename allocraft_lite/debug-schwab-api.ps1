# Debug script to test Schwab API endpoints
Write-Host "Testing Schwab API endpoints..." -ForegroundColor Cyan
Write-Host ""

# Test status endpoint
Write-Host "1. Testing status endpoint..." -ForegroundColor Yellow
try {
    $status = Invoke-WebRequest -Uri "https://allocraft-backend.onrender.com/schwab/status" -Method GET -Headers @{"Authorization"="Bearer YOUR_TOKEN_HERE"} 2>$null
    if ($status) {
        $statusData = $status.Content | ConvertFrom-Json
        Write-Host "Status Response:" -ForegroundColor Green
        $statusData | ConvertTo-Json -Depth 3
    }
} catch {
    Write-Host "Status check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test accounts endpoint  
Write-Host "2. Testing accounts endpoint..." -ForegroundColor Yellow
try {
    $accounts = Invoke-WebRequest -Uri "https://allocraft-backend.onrender.com/schwab/accounts" -Method GET -Headers @{"Authorization"="Bearer YOUR_TOKEN_HERE"} 2>$null
    if ($accounts) {
        $accountsData = $accounts.Content | ConvertFrom-Json
        Write-Host "Accounts Response:" -ForegroundColor Green
        $accountsData | ConvertTo-Json -Depth 3
    }
} catch {
    Write-Host "Accounts fetch failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

Write-Host ""
Write-Host "To use this script:" -ForegroundColor Magenta
Write-Host "1. Get your auth token from sessionStorage.getItem('allocraft_token') in browser console" -ForegroundColor White
Write-Host "2. Replace YOUR_TOKEN_HERE with your actual token" -ForegroundColor White
Write-Host "3. Run the script to see the actual API responses" -ForegroundColor White
