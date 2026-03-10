# Card Limit Implementation Plan

## Overview
Limit players to maximum 2 cards in temp stacks and pending extensions. When they try to add a 3rd card, the action is rejected and the card "snaps back" to hand (via existing error handling).

## Current Architecture

### How "Drag Back" Already Works:
1. Player attempts action (e.g., addToTemp)
2. Server processes action via ActionRouter
3. If validation fails → throw error
4. Client receives error via `socket.emit('error', { message })`
5. Client shows error and requests state sync
6. Sync restores correct state → card returns to hand

### Where Actions Are Processed:
- **Server**: `multiplayer/server/game/ActionRouter.js` → calls action handlers
- **Local/CPU**: `hooks/game/useLocalGame.ts` → calls ActionRouter locally
- **Client UI**: `hooks/game/useDragHandlers.ts` → triggers actions on drop

## Files to Modify

### 1. `shared/game/actions/addToTemp.js`
**Current behavior**: Adds card to temp stack without limit check
**Change**: Add validation before line 109

```javascript
// Before: stack.cards.push({ ...card, source });
// After:
if (stack.cards.length >= 2) {
  throw new Error('Cannot add more than 2 cards to temp stack');
}
```

### 2. `shared/game/actions/addToPendingExtension.js`
**Current behavior**: Adds card to pending extension without limit check
**Change**: Add validation before line 124

```javascript
// Before: buildStack.pendingExtension.cards.push({ card: usedCard, source: cardSource });
// After:
if (buildStack.pendingExtension.cards.length >= 2) {
  throw new Error('Cannot add more than 2 cards to pending extension');
}
```

## Implementation Steps

1. **Modify `addToTemp.js`**:
   - Add card count check before adding to stack
   - Throw descriptive error if limit exceeded

2. **Modify `addToPendingExtension.js`**:
   - Add card count check before adding to pendingExtension
   - Throw descriptive error if limit exceeded

3. **Test both single-player and multiplayer modes**

## Edge Cases

- **Per-player limit**: Each player can have their own temp stack with up to 2 cards
- **Multiple temp stacks**: The limit is per stack, not total
- **Pending extension**: Same - limit is per pending extension
- **Party mode**: Each player can have their own pending extensions

## Acceptance Criteria

- [ ] Cannot add 3rd card to temp stack - shows error, card returns to hand
- [ ] Cannot add 3rd card to pending extension - shows error, card returns to hand
- [ ] Works in single-player (CPU) mode
- [ ] Works in multiplayer (duel) mode
- [ ] Works in party mode
- [ ] Error message is clear and descriptive

## No New Files Needed

The implementation reuses existing:
- Error throwing mechanism in action handlers
- Error handling in GameCoordinatorService
- State sync in useGameStateSync
- Alert in useLocalGame
