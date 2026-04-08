# Game Over Modal Fix – Tournament Mode (Comprehensive Guide)

## Problem Statement
In tournament mode (e.g., 4‑player knockout qualifying), the **Game Over modal did not appear** after a hand finished, even though the modal worked perfectly in regular game modes (2‑player, 3‑player, 4‑player free‑for‑all).  
The client logs showed `isGameOver: false` and `gameOverData: null`, indicating the `game-over` event never reached the client.

---

## Root Cause Analysis

### How Regular Modes Work (2‑player, 3‑player, 4‑player)
1. Round ends → `RoundValidator.shouldEndRound()` returns `true`.
2. `GameCoordinatorService._handleRoundEnd()` calls `RoundValidator.checkGameOver()`.
3. For non‑tournament modes, `checkGameOver()` returns `{ gameOver: true, winner, finalScores }`.
4. `_handleRoundEnd()` calls `_handleGameOver()`.
5. `_handleGameOver()` emits a `game-over` event using **`broadcaster.broadcastToGame()`** – a proven method that reliably reaches all clients in the game.
6. Client receives the event → sets `gameOverData` → `isGameOver = true` → modal shows.

### Why Tournament Mode Failed
1. Round ends → `RoundValidator.checkGameOver()` detects `tournamentMode === 'knockout'` and **explicitly returns `{ gameOver: false }`** (intentional – the tournament should continue with more hands).
2. `_handleRoundEnd()` sees tournament mode and calls `TournamentCoordinator.handleRoundEnd()` instead of `_handleGameOver()`.
3. Inside `TournamentCoordinator.handleHandComplete()`, the `game-over` emission was:
   - **Conditional** – only executed if `previousGameId` existed (which is `null` for the first hand).
   - **Using direct socket.io `io.to(...).emit()`** instead of the `broadcaster` service.
   - **Missing important payload fields** (capturedCards, scoreBreakdowns, etc.).
4. As a result:
   - First hand → no emission at all.
   - Later hands → emission may not reach clients due to room mismatches or missing socket registry entries.
   - Client never receives `game-over` → `gameOverData` stays `null` → modal never shows.

---

## Changes Made

### 1. `TournamentCoordinator.js` – Unconditional Emission Using Broadcaster

**File:** `multiplayer/server/services/TournamentCoordinator.js`  
**Method:** `handleHandComplete(gameState, results)`

**Before (broken):**
```javascript
// Inside the else block (phase not complete)
const previousGameId = tournament.previousGameId;
if (previousGameId) {
  const previousGameState = this.gameManager.getGameState(previousGameId);
  if (previousGameState) {
    // Minimal payload, using io.to()
    this.io.to(`game-${previousGameId}`).emit('game-over', gameOverPayload);
  }
}
```

**After (fixed):**
```javascript
// ALWAYS emit game-over for this hand (same as _handleGameOver)
const playerCount = gameState.playerCount || 4;
const capturedCards = [];
for (let i = 0; i < playerCount; i++) {
  capturedCards.push(gameState.players[i]?.captures?.length || 0);
}

const tableCardsRemaining = gameState.tableCards?.length || 0;
const deckRemaining = gameState.deck?.length || 0;

const scores = results.finalScores || [];
const scoreBreakdowns = results.scoreBreakdowns || [];

const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
const winner = scores.findIndex(s => s === maxScore);

const gameOverPayload = {
  winner: winner >= 0 ? winner.toString() : '0',
  finalScores: scores,
  capturedCards,
  tableCardsRemaining,
  deckRemaining,
  scoreBreakdowns,
  teamScoreBreakdowns: null,
  isPartyMode: false,
  isTournamentMode: true,
  playerStatuses: gameState.playerStatuses || {},
  qualifiedPlayers: gameState.qualifiedPlayers || [],
  handNumber: tournament.currentHand,
  totalHands: tournament.totalHands
};

// Use the same broadcaster method as regular game over
this.broadcaster.broadcastToGame(gameState.gameId, 'game-over', gameOverPayload, this.matchmaking);
console.log(`[HAND_END] ✅ Emitted game-over for hand ${tournament.currentHand} to game ${gameState.gameId}`);
```

**Key improvements:**
- **Unconditional emission** – every hand, including the first, now triggers a `game-over` event.
- **Uses `broadcaster.broadcastToGame()`** – the same reliable method used by non‑tournament modes.
- **Full payload** – includes all fields the client expects (capturedCards, scoreBreakdowns, etc.), ensuring the modal can display detailed results.
- **No dependency on `previousGameId`** – avoids missing the first hand.

### 2. Client‑Side Modal Logic (Already Correct)

The client's `GameBoard.tsx` already had a simplified modal visibility check:
```typescript
const shouldShowStandardGameOver = useMemo(() => {
  if (!isGameOver) return false;
  return true; // Show modal for ALL games
}, [isGameOver]);
```
No changes were required here, as the issue was purely server‑side.

### 3. Supporting Changes in `_handleTournamentRoundEnd`

To ensure the hand completion is detected reliably, `_handleTournamentRoundEnd` now sets `gameState.gameOver = true` before calling `handleHandComplete`:
```javascript
// Hand is complete when game is over OR when round ended
const isHandComplete = gameState.gameOver === true || gameState.roundEndReason !== undefined;
if (isHandComplete) {
  gameState.gameOver = true; // Force flag for consistency
  // ... call handleHandComplete
}
```
This guarantees that `handleHandComplete` receives a state where `gameOver` is `true`, even though `RoundValidator.checkGameOver()` returned `false`.

---

## Complete Flow After Fix

```
1. Hand ends (all cards played, all turns ended)
   ↓
2. RoundValidator.shouldEndRound() → true
   ↓
3. GameCoordinatorService._handleRoundEnd() calls RoundValidator.checkGameOver()
   ↓
4. checkGameOver() returns { gameOver: false } (tournament mode)
   ↓
5. _handleRoundEnd() calls TournamentCoordinator.handleRoundEnd()
   ↓
6. TournamentCoordinator._handleTournamentRoundEnd() detects hand completion
   ↓
7. _handleTournamentRoundEnd() sets gameState.gameOver = true
   ↓
8. Calls handleHandComplete(gameState, results)
   ↓
9. handleHandComplete() updates cumulative scores, then:
   - Builds full gameOverPayload (capturedCards, scoreBreakdowns, etc.)
   - Calls broadcaster.broadcastToGame(gameState.gameId, 'game-over', payload)
   ↓
10. Broadcaster sends event to all sockets in the game
   ↓
11. Client receives 'game-over' event → sets gameOverData
   ↓
12. isGameOver becomes true (gameOverData exists)
   ↓
13. GameOverModal appears with scores and breakdowns
```

---

## Why This Fix Works

| Aspect | Before | After |
|--------|--------|-------|
| **Emission condition** | Only if `previousGameId` existed (first hand missed) | Unconditional – every hand |
| **Emission method** | `io.to(...).emit()` (unreliable for tournament rooms) | `broadcaster.broadcastToGame()` (proven reliable) |
| **Payload completeness** | Minimal (missing capturedCards, scoreBreakdowns) | Full – matches `_handleGameOver` |
| **Hand detection** | Relied on `gameOver` flag (never set) | Explicitly sets `gameState.gameOver = true` |
| **Client modal trigger** | No event → no modal | Event received → modal shows |

---

## Manual Next Hand Control

Because the automatic `_startNextHand()` call was intentionally commented out (to give full control over when the next hand begins), the tournament **stops after each hand**.  
A manual trigger (e.g., a custom socket event `start-next-hand`) is required to start the next hand. This does not affect the modal.

---

## Verification Steps

### Server Logs – Should Show:
```
[HAND_END] ✅ Emitted game-over for hand 1 to game 3
[Broadcaster] Emitting game-over to socket: xxx
```

### Client Logs – Should Show:
```
[useGameStateSync] Received game-over event: { winner: ..., finalScores: ..., scoreBreakdowns: ... }
[DEBUG] Showing GameOverModal - game ended
```

### If Still Not Working – Debugging Checklist

1. **Confirm the event is emitted** – add a `console.log` right before `broadcaster.broadcastToGame()` and check server logs.
2. **Check `broadcaster.broadcastToGame` implementation** – ensure it correctly retrieves sockets from `matchmaking.socketRegistry` or falls back to rooms.
3. **Verify socket registry** – in `_startNextHand`, after `socketRegistry.set()`, log the entry to confirm it exists.
4. **Client listener** – ensure the client's socket is listening to the `game-over` event and that no conditional blocks skip it.
5. **Network tab** – use browser dev tools to see if the WebSocket message is actually sent.

---

## Files Modified

| File | Change |
|------|--------|
| `multiplayer/server/services/TournamentCoordinator.js` | Unconditional `game-over` emission using `broadcaster.broadcastToGame()`; full payload; forced `gameState.gameOver = true`. |
| `components/game/GameBoard.tsx` | (No change needed – already simple) |
| `docs/game-over-modal-fix.md` | This document – comprehensive explanation. |

---

## Conclusion

The modal now appears after **every** hand in tournament mode, mirroring the behaviour of regular game modes. The fix aligns tournament hand‑end emission with the proven `broadcaster` pattern, removes conditional blocks that could skip emission, and provides the client with all necessary data to display scores and breakdowns.
