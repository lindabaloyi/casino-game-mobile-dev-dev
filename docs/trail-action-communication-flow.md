# Trail Action Communication Flow

## Overview
The trail action allows players to place cards from their hand onto the empty table area when no other valid actions (captures, builds) are available. This document outlines the complete client-server communication flow for executing trail actions.

## Flow Diagram

```
Client Drag → Drop Zone → Action Determination → Modal Confirmation → Server Action → State Update → Broadcast
```

## 1. Client-Side Components

### 1.1 Drag Initiation (`DraggableCard.tsx`)
- **Location**: `components/DraggableCard.tsx`
- **Trigger**: User starts dragging a hand card
- **Action**: Calls `onDragStart(card)` from parent component
- **Data Flow**: `{ card: Card, source: 'hand', player: number }`

### 1.2 Drop Zone Registration (`useTableDropZone.ts`)
- **Location**: `hooks/useTableDropZone.ts`
- **Function**: Registers global drop zone for empty table area
- **Priority**: `DROP_ZONE_PRIORITIES.TABLE_AREA` (0 - lowest priority)
- **Bounds**: Calculated using `measureInWindow()` for the table container
- **Handler**: Returns `{ type: 'table', area: 'empty' }` for trail drops

### 1.3 Drop Resolution (`DraggableCard.tsx`)
- **Location**: `components/DraggableCard.tsx` (lines 140-200)
- **Process**: Iterates through `(global as any).dropZones` with priority-based selection
- **Selection Logic**: Higher priority zones checked first, bounds collision detection
- **For Trail**: Table area zone selected when dropping on empty table space

### 1.4 Action Determination (`shared-game-logic.ts`)
- **Location**: `multiplayer/server/game-logic/shared-game-logic.ts`
- **Function**: `determineActions(draggedItem, targetInfo, gameState)`
- **Trail Conditions**:
  - `draggedItem.source === 'hand'`
  - `targetInfo.type === 'table' && targetInfo.area === 'empty'`
  - No captures or builds available
  - Round 1 restriction: No active builds for the player
  - No duplicate ranks on table
- **Return**: `{ actions: [{ type: 'trail', label: 'Trail Card', payload: { draggedItem, card } }], requiresModal: true }`

### 1.5 Modal Presentation (`useModalManager.ts`)
- **Location**: `hooks/useModalManager.ts`
- **Trigger**: `requiresModal: true` from action determination
- **Modal Type**: Trail confirmation modal (always requires confirmation)
- **User Action**: Player confirms or cancels trail
- **Confirmation Handler**: `handleTrailConfirm()` sends action to server
- **Cancellation Handler**: `handleTrailCancel()` sends cancel action

## 2. Server-Side Components

### 2.1 Action Routing (`ActionRouter.js`)
- **Location**: `multiplayer/server/game/ActionRouter.js`
- **Entry Point**: Receives action via WebSocket
- **Action Type**: `'trail'`
- **Validation**: Calls trail rules validation
- **Handler**: Routes to `handleTrail()` function

### 2.2 Trail Rules Validation (`trailRules.js`)
- **Location**: `multiplayer/server/game/logic/rules/trailRules.js`
- **Function**: `trailRules` array with single rule object
- **Validation Logic**:
  ```javascript
  {
    id: 'trail-card',
    condition: (context) => {
      // Only hand cards
      if (context.draggedItem?.source !== 'hand') return false;
      // Empty table area only
      if (context.targetInfo?.type !== 'table' || context.targetInfo?.area !== 'empty') return false;
      // Round 1: No active builds
      if (context.round === 1 && hasActiveBuild) return false;
      // No duplicate ranks on table
      if (hasDuplicateOnTable) return false;
      return true;
    },
    action: (context) => ({
      type: 'trail',
      payload: { card: context.draggedItem.card }
    }),
    requiresModal: true,
    priority: 10
  }
  ```

### 2.3 Trail Action Handler (`trail.js`)
- **Location**: `multiplayer/server/game/actions/trail.js`
- **Function**: `handleTrail(gameManager, playerIndex, action)`
- **Process**:
  1. Remove card from player's hand
  2. Add card to table as loose card
  3. Log the action
  4. Return updated game state

### 2.4 State Update & Broadcasting
- **Game State Update**: `newGameState.tableCards.push(trailedCard)`
- **Broadcast**: `BroadcasterService` sends updated state to all clients
- **Turn Advancement**: Game proceeds to next player's turn

## 3. Data Structures

### Client → Server Action Payload
```typescript
{
  type: 'trail',
  payload: {
    card: {
      rank: string,  // 'A', '2', '3', ..., '10'
      suit: string,  // '♠', '♥', '♦', '♣'
      value: number  // 1-10
    }
  }
}
```

### Server → Client State Update
```typescript
{
  type: 'game-state-update',
  payload: {
    gameState: {
      tableCards: [...],      // Card added to table
      playerHands: [[...]],   // Card removed from hand
      currentPlayer: number,  // Next player's turn
      // ... other game state
    }
  }
}
```

## 4. Error Handling

### Client-Side Errors
- **Not Your Turn**: `setErrorModal({ title: 'Not Your Turn', message: '...' })`
- **Invalid Action**: Server rejects invalid trail attempts
- **Network Errors**: WebSocket connection issues

### Server-Side Validation
- **Card Not in Hand**: Throws error if card not found in player's hand
- **Invalid Game State**: Game validation before processing
- **Rule Violations**: Trail rules prevent invalid trails

## 5. Key Integration Points

### Hooks Involved
- `useDragHandlers.ts`: Orchestrates drag/drop flow
- `useTableDropZone.ts`: Registers table area drop zone
- `useModalManager.ts`: Handles trail confirmation modal
- `useServerListeners.ts`: Processes server responses

### Components Involved
- `DraggableCard.tsx`: Low-level drag mechanics
- `GameBoard.tsx`: Main game component
- `TrailConfirmationModal.tsx`: User confirmation UI

### Server Components
- `ActionRouter.js`: Routes actions to handlers
- `GameManager.js`: Manages game state
- `BroadcasterService.js`: Sends updates to clients

## 6. Testing Scenarios

### Valid Trail Cases
- Hand card dropped on empty table area
- No captures or builds available
- No duplicate ranks on table
- Round 2+ or no active builds in round 1

### Invalid Trail Cases
- Dropping on specific table cards (should trigger staging)
- Attempting trail with available captures
- Round 1 with active build
- Creating duplicate ranks on table

### Edge Cases
- Network disconnection during trail confirmation
- Multiple players attempting actions simultaneously
- Server validation failures requiring client reset

## 7. Future Refactoring Notes

The trail logic is currently mixed with staging logic in `useDragHandlers.ts`. The planned refactoring will:

1. Extract trail-specific logic into `hooks/dropHandlers/useTrailDropHandlers.ts`
2. Separate trail drop zone registration from staging zones
3. Create dedicated trail action determination logic
4. Simplify the main drag handler orchestration

This will improve maintainability and make trail logic independently testable.
