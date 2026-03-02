# Capture Separation Plan: captureOwn vs captureOpponent

## Problem
The current [`capture.js`](multiplayer/server/game/actions/capture.js) handles multiple scenarios with complex validation:
- Loose card capture (identical rank)
- Own build capture (complex: identical cards OR value match)
- Opponent build capture (should be simple: just value match)

This violates **Single Responsibility Principle** - one handler doing too much.

## Solution
Split into two handlers with SmartRouter deciding which to use.

## Current Handler Complexity

```javascript
// capture.js lines 134-167 - Complex validation
if (allSameRank) {
  // Identical cards: can capture by rank OR by sum of any subset
  const possibleValues = getPossibleCaptureValues(buildStack.cards);
  if (!possibleValues.includes(capturingCard.value)) {
    throw new Error(...);  // Complex error message
  }
} else {
  // Different cards: must match build VALUE
  if (capturingCard.value !== buildStack.value) {
    throw new Error(...);
  }
}
```

## New Structure

### 1. captureOpponent.js (SIMPLE)
```javascript
function captureOpponent(state, payload, playerIndex) {
  const { card, targetStackId } = payload;
  
  // Find build stack
  const stack = findBuildStack(state, targetStackId);
  
  // SIMPLE validation: just check value match
  if (card.value !== stack.value) {
    throw new Error(`Card value ${card.value} doesn't match build ${stack.value}`);
  }
  
  // Remove build, add cards to captures, advance turn
}
```

### 2. captureOwn.js (COMPLEX)
Keeps current logic from capture.js:
- Loose card capture (identical rank)
- Build capture with identical cards (getPossibleCaptureValues)
- Build capture with different cards (value match)

### 3. SmartRouter Decision
```javascript
routeCapture(payload, state, playerIndex) {
  const { targetType, targetStackId } = payload;
  
  // Loose card - use captureOwn (has the logic)
  if (targetType !== 'build') {
    return { type: 'captureOwn', payload };
  }
  
  const stack = findBuildStack(state, targetStackId);
  const isOwnBuild = stack.owner === playerIndex;
  
  if (isOwnBuild) {
    return { type: 'captureOwn', payload };  // Complex logic
  } else {
    return { type: 'captureOpponent', payload };  // Simple!
  }
}
```

## Implementation Steps

1. **Create `captureOpponent.js`**
   - Simple value match validation
   - Remove build from table
   - Add cards to player's captures
   - Advance turn

2. **Create `captureOwn.js`**
   - Copy current capture.js logic
   - Handle loose cards + own builds only

3. **Update SmartRouter**
   - Modify routeCapture to route to captureOwn vs captureOpponent

4. **Update `actions/index.js`**
   - Register both handlers
   - Keep 'capture' for backward compat or remove

5. **Test**
   - Opponent build capture works with simple rule
   - Own build capture still works with complex rules

## Benefits
| Aspect | Benefit |
|--------|---------|
| Simplicity | Opponent capture has ONE rule |
| Testability | Can test each handler independently |
| Maintainability | Rules can evolve independently |
| Clarity | Code intent is obvious |
