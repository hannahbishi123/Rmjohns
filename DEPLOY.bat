@echo off
title RMJohn's Eateries System - Deploy to Firebase
color 0B
cd /d "%~dp0"

echo.
echo  ================================================
echo   RMJohn's Eateries System - Deploy to Firebase
echo   Target: rmjohns-eateries.web.app
echo  ================================================
echo.

:: Check Node
set "NODE=C:\Program Files\nodejs\node.exe"
set "NPM=C:\Program Files\nodejs\npm.cmd"
set "PATH=C:\Program Files\nodejs;%PATH%"

if not exist "%NODE%" (
    echo  [ERROR] Node.js not found at C:\Program Files\nodejs
    echo  Please install from: https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('"%NODE%" --version') do echo  [OK] Node.js %%v

:: Check Firebase CLI
echo.
echo  Checking for Firebase CLI...
where firebase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [!] Firebase CLI not found. Installing...
    call "%NPM%" install -g firebase-tools
    if %ERRORLEVEL% NEQ 0 (
        echo  [ERROR] Failed to install Firebase CLI
        pause
        exit /b 1
    )
    echo  [OK] Firebase CLI installed
) else (
    for /f "tokens=*" %%v in ('firebase --version') do echo  [OK] Firebase CLI %%v
)

:: Check if logged in
echo.
echo  Checking Firebase login status...
firebase login >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [!] You need to log in to Firebase first.
    echo  Opening browser for authentication...
    firebase login
    if %ERRORLEVEL% NEQ 0 (
        echo  [ERROR] Firebase login failed
        pause
        exit /b 1
    )
)

:: Install dependencies if missing
if not exist "node_modules\" (
    echo.
    echo  Installing dependencies...
    call "%NPM%" install
    if %ERRORLEVEL% NEQ 0 (
        echo  [ERROR] npm install failed
        pause
        exit /b 1
    )
    echo  [OK] Dependencies installed
)

:: Build the project
echo.
echo  ================================================
echo   Building project...
echo  ================================================
call "%NPM%" run build
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Build failed
    pause
    exit /b 1
)
echo  [OK] Build successful

:: Deploy to Firebase
echo.
echo  ================================================
echo   Deploying to Firebase Hosting...
echo   Target: rmjohns-eateries.web.app
echo  ================================================
echo.
firebase deploy
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Deployment failed
    pause
    exit /b 1
)

echo.
echo  ================================================
echo   DEPLOYMENT SUCCESSFUL!
echo   Your app is now live at:
echo   https://rmjohns-eateries.web.app
echo  ================================================
echo.
pause
