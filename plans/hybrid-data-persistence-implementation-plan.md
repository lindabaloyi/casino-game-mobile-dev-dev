# Hybrid Data Persistence Implementation Plan

## Overview
This plan implements the PRD requirements for hybrid data persistence: AsyncStorage for guests, MongoDB with local caching for authenticated users.

## Problem Summary
The current implementation has three main issues:
1. **Storage Key Confusion** - Uses single `player_profile` key for both guest and authenticated users
2. **Missing Guest-to-Auth Merge** - Guest data is not merged into MongoDB on sign-up/login
3. **Cache Invalidation Issues** - Auth cache not properly cleared on logout

## Implementation Tasks

### Phase 1: Storage Key Architecture (Files: hooks/usePlayerProfile.ts, hooks/useAuth.ts)

#### 1.1 Define PRD Storage Keys
```
Guest Mode:
- guest_profile: Local profile data (username, avatar, stats)
- guest_game_progress: Local game progress data

Authenticated Mode (Cache):
- player_profile: Cached MongoDB profile for auth users
- auth_cache_profile: Alternative cache key
- auth_cache_progress: Cached game progress for auth users
```

#### 1.2 Update usePlayerProfile.ts
- Modify `loadProfile()` to check auth state and use appropriate key
- Modify `saveProfile()` to write to correct key based on auth state
- Add guest profile auto-creation for new guests

#### 1.3 Add PRD-Specific Constants
```typescript
const GUEST_PROFILE_KEY = 'guest_profile';
const GUEST_GAME_PROGRESS_KEY = 'guest_game_progress';
const AUTH_CACHE_PROFILE_KEY = 'auth_cache_profile';
const AUTH_CACHE_PROGRESS_KEY = 'auth_cache_progress';
```

---

### Phase 2: Guest-to-Auth Merge (Files: hooks/useAuth.ts, hooks/usePlayerProfile.ts)

#### 2.1 On Login/Register - Merge Guest Data
Before authenticating:
1. Read guest_profile from AsyncStorage
2. Read guest_game_progress from AsyncStorage
3. Send merge request to server with guest data

#### 2.2 Server-Side Merge API (Requires backend implementation)
New endpoint: `POST /api/auth/merge-guest`
- Accept guest profile and game progress data
- Merge with existing MongoDB user data using "last write wins" strategy
- Return merged data to client

#### 2.3 Client-Side Merge Flow
After successful auth:
1. Call merge API with local guest data
2. Receive merged profile from server
3. Save merged profile to player_profile (auth cache)
4. Clear guest_profile and guest_game_progress from AsyncStorage

---

### Phase 3: Cache Invalidation on Logout (File: hooks/useAuth.ts)

#### 3.1 Clear All PRD Keys on Logout
```typescript
const logout = async () => {
  // Clear auth data
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  
  // Clear player profile cache
  await AsyncStorage.removeItem('player_profile');
  
  // Clear PRD-specific keys
  await AsyncStorage.removeItem(GUEST_PROFILE_KEY);
  await AsyncStorage.removeItem(GUEST_GAME_PROGRESS_KEY);
  await AsyncStorage.removeItem(AUTH_CACHE_PROFILE_KEY);
  await AsyncStorage.removeItem(AUTH_CACHE_PROGRESS_KEY);
  
  // Clear other caches
  await AsyncStorage.removeItem('server_profile_cache');
  // ... leaderboard caches
};
```

#### 3.2 Clear usePlayerProfile State
- Add callback to reset profile state to default when logout occurs

---

### Phase 4: Read/Write Behavior (Files: hooks/usePlayerProfile.ts)

#### 4.1 Guest Mode Behavior
| Operation | Behavior |
|-----------|----------|
| Read | Read from guest_profile |
| Write | Write to guest_profile, no server call |
| No network | Works fully offline |

#### 4.2 Authenticated Mode Behavior
| Operation | Behavior |
|-----------|----------|
| Read (online) | Read from MongoDB, update local cache |
| Read (offline) | Read from player_profile (cache) |
| Write (online) | Write to MongoDB, update local cache |
| Write (offline) | Show error: "You're offline. Changes will be saved when you reconnect." |

---

### Phase 5: Edge Case Handling

#### 5.1 Guest Upgrades While Offline
- Show error: "Please connect to the internet to create an account. Your progress will be merged automatically afterward."

#### 5.2 Cache Corrupt or Cleared by OS
- On next authenticated read, fetch from MongoDB and rebuild cache

#### 5.3 Merge Conflict Resolution
- Use "last write wins" based on timestamp
- Scalar fields (score, level): take max
- Complex collections: server is authoritative unless local is newer

---

## Acceptance Criteria Mapping

| ID | Criteria | Implementation |
|----|-----------|----------------|
| AC-01 | Guest can play and resume later | Guest writes to guest_profile |
| AC-02 | Guest sign-up merges progress | Merge guest data on register |
| AC-03 | Auth user sees data on different device | MongoDB is source of truth |
| AC-04 | Logout clears all local data | Clear all PRD keys on logout |
| AC-05 | No stale data after login | Clear guest keys after merge |
| AC-06 | Auth user sees data instantly | Cache read + background refresh |
| AC-07 | Guest mode works offline | No network calls in guest mode |
| AC-08 | Offline auth user sees error on write | Check connectivity before write |

---

## Files to Modify
1. `hooks/useAuth.ts` - Add merge logic, fix logout clearing
2. `hooks/usePlayerProfile.ts` - Implement PRD storage key logic

## Files to Create (Future)
1. `hooks/useStorageMode.ts` - Centralize storage mode detection
2. Backend: `/api/auth/merge-guest` endpoint

---

## Testing Checklist
- [ ] Guest user plays, closes app, reopens - progress persists
- [ ] Guest signs up - progress appears in new account
- [ ] Auth user logs in on different device - sees same data
- [ ] Logout - all local data cleared
- [ ] Login after logout - no stale data from previous account
- [ ] Auth user offline - can read cached data, write shows error