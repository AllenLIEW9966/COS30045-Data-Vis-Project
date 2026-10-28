@echo off
title Allen GameDV - Console War Dashboard
cd /d "%~dp0"

echo ============================================
echo   Allen GameDV - THE CONSOLE WAR
echo ============================================
echo.
echo   Port 8100  (games dashboard)
echo   Dashboard: http://localhost:8100
echo.
echo   Keep this window OPEN while using the site.
echo   Close it or press Ctrl+C to stop.
echo ============================================
echo.
echo If you still see ROAD SAFETY, your browser cached it:
echo   press CTRL+F5 to force reload.
echo.

start "" http://localhost:8100

py -m http.server 8100 2>nul
if errorlevel 1 python -m http.server 8100 2>nul
if errorlevel 1 python3 -m http.server 8100 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: Python was not found.
    echo   Install from https://python.org
    echo   or with Node.js:  npx serve -l 8100
    echo.
    pause
)
