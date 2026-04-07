# Tournament Implementation Plan - Qualifying Phase Only

## Overview

Implement fresh-game-per-hand tournament for **qualifying phase only**:
- 4 players play 4 hands
- Each hand = independent game with new deck and new Socket.IO room
- After 4 hands: top 3 qualify, 4th eliminated

---

## Implementation Steps

### Phase 1: Create TournamentCoordinator

**Files to modify/create:**
- `multiplayer/server/services/TournamentCoordinator.js` (NEW)

**Tasks:**
1. Create class with constructor(gameManager, io)
2. Implement `createQualifier(players, config)` - creates tournament with 4 players
3. Implement `_startNextHand(tournamentId)` - creates fresh game, moves sockets
4. Implement `handleHandComplete(gameState, results)` - updates scores, starts next hand
5. Implement `_endQualifying(tournamentId)` - determines top 3, notifies players
6. Implement helper methods: `_moveSocketsToGame()`, `_getSocketByPlayerId()`

---

### Phase 2: Update GameCoordinatorService

**Files to modify:**
- `multiplayer/server/services/GameCoordinatorService.js`

**Tasks:**
1. Import TournamentCoordinator
2. Add `io` parameter to constructor
3. Initialize: `this.tournamentCoordinator = new TournamentCoordinator(gameManager, io)`
4. In `_handleRoundEnd()`:
   - Replace tournament branch to call `tournamentCoordinator.handleHandComplete(newState, results)`
   - Return early (Coordinator handles next game start)

---

### Phase 3: Update Server Entry Point

**Files to modify:**
- `multiplayer/server/index.js` (or main server file)

**Tasks:**
1. Import TournamentCoordinator
2. Pass `io` to GameCoordinatorService constructor

---

### Phase 4: Client Socket Events

**Files to modify (if needed):**
- Client-side socket handlers

**New events to handle:**
- `game-start` - now includes `tournamentPhase`, `tournamentHand`, `totalHands`
- `tournament-eliminated` - player didn't qualify
- `qualifying-complete` - player qualified
- `qualifying-results` - final leaderboard

---

### Phase 5: Testing

**Test scenarios:**
1. 4 players join tournament → first hand starts
2. Complete hand 1 → scores update → hand 2 starts
3. Complete hand 2 → scores update → hand 3 starts
4. Complete hand 3 → scores update → hand 4 starts
5. Complete hand 4 → top 3 qualify, 4th eliminated
6. Verify socket room migration works
7. Verify eliminated player doesn't receive hand 2 start

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `multiplayer/server/services/TournamentCoordinator.js` | CREATE | New tournament coordinator class |
| `multiplayer/server/services/GameCoordinatorService.js` | MODIFY | Add TournamentCoordinator, pass io |
| `multiplayer/server/index.js` | MODIFY | Pass io to GameCoordinatorService |
| `docs/tournament-fresh-game-per-hand.md` | READ | Reference implementation |

---

## Key Implementation Notes

1. **Fresh game per hand**: Use `initializeGame()` from shared/game.js
2. **Socket room migration**: Leave old room, join new room per hand
3. **Cumulative scores**: Track in TournamentCoordinator, reset each phase
4. **No semifinal yet**: Stop after qualifying for this implementation

---

## Next Steps After This Works

1. Add semifinal phase (3 players, 3 hands)
2. Add final phase (2 players, 2 hands)
3. Add tournament UI for viewing bracket/leaderboard