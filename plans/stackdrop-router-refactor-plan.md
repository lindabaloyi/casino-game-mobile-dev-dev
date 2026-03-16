# StackDropRouter Refactoring Plan

## Overview

Refactor the monolithic `StackDropRouter` into a clean dispatcher with focused handlers for each drop type. This improves separation of concerns, testability, and maintainability.

## Current Architecture Issues

- `StackDropRouter` handles temp stacks, friendly builds, and opponent builds in one file
- Logic duplication with `CaptureRouter` and `ExtendRouter`
- Multi-card capture flow embedded in `routeOpponentBuildDrop`
- No centralized card source validation

## Target Architecture

```
StackDropDispatcher (NEW)
├── TempStackDropHandler (NEW) - temp stack drops
├── FriendlyBuildHandler (NEW) - friendly build drops
│   ├── ExtendRouter (existing)
│   └── CaptureRouter (existing)
├── OpponentBuildHandler (NEW) - opponent build drops
│   └── CaptureRouter (existing)
└── CardSourceValidator (NEW) - validates card source
```

## Step-by-Step Implementation

### Step 1: Create CardSourceValidator

**File:** `shared/game/smart-router/validators/CardSourceValidator.js`

Validates that a card actually exists at the claimed source (hand, table, captures).

```javascript
class CardSourceValidator {
  validate(card, source, playerIndex, state) {
    // Check hand
    if (source === 'hand') {
      const inHand = state.players[playerIndex].hand.some(
        c => c.rank === card.rank && c.suit === card.suit
      );
      if (!inHand) throw new Error(`Card ${card.rank}${card.suit} not in hand`);
      return 'hand';
    }
    
    // Check table
    if (source === 'table') {
      const onTable = state.tableCards.some(
        tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit
      );
      if (!onTable) throw new Error(`Card ${card.rank}${card.suit} not on table`);
      return 'table';
    }
    
    // Check captures
    if (source.startsWith('captured')) {
      const captures = state.players[playerIndex].captures || [];
      const inCaptures = captures.some(
        c => c.rank === card.rank && c.suit === card.suit
      );
      if (!inCaptures) throw new Error(`Card ${card.rank}${card.suit} not in captures`);
      return 'captured';
    }
    
    throw new Error(`Unknown source: ${source}`);
  }
}
```

### Step 2: Create TempStackDropHandler

**File:** `shared/game/smart-router/handlers/TempStackDropHandler.js`

Handles drops on temp stacks. Uses BuildCalculator to determine capture vs add.

```javascript
const { calculateBuildValue } = require('../../buildCalculator');

class TempStackDropHandler {
  handle(payload, state, playerIndex) {
    const { stackId, card, cardSource } = payload;
    
    // Find temp stack
    const stack = state.tableCards.find(
      tc => tc.type === 'temp_stack' && tc.stackId === stackId
    );
    
    if (!stack) {
      throw new Error(`Temp stack "${stackId}" not found`);
    }
    
    // Only owner's stack can capture
    if (stack.owner !== playerIndex) {
      return { type: 'addToTemp', payload: { card, stackId, source: cardSource } };
    }
    
    // Use build calculator to check capture
    const stackValues = stack.cards.map(c => c.value);
    const buildInfo = calculateBuildValue(stackValues);
    
    const playerHand = state.players[playerIndex].hand || [];
    
    // Check if card completes build
    if (buildInfo && buildInfo.need === 0 && card.value === buildInfo.value) {
      const matchingCards = playerHand.filter(c => c.value === buildInfo.value);
      if (matchingCards.length === 1) {
        return { type: 'captureTemp', payload: { card, stackId, source: cardSource } };
      }
    }
    
    // Check need value
    if (buildInfo && buildInfo.need > 0 && card.value === buildInfo.need) {
      const matchingCards = playerHand.filter(c => c.value === buildInfo.need);
      if (matchingCards.length === 1) {
        return { type: 'captureTemp', payload: { card, stackId, source: cardSource } };
      }
    }
    
    // Check same-rank capture
    const allSameRank = stack.cards.length > 0 && 
      stack.cards.every(c => c.rank === stack.cards[0].rank);
    if (allSameRank && card.rank === stack.cards[0].rank) {
      const matchingCards = playerHand.filter(c => c.rank === stack.cards[0].rank);
      if (matchingCards.length === 1) {
        return { type: 'captureTemp', payload: { card, stackId, source: cardSource } };
      }
    }
    
    // Default: add to temp
    return { type: 'addToTemp', payload: { card, stackId, source: cardSource } };
  }
}
```

### Step 3: Create FriendlyBuildHandler

**File:** `shared/game/smart-router/handlers/FriendlyBuildHandler.js`

Handles drops on builds owned by player or teammate. Delegates to ExtendRouter and CaptureRouter.

```javascript
const ExtendRouter = require('../routers/ExtendRouter');
const CaptureRouter = require('../routers/CaptureRouter');

class FriendlyBuildHandler {
  constructor() {
    this.extendRouter = new ExtendRouter();
    this.captureRouter = new CaptureRouter();
  }
  
  handle(payload, stack, state, playerIndex) {
    const { stackId, card } = payload;
    
    // Check pending extension first
    if (stack.pendingExtension?.looseCard || stack.pendingExtension?.cards) {
      const source = this.getCardSource(state, playerIndex, card);
      return this.extendRouter.route({ stackId, card, cardSource: source }, state, playerIndex);
    }
    
    // Determine source
    const source = this.getCardSource(state, playerIndex, card);
    
    // Delegate entirely to CaptureRouter
    // It handles: captureOwn, startBuildExtension, addToTemp
    return this.captureRouter.route(
      { card, targetType: 'build', targetStackId: stackId },
      state,
      playerIndex
    );
  }
  
  getCardSource(state, playerIndex, card) {
    const playerHand = state.players?.[playerIndex]?.hand || [];
    if (playerHand.some(c => c.rank === card.rank && c.suit === card.suit)) {
      return 'hand';
    }
    return 'table'; // fallback
  }
}
```

### Step 4: Create OpponentBuildHandler

**File:** `shared/game/smart-router/handlers/OpponentBuildHandler.js`

Handles drops on opponent builds, including multi-card capture flow.

```javascript
const CaptureRouter = require('../routers/CaptureRouter');

class OpponentBuildHandler {
  constructor() {
    this.captureRouter = new CaptureRouter();
  }
  
  handle(payload, stack, state, playerIndex) {
    const { stackId, card, cardSource } = payload;
    const source = cardSource || this.getCardSource(state, playerIndex, card);
    
    // Check for pending multi-card capture
    if (stack.pendingCapture) {
      const currentSum = stack.pendingCapture.cards.reduce(
        (sum, item) => sum + item.card.value, 0
      );
      
      if (source === 'hand') {
        // Hand card trying to complete capture
        if (currentSum + card.value === stack.value) {
          return { type: 'completeCapture', payload: { stackId } };
        } else {
          throw new Error(`Cannot complete - pending ${currentSum} + ${card.value} ≠ ${stack.value}`);
        }
      } else {
        // Adding table/captured card
        if (currentSum + card.value < stack.value) {
          return { type: 'addToCapture', payload: { stackId, card, cardSource: source } };
        } else if (currentSum + card.value === stack.value) {
          return { type: 'addToCapture', payload: { stackId, card, cardSource: source } };
        } else {
          throw new Error(`Would exceed build value`);
        }
      }
    }
    
    // No pending capture - handle based on source
    
    if (source === 'table' || source.startsWith('captured')) {
      if (card.value < stack.value) {
        // Start multi-card capture
        return { type: 'startBuildCapture', payload: { stackId, card, cardSource: source } };
      } else {
        // Single card - delegate to CaptureRouter
        return this.captureRouter.route(
          { card, targetType: 'build', targetStackId: stackId },
          state,
          playerIndex
        );
      }
    }
    
    // Hand card - delegate to CaptureRouter (capture or steal)
    return this.captureRouter.route(
      { card, targetType: 'build', targetStackId: stackId },
      state,
      playerIndex
    );
  }
  
  getCardSource(state, playerIndex, card) {
    const playerHand = state.players?.[playerIndex]?.hand || [];
    if (playerHand.some(c => c.rank === card.rank && c.suit === card.suit)) {
      return 'hand';
    }
    return 'table'; // fallback
  }
}
```

### Step 5: Create StackDropDispatcher

**File:** `shared/game/smart-router/dispatchers/StackDropDispatcher.js`

Main entry point that dispatches to the appropriate handler.

```javascript
const StackHelper = require('../helpers/StackHelper');
const TempStackDropHandler = require('../handlers/TempStackDropHandler');
const FriendlyBuildHandler = require('../handlers/FriendlyBuildHandler');
const OpponentBuildHandler = require('../handlers/OpponentBuildHandler');
const LooseCardRouter = require('../routers/LooseCardRouter');
const { areTeammates } = require('../../team');

class StackDropDispatcher {
  constructor() {
    this.tempHandler = new TempStackDropHandler();
    this.friendlyHandler = new FriendlyBuildHandler();
    this.opponentHandler = new OpponentBuildHandler();
    this.looseCardRouter = new LooseCardRouter();
  }
  
  route(payload, state, playerIndex) {
    const { stackType, stackId, card } = payload;
    
    // Temp stack
    if (stackType === 'temp_stack') {
      return this.tempHandler.handle(payload, state, playerIndex);
    }
    
    // Build stack
    if (stackType === 'build_stack') {
      const stack = StackHelper.findStack(state, stackId);
      if (!stack) {
        throw new Error(`Build stack "${stackId}" not found`);
      }
      
      const isFriendly = this.isFriendlyBuild(stack, playerIndex, state);
      
      if (isFriendly) {
        return this.friendlyHandler.handle(payload, stack, state, playerIndex);
      } else {
        return this.opponentHandler.handle(payload, stack, state, playerIndex);
      }
    }
    
    // Unknown stack type - delegate to LooseCardRouter
    return this.looseCardRouter.routeCreateTemp(payload, state, playerIndex);
  }
  
  isFriendlyBuild(stack, playerIndex, state) {
    // Same owner
    if (stack.owner === playerIndex) return true;
    
    // Party mode - check teammates
    if (state.playerCount === 4) {
      return areTeammates(playerIndex, stack.owner);
    }
    
    return false;
  }
}
```

### Step 6: Update SmartRouter

**File:** `shared/game/smart-router/index.js`

Replace StackDropRouter with StackDropDispatcher.

```javascript
const StackDropDispatcher = require('./dispatchers/StackDropDispatcher');

// In constructor:
this.stackDropDispatcher = new StackDropDispatcher();

// In route():
case 'stackDrop':
  return this.stackDropDispatcher.route(payload, state, playerIndex);
```

### Step 7: Remove StackDropRouter

After testing, delete `shared/game/smart-router/routers/StackDropRouter.js`.

## File Structure After Refactoring

```
shared/game/smart-router/
├── index.js                    # Updated to use dispatcher
├── dispatchers/
│   └── StackDropDispatcher.js  # NEW - main entry point
├── handlers/
│   ├── TempStackDropHandler.js     # NEW
│   ├── FriendlyBuildHandler.js     # NEW
│   └── OpponentBuildHandler.js     # NEW
├── validators/
│   └── CardSourceValidator.js      # NEW (optional)
└── routers/
    ├── CaptureRouter.js       # EXISTING
    ├── ExtendRouter.js        # EXISTING
    ├── LooseCardRouter.js     # EXISTING
    ├── StackDropRouter.js     # TO BE DELETED
    ├── TempRouter.js          # EXISTING
    └── TrailRouter.js         # EXISTING
```

## Testing Strategy

1. **Unit tests** for each handler in isolation
2. **Integration tests** for dispatcher with mock handlers
3. **E2E tests** verify complete flows

## Benefits

- **Separation of concerns**: Each handler focuses on one drop type
- **Reuse**: Delegates to existing routers where appropriate
- **Testability**: Each component can be tested independently
- **Maintainability**: Adding new rules only requires modifying one handler
- **Clear multi-card capture**: Isolated in OpponentBuildHandler
