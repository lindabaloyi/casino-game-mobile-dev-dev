# Tournament Semi-Final Bug Fix Plan

## Problem Summary

When transitioning from QUALIFYING to SEMI_FINAL:
1. **Eliminated players still receive game actions** - ELIMINATED player (player_2) can send drag events and game actions
2. **"Not your turn" error** - currentPlayer shows 0, but eliminated player at index 2 tries to act
3. **Hand dealing issue** - Need to verify hands are dealt correctly to qualified players

## Root Causes Identified

### 1. Server-side: No ELIMINATED check in game action handlers
- `handleGameAction` - Already has check but needs verification
- `handleDragStart/Move/End` - Already has check but needs verification
- `handleStartNextRound` - Already has check but needs verification
- **ActionRouter.js** - Missing check! The shared action router needs to reject ELIMINATED players

### 2. Turn Management: Uses playerIndex instead of accounting for ELIMINATED
- The `currentPlayer` is set to 0, but when ELIMINATED players are filtered out, the turn order should skip them
- `nextTurn` in turn.js already skips ELIMINATED players, but ActionRouter turn check doesn't

### 3. Socket-to-Player Mapping
- When transitioning to SEMI_FINAL, the players array is rebuilt with new indices
- The socketPlayerMap still maps sockets to old indices (0-3)
- After filtering to 3 players, playerIndex 2 no longer exists in the new players array
- The eliminated player's socket still maps to index 2, which is now invalid

## Fix Plan

### Phase 1: Fix ActionRouter turn check (DONE)
- Add ELIMINATED check before turn validation
- Reject actions from ELIMINATED players with "You have been eliminated"

### Phase 2: Verify GameCoordinatorService handlers (DONE)
- Ensure handleGameAction, handleDrag*, handleStartNextRound all reject ELIMINATED

### Phase 3: Investigate hand dealing
- The logs show qualified players (player_0, player_1, player_3) should get new hands
- Need to verify hands are dealt after SEMI_FINAL transition

### Phase 4: Investigate turn order after transition
- The currentPlayer should be set to first qualified player (index 0)
- Turn management should properly cycle through only ACTIVE players
- nextTurn in turn.js already handles skipping ELIMINATED

## Expected Behavior After Fix

1. When QUALIFYING ends and SEMI_FINAL starts:
   - Only 3 players (player_0, player_1, player_3) remain in players array
   - player_2 (ELIMINATED) is NOT in the players array
   - All 4 sockets still exist, but eliminated socket maps to index that doesn't exist
   - ELIMINATED player receives playerNumber: null and sees SpectatorView

2. During SEMI_FINAL:
   - ELIMINATED player cannot send any game actions (rejected at multiple layers)
   - Turn cycles through only ACTIVE players: 0 → 1 → 3 → 0 (skipping 2)
   - "Not your turn" shows currentPlayer: 0 when eliminated tries to act

## Testing Checklist

- [ ] ELIMINATED player cannot send trail, build, capture actions
- [ ] ELIMINATED player cannot send drag-start/move/end events
- [ ] ELIMINATED player sees SpectatorView (playerNumber: null)
- [ ] Qualified players get proper hands dealt
- [ ] Turn cycles correctly through only active players
- [ ] "Not your turn" error shows correct currentPlayer for 3-player game
