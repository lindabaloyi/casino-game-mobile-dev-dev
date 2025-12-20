# Casino Game Combo Validation: Card Combination Detection & Validation

## Overview

This document explains the complete logic for validating card combinations in the casino game, including how sequences with different combos are detected, validated, and processed through the rule-based action determination system.

## Table of Contents

1. [Action Determination Engine](#action-determination-engine)
2. [Rule-Based Validation System](#rule-based-validation-system)
3. [Capture Validation Logic](#capture-validation-logic)
4. [Build Creation & Extension Logic](#build-creation--extension-logic)
5. [Staging & Temp Stack Validation](#staging--temp-stack-validation)
6. [Trail Validation Logic](#trail-validation-logic)
7. [Priority Resolution System](#priority-resolution-system)
8. [Sequence Detection Algorithms](#sequence-detection-algorithms)
9. [Validation Flow Examples](#validation-flow-examples)
10. [Implementation Architecture](#implementation-architecture)

## Action Determination Engine

### Core Architecture

The casino game uses a **deterministic state machine** called the `ActionDeterminationEngine` to evaluate all possible actions based on game state and player input.

```javascript
class ActionDeterminationEngine {
  constructor() {
    this.rules = [];
    this.loadRules(); // Load capture, build, staging, trail rules
  }

  determineActions(draggedItem, targetInfo, gameState) {
    const context = this.createContext(draggedItem, targetInfo, gameState);
    const matchingRules = this.evaluateRules(context);
    return this.formatResult(matchingRules, context);
  }
}
```

### Rule Evaluation Process

```
1. Player drags card (draggedItem) to target (targetInfo)
2. Engine creates evaluation context with game state
3. Rules are evaluated in priority order (highest first)
4. Matching rules generate action objects
5. Results formatted for modal presentation or direct execution
```

## Rule-Based Validation System

### Rule Structure

Each validation rule follows this structure:

```javascript
{
  id: 'rule-name',
  condition: (context) => boolean,  // Validation logic
  action: (context) => actionObject, // Action generator
  requiresModal: boolean,           // User choice required?
  priority: number,                 // Evaluation order
  exclusive: boolean               // Stop after match?
}
```

### Rule Categories & Priorities

| Rule Category | Priority Range | Examples | Modal Required |
|---------------|----------------|----------|----------------|
| **Staging** | 95-80 | Temp stack creation, card addition | No |
| **Capture** | 50-40 | Single card, build, temp stack capture | No |
| **Build** | 35-25 | Create build, extend own/opponent build | Yes/No |
| **Trail** | 10 | Place card on empty table | Yes |

### Context Object Structure

```javascript
const context = {
  round: gameState.round,
  currentPlayer: gameState.currentPlayer,
  tableCards: gameState.tableCards,
  playerHands: gameState.playerHands,
  draggedItem: { card, source, player },
  targetInfo: { type, card, index, area }
};
```

## Capture Validation Logic

### Single Card Capture

**Rule:** `single-card-capture` (Priority: 50)

**Condition Logic:**
```javascript
// Must be hand card dropped on loose table card
draggedItem.source === 'hand' &&
targetInfo.type === 'loose' &&
isCard(targetInfo.card) &&

// Values must match exactly
rankValue(draggedItem.card.rank) === rankValue(targetInfo.card.rank)
```

**Valid Examples:**
- Hand: 7♠ → Table: 7♦ ✅ (value match)
- Hand: K♥ → Table: K♣ ✅ (face card match)
- Hand: 5♠ → Table: 6♦ ❌ (value mismatch)

**Action Generated:**
```javascript
{
  type: 'capture',
  targetCards: [targetCard],
  captureValue: rankValue(card.rank),
  captureType: 'single'
}
```

### Build Capture

**Rule:** `build-capture` (Priority: 45)

**Condition Logic:**
```javascript
// Must be hand card dropped on build
draggedItem.source === 'hand' &&
isBuild(targetInfo.card) &&

// Hand card value must equal build value
rankValue(draggedItem.card.rank) === targetInfo.card.value
```

**Valid Examples:**
- Hand: 9♠ → Build(9): [5♦,4♣] ✅ (9 = 9)
- Hand: 7♥ → Build(8): [3♠,5♦] ❌ (7 ≠ 8)

**Action Generated:**
```javascript
{
  type: 'capture',
  targetCards: build.cards,
  captureValue: build.value,
  captureType: 'build'
}
```

### Temp Stack Capture

**Rule:** `temp-stack-capture` (Priority: 40)

**Condition Logic:**
```javascript
// Must be hand card dropped on temp stack
draggedItem.source === 'hand' &&
isTemporaryStack(targetInfo.card) &&

// Hand card value must equal stack value
rankValue(draggedItem.card.rank) === calculateCardSum(targetInfo.card.cards)
```

**Valid Examples:**
- Hand: 10♠ → Temp Stack: [4♥,6♦] ✅ (10 = 4+6)
- Hand: 8♣ → Temp Stack: [5♠,4♦] ❌ (8 ≠ 9)

## Build Creation & Extension Logic

### Create Own Build

**Rule:** `create-own-build` (Priority: 35, Modal: Yes)

**Condition Logic:**
```javascript
// Must be hand card dropped on loose table card
draggedItem.source === 'hand' &&
targetInfo.type === 'loose' &&
!isBuild(targetInfo.card) &&

// Round restrictions: Round 1 OR player has existing build
(round === 1 || hasOwnBuild(tableCards, currentPlayer))
```

**Validation Logic:**
```javascript
function hasOwnBuild(tableCards, playerIndex) {
  return tableCards.some(card =>
    isBuild(card) && card.owner === playerIndex
  );
}
```

**Action Generated:**
```javascript
{
  type: 'build',
  operation: 'create',
  owner: context.currentPlayer,
  cards: [targetCard, draggedCard],
  value: rankValue(targetCard.rank) + rankValue(draggedCard.rank)
}
```

### Extend Own Build

**Rule:** `extend-own-build` (Priority: 30, Modal: No)

**Condition Logic:**
```javascript
// Must be hand card dropped on own build
draggedItem.source === 'hand' &&
isBuild(targetInfo.card) &&
targetInfo.card.owner === currentPlayer &&

// Extension must keep total ≤ 10
targetInfo.card.value + rankValue(draggedItem.card.rank) <= 10
```

**Action Generated:**
```javascript
{
  type: 'build',
  operation: 'extend',
  targetBuild: targetBuild,
  addedCard: draggedCard,
  newValue: targetBuild.value + rankValue(draggedCard.rank)
}
```

### Extend Opponent Build

**Rule:** `extend-opponent-build` (Priority: 25, Modal: Yes)

**Condition Logic:**
```javascript
// Must be hand card dropped on opponent build
draggedItem.source === 'hand' &&
isBuild(targetInfo.card) &&
targetInfo.card.owner !== currentPlayer &&
targetInfo.card.isExtendable && // Opponent allows extension

// Extension must keep total ≤ 10
targetInfo.card.value + rankValue(draggedItem.card.rank) <= 10
```

## Staging & Temp Stack Validation

### Create Staging Stack

**Rule:** `universal-staging` (Priority: 95, Modal: No)

**Condition Logic:**
```javascript
// Any card to loose table card
(draggedItem.source === 'hand' || draggedItem.source === 'table') &&
targetInfo.type === 'loose'
```

**Action Generated:**
```javascript
{
  type: 'createStagingStack',
  payload: {
    source: draggedItem.source,
    card: draggedItem.card,
    targetIndex: targetInfo.index,
    isTableToTable: draggedItem.source === 'table'
  }
}
```

### Add to Temp Stack

**Rule:** `temp-stack-addition` (Priority: 80, Modal: No, Exclusive: Yes)

**Condition Logic:**
```javascript
// Any card dropped on existing temp stack
targetInfo.type === 'temporary_stack' &&
draggedItem.card
```

**Action Generated:**
```javascript
{
  type: 'addToStagingStack',
  payload: {
    stackId: targetInfo.stackId,
    card: draggedItem.card,
    source: draggedItem.source
  }
}
```

## Trail Validation Logic

### Trail Card

**Rule:** `trail-card` (Priority: 10, Modal: Yes)

**Condition Logic:**
```javascript
// Hand card dropped on empty table area
draggedItem.source === 'hand' &&
targetInfo.type === 'table' &&
targetInfo.area === 'empty' &&

// Round 1 restrictions
!(round === 1 && hasOwnBuild(tableCards, currentPlayer)) &&

// No duplicate values on table
!tableCards.some(card =>
  isCard(card) && rankValue(card.rank) === rankValue(draggedItem.card.rank)
)
```

**Action Generated:**
```javascript
{
  type: 'trail',
  payload: { card: draggedItem.card }
}
```

## Priority Resolution System

### Rule Evaluation Order

```javascript
// Rules sorted by priority (highest first)
this.rules = [
  ...stagingRules,    // 95-80 (highest priority)
  ...captureRules,    // 50-40
  ...buildRules,      // 35-25
  ...trailRules       // 10 (lowest)
].sort((a, b) => b.priority - a.priority);
```

### Multi-Rule Resolution

```javascript
function evaluateRules(context) {
  const matchingRules = [];

  for (const rule of this.rules) {
    if (rule.condition(context)) {
      matchingRules.push(rule);

      // Exclusive rules stop evaluation
      if (rule.exclusive) break;
    }
  }

  return matchingRules;
}
```

### Modal vs Direct Execution

```javascript
function formatResult(matchingRules, context) {
  const actions = matchingRules.map(rule => rule.action(context));

  // Modal required if multiple actions OR trail
  const requiresModal = matchingRules.some(rule =>
    rule.requiresModal ||
    actions.some(action => action.type === 'trail') ||
    actions.length > 1
  );

  return {
    actions,
    requiresModal,
    errorMessage: actions.length === 0 ? 'No valid actions available' : null
  };
}
```

## Sequence Detection Algorithms

### Card Value System

**Casino Game Card Values:**
- **A (Ace)** = 1 point
- **2-10** = Face value (2, 3, 4, 5, 6, 7, 8, 9, 10)
- **No face cards** (J, Q, K are not used in casino)

```javascript
function rankValue(rank) {
  if (rank === 'A') return 1;        // Ace = 1
  if (typeof rank === 'number') return rank;
  if (typeof rank === 'string') {
    const parsed = parseInt(rank, 10);
    return isNaN(parsed) ? 0 : parsed; // 2-10 = face value
  }
  return 0;
}
```

**Deck Composition:**
- **4 suits:** ♠ ♥ ♦ ♣
- **Ranks:** A, 2, 3, 4, 5, 6, 7, 8, 9, 10 (40 cards total)
- **No J, Q, K** - casino uses simplified deck

### Build Value Calculation

```javascript
function calculateBuildValue(cards) {
  return cards.reduce((sum, card) => sum + rankValue(card.rank), 0);
}
```

### Temp Stack Value Calculation

```javascript
function calculateCardSum(cards) {
  return cards.reduce((sum, card) => sum + rankValue(card.rank), 0);
}
```

### Sequence Validation (Proposed)

```javascript
function isValidSequence(cards) {
  const sorted = [...cards].sort((a, b) => rankValue(a.rank) - rankValue(b.rank));

  for (let i = 1; i < sorted.length; i++) {
    if (rankValue(sorted[i].rank) !== rankValue(sorted[i-1].rank) + 1) {
      return false;
    }
  }

  return true;
}
```

### Set Validation (Proposed)

```javascript
function isValidSet(cards) {
  const firstValue = rankValue(cards[0].rank);
  return cards.every(card => rankValue(card.rank) === firstValue);
}
```

## Validation Flow Examples

### Example 1: Single Card Capture

**Input:**
- Dragged: Hand 7♠ (value: 7)
- Target: Table 7♦ (loose card, value: 7)
- Game State: Round 1, Player 0's turn

**Rule Evaluation:**
1. `universal-staging` (95): ✅ Match → Create staging stack
2. `single-card-capture` (50): ✅ Match → Capture action
3. **Result:** Multiple actions → Modal required

**Final Action (User Choice):**
```javascript
{
  type: 'capture',
  targetCards: [{rank: '7', suit: '♦'}],
  captureValue: 7,
  captureType: 'single'
}
```

### Example 2: Build Creation

**Input:**
- Dragged: Hand 5♠ (value: 5)
- Target: Table 4♦ (loose card, value: 4)
- Game State: Round 1, Player 0's turn

**Rule Evaluation:**
1. `universal-staging` (95): ✅ Match → Create staging stack
2. `create-own-build` (35): ✅ Match → Build creation action
3. **Result:** Modal required for build creation

**Final Action:**
```javascript
{
  type: 'build',
  operation: 'create',
  owner: 0,
  cards: [
    {rank: '4', suit: '♦', source: 'table'},
    {rank: '5', suit: '♠', source: 'hand'}
  ],
  value: 9
}
```

### Example 3: Trail (No Valid Captures)

**Input:**
- Dragged: Hand 3♣ (value: 3)
- Target: Empty table area
- Game State: Round 1, No 3s on table, Player has no builds

**Rule Evaluation:**
1. `universal-staging` (95): ❌ No target card
2. `single-card-capture` (50): ❌ No matching table card
3. `create-own-build` (35): ❌ No target card
4. `trail-card` (10): ✅ Match → Trail action
5. **Result:** Modal required for trail confirmation

## Implementation Architecture

### File Structure

```
multiplayer/server/game/
├── logic/
│   ├── actionDetermination.js    # Main engine
│   ├── rules/
│   │   ├── captureRules.js       # Capture validation
│   │   ├── buildRules.js         # Build validation
│   │   ├── stagingRules.js       # Staging validation
│   │   └── trailRules.js         # Trail validation
│   └── validation/
│       └── canTrailCard.js       # Trail helper
├── actions/
│   ├── createStagingStack.js     # Staging execution
│   ├── finalizeStagingStack.js   # Finalization
│   └── capture.js               # Capture execution
└── GameState.js                  # State utilities
```

### Client-Side Integration

```typescript
// In drop handlers
const actions = determineActions(draggedItem, targetInfo, gameState);

if (actions.requiresModal) {
  // Show ActionModal with options
  setModalInfo({
    title: 'Choose Action',
    message: 'What would you like to do?',
    actions: actions.actions
  });
} else {
  // Execute directly
  sendAction(actions.actions[0]);
}
```

### Server-Side Processing

```javascript
// ActionRouter.js
const action = await this.actionHandlers[actionType](
  this.gameManager,
  playerIndex,
  action,
  gameId  // Added for validation
);

return this.gameManager.updateGame(gameId, action);
```

## Key Design Principles

### 1. Rule-Based Architecture
- **Separation of Concerns:** Validation logic separate from execution
- **Priority System:** Clear precedence for conflicting actions
- **Modular Rules:** Easy to add/modify game rules

### 2. User Experience Focus
- **Modal for Choices:** Complex decisions presented clearly
- **Direct Execution:** Simple actions happen immediately
- **Validation Feedback:** Clear error messages for invalid moves

### 3. Extensibility
- **New Rule Types:** Easy to add new action categories
- **Custom Validation:** Rules can implement complex logic
- **Action Composition:** Multiple rules can match for choice presentation

### 4. Performance Optimization
- **Early Exit:** Exclusive rules stop unnecessary evaluation
- **Cached Calculations:** Card values computed once
- **Efficient Filtering:** Table card iteration optimized

## Future Enhancements

### Combo Validation During Stacking
```javascript
// Add to staging rules
{
  id: 'combo-validation-staging',
  condition: (context) => {
    // Validate card combinations during stacking
    return validateCardCombination(context.draggedItem.card, context.targetStack);
  }
}
```

### Real-Time Validation Feedback
- Visual indicators for valid/invalid combinations
- Progressive validation as cards are added
- Combo suggestions and hints

### Advanced Sequence Detection
- Pattern recognition for complex combinations
- Machine learning for combo prediction
- Player-specific combo preferences

---

## Summary

The casino game's combo validation system provides a robust, extensible framework for detecting and validating card combinations through:

1. **Rule-Based Engine:** Deterministic evaluation of game actions
2. **Priority System:** Clear resolution of conflicting possibilities
3. **Modal Interface:** User choice for complex decisions
4. **Validation Logic:** Comprehensive checking of game rules
5. **Extensible Architecture:** Easy to add new combo types and rules

This system ensures fair play, clear user experience, and maintainable code structure for the casino card game.
