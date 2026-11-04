@echo off
title 3AM SCROLL — HIMA Studio
cd /d "%~dp0"

:: Disable QuickEdit mode for this console to prevent terminal freeze on mouse clicks
reg add "HKCU\Console" /v QuickEdit /t REG_DWORD /d 0 /f >nul 2>&1

echo ======================================================================
echo   3AM SCROLL -- HIMA Engine (Local PC Studio)
echo ======================================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    node src\hima.mjs %*
) else (
    if exist "hima.exe" (
        hima.exe %*
    ) else (
        echo Error: Neither Node.js nor hima.exe was found!
    )
)

echo.
echo ======================================================================
pause
