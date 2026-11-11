@echo off
title RMJohn's Eateries System
color 0A
cd /d "%~dp0"

:: Use full Node.js path (works even if PATH is not set correctly)
set "NODE=C:\Program Files\nodejs\node.exe"
set "NPM=C:\Program Files\nodejs\npm.cmd"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo.
echo  ================================
echo   RMJohn's Eateries System
echo  ================================
echo.

:: Check Node
if not exist "%NODE%" (
    echo  [ERROR] Node.js not found at C:\Program Files\nodejs
    echo  Please install from: https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('"%NODE%" --version') do echo  [OK] Node.js %%v

:: Install dependencies if missing
if not exist "node_modules\" (
    echo  Installing dependencies...
    call "%NPM%" install
    echo.
)

echo.
echo  Starting backend API (MySQL + Firebase sync)...
echo  Make sure MySQL is running in XAMPP first.
echo.
start "RMJohn's API - MySQL + Firebase Sync" cmd /k "set PATH=C:\Program Files\nodejs;%PATH% && cd /d "%~dp0" && "%NODE%" backend/index.js"

echo  Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo  Starting frontend dev server...
echo.
start "RMJohn's Frontend - Vite" cmd /k "set PATH=C:\Program Files\nodejs;%PATH% && cd /d "%~dp0" && "%NPM%" run dev:client"

echo.
echo  ================================
echo   App is starting...
echo  ================================
echo.
echo  Local app  : http://127.0.0.1:5173  (opens automatically)
echo  Local API  : http://127.0.0.1:3001
echo.
echo  Data saves to BOTH MySQL (local) AND Firebase (live).
echo.
echo  To stop the app: close both terminal windows.
echo.
pause
