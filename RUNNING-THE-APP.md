# How to Run Your Casino Game on Android Emulator

This guide shows you how to set up and run your casino game with proper Android networking.

---

## Prerequisites

1. **Android Studio** installed with an emulator created
2. **Node.js** installed (for npm commands)
3. Your project at: `c:\Users\LB\Desktop\Linda Baloyi\MadGames\dev\casino-game`

---

## Step-by-Step Guide

### Step 1: Open Your Project Directory

Open your terminal/command prompt and navigate to your project:

```bash
cd "c:\Users\LB\Desktop\Linda Baloyi\MadGames\dev\casino-game"
```

### Step 2: Start Your Android Emulator

1. Open **Android Studio**
2. Click on **AVD Manager** (the Android icon in the toolbar)
3. Start your preferred emulator (e.g., Pixel 7 API 34)
4. Wait for the emulator to fully boot (you should see the Android home screen)

### Step 3: Run the ADB Reverse Script

**Option A: Using PowerShell (Recommended)**

```bash
powershell -ExecutionPolicy Bypass -File scripts\adb-reverse.ps1
```

**Option B: Using Batch File**

```bash
scripts\adb-reverse.bat
```

**What this does:**
- Detects if your Android emulator is running
- Sets up port forwarding so the emulator can reach your localhost server
- You'll see "SUCCESS! Port 3001 is now reversed to your emulator"

### Step 4: Prebuild Android Native Project (CRITICAL - Read First!)

**This step is needed when you change app.json** (like `edgeToEdgeEnabled` or navigation bar settings).

Run this command to regenerate the native Android project with your new settings:

```bash
npx expo prebuild --clean
```

This will:
- Regenerate android/ folder with updated native code
- Apply your new `edgeToEdgeEnabled: false` and navigation bar settings
- You may need to restart the emulator after this

### Step 5: Start the Game Server

In a **new** terminal window, run:

```bash
cd "c:\Users\LB\Desktop\Linda Baloyi\MadGames\dev\casino-game"
npm run server
```

You should see:
```
[Server] 🎮 Casino Game Server Started!
[Server] Local:   http://localhost:3001
[Server] LAN IP:  http://192.168.18.14:3001
```

### Step 6: Start Expo Development Server

In **another new** terminal window, run:

```bash
cd "c:\Users\LB\Desktop\Linda Baloyi\MadGames\dev\casino-game"
npm start
```

Wait for it to start. You'll see:
```
Waiting on http://localhost:8081
```

### Step 7: Run on Android Emulator

Press **`a`** in the Expo terminal to launch on Android emulator.

The app will open in your emulator and should connect to the server automatically!

---

## Quick Reference: All Commands

```bash
# Terminal 1: Set up ADB reverse
cd "c:\Users\LB\Desktop\Linda Baloyi\MadGames\dev\casino-game"
powershell -ExecutionPolicy Bypass -File scripts\adb-reverse.ps1

# Terminal 2: Prebuild (after app.json changes)
cd "c:\Users\LB\Desktop\Linda Baloyi\MadGames\dev\casino-game"
npx expo prebuild --clean

# Terminal 3: Start server
cd "c:\Users\LB\Desktop\Linda Baloyi\MadGames\dev\casino-game"
npm run server

# Terminal 4: Start Expo
cd "c:\Users\LB\Desktop\Linda Baloyi\MadGames\dev\casino-game"
npm start

# Then press 'a' in Terminal 4 to run on Android
```

---

## Troubleshooting

### "ADB not found" error
- Make sure Android SDK is installed
- Add Android SDK platform-tools to your PATH

### Connection refused error
- Make sure you ran the adb-reverse script (Step 3)
- Make sure the server is running (Step 5)

### Emulator not detected
- Restart your emulator in Android Studio AVD Manager
- Make sure the emulator is fully booted before running the script

### Navigation bar still visible after making changes to app.json
- Did you run `npx expo prebuild --clean` to regenerate native project?
- Check the log for: `[SafeAreaDebug] Navigation bar behavior set to: overlay-swipe`

---

## How the Networking Fix Works

The ADB reverse script creates a tunnel:
- Emulator → localhost:3001 → Your computer's port 3001

This allows your React Native app (running in the emulator) to connect to your Node.js server (running on your computer) without network issues.

The [`serverUrl.ts`](utils/serverUrl.ts) file detects you're on an Android emulator and automatically uses `http://localhost:3001` instead of your LAN IP.
