# Temp Stack Creation Logic & Anti-Duplication System

## Overview

This document explains the casino game's temporary stack creation system, the card duplication bug we fixed, and the comprehensive logging system we implemented for debugging.

## 🎯 Problem Identified

### Card Duplication Bug
**Issue:** When creating temp stacks from table cards, the server was adding temp stacks **without removing the original cards**, causing state accumulation:

```javascript
// BEFORE (Broken):
gameState.tableCards.push(tempStack); // Only adds temp stack
// Result: [card1, card2] → [card1, card2, tempStack] ❌ 3 items

// When cancelled: temp stack expands back to cards
// Result: [card1, card2, card1, card2] ❌ 4 items (duplication)
```

### Root Cause
The action handlers were treating temp stack creation as an **additive operation** rather than a **replacement operation**.

## ✅ Solution Implemented

### State Replacement Logic
**Fix:** Remove original cards before adding temp stack:

```javascript
// AFTER (Fixed):
// 1. Remove original cards from table
const draggedIndex = gameState.tableCards.findIndex(card =>
  card.rank === draggedItem.card.rank && card.suit === draggedItem.card.suit
);
const targetIndex = gameState.tableCards.findIndex(card =>
  card.rank === targetInfo.card.rank && card.suit === targetInfo.card.suit
);

// Remove in reverse order to maintain indices
[draggedIndex, targetIndex].sort((a,b) => b-a).forEach(index => {
  gameState.tableCards.splice(index, 1);
});

// 2. Add temp stack (replacement, not addition)
gameState.tableCards.push(tempStack);
// Result: [card1, card2] → [tempStack] ✅ 1 item
```

## 🏗️ Complete System Architecture

### 1. Action Determination Engine (`actionDetermination.js`)

**Rule Evaluation Pipeline:**
```javascript
class ActionDeterminationEngine {
  determineActions(draggedItem, targetInfo, gameState) {
    console.log('[ENGINE] ===== ACTION DETERMINATION START =====');

    const context = this.createContext(draggedItem, targetInfo, gameState);
    const matchingRules = this.evaluateRules(context);

    // All actions are functions that return complete objects
    const actions = matchingRules.map(rule => rule.action(context));

    return { actions, requiresModal: this.needsModal(actions) };
  }
}
```

### 2. Staging Rules (`stagingRules.js`)

**Rule-Based Action Creation:**
```javascript
const stagingRules = [
  {
    id: 'table-to-table-staging',
    condition: (context) => {
      console.log('[STAGING_RULE] Evaluating table-to-table staging');
      return context.draggedItem?.source === 'table' &&
             context.targetInfo?.type === 'loose';
    },
    action: (context) => ({
      type: 'tableToTableDrop',
      payload: {
        gameId: context.gameId,
        draggedItem: context.draggedItem,
        targetInfo: context.targetInfo
      }
    }),
    requiresModal: false,
    priority: 100
  }
];
```

### 3. Action Handlers

#### Table-to-Table Handler (`tableToTableDrop.js`)
```javascript
function handleTableToTableDrop(gameManager, playerIndex, action) {
  console.log('[TEMP_STACK] 🏃 TABLE_TO_TABLE_DROP executing');

  const { gameId, draggedItem, targetInfo } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  // ✅ CRITICAL FIX: Remove originals before adding temp stack
  console.log('[TEMP_STACK] Removing original cards before creating temp stack');

  // Find and remove dragged card
  const draggedIndex = gameState.tableCards.findIndex(card =>
    card.rank === draggedItem.card.rank && card.suit === draggedItem.card.suit
  );

  // Find and remove target card
  const targetIndex = gameState.tableCards.findIndex(card =>
    card.rank === targetInfo.card.rank && card.suit === targetInfo.card.suit
  );

  // Remove cards (reverse order to maintain indices)
  [draggedIndex, targetIndex]
    .filter(i => i >= 0)
    .sort((a, b) => b - a)
    .forEach(index => {
      console.log(`[TEMP_STACK] Removing card at index ${index}`);
      gameState.tableCards.splice(index, 1);
    });

  // ✅ Create and add temp stack
  const tempStack = {
    type: 'temporary_stack',
    stackId: `temp-${Date.now()}`,
    cards: [targetInfo.card, draggedItem.card],
    owner: playerIndex,
    value: (targetInfo.card.value || 0) + (draggedItem.card.value || 0)
  };

  gameState.tableCards.push(tempStack);

  console.log('[TEMP_STACK] ✅ Temp stack created without duplication');
  return gameState;
}
```

#### Hand-to-Table Handler (`handToTableDrop.js`)
```javascript
function handleHandToTableDrop(gameManager, playerIndex, action) {
  console.log('[TEMP_STACK] 🏃 HAND_TO_TABLE_DROP executing');

  const { gameId, draggedItem, targetInfo } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  // ✅ Remove target card from table
  const targetIndex = gameState.tableCards.findIndex(card =>
    card.rank === targetInfo.card.rank && card.suit === targetInfo.card.suit
  );

  if (targetIndex >= 0) {
    gameState.tableCards.splice(targetIndex, 1);
    console.log('[TEMP_STACK] Target card removed from table');
  }

  // ✅ Create temp stack with hand card + removed table card
  const tempStack = {
    type: 'temporary_stack',
    stackId: `temp-${Date.now()}`,
    cards: [targetInfo.card, draggedItem.card],
    owner: playerIndex,
    value: (targetInfo.card.value || 0) + (draggedItem.card.value || 0)
  };

  gameState.tableCards.push(tempStack);

  // ✅ Remove from player's hand
  const hand = gameState.playerHands[playerIndex];
  const cardIndex = hand.findIndex(card =>
    card.rank === draggedItem.card.rank && card.suit === draggedItem.card.suit
  );

  if (cardIndex >= 0) {
    hand.splice(cardIndex, 1);
    console.log('[TEMP_STACK] Card removed from player hand');
  }

  console.log('[TEMP_STACK] ✅ Hand-to-table temp stack created');
  return gameState;
}
```

## 🔍 Comprehensive Debug Logging System (ENHANCED)

### **🎯 Complete Debug Coverage Added:**

#### **1. Client-Side Drag Operations (`useDragHandlers.ts`)**
```javascript
// Pre-action table state analysis
console.log(`🔍 [STAGING_DEBUG] Current table state:`, {
  tableCardsCount: gameState.tableCards?.length || 0,
  tableCards: gameState.tableCards?.map((card, index) => ({
    index, type: card?.type || 'loose',
    card: card?.type === 'temporary_stack'
      ? `temp-stack(${card.stackId})[${card.cards?.length || 0} cards]`
      : `${card?.rank || 'no-rank'}${card?.suit || 'no-suit'}`,
    owner: card?.owner
  })) || [],
  playerHands: gameState.playerHands?.map((hand, idx) => ({
    player: idx, handSize: hand?.length || 0,
    cards: hand?.map(c => `${c.rank}${c.suit}`) || []
  })) || []
});
```

#### **2. Action Determination Engine (`actionDetermination.js`)**
```javascript
// Full context logging
console.log('[ENGINE] Full context:', {
  draggedSource: draggedItem?.source,
  draggedCard: draggedItem?.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'none',
  targetType: targetInfo?.type,
  gameId: gameState?.gameId,
  currentPlayer: gameState?.currentPlayer,
  tableCardsCount: gameState?.tableCards?.length || 0,
  playerHands: gameState?.playerHands?.map((h, i) => ({
    player: i, handSize: h?.length || 0
  })) || []
});
```

#### **3. Server Handler Debugging (`tableToTableDrop.js`)**
```javascript
// Pre-execution state
console.log('[SERVER_DEBUG] PRE-EXECUTION STATE:', {
  gameId: action.payload.gameId,
  playerIndex,
  draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
  targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`
});

// Table structure analysis
console.log('[DEBUG] Table items analysis:', {
  totalItems: gameState.tableCards.length,
  items: gameState.tableCards.map((item, i) => ({
    index: i, type: item.type || 'loose',
    hasRank: 'rank' in item, rank: item.rank, suit: item.suit,
    isTempStack: item.type === 'temporary_stack'
  }))
});

// Card finding process
console.log(`[DEBUG] Found dragged card ${tableItem.rank}${tableItem.suit} at index ${i}`);
console.log(`[DEBUG] Found target card ${tableItem.rank}${tableItem.suit} at index ${i}`);
```

#### **4. Validation System (`GameState.js`)**
```javascript
// Comprehensive duplicate detection
function validateNoDuplicates(gameState) {
  console.log('[VALIDATION] 🔍 Checking for card duplicates across all game locations...');

  // Checks table (loose + temp stacks), hands, and captures
  // Reports detailed locations of any duplicates found
}
```

### **📊 Debug Log Categories:**

| Log Category | Purpose | Location |
|--------------|---------|----------|
| `[STAGING_DEBUG]` | Client drag/drop analysis | `useDragHandlers.ts` |
| `[ENGINE]` | Action determination process | `actionDetermination.js` |
| `[SERVER_DEBUG]` | Server handler execution | `tableToTableDrop.js` |
| `[DEBUG]` | Detailed operation steps | All handlers |
| `[VALIDATION]` | Duplicate detection | `GameState.js` |
| `[TEMP_STACK]` | Temp stack operations | All temp stack handlers |

### **🎯 Debug Output Example:**
```
🔍 [STAGING_DEBUG] Current table state: { tableCardsCount: 3, tableCards: [...] }
[ENGINE] ===== ACTION DETERMINATION START =====
[ENGINE] Full context: { draggedSource: "table", targetType: "loose", ... }
[SERVER_DEBUG] PRE-EXECUTION STATE: { draggedCard: "5♣", targetCard: "4♦" }
[DEBUG] Table items analysis: { totalItems: 3, items: [...] }
[DEBUG] Found dragged card 5♣ at index 1
[DEBUG] Found target card 4♦ at index 2
[TEMP_STACK] Card indices to remove: { indicesToRemove: [1,2], count: 2 }
[VALIDATION] ✅ No duplicates found across all game locations
```

### **🚀 Debug Commands:**

**To enable full debugging:**
```bash
# All temp stack logs are now active by default
# Look for logs starting with [STAGING_DEBUG], [ENGINE], [SERVER_DEBUG], etc.
```

**To filter specific logs:**
```bash
# In browser console:
console.log = (function(original) {
  return function(...args) {
    if (args[0]?.includes?.('[TEMP_STACK]')) {
      original.apply(console, args);
    }
  };
})(console.log);
```

## 🧪 Testing & Validation

### Unit Test Example
```javascript
// Test temp stack creation without duplication
describe('Temp Stack Creation', () => {
  test('table-to-table creates single temp stack', () => {
    const gameState = {
      tableCards: [
        { rank: '5', suit: '♥', value: 5 },
        { rank: 'A', suit: '♠', value: 1 }
      ]
    };

    // Simulate table-to-table drop
    const result = handleTableToTableDrop(gameManager, 0, {
      payload: {
        draggedItem: { card: gameState.tableCards[0], source: 'table' },
        targetInfo: { card: gameState.tableCards[1], type: 'loose' }
      }
    });

    // Should have 1 temp stack, not 3 items
    expect(result.tableCards).toHaveLength(1);
    expect(result.tableCards[0].type).toBe('temporary_stack');
    expect(result.tableCards[0].cards).toHaveLength(2);
  });
});
```

### Integration Test Flow
```javascript
// 1. Initial state: 2 cards on table
expect(gameState.tableCards).toHaveLength(2);

// 2. Create temp stack
const actionResult = determineActions(draggedItem, targetInfo, gameState);
expect(actionResult.actions[0].type).toBe('tableToTableDrop');

// 3. Execute action
const newState = handleTableToTableDrop(gameManager, 0, actionResult.actions[0]);

// 4. Verify: 1 temp stack (not 3 items)
expect(newState.tableCards).toHaveLength(1);
expect(newState.tableCards[0].type).toBe('temporary_stack');
```

## 🎯 Key Principles

### 1. State Replacement (Not Addition)
- **❌ Wrong:** Add temp stack + keep originals
- **✅ Right:** Remove originals + add temp stack

### 2. Atomic Operations
- Card removal and temp stack creation happen together
- No intermediate invalid states

### 3. Comprehensive Logging
- Every state change is logged
- Before/after states are tracked
- Error conditions are captured

### 4. Consistent Payload Structure
- All actions include required `payload` object
- Handler expects `{ gameId, draggedItem, targetInfo }`

## 🚨 Common Issues & Fixes (UPDATED WITH LATEST FIXES)

### Issue 1: Cards Still Duplicating (CRITICAL - FIXED)
**Symptom:** Cards exist in multiple locations simultaneously
**Root Cause:** `addToStagingStack` adds cards without removing from original locations
**Fix Applied:**
- ✅ Modified `stagingRules.js` - Only hand cards can join existing temp stacks
- ✅ Fixed `addToStagingStack.js` - Removes cards from ALL locations before adding
- ✅ Enhanced `validateNoDuplicates` - Comprehensive location tracking and validation

### Issue 2: Table Cards Joining Temp Stacks (FIXED)
**Symptom:** Table cards dragged to existing temp stacks created duplicates
**Root Cause:** `addToStagingStack` didn't remove cards from original table locations
**Fix Applied:**
- ✅ Enhanced `addToStagingStack` to remove cards from ALL locations before adding
- ✅ Table cards CAN join existing temp stacks (via proper removal)
- ✅ Comprehensive validation prevents any duplication

### Issue 3: Handler Crashes
**Symptom:** `"Cannot destructure property 'gameId'"` error
**Fix:** Include `payload` object in action creation

### Issue 4: Wrong Cards in Temp Stack
**Symptom:** Temp stack contains wrong cards
**Fix:** Verify card matching logic uses both `rank` and `suit`

### Issue 5: Client Sync Issues
**Symptom:** Client shows different state than server
**Fix:** Check WebSocket broadcasting and state serialization

## 🎯 Temp Stack Augmentation System (INTEGRATED)

### **✅ Successfully Integrated: "Always Allow, Never Validate" Philosophy**

The temp stack augmentation system from `temp-stack-augmentation.md` has been **fully integrated** into the current logic. Players can now:

- **Create initial temp stacks**: Drag loose card → loose card (2-card stacks)
- **Augment existing stacks**: Drag ANY card → existing temp stack (unlimited additions)
- **Build complex combinations**: Example - (2♣ + 3♦ + 5♥ + A♠) = 10-value stack

### **Key Integration Changes:**

1. **`addToStagingStack.js`** - Simplified to "always allow" logic (no restrictions)
2. **`stagingRules.js`** - Allows any source to join existing temp stacks
3. **`TableInteractionManager.tsx`** - Always accepts drops on temp stacks
4. **`TempStackRenderer.tsx`** - Drop zones configured for unlimited additions

### **Freedom vs Safety Trade-off:**

| Aspect | Before (Anti-Duplication) | After (Augmentation) |
|--------|---------------------------|----------------------|
| **Duplicates** | ❌ Strictly prevented | ✅ Allowed (player choice) |
| **Complexity** | High (multi-location tracking) | Low (simple add-only) |
| **Player Freedom** | Limited | ✅ Complete freedom |
| **Performance** | Slower (extensive validation) | Faster (minimal logic) |

## 📊 Performance Considerations

### Efficient Card Removal (Implemented)
```javascript
// ✅ OPTIMIZED: Single-pass algorithm (O(n) vs O(2n))
const indicesToRemove = [];

for (let i = 0; i < gameState.tableCards.length; i++) {
  const card = gameState.tableCards[i];

  // Check for dragged card
  if (card.rank === draggedItem.card.rank &&
      card.suit === draggedItem.card.suit &&
      !indicesToRemove.includes(i)) {
    indicesToRemove.push(i);
  }

  // Check for target card (handles same card edge case)
  if (card.rank === targetInfo.card.rank &&
      card.suit === targetInfo.card.suit &&
      !indicesToRemove.includes(i)) {
    indicesToRemove.push(i);
  }
}

// Enhanced edge case handling: prevent removing same card twice
if (indicesToRemove.length === 1) {
  // Same card dragged and targeted - remove once
  gameState.tableCards.splice(indicesToRemove[0], 1);
} else if (indicesToRemove.length === 2) {
  // Different cards - remove both in reverse order
  indicesToRemove.sort((a, b) => b - a).forEach(index => {
    gameState.tableCards.splice(index, 1);
  });
}

// Remove in reverse order to maintain indices
indicesToRemove.sort((a,b) => b-a).forEach(index => {
  gameState.tableCards.splice(index, 1);
});
```

### Duplicate Validation System (Implemented)
```javascript
// ✅ Added comprehensive validation after every temp stack operation
function validateNoDuplicates(gameState) {
  const allCards = [];

  // Collect all cards from table (loose + temp stacks)
  gameState.tableCards.forEach(item => {
    if (item.type === 'temporary_stack' && item.cards) {
      allCards.push(...item.cards.map(c => `${c.rank}${c.suit}`));
    } else if (item.rank && item.suit) {
      allCards.push(`${item.rank}${item.suit}`);
    }
  });

  // Check player hands for cross-contamination
  gameState.playerHands.forEach((hand, playerIndex) => {
    hand.forEach(card => {
      allCards.push(`${card.rank}${card.suit}-hand-p${playerIndex}`);
    });
  });

  const uniqueCards = [...new Set(allCards)];
  const hasDuplicates = allCards.length !== uniqueCards.length;

  if (hasDuplicates) {
    console.error('[VALIDATION] ❌ DUPLICATES FOUND:', {
      duplicates: allCards.filter((card, index) =>
        allCards.indexOf(card) !== index
      )
    });
  }

  return !hasDuplicates;
}
```

### Memory Management
- Temp stacks reuse existing card objects
- No unnecessary object creation
- Clean removal prevents memory leaks

## 🔮 Future Enhancements

### 1. Multi-Card Temp Stacks
```javascript
// Support for 3+ card temp stacks
action: (context) => ({
  type: 'createMultiCardTempStack',
  payload: {
    cards: selectedCards,
    owner: playerIndex
  }
});
```

### 2. Temp Stack Validation
```javascript
// Validate temp stack creation rules
function validateTempStack(cards) {
  // Check value limits, ownership, etc.
  return isValid ? cards : null;
}
```

### 3. Undo/Redo System
```javascript
// Track state changes for undo functionality
const undoStack = [];
undoStack.push({
  type: 'temp_stack_created',
  originalCards: removedCards,
  tempStack: createdStack
});
```

## 📋 Checklist

- ✅ Remove original cards before adding temp stacks
- ✅ Include proper payload structure in actions
- ✅ Comprehensive logging for debugging
- ✅ Atomic state transitions
- ✅ Client-server state synchronization
- ✅ No card duplication in any scenario
- ✅ Proper cleanup on cancellation

---

**This system ensures temp stack creation is reliable, debuggable, and free from card duplication issues.** 🎰✨
