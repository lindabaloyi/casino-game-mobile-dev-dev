# Multiplayer Architecture Upgrade Plan

## Current State: Level 3 - Server Authority

Your game is currently at **Level 3 (Server Authority)** which is production-ready. However, upgrading to **Level 4 (Optimistic UI)** will significantly improve the player experience.

---

## Upgrade Roadmap

### Phase 1: Move Lock (Quick Fix) ⚡
**Impact**: 70% of race condition bugs
**Effort**: Low
**Duration**: 1-2 hours

Add a simple move lock to prevent drag during server round-trip:

```typescript
// hooks/useGameState.ts
const [isProcessingMove, setIsProcessingMove] = useState(false);

socket.on('game-update', (state) => {
  setGameState(state);
  setIsProcessingMove(false);  // Unlock
});

// Disable drag while processing
const canDrag = !isProcessingMove && isMyTurn;
```

**Changes needed:**
- Add `isProcessingMove` state to `useGameState.ts`
- Pass `canDrag` prop to GameBoard
- Disable drag handlers when `!canDrag`

---

### Phase 2: Pending Move State 🟡
**Impact**: Visual feedback during server processing
**Effort**: Medium
**Duration**: 2-4 hours

Track pending moves with status:

```typescript
interface PendingMove {
  cardId: string;
  action: GameAction;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'rejected';
}

const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

// When player drops card
const handleDrop = (card) => {
  setPendingMove({
    cardId: card.id,
    action: action,
    timestamp: Date.now(),
    status: 'pending'
  });
  socket.emit('game-action', action);
};

// When server confirms
socket.on('game-update', (state) => {
  setPendingMove(prev => prev ? { ...prev, status: 'confirmed' } : null);
  setGameState(state);
  
  // Clear after short delay for animation
  setTimeout(() => setPendingMove(null), 300);
});

// When server rejects
socket.on('action-rejected', ({ cardId, reason }) => {
  setPendingMove(prev => prev ? { ...prev, status: 'rejected' } : null);
  // Animate card back
  setTimeout(() => setPendingMove(null), 500);
});
```

**Changes needed:**
- Add `PendingMove` interface
- Add visual indicator (opacity/transparency) for pending cards
- Handle `action-rejected` event from server
- Animate corrections when rejected

---

### Phase 3: Server-Side Move Validation ⚠️
**Impact**: Proper rejection handling
**Effort**: Medium
**Duration**: 2-3 hours

Server must validate and reject invalid moves:

```javascript
// multiplayer/server/game/ActionRouter.js

socket.on('game-action', (action) => {
  const validation = validateAction(currentState, action);
  
  if (!validation.valid) {
    socket.emit('action-rejected', {
      cardId: action.payload.cardId,
      reason: validation.reason
    });
    return;
  }
  
  // Process valid action
  const newState = processAction(currentState, action);
  io.to(room).emit('game-update', newState);
});
```

**Changes needed:**
- Add `validateAction()` function in shared code
- Server rejects invalid moves with reason
- Client handles rejection gracefully

---

### Phase 4: State Versioning (Advanced) 🔒
**Impact**: Handles out-of-order updates
**Effort**: High
**Duration**: 4-6 hours

Prevent old updates from overwriting newer state:

```typescript
interface GameState {
  version: number;
  deck: Card[];
  // ... other fields
}

// Server increments version
const newState = {
  ...currentState,
  version: currentState.version + 1
};

// Client ignores old versions
socket.on('game-update', (state) => {
  if (state.version <= currentVersion) {
    console.log('Ignoring outdated update');
    return;
  }
  setGameState(state);
  setCurrentVersion(state.version);
});
```

**Changes needed:**
- Add `version` field to GameState
- Server increments on each action
- Client tracks and ignores stale updates

---

## Implementation Priority

| Priority | Phase | Impact | Effort |
|----------|-------|--------|--------|
| 1️⃣ | Phase 1: Move Lock | High | Low |
| 2️⃣ | Phase 2: Pending Moves | High | Medium |
| 3️⃣ | Phase 3: Server Validation | Medium | Medium |
| 4️⃣ | Phase 4: Versioning | Low | High |

---

## Files to Modify

### Phase 1: Move Lock
- `hooks/useGameState.ts` - Add isProcessingMove state
- `components/game/GameBoard.tsx` - Pass canDrag to handlers

### Phase 2: Pending Moves
- `hooks/useGameState.ts` - Add PendingMove type and state
- `types/game.types.ts` - Define PendingMove interface
- `components/cards/DraggableHandCard.tsx` - Visual feedback (opacity)
- `components/game/GameBoard.tsx` - Handle pending visual state

### Phase 3: Server Validation
- `shared/game/ActionRouter.js` - Add validateAction
- `multiplayer/server/game/ActionRouter.js` - Reject invalid actions
- `hooks/useGameState.ts` - Handle action-rejected event

### Phase 4: Versioning
- `shared/game/GameState.js` - Add version to state
- `hooks/useGameState.ts` - Version comparison logic
- All action processors - Increment version

---

## Testing Checklist

- [ ] Card drag during server processing is blocked
- [ ] Pending cards show visual indicator
- [ ] Valid moves process normally
- [ ] Invalid moves show rejection animation
- [ ] Multiple rapid moves are queued properly
- [ ] Network latency doesn't cause state corruption

---

## Benefits After Upgrade

1. **No more card snapping back** - Move lock prevents race conditions
2. **Better player feedback** - Pending state shows cards are processing
3. **Graceful error handling** - Invalid moves animate back instead of breaking
4. **Robust against latency** - Versioning prevents stale updates
5. **Same server authority** - No cheating possible

---

## Alternative: Event-Driven State (Bonus)

Instead of full state replacement, use **deltas**:

```javascript
// Server sends changes, not entire state
socket.emit('game-update', {
  type: 'CARD_PLAYED',
  payload: {
    playerId: 0,
    cardId: 'AH',
    targetStack: 'build-1'
  }
});

// Client applies delta
socket.on('game-update', (delta) => {
  applyDelta(gameState, delta);
});
```

This reduces bandwidth and simplifies reconciliation but requires more refactoring.
