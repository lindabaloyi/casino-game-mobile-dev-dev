# Casino Game Combo Detection and Action Rules

## Overview

This document details the complete rules and logic for the casino card game's combo detection, capture mechanics, build creation, and action handling. The game features sophisticated card combination detection that determines available player actions through the ActionModal system.

## Table of Contents

1. [Card Values and Fundamentals](#card-values-and-fundamentals)
2. [Combo Detection Logic](#combo-detection-logic)
3. [Capture Mechanics](#capture-mechanics)
4. [Build System](#build-system)
5. [ActionModal Flow](#actionmodal-flow)
6. [Special Rules](#special-rules)
7. [Implementation Details](#implementation-details)

## Card Values and Fundamentals

### Card Value System

```javascript
function rankValue(rank) {
  switch(rank) {
    case 'A': return 1;
    case '2': return 2;
    case '3': return 3;
    case '4': return 4;
    case '5': return 5;
    case '6': return 6;
    case '7': return 7;
    case '8': return 8;
    case '9': return 9;
    case '10': return 10;
    case 'J': return 10;
    case 'Q': return 10;
    case 'K': return 10;
    default: return 0;
  }
}

function calculateCardSum(cards) {
  return cards.reduce((sum, card) => sum + rankValue(card.rank), 0);
}
```

### Game Objects

- **Loose Cards**: Individual cards on the table (no `type` property)
- **Builds**: Created combinations with `type: 'build'`
- **Temp Stacks**: Player-created staging with `type: 'temporary_stack'`

## Combo Detection Logic

### 1. Sequence Detection

**Rule**: Cards form a consecutive numerical sequence (regardless of suit)

```javascript
function isValidSequence(cards) {
  if (cards.length < 3) return false; // Need at least 3 cards

  const sortedCards = [...cards].sort((a, b) => rankValue(a.rank) - rankValue(b.rank));

  for (let i = 1; i < sortedCards.length; i++) {
    const currentValue = rankValue(sortedCards[i].rank);
    const previousValue = rankValue(sortedCards[i-1].rank);

    if (currentValue !== previousValue + 1) {
      return false;
    }
  }

  return true;
}

// Examples:
// ✅ 5♠ + 6♦ + 7♣ + 8♥ (sequence of 4)
// ✅ 9♠ + 10♦ + J♣ (sequence of 3)
// ❌ 5♠ + 7♦ + 8♣ (missing 6)
// ❌ 5♠ + 6♦ + 7♣ (only 2 cards)
```

### 2. Set Detection

**Rule**: Multiple cards of the same numerical value

```javascript
function isValidSet(cards) {
  if (cards.length < 3) return false; // Need at least 3 cards

  const firstValue = rankValue(cards[0].rank);
  return cards.every(card => rankValue(card.rank) === firstValue);
}

// Examples:
// ✅ Three 9s: 9♠ + 9♦ + 9♣
// ✅ Four 5s: 5♠ + 5♦ + 5♣ + 5♥
// ✅ Three Kings: K♠ + K♦ + K♣
// ❌ 9♠ + 9♦ + 8♣ (mixed values)
// ❌ 9♠ + 9♦ (only 2 cards)
```

### 3. Special Combination Detection

#### Marriage (King + Queen)
```javascript
function isMarriage(cards) {
  if (cards.length !== 2) return false;

  const [card1, card2] = cards;
  const hasKing = cards.some(c => c.rank === 'K');
  const hasQueen = cards.some(c => c.rank === 'Q');

  return hasKing && hasQueen &&
         card1.suit === card2.suit; // Same suit required
}

// Examples:
// ✅ K♠ + Q♠ (Spades marriage)
// ✅ Q♦ + K♦ (Diamonds marriage)
// ❌ K♠ + Q♦ (different suits)
// ❌ K♠ + J♠ (not king+queen)
```

#### Buildable Sum
```javascript
function isBuildableSum(cards, targetSum = null) {
  const totalValue = calculateCardSum(cards);

  // If target sum specified, must match exactly
  if (targetSum !== null) {
    return totalValue === targetSum;
  }

  // Otherwise, any sum ≤ 10 can be built
  return totalValue <= 10;
}

// Examples:
// ✅ 4♠ + 5♦ (sum = 9, can build)
// ✅ 3♣ + 4♥ + 3♦ (sum = 10, can build)
// ❌ 6♠ + 7♦ + 8♣ (sum = 21, cannot build)
```

### 4. Combo Classification System

```javascript
function classifyCombo(cards) {
  const totalValue = calculateCardSum(cards);

  // Check for special combinations first
  if (isMarriage(cards)) {
    return {
      comboType: 'MARRIAGE',
      totalValue: totalValue,
      description: `Marriage: ${cards.map(c => c.rank).join('+')} of ${cards[0].suit}`,
      canBuild: true,
      canCapture: true
    };
  }

  // Check for sequences
  if (isValidSequence(cards)) {
    return {
      comboType: 'SEQUENCE',
      totalValue: totalValue,
      description: `Sequence: ${cards.map(c => rankValue(c.rank)).join(', ')}`,
      canBuild: totalValue <= 10,
      canCapture: true
    };
  }

  // Check for sets
  if (isValidSet(cards)) {
    const value = rankValue(cards[0].rank);
    return {
      comboType: 'SET',
      totalValue: totalValue,
      description: `${cards.length} × ${value}s`,
      canBuild: totalValue <= 10,
      canCapture: true
    };
  }

  // Check for buildable sums
  if (totalValue <= 10) {
    return {
      comboType: 'BUILDABLE_SUM',
      totalValue: totalValue,
      description: `Sum: ${cards.map(c => rankValue(c.rank)).join(' + ')} = ${totalValue}`,
      canBuild: true,
      canCapture: true
    };
  }

  // No valid combo
  return {
    comboType: 'INVALID',
    totalValue: totalValue,
    description: `Invalid combo (sum: ${totalValue})`,
    canBuild: false,
    canCapture: false
  };
}
```

## Capture Mechanics

### 1. Single Card Capture

**Rule**: Play a card that matches the value of a loose card on the table

```javascript
function canCaptureSingleCard(capturingCard, targetCard) {
  return rankValue(capturingCard.rank) === rankValue(targetCard.rank);
}

// Examples:
// ✅ Play 7♦ to capture 7♠
// ✅ Play K♣ to capture K♥
// ❌ Play 8♠ to capture 7♦ (values don't match)
```

### 2. Build Capture

**Rule**: Play a card that matches the total value of an entire build

```javascript
function canCaptureBuild(capturingCard, build) {
  return rankValue(capturingCard.rank) === build.value;
}

// Examples:
// ✅ Play 9♠ to capture build worth 9 (5♠+4♦)
// ✅ Play 7♦ to capture build worth 7 (3♣+4♥)
// ❌ Play 8♣ to capture build worth 9 (value mismatch)
```

**Important**: You cannot capture your own builds!

### 3. Temp Stack Capture

**Rule**: Play a card that matches the capture value of a temp stack

```javascript
function canCaptureTempStack(capturingCard, tempStack) {
  const captureValue = tempStack.captureValue || calculateCardSum(tempStack.cards);
  return rankValue(capturingCard.rank) === captureValue;
}

// Examples:
// ✅ Play 8♥ to capture temp stack worth 8
// ✅ Play 6♣ to capture marriage (K+Q = 20, but special rules may apply)
// ❌ Play 7♦ to capture temp stack worth 9
```

### 4. Two-Card Capture

**Rule**: Use two cards from hand to capture (advanced play)

```javascript
function canTwoCardCapture(card1, card2, target) {
  const combinedValue = rankValue(card1.rank) + rankValue(card2.rank);
  const targetValue = isBuild(target) ? target.value : rankValue(target.rank);

  return combinedValue === targetValue;
}

// Examples:
// ✅ Play 3♠ + 4♦ (sum=7) to capture 7♥
// ✅ Play 2♣ + 5♥ (sum=7) to capture build worth 7
// ❌ Play 3♠ + 6♦ (sum=9) to capture 7♥
```

## Build System

### 1. Build Creation

**Rule**: Combine cards totaling ≤ 10 to create a build

```javascript
function canCreateBuild(cards) {
  const totalValue = calculateCardSum(cards);
  return totalValue <= 10 && cards.length >= 2;
}

// Examples:
// ✅ 4♠ + 5♦ (sum=9) → Build worth 9
// ✅ 3♣ + 4♥ + 3♦ (sum=10) → Build worth 10
// ❌ 6♠ + 7♦ + 8♣ (sum=21) → Cannot build
```

### 2. Build Extension

**Rule**: Add cards to existing builds (with restrictions)

```javascript
function canExtendBuild(card, build) {
  // Cannot extend your own builds
  if (build.owner === currentPlayer) {
    return false;
  }

  // Must not exceed 10 total
  const newTotal = build.value + rankValue(card.rank);
  if (newTotal > 10) {
    return false;
  }

  // Build must be extendable (most are)
  return build.isExtendable;
}

// Examples:
// ✅ Add 3♠ to build worth 6 (3♦+3♣) → New total: 9
// ❌ Add 5♥ to build worth 7 (4♠+3♦) → Would exceed 10
// ❌ Add card to your own build (not allowed)
```

### 3. Build Ownership

- **Your builds**: Cannot be captured by you, cannot be extended by others during your turn
- **Opponent builds**: Can be captured or extended by you
- **Extendable builds**: Most builds allow extension (special rules may restrict)

## ActionModal Flow

### Combo-Based Action Presentation

```javascript
function showComboOptions(tempStack, validation) {
  const cardsText = tempStack.cards.map(c => rankValue(c.rank)).join(', ');

  let title = '';
  let message = '';
  let actions = [];

  switch (validation.comboType) {
    case 'MARRIAGE':
      title = '💕 Marriage';
      message = `Royal marriage: ${validation.description}`;
      actions = [
        { text: 'Capture with marriage', action: () => captureWithMarriage(tempStack) },
        { text: 'Build marriage', action: () => createMarriageBuild(tempStack) }
      ];
      break;

    case 'SEQUENCE':
      title = '🔢 Sequence';
      message = `Sequence: ${cardsText} = ${validation.totalValue}`;
      actions = validation.totalValue <= 10
        ? [
            { text: `Build ${validation.totalValue}`, action: () => createBuild(tempStack, validation.totalValue) },
            { text: 'Capture (if you have matching card)', action: () => checkForCapture(tempStack, validation.totalValue) }
          ]
        : [{ text: 'Cannot build (total >10)', style: 'disabled' }];
      break;

    case 'SET':
      title = '🎯 Same Value Cards';
      message = `You have ${tempStack.cards.length} cards of value ${validation.totalValue / tempStack.cards.length}`;
      actions = [
        { text: 'Capture', action: () => captureCards(tempStack) },
        { text: 'Build', action: () => createBuild(tempStack, validation.totalValue) }
      ];
      break;

    case 'BUILDABLE_SUM':
      title = '🏗️ Buildable Sum';
      message = `Cards sum to ${validation.totalValue} (≤10)`;
      actions = [
        { text: `Build ${validation.totalValue}`, action: () => createBuild(tempStack, validation.totalValue) },
        { text: 'Capture (if you have matching card)', action: () => checkForCapture(tempStack, validation.totalValue) }
      ];
      break;

    case 'INVALID':
      title = '❌ Invalid Combination';
      message = `These cards don't form a valid combo (sum: ${validation.totalValue})`;
      actions = [
        { text: 'Add more cards', action: () => continueStacking(tempStack) },
        { text: 'Cancel stack', action: () => cancelStack(tempStack) }
      ];
      break;
  }

  // Always add edit option
  actions.push({ text: 'Edit Stack', style: 'cancel' });

  Alert.alert(title, message, actions);
}
```

### Action Priority Logic

```javascript
function determineActionPriority(tempStack) {
  const combo = classifyCombo(tempStack.cards);

  // Priority order:
  // 1. Captures (if available)
  // 2. Builds (if valid)
  // 3. Add to existing build
  // 4. Edit/Cancel

  const actions = [];

  // Check for captures first
  const availableCaptures = findAvailableCaptures(tempStack);
  if (availableCaptures.length > 0) {
    actions.push(...availableCaptures);
  }

  // Then builds
  if (combo.canBuild) {
    actions.push({
      type: 'build',
      label: `Create Build (${combo.totalValue})`,
      priority: 2
    });
  }

  // Then extensions
  const availableExtensions = findAvailableExtensions(tempStack);
  if (availableExtensions.length > 0) {
    actions.push(...availableExtensions);
  }

  // Always allow editing
  actions.push({
    type: 'edit',
    label: 'Edit Stack',
    priority: 99 // Lowest priority
  });

  return actions.sort((a, b) => (a.priority || 0) - (b.priority || 0));
}
```

## Special Rules

### 1. Round 1 Restrictions

**Trail Rule**: Cannot trail if you have a capture or build opportunity

```javascript
function canTrailInRound1(card, gameState) {
  // Check if player has any captures or builds available
  const hasCaptures = checkForCaptures(card, gameState);
  const hasBuilds = checkForBuilds(card, gameState);

  return !hasCaptures && !hasBuilds;
}
```

### 2. Last Card Rule

**Rule**: Last card played must capture or build (cannot trail)

```javascript
function isLastCardValid(card, gameState) {
  // Must have at least one capture or build opportunity
  return hasCaptures(card, gameState) || hasBuilds(card, gameState);
}
```

### 3. Sweep Bonus

**Rule**: Capturing all table cards in one turn earns a bonus

```javascript
function checkForSweep(capturedCards, tableCards) {
  const allTableCardsCaptured = tableCards.length === 0;
  const capturedInThisTurn = capturedCards.length;

  if (allTableCardsCaptured && capturedInThisTurn > 0) {
    return { isSweep: true, bonus: 1 }; // Award 1 point bonus
  }

  return { isSweep: false, bonus: 0 };
}
```

## Implementation Details

### Action Determination Engine

The game uses a rule-based action determination system:

```javascript
class ActionDeterminationEngine {
  determineActions(draggedItem, targetInfo, gameState) {
    // 1. Evaluate all rules against context
    const matchingRules = this.evaluateRules(context);

    // 2. Execute actions for matching rules
    const actions = matchingRules.map(rule => rule.action(context));

    // 3. Determine if modal required
    const requiresModal = actions.length > 1 ||
                         actions.some(a => a.type === 'trail');

    return { actions, requiresModal };
  }
}
```

### Rule Priority System

Rules are evaluated in priority order:

1. **Staging Rules** (Priority 100) - Temp stack creation
2. **Capture Rules** (Priority 90) - Card/build captures
3. **Build Rules** (Priority 80) - Build creation/extension
4. **Trail Rules** (Priority 70) - Last resort play

### State Management

```javascript
// Game state structure
const gameState = {
  currentPlayer: 0,
  round: 1,
  tableCards: [
    // Loose cards: { rank, suit }
    // Builds: { type: 'build', cards, value, owner, isExtendable }
    // Temp stacks: { type: 'temporary_stack', cards, owner, value }
  ],
  playerHands: [
    [{ rank: '7', suit: '♠' }, { rank: 'K', suit: '♦' }], // Player 0
    [{ rank: '8', suit: '♥' }, { rank: 'Q', suit: '♣' }]  // Player 1
  ],
  playerCaptures: [[], []] // Captured cards
};
```

### Validation Flow

```
1. Player makes move (drag card)
2. ActionDeterminationEngine evaluates rules
3. Matching rules generate actions
4. If multiple actions → ActionModal appears
5. Player selects action → Execute move
6. Update game state → Broadcast to clients
```

This comprehensive system ensures fair play, strategic depth, and clear user guidance through combo detection and action prioritization.
