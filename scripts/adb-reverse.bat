@echo off
REM ADB Reverse Script for Casino Game
REM Run this before starting the app on Android Emulator
REM Usage: scripts\adb-reverse.bat

echo ======================================
echo Casino Game - ADB Reverse Setup
echo ======================================
echo.

REM Check if adb is in PATH
where adb >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: ADB not found in PATH!
    echo Please install Android SDK or add it to your PATH
    echo.
    echo Common locations:
    echo   - %%LOCALAPPDATA%%\Android\Sdk\platform-tools
    echo   - %%ANDROID_HOME%%\platform-tools
    pause
    exit /b 1
)

echo Found ADB in PATH

REM Get connected devices
adb devices > devices.txt
findstr /C:"emulator" devices.txt >nul 2>&1
set EMULATOR_FOUND=%ERRORLEVEL%
del devices.txt

if %EMULATOR_FOUND% equ 0 (
    echo Android Emulator detected!
    echo.
    echo Setting up port reverse for port 3001...
    
    adb reverse tcp:3001 tcp:3001
    
    if %ERRORLEVEL% equ 0 (
        echo.
        echo SUCCESS!
        echo   Port 3001 is now reversed to your emulator
        echo   Your app can now connect to http://localhost:3001
    ) else (
        echo Failed to set up reverse connection
    )
) else (
    echo No Android emulator detected.
    echo Make sure your emulator is running and connected.
    echo.
    echo To start an emulator:
    echo   1. Open Android Studio -^> AVD Manager
    echo   2. Start your emulator
    echo   3. Re-run this script
)

echo.
pause