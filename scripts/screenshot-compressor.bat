@echo off
setlocal enabledelayedexpansion
set SCRIPT_DIR=C:\Users\Benjamin-Pers\AppData\Roaming\Microsoft\Windows\Screenshots
set SCRIPT_FILE=%SCRIPT_DIR%\screenshot-compressor.js
if not exist "%SCRIPT_FILE%" (
    echo ERROR: Script file not found
    pause
    exit /b 1
)
cls
echo.
echo Screenshot Auto-Compressor
echo.
node "%SCRIPT_FILE%"
pause
