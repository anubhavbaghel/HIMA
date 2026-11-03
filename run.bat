@echo off
title 3AM SCROLL — HIMA Studio
cd /d "%~dp0"

echo ======================================================================
echo   3AM SCROLL -- HIMA Engine (Local PC Studio)
echo ======================================================================
echo.

if exist "hima.exe" (
    hima.exe %*
) else (
    node src\hima.mjs %*
)

echo.
echo ======================================================================
pause
