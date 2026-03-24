# Phase 1: Android Build Pipeline Setup - PRD

## 1. Executive Summary

**Objective**: Fix the "java.io Exception failed to download remote update" error and enable standalone APK builds without Metro bundler dependency.

**Current Status**: The Android APK requires Metro bundler to serve JavaScript, causing runtime failures when running standalone.

**Target Outcome**: Generate standalone APK with embedded JavaScript bundle that works without Metro.

---

## 2. Current State Analysis

### 2.1 Technology Stack

| Component | Current Value |
|-----------|----------------|
| Framework | Expo SDK 54, React Native 0.81.5 |
| Language | TypeScript ~5.9.2 |
| Navigation | expo-router v6.0.21 |
| JS Engine | hermes (already configured) |
| Platform Target | iOS, Android, Web |

### 2.2 Existing Configuration

**app.json** (lines 20-31):
- Package: `com.anonymous.casinomobile`
- Version Code: 1
- JS Engine: hermes
- Orientation: landscape

**Environment Variables** (.env):
- `EXPO_PUBLIC_SOCKET_URL_LOCAL`: http://localhost:3001
- `EXPO_PUBLIC_SOCKET_URL_LAN`: http://192.168.18.14:3001
- `EXPO_PUBLIC_SOCKET_URL`: http://localhost:3001
- `EXPO_PUBLIC_AUTODETECT_ENABLED`: true

### 2.3 Missing Configuration

- No `bundleInExpo` flag in app.json
- No build configurations for debug/release variants
- No expo-dev-client package installed

---

## 3. Problem Statement

### Problem 1: Metro Dependency
**Error**: "java.io Exception failed to download remote update"

**Root Cause**: 
- Debug APK expects Metro bundler to serve JavaScript bundle
- No JS bundle embedded in the APK
- Release build not configured to include bundle

**Impact**: App crashes on Android when Metro is not running

### Problem 2: DevTools Connection Issues
**Root Cause**: Proper port forwarding and network configuration not set up

**Impact**: Difficult to debug on physical Android devices

---

## 4. Requirements

### 4.1 Must Have (Critical Path)

| ID | Requirement | Success Criteria |
|----|-------------|-------------------|
| R1 | Update app.json with Android build config | `bundleInExpo: true` added to debug and release |
| R2 | Configure JS bundle embedding | APK includes bundled JS without Metro |
| R3 | Enable Metro bundler for development | Hot reload and debugging works |
| R4 | Test both Metro and standalone builds | Both approaches functional |
| R5 | Verify game functionality | All game modes playable |

### 4.2 Should Have (Enhancement Path)

| ID | Requirement | Success Criteria |
|----|-------------|-------------------|
| R6 | Install expo-dev-client | Enables dev client builds |
| R7 | Add release build configuration | Production-ready APK generation |

### 4.3 Nice to Have (Polish)

| ID | Requirement | Success Criteria |
|----|-------------|-------------------|
| R8 | Configure EAS Build pipeline | Cloud-based APK builds |

---

## 5. Implementation Plan

### 5.1 Task 1: Update app.json

**File**: `app.json`

**Changes Required**:
```json
{
  "expo": {
    "android": {
      "package": "com.casinogame.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundColor": "#0f4d0f"
      },
      "buildConfigurations": {
        "debug": {
          "bundleInExpo": true
        },
        "release": {
          "bundleInExpo": true,
          "jsEngine": "hermes"
        }
      }
    }
  }
}
```

**Notes**:
- Change package name from `com.anonymous.casinomobile` to `com.casinogame.app`
- Add `buildConfigurations` object with bundleInExpo flags

### 5.2 Task 2: Install Required Packages

**Command**:
```bash
npm install expo-dev-client
```

**Package**: expo-dev-client ~5.0.0

**Purpose**: Enable dev client builds for testing

### 5.3 Task 3: Build & Run WITH Metro (Development)


**Start Metro bundler:**
```bash
npx expo start
```

**Run on Android Emulator:**
```bash
npx expo run:android
```

**Features:**
- Hot reload enabled
- Real-time code changes
- Console logs in Metro terminal
- Debug at http://localhost:8081/debugger-ui

**Debugging:**
- Press `d` in Metro terminal to open DevTools
- Or open browser: http://localhost:8081/debugger-ui

### 5.4 Task 4: Build & Run WITHOUT Metro (Standalone APK)

**Build Debug APK (bundled JS):**
```bash
npx expo run:android --variant debug
```

**Build Release APK:**
```bash
npx expo run:android --variant release
```

**How it works:**
- JavaScript bundle is embedded inside the APK
- No Metro bundler needed
- Works completely offline
- Install APK directly to device/emulator

**APK Location:**
- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

### 5.5 Task 5: Verify Game Functionality

**Test Checklist - With Metro:**
- [ ] App launches and connects to Metro
- [ ] Hot reload works when saving files
- [ ] Console logs appear in Metro terminal
- [ ] DevTools accessible

**Test Checklist - Without Metro:**
- [ ] APK installs on Android device/emulator
- [ ] App launches without Metro bundler
- [ ] Main menu loads correctly
- [ ] 2 Hands game mode works
- [ ] 3 Hands game mode works
- [ ] 4 Hands game mode works
- [ ] Party mode (2v2) works
- [ ] Multiplayer connection works

---

## 6. Build Variants Reference

| Variant | JS Bundle | Metro Required | Use Case |
|---------|-----------|-----------------|----------|
| Debug | Bundled | No | Testing APK |
| Release | Bundled | No | Production APK |
| Development | Not bundled | Yes | Active development |

---

## 7. Risk Mitigation

### Risk 1: Large Bundle Size
**Mitigation**: 
- Hermes engine already configured for compression
- Monitor bundle size during builds

### Risk 2: Network Connectivity
**Mitigation**:
- Environment variables already configured for LAN/local URLs
- Auto-detection already enabled in .env

---

## 8. Acceptance Criteria

### Phase 1 Complete When:

**With Metro (Development):**
1. ✅ Metro starts successfully with `npx expo start`
2. ✅ App runs on Android emulator with `npx expo run:android`
3. ✅ Hot reload works when saving code changes
4. ✅ Console logs appear in Metro terminal
5. ✅ DevTools accessible at http://localhost:8081/debugger-ui

**Without Metro (Standalone APK):**
1. ✅ `app.json` updated with `bundleInExpo: true`
2. ✅ Debug APK builds with bundled JS (`--variant debug`)
3. ✅ APK runs on Android without Metro
4. ✅ At least one game mode (2 Hands) fully functional
5. ✅ No "java.io Exception" errors on startup

**Both Approaches Working:**
- [ ] Can switch between Metro and standalone as needed
- [ ] Development workflow with hot reload operational
- [ ] Standalone APK can be installed independently

---

## 9. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| expo-dev-client | Yes | For dev client builds |
| hermes | Already configured | JS engine |

---

## 10. Timeline Estimate

| Task | Estimate |
|------|----------|
| Update app.json | 10 minutes |
| Install packages | 5 minutes |
| Build with Metro | 5-10 minutes |
| Build standalone APK | 10-15 minutes |
| Verify both approaches | 30 minutes |
| **Total** | ~1.5 hours |

---

## 11. Related Documentation

- [Android Refactor Plan](plans/android-refactor-plan.md) - Full context
- [app.json](app.json) - Current configuration
- [.env](.env) - Environment variables
- [package.json](package.json) - Dependencies

---

## Quick Reference: Both Approaches

### WITH Metro (Development)
```bash
# Terminal 1: Start Metro
npx expo start

# Terminal 2: Run on emulator
npx expo run:android
```
- Hot reload
- Console logs in Metro terminal
- Debug at http://localhost:8081/debugger-ui

### WITHOUT Metro (Standalone APK)
```bash
# Build with bundled JS
npx expo run:android --variant debug

# APK location:
# android/app/build/outputs/apk/debug/app-debug.apk
```
- No Metro needed
- Works offline
- Shareable APK
