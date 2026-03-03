# Ghost Card System Documentation

## Overview

The **Ghost Card System** provides real-time visibility of an opponent's drag actions during multiplayer card games. When one player drags a card, the opponent sees a semi-transparent "ghost" version of that card moving on their screen, allowing them to understand what the opponent is attempting to do.

This document explains the complete architecture, data flow, and implementation details of this system.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PLAYER A (Dragger)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  DraggableHandCard                                                        │
│         │                                                                   │
│         ▼ emitDragStart()                                                  │
│  ┌──────────────┐    emitDragMove()    ┌──────────────┐                   │
│  │  useDrag()   │─────────────────────▶│ useGameState │                   │
│  │  (hit detect)│    emitDragEnd()     │   (socket)   │                   │
│  └──────────────┘         │             └──────┬───────┘                   │
│         │                 │                      │                          │
│         │                 ▼                      │                          │
│         │         ┌──────────────┐               │                          │
│         │         │ sendAction()│               │                          │
│         │         └──────────────┘               │                          │
│         │                                       │                          │
│         │                                        ▼                          │
│         │                               Socket Server                        │
│         │                               (GameCoordinatorService)           │
│         │                               broadcasts to others               │
│         │                                        │                          │
└─────────│────────────────────────────────────────│──────────────────────────┘
          │                                        │
          │                    ┌───────────────────┘
          │                    │
          │                    ▼
          │        ┌──────────────────────────┐
          │        │      PLAYER B (Opponent)  │
          │        ├──────────────────────────┤
          │        │  socket.on('opponent-    │
          │        │    drag-start/move/end') │
          │        │            │              │
          │        │            ▼              │
          │        │  ┌────────────────────┐  │
          │        │  │ OpponentGhostCard  │  │
          │        │  │    Component       │  │
          │        │  └────────────────────┘  │
          │        │                           │
          └────────▶  See ghost card moving    │
                     (real-time feedback)       
```

---

## Data Flow

### 1. Drag Start

When a player begins dragging a card:

```typescript
// From: components/cards/DraggableHandCard.tsx (or similar)
const { emitDragStart } = useGameState();

// When drag begins
const handleDragStart = () => {
  const position = normalizePosition(absoluteX, absoluteY, tableBounds);
  emitDragStart(card, 'hand', position);
};
```

The server receives this and broadcasts to the opponent:

```javascript
// From: multiplayer/server/services/GameCoordinatorService.js
handleDragStart(socket, data) {
  this.broadcaster.broadcastToOthers(gameId, socket.id, 'opponent-drag-start', {
    playerIndex,
    card: data.card,
    cardId: data.cardId,        // e.g., "AH" for Ace of Hearts
    source: data.source,        // 'hand' | 'table' | 'captured'
    position: data.position,   // normalized 0-1 coordinates
    timestamp: Date.now(),
  });
}
```

### 2. Drag Move (Throttled)

During drag, position updates are sent at ~60fps (throttled to 16ms intervals):

```typescript
// From: hooks/useGameState.ts
const emitDragMove = useCallback(
  throttle((card: Card, position: { x: number; y: number }) => {
    socketRef.current?.emit('drag-move', { card, position });
  }, 16),
  []
);
```

The server broadcasts these updates:

```javascript
// From: multiplayer/server/services/GameCoordinatorService.js
handleDragMove(socket, data) {
  this.broadcaster.broadcastToOthers(gameId, socket.id, 'opponent-drag-move', {
    playerIndex,
    card: data.card,
    position: data.position,
    timestamp: Date.now(),
  });
}
```

### 3. Drag End

When the player releases the card, two things happen:

1. **The action is executed** (e.g., create temp, add to build, trail, etc.)
2. **The end event is broadcast** to the opponent

```typescript
// From: hooks/useGameState.ts
const emitDragEnd = useCallback((card, position, outcome, targetType, targetId) => {
  socketRef.current?.emit('drag-end', { 
    card, 
    position, 
    outcome,           // 'success' | 'miss' | 'cancelled'
    targetType,        // 'card' | 'stack' | 'temp_stack' | 'capture' | 'table'
    targetId           // ID of the target for accurate positioning
  });
}, []);
```

The server broadcasts with target information for accurate ghost positioning:

```javascript
// From: multiplayer/server/services/GameCoordinatorService.js
handleDragEnd(socket, data) {
  this.broadcaster.broadcastToOthers(gameId, socket.id, 'opponent-drag-end', {
    playerIndex,
    card: data.card,
    position: data.position,
    outcome: data.outcome,
    targetType: data.targetType,   // For accurate final position
    targetId: data.targetId,       // For accurate final position
    timestamp: Date.now(),
  });
}
```

---

## Key Components

### 1. `useGameState` Hook

**File:** `hooks/useGameState.ts`

This hook manages the Socket.IO connection and exposes drag event emitters:

```typescript
export interface OpponentDragState {
  playerIndex: number;
  card: Card;
  cardId: string;                    // Unique ID like "AH"
  source: 'hand' | 'table' | 'captured';
  position: { x: number; y: number }; // normalized 0-1
  isDragging: boolean;
  // Target info for accurate final position
  targetType?: 'card' | 'stack' | 'capture' | 'table';
  targetId?: string;
}

// Exposed by the hook
interface UseGameStateResult {
  // ... other properties
  opponentDrag: OpponentDragState | null;
  emitDragStart: (card, source, position) => void;
  emitDragMove: (card, position) => void;
  emitDragEnd: (card, position, outcome, targetType?, targetId?) => void;
}
```

**Socket Event Listeners:**

```typescript
// Listen for opponent drag events
socket.on('opponent-drag-start', (data) => {
  setOpponentDrag({ ...data, isDragging: true });
});

socket.on('opponent-drag-move', (data) => {
  setOpponentDrag(prev => prev ? { ...prev, position: data.position } : null);
});

socket.on('opponent-drag-end', (data) => {
  // Update with target info for accurate final position
  setOpponentDrag(prev => prev ? { 
    ...prev, 
    targetType: data.targetType, 
    targetId: data.targetId 
  } : null);
  
  // Clear after animation delay
  setTimeout(() => setOpponentDrag(null), 500);
});
```

### 2. `OpponentGhostCard` Component

**File:** `components/core/OpponentGhostCard.tsx`

This component renders the semi-transparent ghost card on the opponent's screen:

```typescript
interface OpponentGhostCardProps {
  card: Card;
  position: { x: number; y: number };         // normalized 0-1
  tableBounds: TableBounds;
  // Target info for accurate final position
  targetType?: 'card' | 'stack' | 'temp_stack' | 'capture' | 'table';
  targetId?: string;
  // Position registries to find target's actual position
  cardPositions?: Map<string, { x: number; y: number; width: number; height: number }>;
  stackPositions?: Map<string, { x: number; y: number; width: number; height: number }>;
}

export function OpponentGhostCard({ 
  card, 
  position, 
  tableBounds, 
  targetType, 
  targetId,
  cardPositions,
  stackPositions,
}: OpponentGhostCardProps) {
  // If target info is provided, try to use local registry to find exact position
  let displayPosition = position;
  
  if (targetId && (cardPositions || stackPositions)) {
    if (targetType === 'card' && cardPositions) {
      const targetPos = cardPositions.get(targetId);
      if (targetPos) {
        // Convert target's absolute position back to normalized for display
        displayPosition = {
          x: targetPos.x / tableBounds.width,
          y: targetPos.y / tableBounds.height,
        };
      }
    } else if ((targetType === 'stack' || targetType === 'temp_stack') && stackPositions) {
      const targetPos = stackPositions.get(targetId);
      if (targetPos) {
        displayPosition = {
          x: targetPos.x / tableBounds.width,
          y: targetPos.y / tableBounds.height,
        };
      }
    }
  }

  // Convert normalized coordinates to absolute
  const absPos = denormalizePosition(displayPosition.x, displayPosition.y, tableBounds);
  
  return (
    <Animated.View style={[styles.ghost, { left: absPos.x, top: absPos.y }]}>
      <PlayingCard rank={card.rank} suit={card.suit} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    zIndex: 1000, // Above everything
  },
  cardWrapper: {
    opacity: 0.8,       // Semi-transparent
    transform: [{ scale: 1.05 }], // Slightly larger
  },
});
```

### 3. Position Registry (`useDrag`)

**File:** `hooks/useDrag.ts`

The `useDrag` hook maintains registries of card and stack positions for hit detection:

```typescript
export function useDrag() {
  // Loose card positions
  const cardPositions = useRef<Map<string, CardBounds>>(new Map());
  
  // Temp/build stack positions
  const tempStackPositions = useRef<Map<string, TempStackBounds>>(new Map());
  
  // Captured card position (opponent's top card)
  const capturedCardPosition = useRef<CapturedCardBounds | null>(null);

  // Register a card's position (called by card components on layout)
  const registerCard = useCallback((id: string, bounds: CardBounds) => {
    cardPositions.current.set(id, bounds);
  }, []);

  // Find card at a point (for hit detection)
  const findCardAtPoint = useCallback((x: number, y: number) => {
    // ... hit detection logic
  }, []);

  return {
    cardPositions,
    registerCard,
    findCardAtPoint,
    // ... other registries
  };
}
```

### 4. Coordinate Normalization

**File:** `shared/coordinates.ts`

Coordinates are normalized (0-1) for cross-device consistency:

```typescript
// Convert absolute to normalized
export function normalizePosition(absX: number, absY: number, bounds: TableBounds): Position {
  return {
    x: Math.max(0, Math.min(1, absX / bounds.width)),
    y: Math.max(0, Math.min(1, absY / bounds.height)),
  };
}

// Convert normalized back to absolute
export function denormalizePosition(normX: number, normY: number, bounds: TableBounds): Position {
  return {
    x: normX * bounds.width,
    y: normY * bounds.height,
  };
}
```

---

## Usage in GameBoard

**File:** `components/core/GameBoard.tsx`

The ghost card is rendered in the main game board:

```typescript
export function GameBoard() {
  const { opponentDrag } = useGameState();
  const { 
    tableBounds, 
    registerCard, 
    registerTempStack,
    cardPositions,
    tempStackPositions 
  } = useDragLayout(); // Custom hook combining useDrag + layout
  
  return (
    <View style={styles.container}>
      {/* Main game area */}
      <TableArea>
        {/* Cards and stacks register their positions */}
      </TableArea>
      
      {/* Ghost card overlay - only shows when opponent is dragging */}
      {opponentDrag && (
        <OpponentGhostCard
          card={opponentDrag.card}
          position={opponentDrag.position}
          tableBounds={tableBounds}
          targetType={opponentDrag.targetType}
          targetId={opponentDrag.targetId}
          cardPositions={cardPositions}
          stackPositions={tempStackPositions}
        />
      )}
    </View>
  );
}
```

---

## Hit Detection & Target Identification

When a player drags a card, the client performs hit detection locally using the position registries from `useDrag`:

```typescript
// In DraggableCard component
const onDragEnd = (absoluteX, absoluteY) => {
  // 1. Check if dropped on a loose card
  const cardHit = findCardAtPoint(absoluteX, absoluteY);
  if (cardHit) {
    emitDragEnd(card, position, 'success', 'card', cardHit.id);
    sendAction({ type: 'createTemp', payload: { card, targetCard: cardHit.card }});
    return;
  }
  
  // 2. Check if dropped on a temp/build stack
  const stackHit = findTempStackAtPoint(absoluteX, absoluteY);
  if (stackHit) {
    emitDragEnd(card, position, 'success', stackHit.stackType, stackHit.stackId);
    sendAction({ type: 'addToTemp', payload: { card, stackId: stackHit.stackId }});
    return;
  }
  
  // 3. Missed - trail the card
  emitDragEnd(card, position, 'miss', 'table', undefined);
  sendAction({ type: 'trail', payload: { card }});
};
```

This target information is broadcast to the opponent so they can position the ghost card precisely over the actual target.

---

## Animation Flow

1. **Drag starts** → Ghost appears at normalized start position
2. **During drag** → Ghost moves smoothly using normalized coordinates
3. **Drag ends**:
   - If **hit target**: Ghost animates to actual target card/stack position (using local registry + targetId), then fades
   - If **miss**: Ghost fades at final normalized position
4. **After fade** → State update arrives from server, showing final game state

---

## Server-Side Coordination

**File:** `multiplayer/server/services/GameCoordinatorService.js`

The coordinator handles drag events and coordinates with the broadcaster:

```javascript
class GameCoordinatorService {
  constructor(gameManager, actionRouter, matchmaking, broadcaster) {
    this.gameManager = gameManager;
    this.actionRouter = actionRouter;
    this.matchmaking = matchmaking;
    this.broadcaster = broadcaster;
  }

  handleDragStart(socket, data) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;
    
    const { gameId, playerIndex } = ctx;
    
    // Broadcast to other player (not self)
    this.broadcaster.broadcastToOthers(gameId, socket.id, 'opponent-drag-start', {
      playerIndex,
      card: data.card,
      cardId: data.cardId,
      source: data.source,
      position: data.position,
      timestamp: Date.now(),
    });
  }

  handleDragEnd(socket, data) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;
    
    const { gameId, playerIndex } = ctx;
    
    // Broadcast end to opponent first (so ghost shows final position)
    this.broadcaster.broadcastToOthers(gameId, socket.id, 'opponent-drag-end', {
      playerIndex,
      card: data.card,
      position: data.position,
      outcome: data.outcome,
      targetType: data.targetType,
      targetId: data.targetId,
      timestamp: Date.now(),
    });
    
    // THEN process the action (game state update follows)
  }
}
```

---

## Edge Cases & Considerations

### 1. Different Screen Sizes

The system uses normalized coordinates (0-1) to handle different screen sizes:
- Position is relative to the table bounds, not absolute pixels
- The opponent's device converts normalized back to their local absolute coordinates

### 2. Responsive Layouts

Card positions are stored in registries that update on layout:
- Each card/stack registers its position via `onLayout`
- The registries are Maps keyed by unique IDs

### 3. Target Accuracy

For accurate final ghost positioning:
- The drag end event includes `targetType` and `targetId`
- The opponent's client uses its local registry to find the target's actual position
- This "snaps" the ghost to the real target before fading

### 4. Latency Handling

- Drag move events are throttled to 16ms (~60fps) to prevent network flooding
- The ghost position may slightly lag behind the actual drag on high-latency connections
- This is acceptable as it provides general awareness of opponent actions

### 5. Cleanup

After drag ends, the ghost is cleared after a delay to allow for animation:
```typescript
setTimeout(() => setOpponentDrag(null), 500); // 500ms for fade animation
```

---

## Files Summary

| File | Purpose |
|------|---------|
| `hooks/useGameState.ts` | Client-side socket management + drag event emitters |
| `components/core/OpponentGhostCard.tsx` | Renders the ghost card overlay |
| `hooks/useDrag.ts` | Position registries for hit detection |
| `shared/coordinates.ts` | Normalize/denormalize coordinate utilities |
| `multiplayer/server/services/GameCoordinatorService.js` | Server-side drag event handling |
| `multiplayer/server/services/BroadcasterService.js` | Broadcasts events to opponents |
| `components/core/GameBoard.tsx` | Main component that renders ghost card |

---

## Future Improvements

1. **Animation smoothing**: Use Reanimated to smoothly interpolate ghost position
2. **Multiple ghost cards**: Support for multi-card drags (e.g., building with multiple cards)
3. **Trail prediction**: Show ghost card "trailing" behind main ghost during multi-card plays
4. **Sound effects**: Optional audio cues when opponent starts dragging
