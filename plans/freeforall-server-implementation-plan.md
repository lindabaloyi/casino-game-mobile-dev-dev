# 4-Player Free-For-All Server Implementation Plan

## Overview
Add support for 4-player free-for-all mode to the multiplayer server, similar to how party mode and three-hands mode are implemented.

## Architecture
The current matchmaking system uses:
- `MatchmakingService` - 2-player games
- `PartyMatchmakingService` - 4-player party + 3-player games
- `BroadcasterService` - broadcasts game events
- `GameManager` - manages game state
- `socket-server.js` - handles socket events

## Implementation Steps

### 1. GameManager.js - Add startFreeForAllGame method
**File:** `multiplayer/server/game/GameManager.js`

```javascript
/**
 * Create a new 4-player free-for-all game.
 * @returns {{ gameId: number, gameState: object }}
 */
startFreeForAllGame() {
  const gameId = this._nextId++;
  
  // Free-for-all uses 4 players but without team mechanics
  const gameState = initializeGame(4); // 4 players
  
  this.activeGames.set(gameId, gameState);
  this.socketPlayerMap.set(gameId, new Map());

  return { gameId, gameState };
}
```

### 2. PartyMatchmakingService.js - Add freeforall queue
**File:** `multiplayer/server/services/PartyMatchmakingService.js`

Add:
- `freeForAllWaitingPlayers` array (line ~16)
- `addFreeForAllToQueue(socket)` method (similar to addThreeHandsToQueue)
- `_tryCreateFreeForAllGame()` method (similar to _tryCreateThreeHandsGame)
- `broadcastFreeForAllWaiting(io)` method
- `getWaitingFreeForAllPlayersCount()` method
- `getFreeForAllPlayersNeeded()` method

Key difference from party mode:
- No teammate pairing (all 4 players are independent)
- No team scoring at end of game
- All game logic remains the same, just scoring differs

### 3. BroadcasterService.js - Add broadcastFreeForAllGameStart
**File:** `multiplayer/server/services/BroadcasterService.js`

Add method similar to `broadcastPartyGameStart` and `broadcastThreeHandsGameStart`:

```javascript
broadcastFreeForAllGameStart(gameResult) {
  const { gameId, gameState, players } = gameResult;
  
  players.forEach(({ socket, playerNumber }) => {
    socket.emit('game-start', {
      gameId,
      playerNumber,
      gameState,
      gameMode: 'freeforall',  // Key: specify freeforall mode
    });
  });
}
```

### 4. socket-server.js - Add socket event handlers
**File:** `multiplayer/server/socket-server.js`

Add:
- `join-freeforall-queue` socket event (similar to join-party-queue)
- Handle freeforall in `request-lobby-status`
- Handle freeforall in disconnect handling

### 5. Client-side useMultiplayerGame hook
**File:** `hooks/useMultiplayerGame.ts`

Update to:
- Send `join-freeforall-queue` event when freeforall mode selected
- Handle `freeforall-waiting` event for lobby updates

## Files to Modify

| File | Changes |
|------|---------|
| `multiplayer/server/game/GameManager.js` | Add `startFreeForAllGame()` method |
| `multiplayer/server/services/PartyMatchmakingService.js` | Add freeforall queue and methods |
| `multiplayer/server/services/BroadcasterService.js` | Add `broadcastFreeForAllGameStart()` |
| `multiplayer/server/socket-server.js` | Add socket event handlers |
| `hooks/useMultiplayerGame.ts` | Handle freeforall queue events |

## Key Considerations

1. **Game State**: Use `initializeGame(4)` - same as party mode, but client knows it's freeforall
2. **Scoring**: Free-for-all should not use team scoring (each player scores individually)
3. **Lobby UI**: Show "X/4 players joined" for freeforall queue
4. **Game Start**: Broadcast with `gameMode: 'freeforall'` so client renders correctly

## Testing

1. Start 4 clients
2. Each selects "Free For All" from Play Online menu
3. Verify 4-player game starts when 4th player joins
4. Verify game renders with freeforall layout (no teams)
5. Verify scoring shows individual scores, not team scores
