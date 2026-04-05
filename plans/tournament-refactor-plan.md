# Tournament Refactor Plan

## Goal
Move all tournament-specific logic out of `GameCoordinatorService` into dedicated modules. This will isolate bugs, eliminate remapping, and make turn management trivial.

## Current Issues to Fix
1. Eliminated player sends `client-ready` - should be rejected
2. Turn stuck after eliminated player - needs to skip eliminated
3. `currentPlayer` points to eliminated player after transition
4. Remapping still happening in some places
5. Qualified player never ready - hard to debug

## Proposed File Tree

```
multiplayer/server/
├── services/
│   ├── GameCoordinatorService.js      (cleaned – only delegation)
│   ├── TournamentPhaseManager.js      (NEW – phase transitions, state mutation)
│   ├── TournamentTurnManager.js       (NEW – next active player, skip eliminated)
│   ├── TournamentSocketManager.js     (NEW – socket cleanup, ready validation)
│   └── TournamentManager.js           (existing – keep only qualification helpers)
│
shared/game/tournament/
├── phases.js                          (NEW – startSemifinal, startFinalShowdown)
├── turn.js                           (NEW – getNextTournamentPlayer)
└── validation.js                     (NEW – isEliminated, canAct)
```

## Key Modules

### 1. TournamentPhaseManager
**Responsibility**: Handle phase transitions

**Functions**:
- `transitionToSemifinal(gameState, qualifiedPlayers)` → returns new state (no remapping)
- `transitionToFinalShowdown(...)`
- `setCurrentPlayerToFirstActive(state)`
- `clearReadyStatus(gameId)` – calls GameManager

### 2. TournamentTurnManager  
**Responsibility**: Turn order for tournament

**Functions**:
- `getNextPlayer(state, currentPlayer)` → uses `playerStatuses` to skip eliminated, keeps original indices
- `shouldSkipTurn(state, playerIndex)`

**Does NOT modify** generic `nextTurn` in `shared/game/turn.js` - tournament uses its own.

### 3. TournamentSocketManager
**Responsibility**: Socket lifecycle

**Functions**:
- `removeEliminatedSockets(gameId, qualifiedPlayers)` – deletes from socketPlayerMap
- `isEliminated(socket, gameState)` – used in client-ready handler
- `cleanupAfterTransition(gameId)`

### 4. GameCoordinatorService
**After refactor**: Thin orchestrator

- Removes all `if (tournamentPhase === ...)` branches
- Delegates phase detection to TournamentPhaseManager
- Action validation: calls TournamentTurnManager.canAct() before executing
- Broadcasting remains

### 5. Socket handlers (index.js)
- `client-ready` now calls `TournamentSocketManager.isEliminated(socket, gameState)` - rejects immediately
- No other changes

## How This Fixes the Bugs

| Bug | Solution |
|-----|----------|
| Eliminated player sends client-ready | TournamentSocketManager.isEliminated rejects before marking ready |
| Turn stuck after eliminated player | TournamentTurnManager.getNextPlayer skips eliminated (1 → 2 directly) |
| currentPlayer points to eliminated after transition | TournamentPhaseManager.setCurrentPlayerToFirstActive runs after phase change |
| Remapping still happening | Removed entirely - all indices stay original (0-3) |
| Qualified player never ready | Debugging isolated to TournamentSocketManager - logs expected players |

## Implementation Steps

### Phase 1: Create New Modules

1. Create `TournamentTurnManager.js`
   - Copy `getNextActivePlayer` from turn.js
   - Add `canAct(playerIndex, gameState)` 
   - Add debug logging

2. Create `TournamentSocketManager.js`
   - Add `isEliminated(socketId, gameState)` 
   - Add `removeEliminatedSockets(gameId, qualifiedPlayers)`
   - Add debug logging

3. Create `TournamentPhaseManager.js`
   - Add `transitionToSemifinal(gameState, qualifiedPlayers)`
   - Add `transitionToFinalShowdown(gameState, qualifiedPlayers)`
   - Add `setCurrentPlayerToFirstActive(state)`
   - Add `clearReadyStatus(gameId)`

### Phase 2: Update GameCoordinatorService

1. Import new managers
2. Replace inline tournament code with delegation
3. Remove all `if (tournamentPhase === ...)` branches
4. Keep only: action routing, broadcasting, persistence

### Phase 3: Update Socket Handlers

1. Update `client-ready` to use `TournamentSocketManager.isEliminated`
2. Add debug logging for which players should ready up

### Phase 4: Cleanup

1. Remove old tournament code from startQualificationReview.js
2. Remove any remaining remapping logic
3. Update imports/exports

### Phase 5: Testing

1. Test tournament qualification → semifinal transition
2. Test semifinal → final transition  
3. Test turn order skips eliminated players
4. Test eliminated player is rejected from client-ready

## Example: TournamentTurnManager.getNextPlayer

```javascript
getNextPlayer(state, currentPlayer) {
  const total = state.playerCount;
  let next = (currentPlayer + 1) % total;
  const start = next;
  while (state.playerStatuses?.[`player_${next}`] === 'ELIMINATED') {
    next = (next + 1) % total;
    if (next === start) return currentPlayer; // no active players
  }
  return next;
}
```

## Example: TournamentSocketManager.isEliminated

```javascript
isEliminated(socketId, gameState) {
  const socketMap = gameManager.socketPlayerMap.get(gameState.gameId);
  const playerIndex = socketMap?.get(socketId);
  if (playerIndex === undefined || playerIndex === null) return true;
  
  const playerId = `player_${playerIndex}`;
  return gameState.playerStatuses?.[playerId] === 'ELIMINATED';
}
```

## Risk Assessment

**Low Risk**:
- External behavior unchanged
- All logic moved to new modules
- Can roll back by reverting imports

**High Value**:
- Isolates tournament bugs
- Makes debugging easier
- Removes remapping complexity
- Cleaner separation of concerns
