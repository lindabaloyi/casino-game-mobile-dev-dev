# Tournament Fresh Game Per Phase - Implementation Plan

## Problem Statement

The current implementation had issues:

1. **Remapping instead of fresh game** - After advancing to SEMI_FINAL, the game state still contains 4 players (P0 eliminated)
2. **Socket indices shift** - Eliminated players linger, indices remap incorrectly
3. **Broadcast shows old entries** - Old socket entries still appear in broadcasts

### Solution: Fresh Game Per Phase

Each tournament phase now creates a **brand new game** with a **new gameId**, moving only qualified players' sockets.

---

## Architecture

```
QUALIFYING (gameId: 1001, 4 players)
    ↓ endTournamentRound() → QUALIFICATION_REVIEW
    ↓ _createFreshState() → _createNewGame() → _migrateSockets()
SEMI_FINAL (gameId: 2002, 3 players only)
    ↓ endTournamentRound() → QUALIFICATION_REVIEW  
    ↓ _createFreshState() → _createNewGame() → _migrateSockets()
FINAL_SHOWDOWN (gameId: 3003, 2 players only)
    ↓ endFinalShowdown()
    → Tournament COMPLETED, winner declared
```

---

## TournamentCoordinator API

### Constructor

```javascript
new TournamentCoordinator(gameManager, matchmaking, broadcaster)
```

### Methods

#### `isTournamentActive(gameState)`

Returns `true` if tournament mode is active.

#### `handleRoundEnd(gameState, gameId, lastAction)`

Main entry point. Handles all phase transitions.

#### `handleClientReady(socketId, gameId, playerIndex)`

Validates client-ready. Returns `false` for eliminated players.

#### `getPlayerNumber(socketId, gameId, gameState)`

Gets current player index for a socket.

---

## Phase Handlers

### `_handleQualifyingRoundEnd`

1. Call `endTournamentRound()` to calculate scores
2. If `QUALIFICATION_REVIEW` → broadcast and wait
3. Otherwise → create fresh SEMI_FINAL state
4. Create new game with `Date.now()` as gameId
5. Migrate only qualified (top 3) sockets
6. Broadcast `game-over` with `nextGameId`
7. Close old game

### `_handleSemifinalRoundEnd`

Same pattern, but creates FINAL_SHOWDOWN with top 2.

### `_handleFinalShowdownRoundEnd`

Calls `endFinalShowdown()`, determines winner.

### `_handleAdvanceFromQualificationReview`

When user clicks "Continue" after seeing scores.

---

## Key Methods

### `_createFreshState(currentState, nextPhase, qualifiedPlayerIds)`

Creates a completely fresh game state:

```javascript
_createFreshState(currentState, nextPhase, qualifiedPlayerIds) {
  const deck = createDeck();
  const cardsPerPlayer = qualifiedPlayerIds.length === 2 ? 10 : 13;
  
  // Build players array - exactly qualified players
  newState.players = qualifiedPlayerIds.map((playerId, index) => ({
    id: playerId,
    index: index,
    hand: deck.splice(0, cardsPerPlayer),
    captures: [],
    score: 0
  }));
  
  newState.playerCount = qualifiedPlayerIds.length;
  newState.tournamentPhase = nextPhase;
  // ... fresh state for new phase
}
```

### `_migrateSockets(oldGameId, newGameId, qualifiedPlayerIds)`

**Critical:** No remapping - just map socket to new index based on `qualifiedPlayerIds` position.

```javascript
_migrateSockets(oldGameId, newGameId, qualifiedPlayerIds) {
  for (const socket of oldSockets) {
    const playerId = this._getPlayerIdFromSocket(socket, oldGameId);
    
    if (playerId && qualifiedPlayerIds.includes(playerId)) {
      // Qualified player - migrate
      const newIndex = qualifiedPlayerIds.indexOf(playerId);
      newSocketMap.set(socket.id, newIndex);
      
      // Update registry
      this.matchmaking.socketRegistry?.set(socket.id, newGameId, ...);
      
      // Move socket between rooms
      socket.leave(`game-${oldGameId}`);
      socket.join(`game-${newGameId}`);
    }
    // Eliminated players are left behind!
  }
}
```

---

## What NOT to Do

1. ❌ **Don't call `startSemifinal` / `startFinalShowdown`** - These modify the same game
2. ❌ **Don't remap socket indices** - Just map to new position in qualifiedPlayers array
3. ❌ **Don't preserve old playerStatuses** - Fresh game = fresh state
4. ❌ **Don't keep eliminated sockets** - Only migrate qualified players
5. ❌ **Don't use old gameId** - Create new gameId for each phase

---

## Expected Debug Output

```
[TournamentCoordinator] Qualifying complete, qualified: ["player_0","player_2","player_3"]
[TournamentCoordinator] Created fresh state for SEMI_FINAL with 3 players
[TournamentCoordinator] Created new game: 1735484000001
[TournamentCoordinator] Migrating from game 1001 to 1735484000001
[TournamentCoordinator] Qualified players: ["player_0","player_2","player_3"]
[TournamentCoordinator] ✓ Migrated socket abc12345 (player_0) -> index 0
[TournamentCoordinator] ✓ Migrated socket def67890 (player_2) -> index 1
[TournamentCoordinator] ✓ Migrated socket ghi11111 (player_3) -> index 2
[TournamentCoordinator] ✗ Left behind socket jkl99999 (not qualified)
[TournamentCoordinator] Broadcasting transition: QUALIFYING -> SEMI_FINAL
[TournamentCoordinator] Created SEMI_FINAL game: 1735484000001
```

---

## Client-Side Handling

When client receives `game-over` with `nextGameId`:

```javascript
socket.on('game-over', (data) => {
  if (data.isTournamentMode && data.nextGameId) {
    // Show transition modal
    showTournamentTransitionModal(data);
    
    // After countdown, join new game
    setTimeout(() => {
      socket.emit('join-game', { gameId: data.nextGameId });
    }, data.countdownSeconds * 1000);
  }
});
```

---

## Files Modified

| File | Change |
|------|--------|
| `TournamentCoordinator.js` | Complete rewrite with fresh game per phase |
| `GameManager.js` | Added `closeGame()` method |

---

## Testing Checklist

- [x] Server loads without errors
- [ ] Qualifying ends → NEW game with 3 players (no P1)
- [ ] Socket migration logs show only qualified players moving
- [ ] Broadcast shows only 3 players in SEMI_FINAL
- [ ] Eliminated player cannot act in new game
- [ ] Same for SEMI_FINAL → FINAL_SHOWDOWN (2 players)
- [ ] Final showdown declares winner correctly

---

## Troubleshooting

### Problem: "Cannot read property X of undefined"

**Cause:** Trying to access players in old game after it's closed.

**Fix:** Ensure `getGameState()` is called before game is closed, or check `game.isClosed` flag.

### Problem: Sockets not migrating

**Cause:** `getGameSockets` returns empty.

**Fix:** Verify socket.io room names match (`game-${gameId}`).

### Problem: Client can't join new game

**Cause:** Client still has old gameId.

**Fix:** Ensure client handles `game-over` with `nextGameId` and reconnects.
