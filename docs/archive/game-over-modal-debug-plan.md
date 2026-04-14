# Game Over Modal Debug Analysis & Fix Plan

## Problem Statement
The Game Over modal is not showing after tournament phase transitions (qualifying → semifinal → final). Players see the game immediately transition to the next phase without viewing scores, qualification results, or the countdown timer.

## Root Cause Analysis

### Server-Side Flow (Working)
The server correctly emits `game-over` events during phase transitions:
1. TournamentCoordinator._endPhase() creates game-over payload with:
   - `isTournamentMode: true`
   - `nextGameId: null` (delayed creation)
   - `nextPhase: 'SEMI_FINAL'`
   - `qualifiedPlayers: [...]`
   - `eliminatedPlayers: [...]`
   - `countdownSeconds: 8`
2. Event is emitted to the old game room
3. After 8-second delay, next phase game is created and `game-start` is emitted

### Client-Side Flow (Broken)

**Event Reception**: ✅ Working
- `hooks/multiplayer/useGameStateSync.ts` correctly receives `game-over` event
- `setGameOverData(data)` is called with full payload
- Debug logs show correct tournament data received

**Modal Visibility Logic**: ❌ Broken
- `components/game/GameBoard.tsx` has `shouldShowStandardGameOver` logic
- **Current logic suppresses ALL tournament game-over modals**:

```typescript
const shouldShowStandardGameOver = useMemo(() => {
  if (!isGameOver) return false;
  
  // Suppress standard modal when tournament is in terminal phase
  if (gameState.tournamentMode === 'knockout') {
    // This suppresses ALL tournament modals!
    return false;
  }
  return true;
}, [isGameOver, gameState.tournamentMode]);
```

**The Issue**: The suppression logic is too broad. It prevents the modal from showing during phase transitions where we actually WANT it to show.

## Required Behavior

### When to Show Modal
- ✅ Regular games (2/3/4 player non-tournament)
- ✅ Tournament games with transition data (`nextGameId`, `nextPhase`, `qualifiedPlayers`)
- ✅ Tournament games with `countdownSeconds > 0`
- ❌ Tournament hand-to-hand transitions (no transition data)

### When to Suppress Modal
- ❌ Tournament phase transitions (we want to show these!)
- ✅ Only when there's a tournament winner declared
- ✅ Only when in terminal phases without transition data

## Fix Implementation Status

### ✅ Phase 1: Update Modal Visibility Logic - COMPLETED

**File**: `components/game/GameBoard.tsx`

**Changes**:
- Modified `shouldShowStandardGameOver` to show modal when transition data exists
- Added debug logging for visibility decisions
- Now shows modal for tournament phase transitions with qualified/eliminated players or countdown

### ✅ Phase 2: Tournament Mode Detection - COMPLETED

**File**: `components/game/GameBoard.tsx`

**Changes**:
- Updated `isTournamentMode` prop to check `gameOverData?.isTournamentMode` first
- Falls back to `gameState.tournamentMode === 'knockout'`

### ✅ Phase 3: Countdown Timer Handling - COMPLETED

**File**: `components/modals/GameOverModal.tsx`

**Changes**:
- Updated countdown timer trigger from `nextGameId && transitionType === 'auto'`
- Now triggers on `transitionType === 'auto' && countdownSeconds > 0`
- Allows countdown even when `nextGameId` is null during transition

### ✅ Phase 4: Countdown Display - COMPLETED

**File**: `components/modals/GameOverModal.tsx`

**Changes**:
- Updated countdown display text to show different messages based on `nextGameId` presence
- Shows "Next phase starts in X seconds..." when game is ready
- Shows "Preparing next phase in X seconds..." during preparation

### ✅ Phase 5: Play Again Button Logic - COMPLETED

**File**: `components/modals/GameOverModal.tsx`

**Changes**:
- Updated `showPlayAgain` logic to hide button during auto-transitions
- Only shows when not in tournament mode OR when there's no auto-transition

### Testing Scenarios

1. **Regular 4-player game**: Modal should show ✅
2. **Tournament hand 1→2**: Modal should NOT show ✅ (no transition data)
3. **Tournament qualifying→semifinal**: Modal SHOULD show with countdown ✅ (has nextPhase, qualifiedPlayers, countdown)
4. **Tournament final winner**: Modal should show winner ✅

## Debug Steps

### Step 1: Verify Server Events
```bash
# Start server and play tournament
# Check server logs for:
# [TRANSITION] Emitting game-over to room: game-X with 8s countdown
# [useGameStateSync] Received game-over event: {...}
```

### Step 2: Check Client Modal Logic
```typescript
// Add debug logs in GameBoard.tsx
console.log('[DEBUG] isGameOver:', isGameOver);
console.log('[DEBUG] gameState.tournamentMode:', gameState.tournamentMode);
console.log('[DEBUG] gameOverData transition data:', {
  nextGameId: gameOverData?.nextGameId,
  nextPhase: gameOverData?.nextPhase,
  qualifiedPlayers: gameOverData?.qualifiedPlayers,
  countdownSeconds: gameOverData?.countdownSeconds
});
console.log('[DEBUG] shouldShowStandardGameOver:', shouldShowStandardGameOver);
```

### Step 3: Test Modal Props
```typescript
// In GameOverModal component
console.log('[GameOverModal] Props:', {
  visible,
  isTournamentMode,
  nextGameId,
  nextPhase,
  countdownSeconds,
  qualifiedPlayers,
  eliminatedPlayers
});
```

## Expected Outcome

After implementing the fix:
1. Tournament phase transitions show Game Over modal with:
   - Qualification results (✓ qualified, ✗ eliminated)
   - Next phase announcement
   - 8-second countdown
   - Auto-transition to next game
2. Regular tournament hands don't show modal
3. Non-tournament games show modal as before

## Rollback Plan

If issues occur:
1. Revert `shouldShowStandardGameOver` logic
2. Keep server-side delay (8 seconds) 
3. Test with client-side modal suppression instead

## Implementation Priority

1. **High**: Fix modal visibility logic (Phase 1)
2. **Medium**: Update tournament mode detection (Phase 2)  
3. **Low**: Improve countdown handling (Phase 3-4)
4. **Test**: Comprehensive testing across all scenarios</content>
<parameter name="filePath">docs/game-over-modal-debug-plan.md