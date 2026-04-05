# Tournament Transition Debug Logging Plan

## Overview
Add comprehensive debug logging with player names during tournament phase transitions to clearly track who qualified, who was eliminated, and what happens to their sockets.

## Current Problem
- Logs show `player_0`, `player_1`, etc. - not meaningful
- No visibility into which real player (by username) is being affected
- Cannot easily trace socket mappings to player names

## Solution
Create helper function to log player state with names, using PlayerProfile.getPlayerInfos()

## Implementation

### 1. Create Debug Helper in GameCoordinatorService.js

Add helper method to format player state with names:

```javascript
/**
 * Format player state with names for debug logging
 * @param {Object} gameState - Game state
 * @param {Map} socketMap - Map of socketId -> playerIndex
 * @returns {string} Formatted log string
 */
async _formatPlayerState(gameState, socketMap) {
  if (!gameState?.players || !socketMap) return 'No game state';
  
  const lines = [];
  
  // Get userIds from players
  const userIds = gameState.players.map(p => p.userId).filter(Boolean);
  const playerInfos = await PlayerProfile.getPlayerInfos(userIds);
  
  // Build socket -> playerIndex map for lookup
  const socketToPlayerIdx = new Map();
  for (const [socketId, idx] of socketMap.entries()) {
    socketToPlayerIdx.set(socketId, idx);
  }
  
  for (let i = 0; i < gameState.players.length; i++) {
    const player = gameState.players[i];
    const playerId = player.id || `player_${i}`;
    const status = gameState.playerStatuses?.[playerId] || 'UNKNOWN';
    const info = playerInfos.find(p => p.userId === player.userId);
    const username = info?.username || player.userId || 'Unknown';
    const avatar = info?.avatar || 'lion';
    
    // Find socket for this player index
    let socketId = null;
    for (const [sock, idx] of socketMap.entries()) {
      if (idx === i) {
        socketId = sock;
        break;
      }
    }
    
    const statusIcon = status === 'ACTIVE' ? '✓' : status === 'ELIMINATED' ? '✗' : status === 'WINNER' ? '🏆' : '?';
    lines.push(`  ${statusIcon} ${username} (${playerId}) - Status: ${status.padEnd(10)} | Socket: ${socketId ? socketId.substr(0,8) + '...' : 'NONE'}`);
  }
  
  return lines.join('\n');
}
```

### 2. Enhanced Transition Logging (3 locations)

**Location 1: Line ~190 (advanceFromQualificationReview action path)**
```javascript
// BEFORE transition - show 4 players
const socketMapBefore = this.gameManager.socketPlayerMap.get(gameId);
const playerStateBefore = await this._formatPlayerState(newState, socketMapBefore);
console.log(`[Coordinator] ════════════════════════════════════════`);
console.log(`[Coordinator] BEFORE TRANSITION -> ${newState.tournamentPhase}`);
console.log(`[Coordinator] ════════════════════════════════════════`);
console.log(playerStateBefore);
console.log(`[Coordinator] Qualified: ${JSON.stringify(qualifiedPlayers)}`);
```

**After cleanup (after removing ELIMINATED sockets):**
```javascript
// AFTER transition - show final state
const socketMapAfter = this.gameManager.socketPlayerMap.get(gameId);
const playerStateAfter = await this._formatPlayerState(newState, socketMapAfter);
console.log(`[Coordinator] ════════════════════════════════════════`);
console.log(`[Coordinator] AFTER TRANSITION -> ${newState.tournamentPhase}`);
console.log(`[Coordinator] ════════════════════════════════════════`);
console.log(playerStateAfter);
```

### 3. Update ActionRouter Turn Check

Add username to turn check logging:
```javascript
console.log(`[ActionRouter] Turn check: playerIndex=${playerIndex} (${username}), currentPlayer=${state.currentPlayer}, isEliminated=${isEliminated}`);
```

### 4. Add Socket Cleanup Details

```javascript
console.log(`[Coordinator] 🧹 Cleaning up ELIMINATED players:`);
for (const socketId of allSockets) {
  const playerIdx = this.gameManager.getPlayerIndex(gameId, socketId);
  if (playerIdx !== null) {
    const playerId = `player_${playerIdx}`;
    const status = newState.playerStatuses?.[playerId];
    const player = newState.players?.[playerIdx];
    const username = player?.userId || 'Unknown';
    
    console.log(`[Coordinator]   - Socket ${socketId.substr(0,8)}... -> ${username} (${playerId}): ${status}`);
    
    if (status === 'ELIMINATED') {
      console.log(`[Coordinator]   ⬆ REMOVING socket mapping for ELIMINATED player`);
      this.gameManager.removePlayerFromGame(gameId, socketId);
    }
  }
}
```

## Expected Log Output

```
[Coordinator] ════════════════════════════════════════
[Coordinator] BEFORE TRANSITION -> SEMI_FINAL
[Coordinator] ════════════════════════════════════════
[Coordinator]   ✓ Linda (player_0) - Status: ACTIVE     | Socket: cAsaKIfQ...
[Coordinator]   ✓ Player1 (player_1) - Status: ACTIVE     | Socket: gBKfIY3q...
[Coordinator]   ✗ Player2 (player_2) - Status: ELIMINATED | Socket: DyKn4ZZF...
[Coordinator]   ✓ Player3 (player_3) - Status: ACTIVE     | Socket: Ca4WqpAD...
[Coordinator] Qualified: ["player_0","player_1","player_3"]

[Coordinator] 🧹 Cleaning up ELIMINATED players:
[Coordinator]   - Socket cAsaKIfQ... -> Linda (player_0): ACTIVE
[Coordinator]   - Socket gBKfIY3q... -> Player1 (player_1): ACTIVE
[Coordinator]   - Socket DyKn4ZZF... -> Player2 (player_2): ELIMINATED
[Coordinator]   ⬆ REMOVING socket mapping for ELIMINATED player
[Coordinator]   - Socket Ca4WqpAD... -> Player3 (player_3): ACTIVE

[Coordinator] ════════════════════════════════════════
[Coordinator] AFTER TRANSITION -> SEMI_FINAL
[Coordinator] ════════════════════════════════════════
[Coordinator]   ✓ Linda (player_0) - Status: ACTIVE     | Socket: cAsaKIfQ...
[Coordinator]   ✓ Player1 (player_1) - Status: ACTIVE     | Socket: gBKfIY3q...
[Coordinator]   ✓ Player3 (player_3) - Status: ACTIVE     | Socket: Ca4WqpAD...
[Coordinator] Sockets after cleanup: [cAsaKIfQ, gBKfIY3q, Ca4WqpAD]
```

## Files to Modify

1. **GameCoordinatorService.js** - Add helper method + enhance logging in 3 transition locations
2. **ActionRouter.js** - Enhance turn check logging with player name

## Implementation Status

- [ ] Create _formatPlayerState helper method
- [ ] Add BEFORE transition logging (3 locations)
- [ ] Add ELIMINATED cleanup details with names
- [ ] Add AFTER transition logging (3 locations)
- [ ] Enhance ActionRouter logging
- [ ] Test end-to-end
