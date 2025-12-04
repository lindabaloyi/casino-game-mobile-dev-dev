# Multiplayer Casino Game Architecture

## Overview

This document explains the current multiplayer casino game architecture, identifies complexities with the current implementation, and proposes a simplified approach.

## Current Architecture

The casino game uses a **client-server model** with the following components:

### Server Side (`multiplayer/server/`)

- **Entry point**: `index.js` - Manages Socket.IO connections, matchmaking, and game state
- **Game Logic**: `game-logic/game-actions.js` - Action handlers for specific move types (trail, capture, build, etc.)
- **Game State**: `game-logic/game-state.ts` - TypeScript interfaces for game data structures
- **Shared Logic**: `game-logic/shared-game-logic.js/.ts` - Common functions used by client and server

### Client Side (React Native app)

- **Game Board**: `components/GameBoard.tsx` - Main game interface with drag-and-drop
- **Networking**: `hooks/useSocket.ts` - Socket.IO client for server communication
- **UI Components**: Various components for cards, hands, modals, etc.

## Current Flow

When a player drops a card:

1. **Client calculates actions**: `GameBoard.tsx` calls `sharedGameLogic.determineActions()`
2. **Client responds immediately**:
   - Single action: Sends to server for execution
   - Multiple actions: Shows modal for user choice
3. **Server validates and executes**: Receives processed action, validates, updates state
4. **Server broadcasts update**: All clients receive new game state

## The Problem with `shared-game-logic` and `determineActions`

### Why They Exist

- **Client-side responsiveness**: Avoid network latency for immediate UI feedback
- **Shared business logic**: Both client and server should agree on game rules
- **Modal determination**: Client needs to know if user choice is required vs. automatic execution

### Problems Identified

1. **Logic Duplication**: Same action-determination logic exists in multiple files
   - `shared-game-logic.js:determineActions()`
   - `GameBoard.tsx` (modal logic around determineActions)
   - `game-actions.js` (individual action handlers)

2. **Module Resolution Issues**: Client imports resolve differently than expected
   ```javascript
   // In GameBoard.tsx
   const sharedGameLogic = require('../multiplayer/server/game-logic/shared-game-logic');
   // React Native loads .ts file, but .ts file is missing determineActions
   ```

3. **Maintenance Burden**: Changes to game rules must be synchronized across files

4. **Race Conditions**: Client assumptions about valid moves may differ from server validation

5. **Testing Complexity**: Logic split across client/server makes testing harder

## Error Discovered

The current error "sharedGameLogic.determineActions is not a function" occurs because:

- **Client loads**: `shared-game-logic.ts` (TypeScript version - missing function)
- **Server loads**: `shared-game-logic.js` (JavaScript version - has function)
- **Module resolution**: React Native bundler prefers `.ts` over `.js` for TypeScript projects

## Recommended Simplified Architecture

### Proposed Flow

Eliminate client-side action determination and make the server handle all game logic:

```
┌─────────────┐       card-drop        ┌─────────────┐
│   Client    │ ─────────────────────► │   Server    │
│ (UI Only)   │                        │ (All Logic) │
└─────────────┘                        └─────────────┘
       ▲                                       │
       │ action-choices (if multiple)          │ determine
       │ execute-action (user choice)          │ actions
       ▼                                       ▼
┌─────────────┐      game-update        ┌─────────────┐
│   Modal     │ ◄─────────────────────  │  Execute    │
│  (Client)   │                        │  Action     │
└─────────────┘                         └─────────────┘
```

### New Socket Events

- `card-drop`: `{draggedCard, targetInfo}` - Client sends raw drop event
- `action-choices`: `{options: []}` - Server sends choices to client
- `execute-action`: `{selectedAction}` - Client sends back user choice
- `game-update`: `{gameState}` - Server broadcasts state changes (existing)

### Benefits

1. **Single Source of Truth**: All game logic on server
2. **No Logic Duplication**: `determineActions` exists only server-side
3. **Simpler Client**: Pure UI component, no game rule logic
4. **Easier Testing**: Logic concentrated in one place
5. **Reduces Bugs**: No client/server inconsistency
6. **Better Separation**: Server = business logic, Client = presentation

### What Gets Removed

- Client-side `determineActions` calls in `GameBoard.tsx`
- `require('../multiplayer/server/game-logic/shared-game-logic')` from client
- Immediate action execution logic in client
- Client-side validation of moves

### What Gets Added

- Server-side `card-drop` handler using existing `determineActions`
- Client-side handling of `action-choices` event
- Client-side modal rendering for server-provided choices

## Implementation Steps

1. **Create server `card-drop` handler**:
   ```javascript
   // In server/index.js or new game-logic/determine-actions.js
   socket.on('card-drop', (data) => {
     const actions = determineActions(data.draggedCard, data.targetInfo, gameState);
     if (actions.length === 1) {
       executeAction(actions[0]);
     } else {
       socket.emit('action-choices', { options: actions });
     }
   });
   ```

2. **Update client GameBoard**:
   ```typescript
   // Remove determineActions calls
   // Add action-choices handler
   socket.on('action-choices', (data) => {
     setModalInfo(data.options);
   });
   ```

3. **Remove shared logic from client**:
   - Delete shared-game-logic import
   - Remove determineActions modal logic

4. **Consolidate server logic** (optional):
   - Move `determineActions` to `game-logic/determine-actions.js`
   - Update server imports

## Migration Path

1. **Immediate fix**: Add `determineActions` to `shared-game-logic.ts` (least invasive)
2. **Short-term**: Move `determineActions` entirely to server-only
3. **Long-term**: Implement server-centric action determination (recommended)

## Conclusion

The shared-game-logic and determineActions approach made sense for client-side responsiveness, but introduces unnecessary complexity and maintenance burden. A server-centric approach simplifies the architecture while maintaining good user experience through proper event handling.

The current error is a symptom of the deeper architectural issue - inconsistent logic distribution between client and server.
