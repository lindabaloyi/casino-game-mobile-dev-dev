# Plan: Update Smart Router for Multi-Card Capture

## Overview

Integrate the new multi-card capture actions (`startBuildCapture`, `addToCapture`, `completeCapture`, `cancelCapture`) into the existing smart router flow.

## Current Flow

```
Player drags card → StackDropRouter.routeBuildStackDrop
  → if friendly → routeOwnBuildDrop → extendBuild or captureOwn
  → if opponent → routeOpponentBuildDrop → CaptureRouter.routeOpponentBuild
    → if card.value === stack.value → captureOpponent
    → else → stealBuild
```

## Problem

Currently when player drags a table/captured card onto opponent's build:
- Card value matches build → `captureOpponent` (single card)
- Otherwise → `stealBuild` (add card to opponent's build)

But we now support multi-card capture where player can assemble cards from hand/table to equal build value.

## Solution: Update StackDropRouter

### Key Changes

1. **In `routeOpponentBuildDrop`** - Check if build already has `pendingCapture`:
   - If yes: Check if new card makes sum equal build value → `completeCapture`
   - Otherwise → `addToCapture`

2. **If no pendingCapture yet**:
   - If card.value === stack.value → existing: `captureOpponent` 
   - If card.value < stack.value → NEW: Start multi-card capture with `startBuildCapture`
   - If card.value > stack.value → existing: `stealBuild`

3. **Need to pass cardSource** in payload to know if card is from hand or table

## Implementation Steps

### Step 1: Update StackDropRouter.routeOpponentBuildDrop

```javascript
routeOpponentBuildDrop(payload, stack, state, playerIndex) {
  const { stackId, card, cardSource } = payload;
  
  // Check if build already has pending capture (multi-card capture in progress)
  if (stack.pendingCapture) {
    // If dropping HAND card with pending capture, try to complete
    if (cardSource === 'hand') {
      const currentSum = stack.pendingCapture.cards.reduce((sum, item) => sum + item.card.value, 0);
      
      // Check if this hand card completes the capture
      if (currentSum + card.value === stack.value) {
        return { 
          type: 'completeCapture', 
          payload: { stackId } 
        };
      } else {
        // Hand card doesn't complete - invalid move for this build
        throw new Error(`Hand card ${card.value} cannot complete - pending sum ${currentSum} + ${card.value} ≠ build value ${stack.value}`);
      }
    } else {
      // Adding more table/captured cards to pending capture
      const currentSum = stack.pendingCapture.cards.reduce((sum, item) => sum + item.card.value, 0);
      
      if (currentSum + card.value < stack.value) {
        // Add to existing pending capture
        return { 
          type: 'addToCapture', 
          payload: { stackId, card, cardSource } 
        };
      } else if (currentSum + card.value === stack.value) {
        // Would exactly equal - but we need a hand card to trigger completion
        // For now, allow adding but require hand card to complete
        return { 
          type: 'addToCapture', 
          payload: { stackId, card, cardSource } 
        };
      } else {
        // Would exceed build value
        throw new Error(`Cannot add ${card.value} - sum would exceed build value ${stack.value}`);
      }
    }
  }
  
  // No pending capture yet - starting new multi-card capture
  // Only table or captured cards can start multi-card capture (not hand cards)
  if (cardSource === 'table' || cardSource.startsWith('captured')) {
    if (card.value < stack.value) {
      // Start multi-card capture with table/captured card
      return { 
        type: 'startBuildCapture', 
        payload: { stackId, card, cardSource } 
      };
    } else if (card.value === stack.value) {
      // Single card capture - use existing logic
      return this.captureRouter.route(
        { card, targetType: 'build', targetStackId: stackId },
        state,
        playerIndex
      );
    } else {
      // card.value > stack.value - use steal
      return this.captureRouter.route(
        { card, targetType: 'build', targetStackId: stackId },
        state,
        playerIndex
      );
    }
  }
  
  // Hand card dropped on opponent's build with no pending capture
  // Use existing capture/steal logic
  return this.captureRouter.route(
    { card, targetType: 'build', targetStackId: stackId },
    state,
    playerIndex
  );
}
```

### Step 2: Ensure cardSource is passed

The payload should include `cardSource` ('hand' or 'table'). This should already be provided by the client when dragging.

### Step 3: Update UI (Future)

The UI needs to:
1. Show pending capture indicator on build stacks
2. Allow canceling pending captures
3. Visual feedback for multi-card capture progress

## Files to Modify

| File | Changes |
|------|---------|
| `shared/game/smart-router/routers/StackDropRouter.js` | Update `routeOpponentBuildDrop` method |
| `shared/game/smart-router/routers/CaptureRouter.js` | May need minor updates for consistency |

## Validation Rules

1. **startBuildCapture**: Only allow if card is from table or captured (NOT hand), and card.value < build.value
2. **addToCapture**: Only allow if card is from table or captured, and currentSum + card.value <= build.value
3. **completeCapture**: Triggered by dropping HAND card when currentSum + handCard.value === build.value
4. **Source validation**: startBuildCapture/addToCapture only accept table/captured; completeCapture triggered by hand

## Edge Cases

1. **Table cards**: Can be used for multi-card capture
2. **Multiple pending captures**: Only one pending capture per build at a time
3. **Cancel behavior**: `cancelCapture` returns cards to original source
4. **Party mode**: Multi-card capture works for opponent builds only (not teammate)

## Example Flow

```
Opponent's build: value 10
Table has: 4♠, 6♥ 
Player has: 10♥ in hand

1. Drag 4♠ (table) onto build → startBuildCapture (table card, 4 < 10)
2. Drag 6♥ (table) onto same build → addToCapture (4+6=10)
3. Drag 10♥ (hand) onto same build → completeCapture (table sum 10 + hand 10 = build value)
```

## Summary

The smart router update adds multi-card capture support while maintaining backward compatibility with existing single-card capture and steal logic.
