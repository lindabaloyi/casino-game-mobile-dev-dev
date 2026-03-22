# Shiya Recall System - Revised Plan

## Key Clarifications

1. **Shiya activation only via `captureTemp` and `captureOwn`** - not all capture actions
2. **Store full captured item** at capture time (deep copy for exact restoration)
3. **Unified recall** works for any type: single card, temp stack, build stack
4. **Similar to `shiya.js`** - get the exact stack as previously captured

---

## Current State Analysis

### Capture Actions That Should Trigger Shiya Recall
- `captureTemp.js` - ✅ (captures opponent's temp stack)
- `captureOwn.js` - ✅ (captures own temp stack)
- `completeCapture.js` - ✅ (completes a build capture)
- `dropToCapture.js` - ✅ (player drops own stack to capture)

### Capture Actions That Should NOT Trigger Shiya Recall
- `dropToCapture.js` - Player drops their OWN stack to capture
- `completeCapture.js` - May not be Shiya-related
- `captureOpponent.js` - May be different from captureTemp
- `capture.js` - Generic capture
- `declineBuildExtension.js` - Different mechanism

### Existing Code Issues
- `dropToCapture.js` already has Shiya recall logic (should be removed/updated)
- Different recall entry structures in different places
- No unified approach

---

## Implementation Plan

### Phase 1: Create Unified Recall Helpers
**File:** `shared/game/recallHelpers.js`

```javascript
/**
 * Recall Helpers - Unified approach for Shiya recall system
 * 
 * Key principle: Store the exact captured item at capture time,
 * restore it verbatim on recall.
 */

const { areTeammates, getTeamFromIndex } = require('../team');

/**
 * Deep clone an object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Extract cards from any capturable item
 * - Single card: returns [card]
 * - Stack with cards: returns card.cards
 */
function getCardsFromItem(item) {
  return item.cards || [item];
}

/**
 * Generate unique recall ID
 */
function generateRecallId(capturedBy, playerCount) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `recall_${capturedBy}_${timestamp}_${random}`;
}

/**
 * Get teammate indices for a player
 */
function getTeammates(state, playerIdx) {
  const team = getTeamFromIndex(playerIdx);
  const teammates = [];
  
  for (let i = 0; i < state.playerCount; i++) {
    if (i !== playerIdx && getTeamFromIndex(i) === team) {
      teammates.push(i);
    }
  }
  
  return teammates;
}

/**
 * Create Shiya recall entries for teammates when a capture happens
 * 
 * @param {object} state - Game state (cloned)
 * @param {number} capturerIdx - Player who did the capturing
 * @param {object} capturedItem - The exact table item being captured
 *                               (single card, temp stack, or build stack)
 */
function createShiyaRecallEntries(state, capturerIdx, capturedItem) {
  // Only in party mode (4 players)
  if (state.playerCount !== 4) return state;
  
  // Only if Shiya was activated on this item
  if (!capturedItem.shiyaActive || capturedItem.shiyaPlayer === undefined) {
    return state;
  }
  
  const activator = capturedItem.shiyaPlayer;
  
  // Get teammates of the activator (not the capturer)
  // The activator is the one who can recall
  const teammates = getTeammates(state, activator);
  
  // Initialize shiyaRecalls if needed
  if (!state.shiyaRecalls) {
    state.shiyaRecalls = {};
  }
  
  for (const teammateIdx of teammates) {
    if (!state.shiyaRecalls[teammateIdx]) {
      state.shiyaRecalls[teammateIdx] = {};
    }
    
    // Generate unique ID for this recall
    const recallId = generateRecallId(capturerIdx, state.playerCount);
    
    // Store the EXACT captured item (deep copy)
    // This ensures we can restore it exactly
    state.shiyaRecalls[teammateIdx][recallId] = {
      recallId,
      // Original stack ID (for reference)
      originalStackId: capturedItem.stackId,
      // The EXACT captured item - this is the key!
      capturedItem: deepClone(capturedItem),
      // Who captured it
      capturedBy: capturerIdx,
      // Who activated Shiya (the teammate who can recall)
      shiyaActivator: activator,
      // Timestamp for expiration tracking
      timestamp: Date.now(),
      // Quick access properties for UI
      value: capturedItem.value,
      type: capturedItem.type || 'single_card',
      description: capturedItem.description || generateDescription(capturedItem),
    };
    
    console.log(`[createShiyaRecallEntries] Created recall for player ${teammateIdx}:`, {
      recallId,
      originalStackId: capturedItem.stackId,
      type: capturedItem.type,
      value: capturedItem.value,
    });
  }
  
  return state;
}

/**
 * Generate human-readable description for a captured item
 */
function generateDescription(capturedItem) {
  if (!capturedItem.type) {
    // Single card
    return `${capturedItem.rank}${capturedItem.suit}`;
  }
  
  if (capturedItem.type === 'temp_stack') {
    const cardValues = capturedItem.cards?.map(c => c.rank).join('+') || '';
    return `Temp Stack: ${capturedItem.value} (${cardValues})`;
  }
  
  if (capturedItem.type === 'build_stack') {
    const cardValues = capturedItem.cards?.map(c => c.rank).join('+') || '';
    return `Build: ${capturedItem.value} (${cardValues})`;
  }
  
  return `${capturedItem.type}: ${capturedItem.value}`;
}

module.exports = {
  deepClone,
  getCardsFromItem,
  generateRecallId,
  getTeammates,
  createShiyaRecallEntries,
  generateDescription,
};
```

### Phase 2: Create Unified Recall Action
**File:** `shared/game/actions/recall.js` (replaces recallCapture)

```javascript
/**
 * Unified Recall Action
 * 
 * Works for any captured item: single card, temp stack, or build stack.
 * Party mode only (4 players). Out-of-turn allowed.
 * 
 * Payload: { recallId: string }
 * 
 * Flow:
 * 1. Validate party mode and recall entry exists
 * 2. Validate player is teammate of capturer
 * 3. Verify cards still exist in capturer's captures
 * 4. Remove cards from capturer's captures
 * 5. Remove matching card from player's hand (cost)
 * 6. Restore the exact captured item to table
 * 7. Clear recall entry
 */

const { cloneState } = require('../');
const { areTeammates } = require('../team');
const { 
  deepClone, 
  getCardsFromItem,
  generateDescription 
} = require('../recallHelpers');

function recall(state, payload, playerIndex) {
  const { recallId } = payload;
  
  console.log(`[recall] Player ${playerIndex} attempting recall: ${recallId}`);
  
  // Validation: Party mode
  if (state.playerCount !== 4) {
    throw new Error('Recall is only available in 4-player party mode');
  }
  
  // Validation: recallId required
  if (!recallId) {
    throw new Error('recall: recallId is required');
  }
  
  // Get recall entry
  const recallEntry = state.shiyaRecalls?.[playerIndex]?.[recallId];
  if (!recallEntry) {
    throw new Error(`No active recall found for ID: ${recallId}`);
  }
  
  const { capturedItem, capturedBy } = recallEntry;
  
  // Validation: Must be teammate of the capturer
  if (!areTeammates(playerIndex, capturedBy)) {
    throw new Error('You can only recall from your teammate\'s capture pile');
  }
  
  // Get cards from the captured item
  const capturedCards = getCardsFromItem(capturedItem);
  
  if (!capturedCards || capturedCards.length === 0) {
    throw new Error('No cards in captured item');
  }
  
  console.log(`[recall] Captured cards:`, capturedCards.map(c => `${c.rank}${c.suit}`));
  
  // Clone state for modifications
  const newState = cloneState(state);
  
  // Verify and remove cards from capturer's captures
  const capturerCaptures = newState.players[capturedBy].captures;
  
  for (const card of capturedCards) {
    const idx = capturerCaptures.findIndex(
      c => c.rank === card.rank && c.suit === card.suit
    );
    
    if (idx === -1) {
      throw new Error(`Card ${card.rank}${card.suit} not found in captures`);
    }
    
    // Remove the card
    capturerCaptures.splice(idx, 1);
  }
  
  console.log(`[recall] Removed ${capturedCards.length} cards from captures`);
  
  // Find and remove matching card from player's hand (the cost)
  const playerHand = newState.players[playerIndex].hand;
  const matchingCardIdx = playerHand.findIndex(card =>
    capturedCards.some(cc => cc.rank === card.rank)
  );
  
  if (matchingCardIdx === -1) {
    const neededRank = capturedCards[0]?.rank;
    throw new Error(`Need a ${neededRank} card to recall`);
  }
  
  const matchingCard = playerHand.splice(matchingCardIdx, 1)[0];
  console.log(`[recall] Used matching card: ${matchingCard.rank}${matchingCard.suit}`);
  
  // Restore the captured item to the table
  const restoredItem = deepClone(capturedItem);
  
  // Update owner to the recalling player
  if (restoredItem.owner !== undefined) {
    restoredItem.owner = playerIndex;
  }
  
  // For build stacks, reset Shiya state (one-time use)
  if (restoredItem.type === 'build_stack') {
    restoredItem.shiyaActive = false;
    restoredItem.shiyaPlayer = undefined;
  }
  
  // Generate new stackId to avoid conflicts
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  restoredItem.stackId = `${restoredItem.type || 'recall'}_P${playerIndex + 1}_${timestamp}_${random}`;
  
  // Add the cost card to the stack (for temp stacks)
  if (restoredItem.cards) {
    restoredItem.cards.push(matchingCard);
    // Recalculate value if needed
    if (restoredItem.value !== undefined) {
      restoredItem.value += matchingCard.value;
    }
  }
  
  newState.tableCards.push(restoredItem);
  
  console.log(`[recall] Restored item to table:`, {
    stackId: restoredItem.stackId,
    type: restoredItem.type,
    cards: restoredItem.cards?.length || 1,
  });
  
  // Clear the recall entry
  delete newState.shiyaRecalls[playerIndex][recallId];
  
  // Clean up empty recall objects
  if (newState.shiyaRecalls[playerIndex] && 
      Object.keys(newState.shiyaRecalls[playerIndex]).length === 0) {
    delete newState.shiyaRecalls[playerIndex];
  }
  
  return newState;
}

module.exports = recall;
```

### Phase 3: Update captureTemp.js
**File:** `shared/game/actions/captureTemp.js`

Add Shiya recall creation after capture:

```javascript
// After capturing cards and removing from table...
const { createShiyaRecallEntries } = require('../recallHelpers');

// Create recall entries for teammates (if Shiya was active)
newState = createShiyaRecallEntries(newState, playerIndex, capturedStack);
```

### Phase 4: Update captureOwn.js
**File:** `shared/game/actions/captureOwn.js`

Same pattern - add recall creation after capture.

### Phase 5: Remove/Cleanup dropToCapture.js
The existing Shiya recall logic in `dropToCapture.js` should be removed since:
- Shiya should only activate via `captureTemp` and `captureOwn`
- `dropToCapture` is the player dropping their own stack

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     SHIYA ACTIVATION                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. Player A plays card on Player B's temp stack              │
│ 2. Validates: same team, not own stack, Shiya not active      │
│ 3. Sets stack.shiyaActive = true, stack.shiyaPlayer = A      │
│ 4. Other players can now capture that stack                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CAPTURE (captureTemp/captureOwn)           │
├─────────────────────────────────────────────────────────────────┤
│ 1. Player C captures the stack with Shiya active              │
│ 2. Cards moved to C's captures                                │
│ 3. createShiyaRecallEntries() called with captured item        │
│ 4. For each teammate of shiyaPlayer:                          │
│    - Create recall entry with DEEP COPY of captured item      │
│    - Store in state.shiyaRecalls[teammateIdx][recallId]        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RECALL (unified)                           │
├─────────────────────────────────────────────────────────────────┤
│ 1. Teammate clicks/taps on recall option                      │
│ 2. recall() validates: party mode, teammate, cards present    │
│ 3. Remove cards from capturer's pile                          │
│ 4. Remove matching card from recaller's hand                 │
│ 5. Restore EXACT captured item to table                       │
│    - Same cards, same structure, new stackId                  │
│    - Update owner to recaller                                 │
│    - Reset Shiya state for builds                             │
│ 6. Clear recall entry                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

1. **Deep copy at capture time** - Ensures we restore exactly what was captured, even if properties change later

2. **Unified recall function** - Single function handles all types:
   - Single card: `capturedItem = { rank, suit, value }`
   - Temp stack: `capturedItem = { type: 'temp_stack', cards: [...], owner, value }`
   - Build stack: `capturedItem = { type: 'build_stack', cards: [...], owner, base, need }`

3. **Shiya only via captureTemp/captureOwn** - Only these trigger recall creation, matching the game rules

4. **Teammates of activator can recall** - The player who activated Shiya's teammates get the recall option

---

## Files to Modify

| File | Action |
|------|--------|
| `shared/game/recallHelpers.js` | Create new helper module |
| `shared/game/actions/recall.js` | Create unified recall action |
| `shared/game/actions/index.js` | Export new recall action |
| `shared/game/ActionRouter.js` | Add recall to OUT_OF_TURN_ACTIONS |
| `shared/game/actions/captureTemp.js` | Add recall entry creation |
| `shared/game/actions/captureOwn.js` | Add recall entry creation |
| `shared/game/actions/completeCapture.js` | Add recall entry creation |
| `shared/game/actions/dropToCapture.js` | Refactor to use unified helpers |

---

## Testing Checklist

- [ ] Test Shiya activation on temp stack
- [ ] Test Shiya activation on build stack  
- [ ] Test captureTemp creates recall entries for teammates
- [ ] Test captureOwn creates recall entries for teammates
- [ ] Test recall restores single card correctly
- [ ] Test recall restores temp stack with all cards
- [ ] Test recall restores build stack with all properties
- [ ] Test recall fails if cards already captured by someone else
- [ ] Test recall fails without matching card in hand
- [ ] Test out-of-turn recall works in party mode
