# Ghost Card Multiplayer Sync - Diagnostic Implementation

## Problem
The ghost card showing opponent's drag was only visible on the active player's screen, not on the opponent's screen.

## Analysis
After analyzing the codebase, I found the ghost card system IS properly implemented:
- Client emits `drag-start`, `drag-move`, `drag-end` events via socket
- Server receives these and broadcasts to OTHER players via `broadcastToOthers`
- Client listens for `opponent-drag-start`, `opponent-drag-move`, `opponent-drag-end` events
- GameBoard renders `OpponentGhostCard` when `opponentDrag.isDragging` is true

The issue could be:
1. Events not being emitted properly from client
2. Server not broadcasting correctly
3. Opponent's client not receiving the events
4. `getGameSockets` returning no results for the game

## Diagnostic Logs Added

### Client-side (hooks/multiplayer/useOpponentDrag.ts)
Added console logs with 📤 (outgoing) and 📥 (incoming) emojis:

```typescript
// Emit functions
console.log('[useOpponentDrag] 📤 emitDragStart:', card.rank, card.suit, 'from', source, 'position:', position.x.toFixed(2), position.y.toFixed(2));
console.log('[useOpponentDrag] 📤 emitDragMove:', card.rank, card.suit, 'at', position.x.toFixed(2), position.y.toFixed(2));
console.log('[useOpponentDrag] 📤 emitDragEnd:', card.rank, card.suit, 'outcome:', outcome, 'target:', targetType, targetId);

// Socket listeners
console.log('[useOpponentDrag] 📥 opponent-drag-start RECEIVED:', data.card?.rank, data.card?.suit, 'from player', data.playerIndex, 'at', data.position?.x.toFixed(2), data.position?.y.toFixed(2));
console.log('[useOpponentDrag] 📥 opponent-drag-move RECEIVED:', data.card?.rank, data.card?.suit, 'at', data.position?.x.toFixed(2), data.position?.y.toFixed(2));
console.log('[useOpponentDrag] 📥 opponent-drag-end RECEIVED:', data.card?.rank, data.card?.suit, 'outcome:', data.outcome, 'target:', data.targetType, data.targetId);
```

### Server-side (multiplayer/server/services/GameCoordinatorService.js)

```javascript
console.log(`[GameCoordinator] handleDragStart - player ${playerIndex} dragging ${data.card?.rank}${data.card?.suit}, broadcasting to others in game ${gameId}`);
console.log(`[GameCoordinator] handleDragMove - player ${playerIndex} at ${data.position?.x?.toFixed(2)}, ${data.position?.y?.toFixed(2)}`);
console.log(`[GameCoordinator] handleDragEnd - player ${playerIndex}, card ${data.card?.rank}${data.card?.suit}, outcome=${data.outcome || 'miss'}, target=${data.targetType}:${data.targetId}`);
```

### Broadcaster Service (multiplayer/server/services/BroadcasterService.js)

```javascript
console.log(`[Broadcaster] broadcastToOthers: gameId=${gameId}, excludeSocket=${excludeSocketId}, event=${event}, totalSockets=${gameSockets.length}`);
console.log(`[Broadcaster] Sending to ${otherSockets.length} other players`);
console.log(`[Broadcaster] Emitting ${event} to socket:`, otherSocket.id);
console.log(`[Broadcaster] WARNING: No other players to send to!`);
```

### Component-side (components/game/GameBoard.tsx, OpponentGhostCard.tsx)

```typescript
// GameBoard
{(() => { console.log('[GameBoard] 📋 Rendering OpponentGhostCard - opponent is dragging:', opponentDrag.card?.rank, opponentDrag.card?.suit); return null; })()}

// OpponentGhostCard
console.log('[OpponentGhostCard] Rendering with props:', { card: card?.rank + card?.suit, position: ..., targetType, targetId });
```

## How to Test

1. **Start two clients** connected to the same multiplayer game
2. **Player A**: Drag a card from their hand
3. **Check console logs on BOTH clients and server:**

### Expected Log Flow (Working)
```
CLIENT A (dragging):
[useDragHandlers] handleHandDragStart called - card: 5H
[useOpponentDrag] 📤 emitDragStart: 5H from hand position: 0.50, 0.30
[useOpponentDrag] 📤 emitDragEnd: 5H outcome: success target: card 5D

SERVER:
[GameCoordinator] handleDragStart - player 0 dragging 5H, broadcasting to others in game abc123
[Broadcaster] broadcastToOthers: gameId=abc123, excludeSocket=socketA, event=opponent-drag-start, totalSockets=2
[Broadcaster] Sending to 1 other players
[Broadcaster] Emitting opponent-drag-start to socket: socketB

CLIENT B (opponent):
[useOpponentDrag] 📥 opponent-drag-start RECEIVED: 5H from player 0 at 0.50, 0.30
[GameBoard] 📋 Rendering OpponentGhostCard - opponent is dragging: 5H
[OpponentGhostCard] Rendering with props: card: 5H, position: 0.50, 0.30, targetType: undefined, targetId: undefined
```

### Debugging Scenarios

**Scenario 1: Client A never emits drag events**
- Check: Is `emitDragStart` being called in `useDragHandlers`?
- Fix: Verify the callbacks are being passed correctly

**Scenario 2: Server receives but doesn't broadcast**
- Check: Does `getGameSockets(gameId)` return more than 1 socket?
- Fix: Check UnifiedMatchmakingService socket registration

**Scenario 3: Server broadcasts but Client B doesn't receive**
- Check: Is Client B listening on the right socket?
- Fix: Check socket.on('opponent-drag-start') registration

**Scenario 4: Client B receives but doesn't render ghost card**
- Check: Is `opponentDrag?.isDragging` true?
- Fix: Check useOpponentDrag state management

## Key Files to Watch

| File | Purpose |
|------|---------|
| `hooks/multiplayer/useOpponentDrag.ts` | Client emit/listen for drag events |
| `multiplayer/server/services/GameCoordinatorService.js` | Server handler for drag events |
| `multiplayer/server/services/BroadcasterService.js` | Broadcast to other players |
| `multiplayer/server/services/UnifiedMatchmakingService.js` | Track which sockets belong to which games |
| `components/game/GameBoard.tsx` | Render OpponentGhostCard |
| `components/game/OpponentGhostCard.tsx` | Visual ghost card component |

## Next Steps After Testing

1. **If logs show everything working**: The ghost card should appear. Add a visual debug flag if needed.
2. **If `broadcastToOthers` shows 0 other players**: There's a socket registration issue in UnifiedMatchmakingService
3. **If `getGameSockets` returns 0**: The gameId doesn't match what's in the matchmaking map
4. **If client receives but ghost doesn't render**: Check OpponentGhostCard props and React.memo dependencies