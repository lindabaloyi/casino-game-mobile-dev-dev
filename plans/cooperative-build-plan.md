# Plan: Cooperative Build Feature - Allow Building Teammate's Captured Builds

## Overview

When a teammate's build is captured by opponents, the remaining team member should be able to rebuild that build. The `teamCapturedBuilds` tracking is now working. This plan enables using that data to allow players to build those values from the PlayOptionsModal.

## Current State

- `teamCapturedBuilds: { 0: [], 1: [] }` is now in game state
- When opponent captures a build, it gets tracked: `teamCapturedBuilds[team].push({ value, originalOwner })`
- Example: `teamCapturedBuilds: {"0":[],"1":[{"value":8,"originalOwner":2}]}`

## Goal

When a player opens PlayOptionsModal to accept a temp stack:
1. Check team's `teamCapturedBuilds` for available captured build values
2. Allow building those values even if player doesn't have matching card in hand
3. Show "Team Build" option in modal (e.g., "Build 8 (Team)")

---

## Implementation Plan

### Step 1: Pass teamCapturedBuilds to Frontend

**File:** GameBoard component chain needs to receive `teamCapturedBuilds`

**Changes:**
- GameBoard receives `teamCapturedBuilds` from game state
- Pass down through TableArea → StackOverlay → accept button
- Or: Pass to GameModals → PlayOptionsModal

### Step 2: Modify PlayOptionsModal to Accept teamCapturedBuilds

**File:** `components/modals/PlayOptionsModal.tsx`

**Props to add:**
```typescript
interface PlayOptionsModalProps {
  // ... existing props
  teamCapturedBuilds?: { value: number; originalOwner: number }[];
  playerTeam?: number;
}
```

**Logic changes:**
1. Calculate player's team from playerIndex: `playerTeam = Math.floor(playerNumber / 2)`
2. Get team's captured builds: `teamCapturedBuilds[playerTeam]`
3. Filter values that match the temp stack's possible values
4. Show "Team Build" button for these values

### Step 3: Add Team Build Options to UI

**Current UI shows:**
- "Build X (sum)" - if player has card matching total
- "Build Y (base)" - if player has card matching base value
- "No matching cards" - if no matches

**New UI should show:**
- "Build 8 (Team)" - if teammate's build of value 8 was captured
- Include original owner info: "Build 8 (Team - P3)"

### Step 4: Handle Accept Action for Team Builds

**Backend:** `shared/game/actions/acceptTemp.js`

**Changes:**
- When accepting a build value, check if it came from team captured builds
- If yes, don't require player to have the card in hand
- After successful accept, optionally remove from teamCapturedBuilds?

**Decision:** Should we remove from teamCapturedBuilds after successful rebuild?
- Option A: Remove (one-time use)
- Option B: Keep (allow multiple teammates to rebuild)
- **Recommendation:** Keep - allows both teammates to rebuild if needed

---

## Files to Modify

| File | Changes |
|------|---------|
| `components/game/GameBoard.tsx` | Pass `teamCapturedBuilds` to GameModals |
| `components/game/GameModals.tsx` | Pass `teamCapturedBuilds` to PlayOptionsModal |
| `components/modals/PlayOptionsModal.tsx` | Add teamCapturedBuilds prop, add Team Build options |
| `shared/game/actions/acceptTemp.js` | May need validation update (check if card-in-hand required) |

---

## UI Mockup

```
┌─────────────────────────────────┐
│         Build Options            │
│   Use stack to build the following: │
│                                  │
│   [5♠] [3♥] +                  │
│   Total: 8                      │
│                                  │
│   ┌─────────────────────────┐   │
│   │ Build 8 (sum)          │   │ ← Player has 8 in hand
│   └─────────────────────────┘   │
│                                  │
│   ┌─────────────────────────┐   │
│   │ Build 8 (Team - P3)     │   │ ← NEW: Team build option
│   └─────────────────────────┘   │
│                                  │
│   [Cancel]                      │
└─────────────────────────────────┘
```

---

## Acceptance Criteria

1. ✅ `teamCapturedBuilds` exists in game state
2. ✅ When opponent captures teammate's build, it gets tracked
3. ✅ PlayOptionsModal receives teamCapturedBuilds
4. ✅ Team Build options appear when teammate's build was captured
5. ✅ Player can select Team Build without having the card in hand
6. ✅ AcceptTemp action succeeds for Team Build values

---

## Questions for Clarification

1. **One-time use?** Should a captured build be removed from teamCapturedBuilds after being rebuilt?
   - Recommendation: Keep it (allow both teammates to rebuild)

2. **Card requirement?** Should we require the player to have ANY card in hand to do a team build, or allow it even with empty hand?
   - Recommendation: Require at least one card (can't build with nothing)

3. **Display format:** "Build 8 (Team)" or "Build 8 (Teammate)"?
   - Recommendation: "Build 8 (Team Build)"
