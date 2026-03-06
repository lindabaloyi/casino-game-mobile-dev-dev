# Multiplayer Architecture Findings

## Overview

This document analyzes the current multiplayer game architecture, identifies existing patterns, and documents known issues related to client-server synchronization.

---

## Current Architecture

### 1. Socket.IO Communication

The game uses Socket.IO for real-time client-server communication:

**Server**: `multiplayer/server/socket-server.js`
- Port: 3001
- Events: `connect`, `disconnect`, `game-action`, `game-start`, `game-update`, `game-over`, `round-end`

**Client Hooks**:
- `hooks/useGameState.ts` - 2-player multiplayer
- `hooks/usePartyGameState.ts` - 4-player party mode

### 2. State Management Flow

```
Server (Authoritative)
    │
    │ game-state-sync / game-update
    ▼
Client State (useState)
    │
    │ render
    ▼
UI Components
```

### 3. Current Client-Server Pattern

**Current Implementation (No Optimistic Updates)**:

```javascript
// Client sends action
socket.emit('game-action', { type: 'PLAY_CARD', payload: {...} })

// Server processes
server.on('game-action', (action) => {
  // Validate and apply
  const newState = processAction(currentState, action)
  // Broadcast new state
  io.to(room).emit('game-update', newState)
})

// Client receives update
socket.on('game-update', (state) => {
  setGameState(state)  // Full state replacement
})
```

### 4. Event Flow

| Event | Direction | Purpose |
|-------|-----------|---------|
| `game-action` | Client → Server | Player moves |
| `game-start` | Server → Client | Game initialization |
| `game-update` | Server → Client | State after each move |
| `round-end` | Server → Client | Round completed |
| `game-over` | Server → Client | Game finished |
| `opponent-drag-start` | Server → Client | Ghost card rendering |
| `request-sync` | Client → Server | Force state sync |

---

## Current Implementation Details

### 1. Game State Structure

```javascript
interface GameState {
  deck: Card[];
  players: {
    id: number;
    hand: Card[];
    captures: Card[];
    score: number;
  }[];
  tableCards: Card[];  // Loose cards on table
  currentPlayer: number;
  round: number;
  scores: number[];
  playerCount: number;
  turnCounter: number;
  moveCount: number;
  gameOver: boolean;
}
```

### 2. Client State Updates

**In `useGameState.ts`**:

```javascript
// Listen for state updates
socket.on('game-update', (state) => {
  setGameState(state);  // Direct replacement
});

// Store game-over data for modal consistency
socket.on('game-over', (data) => {
  setGameOverData(data);  // Capture exact server values
});
```

### 3. Action Processing

**Server**: `multiplayer/server/game/ActionRouter.js`
- Validates actions
- Updates game state
- Broadcasts to all clients

**Client**: `hooks/game/useGameActions.ts`
- Sends actions to server
- No local prediction/optimistic updates

### 4. Drag Handling

**Real-time Ghost Cards**:
- Client emits `drag-start`, `drag-move`, `drag-end`
- Server broadcasts to opponent via `opponent-drag-*` events
- Opponent renders ghost card at predicted position

---

## Known Issues & Patterns

### Issue 1: Game Over Modal Inconsistency (FIXED)

**Problem**: Two clients saw different final scores/captured cards.

**Cause**: Modal computed values from current `gameState` at render time instead of using server's authoritative `game-over` data.

**Solution**: Store `gameOverData` from server event and use for modal display.

### Issue 2: UI Reconciliation Race Condition (Known)

**What Happens**:
```
1 Player drops card
2 UI attaches card to stack (local animation)
3 Client sends action to server
4 Server processes action
5 Server sends new state
6 setGameState() replaces entire state
7 Drag system still has old animation state → card snaps back
```

**This is NOT an optimistic UI problem** - it's a **UI lifecycle race condition**.

**Root Cause**: 
- Drag system is local UI logic
- Server state replacement happens after move is sent
- Animation doesn't know move succeeded before state replacement

**Current Architecture Maturity Level**:
```
Level 1  Local state
Level 2  Client sync
Level 3  Server authority   ← CURRENT (Production-ready)
Level 4  Optimistic UI
Level 5  Rollback netcode
```

### Issue 3: Round Transition Timing

**Current Behavior**:
- Server detects round end (all hands empty, all turns ended)
- Server sends `round-end` event
- Client auto-starts next round via `startNextRound()`
- Server broadcasts new round state

**Potential Issue**: Small window where clients may have different state during transition.

---

## Server Authority Pattern

The current implementation follows **Server Authority** pattern:

```
Server = Source of Truth
Client = Display Only
```

This means:
- ✅ No cheating possible
- ✅ Always consistent state
- ❌ Slight latency on moves
- ❌ No instant visual feedback

---

## What Would Optimistic UI Add

If implementing optimistic updates in the future, the architecture would need:

### 1. Pending Move State

```javascript
interface PendingMove {
  cardId: string;
  action: GameAction;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'rejected';
}
```

### 2. Move Lock Pattern (Simpler Alternative)

Instead of full optimistic UI, add a move lock:

```javascript
const [isProcessingMove, setIsProcessingMove] = useState(false);

// When card is dropped
const handleCardDrop = (card) => {
  setIsProcessingMove(true);  // Lock interactions
  socket.emit('game-action', action);
};

// When server confirms
socket.on('game-update', (state) => {
  setGameState(state);
  setIsProcessingMove(false);  // Unlock
});

// Disable drag while processing
if (isProcessingMove) return;  // Block new actions
```

### 3. Versioning (Optional Enhancement)

Add state version for out-of-order update handling:

```javascript
{
  stateVersion: 42,  // Server increments each move
  tableCards: [],
  players: []
}
```

Client ignores updates with older version numbers.

---

## Files Reference

### Server-Side
| File | Purpose |
|------|---------|
| `multiplayer/server/socket-server.js` | Main Socket.IO server |
| `multiplayer/server/game/GameManager.js` | Game room management |
| `multiplayer/server/game/ActionRouter.js` | Action validation & routing |
| `multiplayer/server/services/GameCoordinatorService.js` | Game flow coordination |

### Client-Side
| File | Purpose |
|------|---------|
| `hooks/useGameState.ts` | 2-player multiplayer state |
| `hooks/usePartyGameState.ts` | 4-player party mode state |
| `hooks/game/useGameActions.ts` | Action dispatch to server |
| `hooks/game/useDragHandlers.ts` | Drag event handling |
| `components/game/GameBoard.tsx` | Main game UI orchestrator |

---

## Summary

### Current Strengths
1. **Server authoritative** - No desync of game logic
2. **Simple architecture** - Easy to understand and debug
3. **Consistent state** - All clients eventually converge
4. **Production-ready** - Same pattern used by many card games

### Current Limitations
1. **UI race condition** - Drag animation can conflict with state replacement
2. **Modal data timing** - Needed fix for game-over display (FIXED)
3. **No move prediction** - Cannot anticipate server decisions

### Recommendations
1. **For now**: Keep current server-authoritative approach (it's correct)
2. **Quick fix**: Add move lock to prevent drag during server round-trip
3. **Future**: Add optimistic UI with pending state for better UX
4. **Never let client be final authority** - Server must always validate
