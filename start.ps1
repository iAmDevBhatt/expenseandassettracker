Write-Host "Starting Expense Tracker..." -ForegroundColor Cyan

# Start backend
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$PSScriptRoot\backend'; .venv\Scripts\activate; uvicorn main:app --port 8000"
) -WindowStyle Normal

Start-Sleep -Seconds 3

# Start frontend
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$PSScriptRoot\frontend'; npm run dev"
) -WindowStyle Normal

Write-Host "Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Login:    admin / admin123" -ForegroundColor Yellow
