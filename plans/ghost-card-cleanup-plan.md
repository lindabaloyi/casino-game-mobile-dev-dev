# Ghost Card Cleanup Fix Plan

## Problem
Ghost cards remain visible after opponent completes their drag action. The ghost card should fade out and be removed when the action completes.

## Root Cause
- `opponentDrag` state not being cleared on drag end
- Ghost card component never unmounts after fade animation completes

## Solution Architecture

### Fix 1: Server-Side - Emit Drag End Event
**File**: `multiplayer/server/socket-server.js`

When a game action completes, broadcast `opponent-drag-end` to clear drag state on all clients.

### Fix 2: Client-Side - Handle Drag End in Hook
**File**: `hooks/useOpponentDrag.ts` (or `hooks/multiplayer/useOpponentDrag.ts`)

Listen for `opponent-drag-end` event and clear the drag state. Add stale state detection.

### Fix 3: Enhance OpponentGhostCard with Self-Cleanup
**File**: `components/game/OpponentGhostCard.tsx`

- Add `onRemove` callback prop
- Call callback when fade animation completes
- Add stuck detection (auto-remove after timeout)

### Fix 4: GameBoard - Manage Ghost Lifecycle
**File**: `components/game/GameBoard.tsx`

- Track active ghosts in a Map
- Add/remove ghosts via callback
- Clear all ghosts when drag ends

### Fix 5: Client Actions - Emit Drag End
**File**: `hooks/game/useDragHandlers.ts`

Emit `drag-end` event after action is sent to server.

## Implementation Order

1. First: Server-side event emission
2. Second: Client-side hook handling  
3. Third: OpponentGhostCard self-cleanup
4. Fourth: GameBoard lifecycle management
5. Fifth: Client action drag-end emission

## Files to Modify

1. `multiplayer/server/socket-server.js` - Add drag-end broadcast
2. `hooks/multiplayer/useOpponentDrag.ts` - Handle drag-end event
3. `components/game/OpponentGhostCard.tsx` - Add onRemove callback
4. `components/game/GameBoard.tsx` - Manage ghost lifecycle
5. `hooks/game/useDragHandlers.ts` - Emit drag-end on action

## Testing Checklist

- [ ] Ghost appears when opponent starts drag
- [ ] Ghost fades out when opponent completes action
- [ ] Ghost completely disappears after fade
- [ ] No ghost stuck behind capture pile
- [ ] Rapid actions don't leave multiple ghosts
- [ ] Network issues don't leave stale ghosts
