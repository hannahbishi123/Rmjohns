# RMJohn's Eateries System - Run Script
# Usage: Right-click this file > "Run with PowerShell"
# OR in terminal: cd to this folder, then: .\run.ps1

$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "  RMJohn's Eateries System" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Check node
$nodeVersion = & "C:\Program Files\nodejs\node.exe" --version 2>&1
Write-Host "[OK] Node.js $nodeVersion" -ForegroundColor Green

# Install deps if missing
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    & "C:\Program Files\nodejs\npm.cmd" install
}

Write-Host ""
Write-Host "Starting backend API on port 3001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH = 'C:\Program Files\nodejs;' + `$env:PATH; Set-Location '$projectDir'; & 'C:\Program Files\nodejs\node.exe' backend/index.js" -WindowStyle Normal

Write-Host "Waiting for backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Starting frontend on port 5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH = 'C:\Program Files\nodejs;' + `$env:PATH; Set-Location '$projectDir'; & 'C:\Program Files\nodejs\npm.cmd' run dev:client" -WindowStyle Normal

Start-Sleep -Seconds 4

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "  App is running!" -ForegroundColor Green
Write-Host "  http://127.0.0.1:5173" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Open browser
Start-Process "http://127.0.0.1:5173"
