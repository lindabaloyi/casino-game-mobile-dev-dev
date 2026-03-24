# ADB Reverse Script for Casino Game
# Run this before starting the app on Android Emulator
# Usage: powershell -ExecutionPolicy Bypass -File scripts/adb-reverse.ps1

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Casino Game - ADB Reverse Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if ADB is available
$adbPath = Get-Command adb -ErrorAction SilentlyContinue

if (-not $adbPath) {
    # Try common Android SDK locations
    $possiblePaths = @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "$env:ANDROID_HOME\platform-tools\adb.exe",
        "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe"
    )
    
    $adbFound = $false
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $adbPath = $path
            $adbFound = $true
            break
        }
    }
    
    if (-not $adbFound) {
        Write-Host "ERROR: ADB not found!" -ForegroundColor Red
        Write-Host "Please install Android SDK or add it to your PATH" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Found ADB at: $adbPath" -ForegroundColor Green

# Get connected devices
$devices = & $adbPath devices 2>&1

# Check if emulator is connected
$emulatorConnected = $devices | Select-String -Pattern "emulator-\d+\s+device"

if ($emulatorConnected) {
    Write-Host "Android Emulator detected!" -ForegroundColor Green
    
    # Set up reverse proxy
    Write-Host ""
    Write-Host "Setting up port reverse for port 3001..." -ForegroundColor Yellow
    
    $result = & $adbPath reverse tcp:3001 tcp:3001 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ SUCCESS!" -ForegroundColor Green
        Write-Host "   Port 3001 is now reversed to your emulator" -ForegroundColor Green
        Write-Host "   Your app can now connect to http://localhost:3001" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to set up reverse: $result" -ForegroundColor Red
    }
} else {
    Write-Host "No Android emulator detected." -ForegroundColor Yellow
    Write-Host "Make sure your emulator is running and connected." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To start an emulator:" -ForegroundColor Cyan
    Write-Host "   1. Open Android Studio -> AVD Manager" -ForegroundColor White
    Write-Host "   2. Start your emulator" -ForegroundColor White
    Write-Host "   3. Re-run this script" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")