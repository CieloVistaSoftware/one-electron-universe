@echo off
echo === CieloVista Website Generator ===
echo Killing any process on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo   Killing PID %%a
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo Loading CLAUDE key from Windows environment...
for /f "tokens=3" %%a in ('reg query HKCU\Environment /v CLAUDE 2^>nul') do set CLAUDE=%%a
if "%CLAUDE%"=="" (
    echo ERROR: CLAUDE not found in Windows environment variables.
    echo Set it via: Control Panel - System - Environment Variables
    pause
    exit /b 1
)
echo   CLAUDE key loaded: %CLAUDE:~0,20%...

echo Loading falai key from Windows environment...
for /f "tokens=3" %%a in ('reg query HKCU\Environment /v falai 2^>nul') do set FALAI=%%a
if "%FALAI%"=="" (
    echo   falai not found - image generation will be disabled.
    echo   To enable: add falai=your-key to Windows environment variables.
) else (
    echo   falai key loaded: %FALAI:~0,16%...
)

echo.
echo Starting server...
set CVT_TRACE=1
set CV_SITE_SLUG=_shared
set GENERATED_DIR=%USERPROFILE%\Documents\CieloVista\generated
set CVT_TRACE_FILE=%GENERATED_DIR%\%CV_SITE_SLUG%\artifacts\traces\trace.json
cd /d %~dp0
node server.js
