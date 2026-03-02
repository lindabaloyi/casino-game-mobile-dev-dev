# Real-Time Shared Table State Implementation Plan

## Problem Statement

Currently, players only see the final outcome of opponents' actions. Cards suddenly appear, disappear, or move without any animation or intermediate visual feedback. For example, when an opponent drags a card to capture a build, the observing player sees the card vanish from hand and the build vanish, replaced by a capture pile entry - but never sees the drag motion, the card hovering, or the build being targeted.

## Goal

Make the game table a **truly shared, real-time state** where all players witness every table action as it happens, while keeping player hands completely private.

## Current Architecture Analysis

### Server-Side
- **socket-server.js**: Main network layer, sets up Socket.IO
- **BroadcasterService.js**: Broadcasts game updates to all players (game-start, game-update)
- **GameCoordinatorService.js**: Receives client actions, executes via ActionRouter, broadcasts result
- **Current behavior**: Only broadcasts final state after actions complete

### Client-Side
- **useGameState.ts**: Manages socket connection, receives game-start/game-update events, sends actions via `sendAction()`
- **GameBoard.tsx**: Main orchestrator, handles drag overlay, action callbacks
- **useDrag.ts**: Manages position registries for hit detection
- **useDragOverlay.ts**: Manages the ghost card overlay during local drag

### Current Flow
1. Player starts drag → ghost card shown locally only
2. Player drops card → action sent to server
3. Server processes action → broadcasts new state
4. All clients receive state → UI updates (sudden change, no animation)

---

## Implementation Plan

### Phase 1: Drag Event Broadcasting Infrastructure

#### 1.1 Define Drag Event Types (Shared Types)
Create new event types for drag operations:

```typescript
// Shared types - add to a new file or existing types
interface DragEvent {
  playerId: number;
  card: { rank: string; suit: string; value: number };
  source: 'hand' | 'table' | 'captured';
  timestamp: number;
}

interface DragStartEvent extends DragEvent {
  type: 'dragStart';
  startX: number;
  startY: number;
}

interface DragMoveEvent extends DragEvent {
  type: 'dragMove';
  currentX: number;
  currentY: number;
}

interface DragEndEvent extends DragEvent {
  type: 'dragEnd';
  endX: number;
  endY: number;
  // Optional: target info if dropped on something
  targetType?: 'card' | 'stack' | 'capture' | 'table';
  targetId?: string;
}
```

#### 1.2 Server-Side: Add Drag Event Handlers
Modify `GameCoordinatorService.js`:

```javascript
// New methods to handle drag events
handleDragStart(socket, data) {
  const ctx = this._resolvePlayer(socket);
  if (!ctx) return;
  
  // Broadcast to other player (not self)
  this.broadcaster.broadcastToOthers(ctx.gameId, socket.id, 'opponent-drag-start', {
    playerIndex: ctx.playerIndex,
    card: data.card,
    source: data.source,
    position: data.position,
  });
}

handleDragMove(socket, data) {
  // Similar - broadcast position to others
}

handleDragEnd(socket, data) {
  // Broadcast end, then process the action
}
```

#### 1.3 Server-Side: Add broadcastToOthers Method
Modify `BroadcasterService.js`:

```javascript
broadcastToOthers(gameId, excludeSocketId, event, data) {
  const gameSockets = this.matchmaking.getGameSockets(gameId, this.io);
  gameSockets
    .filter(s => s.id !== excludeSocketId)
    .forEach(s => s.emit(event, data));
}
```

### Phase 2: Client-Side Drag Event Emission

#### 2.1 Modify useGameState.ts
Add methods to emit drag events:

```typescript
// Add to useGameState
const emitDragStart = (card: Card, source: 'hand' | 'table' | 'captured', position: {x: number, y: number}) => {
  socketRef.current?.emit('drag-start', { card, source, position });
};

// THROTTLED: Limit dragMove to ~60fps to prevent network flooding
const emitDragMove = useCallback(
  throttle((card: Card, position: {x: number, y: number}) => {
    socketRef.current?.emit('drag-move', { card, position });
  }, 16), // ~60fps max
  []
);

const emitDragEnd = (card: Card, position: {x: number, y: number}, target?: any) => {
  socketRef.current?.emit('drag-end', { card, position, target });
};
```

**Important: Use normalized coordinates (0-1) for cross-device consistency:**
```typescript
// Convert absolute to normalized
const normalizePosition = (absX: number, absY: number, tableBounds: {width: number, height: number}) => ({
  x: absX / tableBounds.width,
  y: absY / tableBounds.height
});

// Convert normalized to absolute (on receiving client)
const denormalizePosition = (normX: number, normY: number, tableBounds: {width: number, height: number}) => ({
  x: normX * tableBounds.width,
  y: normY * tableBounds.height
});
```

#### 2.2 Hook Drag Events into GameBoard
Modify `GameBoard.tsx` to emit events during drag:

```typescript
// In handleTableDragStart
const handleTableDragStart = useCallback((card: any) => {
  dragOverlay.startDrag(card, 'hand');
  // Emit to server for broadcasting (with normalized coordinates)
  const normPos = normalizePosition(absoluteX, absoluteY, tableBounds);
  emitDragStart(card, 'hand', normPos);
}, [dragOverlay]);

// Similar for handleDragMove and handleDragEnd
// Include outcome in dragEnd: 'success' | 'miss' | 'cancelled'
```

#### 2.3 Optimistic Updates
Apply optimistic updates locally BEFORE sending to server for immediate feedback:

```typescript
const handleDragEnd = useCallback((card, position, target) => {
  // 1. Apply optimistic update locally FIRST
  if (target) {
    optimisticApplyAction(card, target);
  }
  
  // 2. Emit drag end to server
  emitDragEnd(card, normalizePosition(position), { ...target, outcome: target ? 'success' : 'miss' });
  
  // 3. Server will broadcast to others
  // 4. When server confirms, reconcile if needed (should match optimistic)
}, []);
```

### Phase 3: Opponent Ghost Card Rendering

#### 3.1 Add Opponent Drag State to useGameState
```typescript
interface OpponentDragState {
  playerIndex: number;
  card: Card;
  source: 'hand' | 'table' | 'captured';
  position: { x: number; y: number };
  isDragging: boolean;
}

// In useGameState
const [opponentDrag, setOpponentDrag] = useState<OpponentDragState | null>(null);

// Socket listeners
socket.on('opponent-drag-start', (data) => {
  setOpponentDrag({ ...data, isDragging: true });
});

socket.on('opponent-drag-move', (data) => {
  setOpponentDrag(prev => prev ? { ...prev, position: data.position } : null);
});

socket.on('opponent-drag-end', () => {
  setOpponentDrag(null);
});
```

#### 3.2 Render Opponent Ghost in GameBoard
```tsx
// In GameBoard render
{opponentDrag && opponentDrag.isDragging && (
  <Animated.View style={[styles.opponentGhost, {
    left: opponentDrag.position.x,
    top: opponentDrag.position.y,
  }]} pointerEvents="none">
    <PlayingCard rank={opponentDrag.card.rank} suit={opponentDrag.card.suit} />
  </Animated.View>
)}
```

### Phase 4: Action Animation Synchronization

#### 4.1 Server-Side: Include Animation Duration in Broadcast
When broadcasting game updates, include context about what happened and animation timing:

```javascript
// In GameCoordinatorService.js
broadcastGameUpdate(gameId, newState, actionContext) {
  // actionContext: { type: 'createTemp' | 'capture' | 'trail' | ... }
  const gameSockets = this.matchmaking.getGameSockets(gameId, this.io);
  
  gameSockets.forEach(s => s.emit('game-update', {
    state: newState,
    actionContext: {
      ...actionContext,
      duration: actionContext.duration || 300 // default 300ms
    }
  }));
}
```

#### 4.2 Client-Side: Animate Based on Action Context with Server-Timing
Modify useGameState to handle action context and use server-provided timing:

```typescript
const [lastAction, setLastAction] = useState<{type: string, cards: any[], duration: number} | null>(null);

socket.on('game-update', ({ state, actionContext }) => {
  if (actionContext) {
    // Use server-provided duration for animation
    setLastAction({
      type: actionContext.type,
      cards: actionContext.cards,
      duration: actionContext.duration || 300
    });
    
    // Clear after animation completes
    setTimeout(() => setLastAction(null), actionContext.duration || 300);
  }
  setGameState(state);
});
```

#### 4.3 State Reconciliation
Handle reconnection mid-drag gracefully:

```javascript
// Server stores last known drag state per player
// In socket-server.js
let activeDrags = new Map(); // playerId -> dragState

// On reconnect
socket.on('reconnect', () => {
  // Send current drag states to reconnected client
  socket.emit('sync-drag-states', Array.from(activeDrags.values()));
});
```

### Phase 5: Hand Privacy

#### 5.1 Never Broadcast Hand Contents
Ensure the server never includes hand cards in drag event broadcasts:

```javascript
// In handleDragStart - only broadcast public card info
// When card is from hand, opponents already see it (it becomes public)
// Just broadcast the rank/suit - that's acceptable
```

#### 5.2 Mask Hand in State Sync
When sending state to clients, ensure hands are properly handled:

```javascript
// In BroadcasterService - for each player, only send THEIR hand
// Other player's hand should be empty or just count
broadcastGameUpdate(gameId, gameState) {
  const gameSockets = this.matchmaking.getGameSockets(gameId, this.io);
  
  gameSockets.forEach((socket, index) => {
    // Create player-specific state
    const playerState = this._createPlayerState(gameState, index);
    socket.emit('game-update', playerState);
  });
}

_createPlayerState(fullState, playerIndex) {
  // Return full state but mask opponent's hand
  const state = JSON.parse(JSON.stringify(fullState));
  state.playerHands = state.playerHands.map((hand, i) => 
    i === playerIndex ? hand : hand.map(() => ({ rank: '?', suit: '?' }))
  );
  return state;
}
```

---

## Implementation Order

1. **Phase 1**: Add drag event infrastructure (server + shared types)
2. **Phase 2**: Emit drag events from client
3. **Phase 3**: Render opponent ghost cards
4. **Phase 4**: Add action animation context
5. **Phase 5**: Ensure hand privacy

---

## Files to Modify

### Server
- `multiplayer/server/services/BroadcasterService.js` - Add broadcastToOthers
- `multiplayer/server/services/GameCoordinatorService.js` - Add drag event handlers
- `multiplayer/server/socket-server.js` - Wire up new event handlers

### Client
- `hooks/useGameState.ts` - Add drag event emission + opponent drag state
- `components/core/GameBoard.tsx` - Emit drag events, render opponent ghosts
- `components/core/hooks/useDragOverlay.ts` - May need modifications

### New Files
- `shared/drag-events.ts` - Shared drag event types (if needed)
- `shared/coordinates.ts` - Normalize/denormalize coordinate utilities
- `utils/throttle.ts` - Throttling utility
- `hooks/useThrottledDrag.ts` - Custom hook for throttled drag events
- `components/core/OpponentGhostCard.tsx` - Dedicated component for opponent ghost

---

## Acceptance Criteria

- [ ] When Player A drags a card, Player B sees a ghost card moving in real time
- [ ] When Player A creates a temp stack, Player B sees the two cards merge
- [ ] When Player A extends a build, Player B sees the card added to the stack
- [ ] When Player A captures/steals, Player B sees cards move to capture pile or new build
- [ ] All animations are smooth and consistent across devices
- [ ] Player hands are never exposed
- [ ] No desync issues after multiple actions
