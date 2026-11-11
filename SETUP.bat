@echo off
title RMJohn's Eateries System - Setup
color 0A
echo.
echo  ================================================
echo   RMJohn's Eateries System - ONE-TIME SETUP
echo  ================================================
echo.

:: ── Step 1: Check for Node.js ──────────────────────────────────────────────
echo  [1/4] Checking for Node.js...
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%v in ('node --version') do echo  [OK] Node.js %%v is already installed.
    goto :check_npm
)

echo  [!] Node.js not found. Installing via winget...
echo      This may take 1-2 minutes. Please wait.
echo.
winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] winget install failed.
    echo  Please install Node.js manually from: https://nodejs.org
    echo  Then run this SETUP.bat again.
    echo.
    pause
    exit /b 1
)

echo.
echo  [OK] Node.js installed. Refreshing PATH...
:: Refresh PATH from registry for this session
for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH') do set "MACHINE_PATH=%%B"
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USER_PATH=%%B"
set "PATH=%MACHINE_PATH%;%USER_PATH%"

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [!] PATH refresh incomplete. 
    echo  Please CLOSE this window, then double-click SETUP.bat again to continue.
    echo.
    pause
    exit /b 0
)

:check_npm
echo.

:: ── Step 2: Install npm dependencies ───────────────────────────────────────
echo  [2/4] Installing project dependencies (npm install)...
cd /d "%~dp0"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] npm install failed. Check the error above.
    pause
    exit /b 1
)
echo  [OK] Dependencies installed.
echo.

:: ── Step 3: Check for XAMPP / MySQL ────────────────────────────────────────
echo  [3/4] Checking for XAMPP and MySQL...

set "MYSQL_EXE="
if exist "C:\xampp4\mysql\bin\mysql.exe" set "MYSQL_EXE=C:\xampp4\mysql\bin\mysql.exe"
if not defined MYSQL_EXE if exist "C:\xampp\mysql\bin\mysql.exe" set "MYSQL_EXE=C:\xampp\mysql\bin\mysql.exe"
if not defined MYSQL_EXE if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if not defined MYSQL_EXE if exist "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"

if not defined MYSQL_EXE (
    echo.
    echo  [!] MySQL not found automatically.
    echo.
    echo  Please do this manually:
    echo    1. Open XAMPP Control Panel
    echo    2. Start MySQL
    echo    3. Open phpMyAdmin at http://localhost/phpmyadmin
    echo    4. Click "Import", select: database\eateries_db.sql
    echo    5. Click "Go"
    echo.
    echo  After importing, run START.bat to launch the app.
    echo.
    pause
    exit /b 0
)

echo  [OK] Found MySQL at: %MYSQL_EXE%
echo.

:: ── Step 4: Import the database ────────────────────────────────────────────
echo  [4/4] Importing database (eateries_db)...
echo       Make sure MySQL is RUNNING in XAMPP first!
echo.

:: Read password from .env
set "DB_PASS="
for /f "tokens=1,* delims==" %%A in (.env) do (
    if "%%A"=="DB_PASSWORD" set "DB_PASS=%%B"
)

if defined DB_PASS (
    "%MYSQL_EXE%" -u root -p%DB_PASS% < "%~dp0database\eateries_db.sql" 2>nul
) else (
    "%MYSQL_EXE%" -u root < "%~dp0database\eateries_db.sql" 2>nul
)

if %ERRORLEVEL% NEQ 0 (
    echo  [!] Database import via CLI failed.
    echo      MySQL might not be running, or needs a password.
    echo.
    echo  Do it manually instead:
    echo    1. Start MySQL in XAMPP Control Panel
    echo    2. Open http://localhost/phpmyadmin
    echo    3. Import: database\eateries_db.sql
    echo.
) else (
    echo  [OK] Database imported successfully.
)

echo.
echo  ================================================
echo   SETUP COMPLETE!
echo   Now double-click START.bat to run the app.
echo  ================================================
echo.
pause
