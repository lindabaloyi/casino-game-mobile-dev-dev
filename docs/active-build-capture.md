# Active Build Capture Logic

## Overview
When players capture active builds by dragging matching cards from their hand, both the build cards and the capturing card are included in the captured set, with the capturing card placed on top.

## Example Scenario
- Player creates a build worth **9** using cards like **5♣ + 4♠**
- On their next turn, they drag a **10♦** from hand onto the build
- The captured set includes: **[5♣, 4♠, 10♦]** with **10♦** on top

## Technical Implementation

### 1. Rule Engine Detection
The `build-capture` rule in `captureRules.js` detects when a hand card matches a build's value:

```javascript
{
  id: 'build-capture',
  condition: (context) => {
    const draggedItem = context.draggedItem;
    const targetInfo = context.targetInfo;

    // Only for hand cards
    if (draggedItem?.source !== 'hand') {
      return false;
    }

    // Target must be a build (check targetInfo.type, not targetInfo.card.type)
    if (targetInfo?.type !== 'build') {
      return false;
    }

    const draggedValue = rankValue(draggedItem.card.rank);
    const buildValue = targetInfo.card.value;
    const matches = draggedValue === buildValue;

    return matches;
  },
  action: (context) => {
    return {
      type: 'capture',
      payload: {
        tempStackId: null, // Build capture - no temp stack
        captureValue: context.targetInfo.card.value,
        targetCards: [...(context.targetInfo.card.cards || []), context.draggedItem.card], // Include capturing card on top
        capturingCard: context.draggedItem.card, // Mark the capturing card
        buildId: context.targetInfo.card.buildId // Include build ID for cleanup
      }
    };
  },
  requiresModal: false,
  priority: 45,
  description: 'Capture entire build'
}
```

### 2. Action Processing
The unified `capture` action in `capture.js` handles the card collection:

```javascript
async function handleCapture(gameManager, playerIndex, action, gameId) {
  const { tempStackId, captureValue, targetCards, buildId, capturingCard } = action.payload;

  // For build captures (tempStackId === null && targetCards exist)
  if (targetCards && targetCards.length > 0) {
    // Remove build from table if buildId provided
    if (buildId) {
      const buildIndex = gameState.tableCards.findIndex(card =>
        card.buildId === buildId
      );
      if (buildIndex !== -1) {
        gameState.tableCards.splice(buildIndex, 1);
      }
    }

    // Handle capturing card removal from hand
    if (capturingCard && tempStackId === null) {
      const handIndex = gameState.playerHands[playerIndex].findIndex(card =>
        card.rank === capturingCard.rank && card.suit === capturingCard.suit
      );
      if (handIndex >= 0) {
        gameState.playerHands[playerIndex].splice(handIndex, 1);
      }
    }

    // Add all target cards (build cards + capturing card) to player's captures
    gameState.playerCaptures[playerIndex].push(...targetCards);
  }
}
```

## Card Order in Captured Set

### 1. Build Cards First
All cards that were part of the build are included first:
```javascript
targetCards: [...(context.targetInfo.card.cards || []), context.draggedItem.card]
```

### 2. Capturing Card Last (On Top)
The card used to capture is placed at the end of the array, making it the "top" card:
```javascript
// Example: Build [5♣, 4♠] captured with 10♦
// Result: [5♣, 4♠, 10♦] - 10♦ is on top
```

## State Changes

### Before Capture
```
Player Hand: [10♦, 7♠, 3♥]
Table Cards: [
  { type: 'build', buildId: 'build-1', value: 9, cards: [5♣, 4♠], owner: 0 }
]
Player Captures: [[], []]
```

### After Capture
```
Player Hand: [7♠, 3♥]  // 10♦ removed
Table Cards: []          // Build removed
Player Captures: [[5♣, 4♠, 10♦], []]  // All cards captured, 10♦ on top
```

## Key Technical Details

### 1. Direct vs Temp Stack Captures
- **Build captures**: `tempStackId: null`, `targetCards` provided
- **Temp stack captures**: `tempStackId` provided, capturing card already in stack
- **Single card captures**: `tempStackId: null`, `targetCards: [looseCard, capturingCard]`

### 2. Hand Card Removal Logic
```javascript
if (capturingCard && tempStackId === null) {
  // Only remove from hand for direct captures (builds/single cards)
  // Temp stack captures don't need hand removal (card already in stack)
}
```

### 3. Build Cleanup
```javascript
if (buildId) {
  // Remove the entire build from tableCards
  gameState.tableCards.splice(buildIndex, 1);
}
```

## Testing

### Test Case: Build Capture
```javascript
// Test owned-build-capture.js
const result = determineActions(
  { card: { rank: '10', suit: '♦', value: 10 }, source: 'hand' },
  {
    type: 'build',
    card: {
      buildId: 'build-1',
      value: 9,
      cards: [
        { rank: '5', suit: '♣', value: 5 },
        { rank: '4', suit: '♠', value: 4 }
      ]
    }
  },
  gameState
);

// Expected result:
// - Actions: [{ type: 'capture', payload: { targetCards: [5♣, 4♠, 10♦] } }]
// - After execution: 10♦ removed from hand, build removed from table, all cards in captures
```

## Casino Rules Compliance

This implementation follows casino rules where:
1. **Capturing card is always included** in the captured set
2. **Capturing card is placed on top** of the captured stack
3. **All cards go to the capturing player's captures** in one action
4. **Turn passes** to the next player after capture

## Edge Cases Handled

1. **Empty builds**: `context.targetInfo.card.cards || []` prevents errors
2. **Missing buildId**: Build removal is optional if buildId not provided
3. **Card not in hand**: Hand removal fails gracefully with warning
4. **Multiple captures**: Each capture action is processed independently

## Future Extensions

1. **Opponent build captures**: Similar logic but with different ownership checks
2. **Multi-card captures**: Support for capturing multiple table elements in one action
3. **Trail captures**: Cards trailed can be captured by matching values