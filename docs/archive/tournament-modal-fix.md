# Tournament Game Over Modal Fix

## Problem

The Game Over modal was not showing when tournament hands transitioned. The server was immediately starting the next hand without letting the client display the modal.

## Solution

Modified `TournamentCoordinator.js` to emit a `game-over` event before transitioning to the next hand, giving clients time to display the modal.

## Code Changes

### File: `multiplayer/server/services/TournamentCoordinator.js`

**Location:** `handleHandComplete` method (around line 261-295)

**Before:**
```javascript
if (phaseComplete) {
  await this._endPhase(gameState.tournamentId, gameState);
} else {
  await this._startNextHand(gameState.tournamentId);
}
```

**After:**
```javascript
if (phaseComplete) {
  await this._endPhase(gameState.tournamentId, gameState);
} else {
  // Show modal before starting next hand - emit game-over event for client to display modal
  const previousGameId = tournament.previousGameId;
  if (previousGameId) {
    const previousGameState = this.gameManager.getGameState(previousGameId);
    if (previousGameState) {
      // Get scores for the game-over event
      const scores = previousGameState.scores || [];
      const scoreBreakdowns = previousGameState.scoreBreakdowns || [];
      
      // Determine winner
      const maxScore = Math.max(...scores);
      const winner = scores.findIndex(s => s === maxScore);
      
      // Emit game-over event so client can show modal with scores
      const gameOverPayload = {
        winner: winner >= 0 ? winner.toString() : '0',
        finalScores: scores,
        isTournamentMode: true,
        playerStatuses: previousGameState.playerStatuses || {},
        tournamentScores: previousGameState.tournamentScores || {},
        // No transition data for regular hand-to-hand (will suppress modal on client)
        scoreBreakdowns: scoreBreakdowns
      };
      
      console.log(`[HAND_TRANSITION] Emitting game-over for hand ${tournament.currentHand} before next hand`);
      this.io.to(`game-${previousGameId}`).emit('game-over', gameOverPayload);
      
      // Wait 3 seconds to let clients see the modal
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  await this._startNextHand(gameState.tournamentId);
}
```

## How It Works

### For Regular Hand Transitions (Hand 1 → Hand 2, etc.)

1. Hand 1 completes
2. Server emits `game-over` event with scores (NO transition data)
3. Client receives event, sets `gameOverData`
4. **Modal suppression logic** checks: hasTransitionData = false (no nextGameId, qualifiedPlayers, etc.)
5. Modal is suppressed (not shown) - this is correct for regular hand transitions
6. After 3 seconds, next hand starts

### For Phase Transitions (QUALIFYING → SEMI_FINAL)

1. Hand 4 (last qualifying hand) completes
2. Server creates next phase game FIRST, then emits `game-over` with:
   - `nextGameId: <new game ID>`
   - `nextPhase: 'SEMI_FINAL'`
   - `countdownSeconds: 8`
   - `qualifiedPlayers: [...]`
   - `eliminatedPlayers: [...]`
3. Client receives event, sets `gameOverData`
4. **Modal shows** because hasTransitionData = true (has nextGameId, countdownSeconds, etc.)
5. After 8 seconds, server broadcasts `game-start` to new game

## Client-Side Modal Logic

**File:** `components/game/GameBoard.tsx`

```javascript
const shouldShowStandardGameOver = useMemo(() => {
  if (!isGameOver) return false;

  // For tournament mode, show modal when there's transition data
  if (gameState.tournamentMode === 'knockout') {
    const hasTransitionData = !!(
      gameOverData?.nextGameId ||
      gameOverData?.nextPhase ||
      gameOverData?.qualifiedPlayers?.length ||
      gameOverData?.eliminatedPlayers?.length ||
      (gameOverData?.countdownSeconds && gameOverData.countdownSeconds > 0)
    );

    // Show modal for phase transitions, suppress for regular hand transitions
    if (hasTransitionData) {
      return true;
    } else {
      return false; // Suppress modal for hand-to-hand
    }
  }

  // Show modal for all non-tournament games
  return true;
}, [isGameOver, gameState.tournamentMode, gameOverData]);
```

## Summary

| Transition Type | Modal Shown? | Reason |
|----------------|--------------|--------|
| Hand 1 → Hand 2 | No | No transition data (nextGameId, etc.) - correct behavior |
| Hand 2 → Hand 3 | No | No transition data - correct behavior |
| Hand 4 → SEMI_FINAL | **Yes** | Has nextGameId, countdownSeconds, qualifiedPlayers - correct behavior |
| SEMI_FINAL → FINAL | **Yes** | Has transition data - correct behavior |

## Additional Changes

### Socket Handler for Tournament Game Join

**File:** `multiplayer/server/socket/handlers/index.js`

```javascript
// Handle join-game for tournament phase transitions
socket.on('join-tournament-game', (data) => {
  const { gameId } = data;
  coordinator.handleJoinTournamentGame(socket, gameId);
});
```

**File:** `multiplayer/server/services/GameCoordinatorService.js`

```javascript
handleJoinTournamentGame(socket, gameId) {
  // Looks up new game state, finds player index, registers socket, emits game-start
}
```

### Client Action Change

**File:** `components/game/GameBoard.tsx`

```javascript
// Changed from 'join-game' to 'join-tournament-game'
onTransitionToNextGame={() => {
  if (gameOverData?.nextGameId) {
    sendAction({ type: 'join-tournament-game', payload: { gameId: gameOverData.nextGameId } });
  }
}}
```

## Debug Logs Added

### Server Side
- `[HAND_TRANSITION] Emitting game-over for hand X before next hand`
- `[TRANSITION] Full game-over payload: {...}`

### Client Side (GameBoard.tsx)
- `[DEBUG] shouldShowStandardGameOver check: {...}`
- `[GameBoard] Showing GameOverModal for tournament phase transition: {...}`