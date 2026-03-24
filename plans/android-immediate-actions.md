# Android Build - Immediate Action Checklist

## Priority 1: Fix APK Build Issues

### Step 1: Update app.json
Edit `app.json` and update the Android configuration:

```json
{
  "expo": {
    "android": {
      "package": "com.casinogame.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundColor": "#0f4d0f"
      }
    },
    "jsEngine": "hermes"
  }
}
```

### Step 2: Generate Android Directory
Run this command to generate the Android native project:
```bash
npx expo prebuild --platform android
```

### Step 3: Build Debug APK with Bundled JS
```bash
npx expo run:android --variant debug
```

This creates an APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Priority 2: Fix Server Connection Issues

### Update serverUrl.ts
Edit `utils/serverUrl.ts` to ensure production builds use the correct URL:

The current implementation looks correct. Ensure your `.env` file has:
```
EXPO_PUBLIC_SOCKET_URL=http://localhost:3001
EXPO_PUBLIC_SOCKET_URL_LAN=http://192.168.X.X:3001
```

---

## Priority 3: Test Checklist

After building, verify:

- [ ] APK installs on Android device/emulator
- [ ] App launches without Metro bundler
- [ ] Can start a 2-hands game against CPU
- [ ] Can connect to multiplayer server (from emulator or same network)

---

## Troubleshooting Commands

### Clear Build Cache
```bash
cd android && ./gradlew clean
```

### Check Metro Port
```bash
adb reverse --list
```

### Verify APK Contains JS Bundle
```bash
# Extract APK contents
unzip -l android/app/build/outputs/apk/debug/app-debug.apk | grep -i bundle
```

You should see `index.android.bundle` in the output.

---

## Files to Modify

| File | Change Required |
|------|-----------------|
| `app.json` | Add package name, versionCode, Hermes config |
| `.env` | Add production server URL |
| `android/app/build.gradle` | Ensure bundleInDebug = true |

---

## Expected Outcome

After completing these steps:
1. Debug APK builds successfully with embedded JS bundle
2. APK runs standalone without Metro bundler
3. Game loads and is playable
4. Multiplayer connects when server is available
