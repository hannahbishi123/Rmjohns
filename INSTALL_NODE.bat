@echo off
title Installing Node.js
color 0A
echo.
echo  Installing Node.js via winget... please wait.
echo  This will take 1-3 minutes.
echo.

winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements

echo.
echo  ============================================
echo   Done! 
echo   NOW: Close this window AND close PowerShell
echo   Then open a NEW PowerShell and run:
echo.
echo     npm run dev
echo.
echo   in the project folder to start the app.
echo  ============================================
echo.
pause
