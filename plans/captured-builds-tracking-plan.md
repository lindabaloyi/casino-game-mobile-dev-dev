# Implementation Plan: Captured Builds Tracking for Cooperative Rebuild

## Overview

This plan implements the backend tracking of captured teammate builds for the cooperative rebuild feature in party mode (2v2). When a player's temporary build (temp stack) is captured by an opponent, the system records that build so the player's teammate can later attempt to rebuild it.

## Data Structure

Add a new field to the game state:

```javascript
teamCapturedBuilds: {
  0: [], // Array for team 0 (players 0 and 1)
  1: []  // Array for team 1 (players 2 and 3)
}
```

Each element in the array is: `{ value: number, originalOwner: playerIndex }`

---

## Implementation Steps

### Step 1: Add teamCapturedBuilds to Game State Initialization

**File:** `shared/game/initialization.js`

**Changes:**
- Add `teamCapturedBuilds: { 0: [], 1: [] }` to the state object in both `initializeGame()` (line ~54) and `initializeTestGame()` (line ~146)

**Code to add:**
```javascript
// Track captured teammate builds for cooperative rebuild
teamCapturedBuilds: { 0: [], 1: [] },
```

---

### Step 2: Modify Capture Action to Track Temp Stack Captures

**File:** `shared/game/actions/capture.js`

**Changes:**
- Add tracking logic when a temp stack is captured by an opponent
- Track only in party mode (`state.isPartyMode === true`)
- Only track when the captured stack is a **build_stack** (`type === 'build_stack'`)
- Only track when the capturing player is on a DIFFERENT team than the stack owner

**Location:** After line 89 (where stack is removed from table) and before line 95 (where captured cards are added to player's hand)

**Code to add:**
```javascript
// Track captured teammate builds for cooperative rebuild
// Only track build_stack captures by opponents in party mode
if (state.isPartyMode && buildStack && buildStack.type === 'build_stack') {
  const stackOwner = buildStack.owner;
  const stackOwnerTeam = stackOwner < 2 ? 0 : 1;
  const capturingPlayerTeam = playerIndex < 2 ? 0 : 1;
  
  // Only track if the capturing player is on a DIFFERENT team (opponent captured it)
  if (stackOwnerTeam !== capturingPlayerTeam) {
    // Ensure teamCapturedBuilds exists
    if (!newState.teamCapturedBuilds) {
      newState.teamCapturedBuilds = { 0: [], 1: [] };
    }
    
    // Add entry to the stack owner's team array
    newState.teamCapturedBuilds[stackOwnerTeam].push({
      value: buildStack.value,
      originalOwner: stackOwner
    });
    
    console.log(`[capture] Tracked captured build: value=${buildStack.value}, originalOwner=${stackOwner}, team=${stackOwnerTeam}`);
  }
}
```

---

### Step 3: Also Update captureOwn Action (for completeness)

**File:** `shared/game/actions/captureOwn.js`

**Note:** The PRD says not to track when capturing your own build. However, for completeness and future flexibility, we should also check that we DON'T track in captureOwn. Since captureOwn is used when capturing your OWN temp stack, the team check would naturally prevent tracking (owner and capturing player are the same).

**Changes:**
- Same tracking logic as capture.js, but with additional check to ensure we DON'T track when player captures their own temp stack (which would naturally not add due to team check)

**Code to add:**
```javascript
// Track captured teammate builds for cooperative rebuild
// Only track build_stack captures by opponents in party mode
// Note: This won't trigger for own builds since team check fails, but kept for consistency
if (state.isPartyMode && buildStack && buildStack.type === 'temp_stack') {
  const stackOwner = buildStack.owner;
  const stackOwnerTeam = stackOwner < 2 ? 0 : 1;
  const capturingPlayerTeam = playerIndex < 2 ? 0 : 1;
  
  // Only track if the capturing player is on a DIFFERENT team (opponent captured it)
  if (stackOwnerTeam !== capturingPlayerTeam) {
    if (!newState.teamCapturedBuilds) {
      newState.teamCapturedBuilds = { 0: [], 1: [] };
    }
    
    newState.teamCapturedBuilds[stackOwnerTeam].push({
      value: buildStack.value,
      originalOwner: stackOwner
    });
    
    console.log(`[captureOwn] Tracked captured build: value=${buildStack.value}, originalOwner=${stackOwner}, team=${stackOwnerTeam}`);
  }
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `shared/game/initialization.js` | Add `teamCapturedBuilds` to state initialization |
| `shared/game/actions/capture.js` | Add tracking logic for temp stack captures |
| `shared/game/actions/captureOwn.js` | Add same tracking logic for completeness |

---

## Testing Checklist

1. **Party mode - Opponent captures build stack:**
   - Player A (team 0) creates build with value 8
   - Player B (team 1) captures it
   - Verify: `teamCapturedBuilds[0]` contains `{ value: 8, originalOwner: 0 }`

2. **Party mode - Owner captures own build:**
   - Player A (team 0) creates build with value 8
   - Player A captures their own build
   - Verify: No entry added to any team array

3. **Party mode - Multiple captures:**
   - Player A loses builds of value 8 and 9
   - Verify: Both entries exist in `teamCapturedBuilds[0]`

4. **Duel mode (2 players):**
   - Game should work normally without tracking
   - Verify: `teamCapturedBuilds` field exists but remains empty

---

## State Distribution

The `teamCapturedBuilds` field is automatically included in game state updates sent to clients through the existing multiplayer synchronization. No additional changes needed for frontend to receive this data.

---

## Future Steps (Out of Scope)

1. **Rebuild Action:** Create action that checks `teamCapturedBuilds` and reassigns ownership when build value matches
2. **Frontend Display:** Show available captured builds to help players know what they can rebuild
3. **Removal Logic:** Implement removal when rebuild action succeeds

---

## Acceptance Criteria

- [ ] `teamCapturedBuilds` field present in game state initialization
- [ ] When opponent captures teammate's temp stack in party mode, entry is added to correct team array
- [ ] When player captures own temp stack, no entry is added
- [ ] Multiple captured builds result in multiple entries
- [ ] Field is included in state sent to clients
- [ ] Works in duel mode without errors (empty arrays)
