# Temp Stack Debugging Guide

## 🚨 Current Issues

### Error 1: "Invalid Move - No valid actions available"
```
Invalid Move
No valid actions available
```

### Error 2: "Cannot read properties of undefined (reading 'length')"
```
Invalid Move
Cannot read properties of undefined (reading 'length')
```

## 🔍 Root Cause Analysis

### Error 1 Analysis
This error comes from `determineActions.js` when no valid actions are found. The function returns:
```javascript
return {
  actions: [],
  requiresModal: false,
  errorMessage: 'No valid actions available'
};
```

### Error 2 Analysis
This error occurs in `tableCardDrop.js` when trying to access `gameState.playerHands[playerIndex].filter()`. The `playerHands[playerIndex]` is `undefined`.

## 📋 Current Code State

### 1. TableInteractionManager.tsx (Client)

```typescript
const handleDropOnStack = useCallback((draggedItem: any, stackId: string) => {
  console.log('[SIMPLE DROP] Processing drop:', {
    draggedCard: `${draggedItem?.card?.rank}${draggedItem?.card?.suit}`,
    stackId,
    source: draggedItem?.source
  });

  // Basic validation only
  if (!draggedItem || !draggedItem.card) {
    console.log('[SIMPLE DROP] No dragged item');
    return false;
  }

  // Parse stack ID
  const parts = stackId.split('-');
  const targetType = parts[0];
  const targetIndex = parseInt(parts[1]);

  // Find the target item
  const targetItem = tableCards[targetIndex];

  if (!targetItem) {
    console.log('[SIMPLE DROP] No target at index', targetIndex);
    return false;
  }

  // Check if it's a temp stack
  const isTempStack = safeHasProperty(targetItem, 'type') && (targetItem as any).type === 'temporary_stack';

  if (isTempStack) {
    console.log('[SIMPLE DROP] 🎯 Dropping on temp stack - ADD CARD');

    const tempStack = targetItem as any;

    // SIMPLE: Always allow adding to temp stack
    if (onDropOnCard) {
      const result = onDropOnCard(draggedItem, {
        type: 'temporary_stack', // ✅ Consistent with server expectations
        stackId: tempStack.stackId,
        stack: tempStack,
        index: targetIndex,
        card: draggedItem.card, // ✅ Include dragged card for consistency
        source: draggedItem.source
      });

      console.log('[SIMPLE DROP] Add to temp stack result:', result);
      return result || true;
    }
  }
  else {
    // Dropping on loose card - CREATE NEW TEMP STACK
    console.log('[SIMPLE DROP] 🎯 Dropping on loose card - CREATE NEW TEMP STACK');

    if (onDropOnCard) {
      const result = onDropOnCard(draggedItem, {
        type: 'loose', // ✅ CRITICAL FIX: Server expects 'loose' for staging
        card: targetItem, // ✅ FIXED: Changed from targetCard to card
        index: actualTargetIndex,
        draggedCard: draggedItem.card,
        source: draggedItem.source
      });

      console.log('[SIMPLE DROP] Create temp stack result:', result);
      return result || true;
    }
  }

  return true;
}, [tableCards, onDropOnCard]);
```

### 2. determineActions.js (Server - Bypass Logic)

```javascript
function determineActions(draggedItem, targetInfo, gameState) {
  console.log('[determineActions] evaluating drop', {
    source: draggedItem.source,
    targetType: targetInfo.type
  });

  // 🎯 SOURCE-AWARE BYPASS: Route to appropriate handler based on dragged source
  if (targetInfo?.type === 'loose') {
    if (draggedItem?.source === 'table') {
      console.log('[DETERMINE_ACTIONS] 🎯 TABLE-TO-TABLE STAGING - BYPASSING CASINO RULES');
      return ['tableToTableDrop'];
    } else if (draggedItem?.source === 'hand') {
      console.log('[DETERMINE_ACTIONS] 🎯 HAND-TO-TABLE STAGING - BYPASSING CASINO RULES');
      return ['handToTableDrop'];
    }
    console.warn('[DETERMINE_ACTIONS] Unknown source for loose drop:', draggedItem?.source);
  }

  if (targetInfo?.type === 'temporary_stack') {
    console.log('[DETERMINE_ACTIONS] 🎯 TEMP STACK ADDITION - BYPASSING CASINO RULES');
    return ['addToStagingStack'];
  }

  // ... rest of casino validation logic
}
```

### 3. tableToTableDrop.js (New Handler)

```javascript
function handleTableToTableDrop(gameManager, playerIndex, action) {
  const { gameId, draggedItem, targetInfo } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  console.log('[TABLE_TO_TABLE] Creating temp stack from table cards:', {
    gameId,
    playerIndex,
    draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`,
    source: draggedItem.source
  });

  // VALIDATION: Ensure this is table-to-table
  if (draggedItem.source !== 'table') {
    console.error('[TABLE_TO_TABLE] ERROR: Expected table source, got:', draggedItem.source);
    throw new Error('TableToTableDrop handler requires table source');
  }

  if (targetInfo.type !== 'loose') {
    console.error('[TABLE_TO_TABLE] ERROR: Expected loose target, got:', targetInfo.type);
    throw new Error('TableToTableDrop handler requires loose card target');
  }

  // SIMPLE: Create temp stack (no hand logic)
  const stackId = `temp-${Date.now()}`;
  const tempStack = {
    type: 'temporary_stack',
    stackId: stackId,
    cards: [targetInfo.card, draggedItem.card],
    owner: playerIndex,
    value: (targetInfo.card.value || 0) + (draggedItem.card.value || 0)
  };

  // Add to table
  gameState.tableCards.push(tempStack);

  console.log('[TABLE_TO_TABLE] ✅ Temp stack created:', {
    stackId,
    cardsCount: tempStack.cards.length,
    value: tempStack.value
  });

  return gameState;
}
```

### 4. handToTableDrop.js (New Handler)

```javascript
function handleHandToTableDrop(gameManager, playerIndex, action) {
  const { gameId, draggedItem, targetInfo } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  console.log('[HAND_TO_TABLE] Creating temp stack from hand + table:', {
    gameId,
    playerIndex,
    handCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    tableCard: `${targetInfo.card.rank}${targetInfo.card.suit}`,
    source: draggedItem.source
  });

  // VALIDATION: Ensure this is hand-to-table
  if (draggedItem.source !== 'hand') {
    console.error('[HAND_TO_TABLE] ERROR: Expected hand source, got:', draggedItem.source);
    throw new Error('HandToTableDrop handler requires hand source');
  }

  if (targetInfo.type !== 'loose') {
    console.error('[HAND_TO_TABLE] ERROR: Expected loose target, got:', targetInfo.type);
    throw new Error('HandToTableDrop handler requires loose card target');
  }

  // Create temp stack
  const stackId = `temp-${Date.now()}`;
  const tempStack = {
    type: 'temporary_stack',
    stackId: stackId,
    cards: [targetInfo.card, draggedItem.card],
    owner: playerIndex,
    value: (targetInfo.card.value || 0) + (draggedItem.card.value || 0)
  };

  // Add to table
  gameState.tableCards.push(tempStack);

  // SAFE: Remove from player's hand
  if (gameState.playerHands && Array.isArray(gameState.playerHands) && gameState.playerHands[playerIndex]) {
    const originalHandSize = gameState.playerHands[playerIndex].length;
    gameState.playerHands[playerIndex] = gameState.playerHands[playerIndex].filter(
      card => !(card.rank === draggedItem.card.rank && card.suit === draggedItem.card.suit)
    );
    const newHandSize = gameState.playerHands[playerIndex].length;

    console.log('[HAND_TO_TABLE] Hand updated:', {
      originalSize: originalHandSize,
      newSize: newHandSize,
      cardRemoved: `${draggedItem.card.rank}${draggedItem.card.suit}`
    });
  } else {
    console.warn('[HAND_TO_TABLE] Player hand not available for removal:', {
      hasPlayerHands: !!gameState.playerHands,
      isArray: Array.isArray(gameState.playerHands),
      playerIndex,
      handExists: !!(gameState.playerHands?.[playerIndex])
    });
  }

  console.log('[HAND_TO_TABLE] ✅ Temp stack created (hand updated):', {
    stackId,
    cardsCount: tempStack.cards.length,
    value: tempStack.value,
    remainingHandSize: gameState.playerHands?.[playerIndex]?.length || 'unknown'
  });

  return gameState;
}
```

### 5. Action Router (socket-server.js)

```javascript
const actionTypeMapping = {
  // ... existing handlers ...
  tableToTableDrop: actionHandlers.handleTableToTableDrop,
  handToTableDrop: actionHandlers.handleHandToTableDrop,
  // Keep existing for backward compatibility
  tableCardDrop: actionHandlers.handleTableCardDrop,
  // ... more handlers ...
};
```

## 🔍 Debugging Steps

### Step 1: Add Comprehensive Logging

Add this to `TableInteractionManager.tsx` at the beginning of `handleDropOnStack`:

```typescript
const handleDropOnStack = useCallback((draggedItem: any, stackId: string) => {
  console.log('[DEBUG] ===== DROP START =====');
  console.log('[DEBUG] draggedItem:', JSON.stringify(draggedItem, null, 2));
  console.log('[DEBUG] stackId:', stackId);
  console.log('[DEBUG] tableCards:', tableCards.map((c, i) => ({
    index: i,
    type: c?.type || 'loose',
    card: c ? `${c.rank}${c.suit}` : 'null'
  })));
  console.log('[DEBUG] ===== DROP END =====');

  // ... rest of function
}, [tableCards, onDropOnCard]);
```

### Step 2: Check Client Payload

The client should be sending this payload structure:

```javascript
{
  type: 'card-drop',
  payload: {
    draggedItem: {
      card: { rank: 'A', suit: '♠', value: 1 },
      source: 'table', // or 'hand'
      player: 0
    },
    targetInfo: {
      type: 'loose', // or 'temporary_stack'
      card: { rank: 'K', suit: '♥', value: 10 }, // for loose cards
      index: 2
    },
    requestId: Date.now()
  }
}
```

### Step 3: Check Server Receipt

Add logging to `useDragHandlers.ts` in `handleDropOnCard`:

```typescript
const handleDropOnCard = useCallback((draggedItem: any, targetInfo: any) => {
  console.log('[SERVER_DEBUG] ===== SERVER RECEIVED =====');
  console.log('[SERVER_DEBUG] draggedItem:', JSON.stringify(draggedItem, null, 2));
  console.log('[SERVER_DEBUG] targetInfo:', JSON.stringify(targetInfo, null, 2));
  console.log('[SERVER_DEBUG] ===== SERVER END =====');

  // ... rest of function
}, []);
```

### Step 4: Check determineActions Flow

Add logging to `determineActions.js`:

```javascript
function determineActions(draggedItem, targetInfo, gameState) {
  console.log('[DETERMINE_DEBUG] ===== DETERMINE START =====');
  console.log('[DETERMINE_DEBUG] draggedItem.source:', draggedItem?.source);
  console.log('[DETERMINE_DEBUG] targetInfo.type:', targetInfo?.type);
  console.log('[DETERMINE_DEBUG] targetInfo.card:', targetInfo?.card ? `${targetInfo.card.rank}${targetInfo.card.suit}` : 'null');

  // ... bypass logic ...

  console.log('[DETERMINE_DEBUG] ===== DETERMINE END =====');
}
```

## 🚨 Common Issues & Solutions

### Issue 1: Wrong Source Value

**Symptom**: Client sends `source: 'hand'` but should be `'table'` for table-to-table drops

**Check**: In `TableInteractionManager.tsx`, ensure the source is correctly detected:

```typescript
// For table card drags, source should be 'table'
// For hand card drags, source should be 'hand'
console.log('[SOURCE_CHECK] Actual source:', draggedItem.source);
```

### Issue 2: Wrong Target Type

**Symptom**: `targetInfo.type` is not `'loose'` or `'temporary_stack'`

**Check**: In `TableInteractionManager.tsx`:

```typescript
console.log('[TARGET_CHECK] targetType:', targetType);
console.log('[TARGET_CHECK] isTempStack:', isTempStack);
console.log('[TARGET_CHECK] targetItem.type:', (targetItem as any)?.type);
```

### Issue 3: Handler Not Registered

**Symptom**: `determineActions` returns correct action type, but handler not found

**Check**: In server console, look for:
```
Action: tableToTableDrop by P1 in game xxx
Unknown action: tableToTableDrop
```

**Solution**: Verify `socket-server.js` has the mapping and `index.js` exports the handler.

### Issue 4: Old Handler Still Used

**Symptom**: Still hitting `tableCardDrop.js` instead of new handlers

**Check**: In `determineActions.js`, the bypass might not be triggering. Add logging:

```javascript
console.log('[BYPASS_CHECK] Should bypass?', {
  targetType: targetInfo?.type,
  source: draggedItem?.source,
  shouldBypass: targetInfo?.type === 'loose' || targetInfo?.type === 'temporary_stack'
});
```

### Issue 5: Game State Issues

**Symptom**: `playerHands[playerIndex]` is undefined in `handToTableDrop.js`

**Check**: Add logging in `handToTableDrop.js`:

```javascript
console.log('[GAME_STATE] playerHands:', {
  exists: !!gameState.playerHands,
  isArray: Array.isArray(gameState.playerHands),
  length: gameState.playerHands?.length,
  playerIndex,
  handExists: !!(gameState.playerHands?.[playerIndex])
});
```

## 🧪 Testing Scenarios

### Test 1: Table-to-Table Drop

**Steps:**
1. Drag loose card A to loose card B
2. Check console logs for:
   ```
   [DEBUG] draggedItem.source: "table"
   [DEBUG] targetInfo.type: "loose"
   [DETERMINE_DEBUG] TABLE-TO-TABLE STAGING - BYPASSING CASINO RULES
   [TABLE_TO_TABLE] Creating temp stack from table cards
   ```

**Expected Result**: Temp stack created, no errors

### Test 2: Hand-to-Table Drop

**Steps:**
1. Drag hand card to loose card
2. Check console logs for:
   ```
   [DEBUG] draggedItem.source: "hand"
   [DEBUG] targetInfo.type: "loose"
   [DETERMINE_DEBUG] HAND-TO-TABLE STAGING - BYPASSING CASINO RULES
   [HAND_TO_TABLE] Creating temp stack from hand + table
   ```

**Expected Result**: Temp stack created, card removed from hand

### Test 3: Temp Stack Addition

**Steps:**
1. Drag any card to existing temp stack
2. Check console logs for:
   ```
   [DEBUG] targetInfo.type: "temporary_stack"
   [DETERMINE_DEBUG] TEMP STACK ADDITION - BYPASSING CASINO RULES
   ```

**Expected Result**: Card added to temp stack

## 🔧 Quick Fixes

### If Still Getting "No valid actions":

1. **Check if bypass is working**:
   ```javascript
   // In determineActions.js, temporarily force return:
   if (targetInfo?.type === 'loose') {
     console.log('[FORCE] Returning tableToTableDrop');
     return ['tableToTableDrop'];
   }
   ```

2. **Check handler registration**:
   ```bash
   # Look for in server logs:
   Unknown action: tableToTableDrop
   # If found, check socket-server.js mapping
   ```

### If Still Getting "Cannot read length":

1. **The old handler is still being called** - check if `determineActions` is returning `['tableCardDrop']` instead of the new handlers

2. **Force route to new handler**:
   ```javascript
   // In determineActions.js:
   return ['tableToTableDrop']; // Force this temporarily
   ```

## 📞 Debug Checklist

- [ ] Client sends correct `source` ('table' or 'hand')
- [ ] Client sends correct `targetInfo.type` ('loose' or 'temporary_stack')
- [ ] `determineActions` bypass triggers and returns correct action
- [ ] Action router has mapping for the returned action
- [ ] Handler receives correct payload structure
- [ ] Handler validates inputs correctly
- [ ] Handler doesn't crash on game state access

## 🎯 Most Likely Culprits

1. **Source detection wrong** - Client sending wrong `source` value
2. **Bypass not triggering** - `determineActions` conditions not met
3. **Handler not registered** - Router missing the mapping
4. **Old handler still used** - Some path still calls `tableCardDrop`

## 📋 Action Items

1. Add comprehensive logging as shown above
2. Test each scenario and check console output
3. Identify which step is failing
4. Apply targeted fix based on findings

**Run the logging first, then we can pinpoint exactly where the issue occurs.**
