Write-Host "Stopping Expense Tracker..." -ForegroundColor Cyan

# Kill backend on port 8000
$backend = netstat -ano | Select-String ":8000 " | ForEach-Object { ($_ -split "\s+")[-1] } | Select-Object -First 1
if ($backend) {
    taskkill /PID $backend /F | Out-Null
    Write-Host "Backend stopped (PID $backend)" -ForegroundColor Green
} else {
    Write-Host "Backend was not running" -ForegroundColor Yellow
}

# Kill frontend on port 5173
$frontend = netstat -ano | Select-String ":5173 " | ForEach-Object { ($_ -split "\s+")[-1] } | Select-Object -First 1
if ($frontend) {
    taskkill /PID $frontend /F | Out-Null
    Write-Host "Frontend stopped (PID $frontend)" -ForegroundColor Green
} else {
    Write-Host "Frontend was not running" -ForegroundColor Yellow
}

Write-Host "Done." -ForegroundColor Cyan
