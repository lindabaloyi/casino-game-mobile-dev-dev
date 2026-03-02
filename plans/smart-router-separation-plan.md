# SmartRouter Separation Plan

## Current State
The current `ActionRouter` does EVERYTHING:
- Validates turn
- Checks game rules (steal vs capture, extend vs accept)
- Executes handlers
- Persists state

## Goal: Separate Concerns

### ActionRouter = Restaurant Manager
- Checks if restaurant is open (turn validation)
- Passes order to kitchen (handler execution)
- Serves food (state persistence)

### SmartRouter = Chef
- Reads recipe (game rules)
- Decides how to cook (routing logic)

## Implementation Plan

### Step 1: Create SmartRouter class

Create `multiplayer/server/game/SmartRouter.js`:

```javascript
class SmartRouter {
  /**
   * Pure function: given action + state, what should happen?
   * Returns { type, payload } for handler
   */
  route(actionType, payload, state, playerIndex) {
    switch (actionType) {
      case 'capture':
        return this.routeCapture(payload, state, playerIndex);
      case 'extendBuild':
        return this.routeExtendBuild(payload, state);
      default:
        return { type: actionType, payload };
    }
  }

  /**
   * Route capture to: capture, addToTemp, or stealBuild
   */
  routeCapture(payload, state, playerIndex) {
    const { targetType, targetStackId, card } = payload;
    
    if (targetType !== 'build' || !targetStackId) {
      return { type: 'capture', payload };
    }
    
    const stack = this.findStack(state, targetStackId);
    if (!stack) {
      return { type: 'capture', payload };
    }
    
    const isOwnBuild = stack.owner === playerIndex;
    
    if (isOwnBuild) {
      return this.routeOwnBuildCapture(payload, stack);
    } else {
      return this.routeOpponentBuildCapture(payload, stack);
    }
  }

  routeOwnBuildCapture(payload, stack) {
    // Own build: can addToTemp if values don't match
    if (payload.card.value !== stack.value) {
      return { 
        type: 'addToTemp', 
        payload: { card: payload.card, stackId: payload.targetStackId } 
      };
    }
    return { type: 'capture', payload };
  }

  routeOpponentBuildCapture(payload, stack) {
    // Card matches build value = capture
    if (payload.card.value === stack.value) {
      return { type: 'capture', payload };
    }
    
    // Validate steal
    if (!this.isValidSteal(stack, payload.card)) {
      throw new Error(this.getStealErrorMessage(stack, payload.card));
    }
    
    return { 
      type: 'stealBuild', 
      payload: { card: payload.card, stackId: payload.targetStackId } 
    };
  }

  isValidSteal(stack, card) {
    // Check 1: Cannot steal base builds
    if (stack.hasBase === true) return false;
    
    // Check 2: Cannot steal value 10
    if (stack.value === 10) return false;
    
    // Check 3: Must create valid build
    const newNeed = this.calculateNewNeed(stack, card);
    return newNeed >= 0;
  }

  calculateNewNeed(stack, card) {
    const cards = [...(stack.cards || []), card];
    const totalSum = cards.reduce((sum, c) => sum + c.value, 0);
    
    if (totalSum <= 10) return 0;
    
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    const base = sorted[0].value;
    const otherSum = sorted.slice(1).reduce((sum, c) => sum + c.value, 0);
    return base - otherSum;
  }

  getStealErrorMessage(stack, card) {
    if (stack.hasBase === true) {
      return 'Cannot steal: base builds cannot be stolen';
    }
    if (stack.value === 10) {
      return 'Cannot steal: builds with value 10 cannot be stolen';
    }
    const newNeed = this.calculateNewNeed(stack, card);
    if (newNeed < 0) {
      return `Cannot steal: adding ${card.rank} would make the build invalid (cards exceed base)`;
    }
  }

  /**
   * Route extendBuild to: startBuildExtension or acceptBuildExtension
   */
  routeExtendBuild(payload, state) {
    const { stackId, card, cardSource } = payload;
    const stack = this.findStack(state, stackId);
    
    if (!stack) {
      throw new Error(`Build "${stackId}" not found`);
    }
    
    if (stack.pendingExtension?.looseCard) {
      // Has pending = accept
      return { 
        type: 'acceptBuildExtension', 
        payload: { stackId, card, cardSource: cardSource || 'hand' } 
      };
    }
    
    // No pending = start
    return { 
      type: 'startBuildExtension', 
      payload: { stackId, card, cardSource: cardSource || 'hand' } 
    };
  }

  findStack(state, stackId) {
    return state.tableCards.find(
      tc => (tc.type === 'build_stack' || tc.type === 'temp_stack') && tc.stackId === stackId
    );
  }
}

module.exports = SmartRouter;
```

### Step 2: Refactor ActionRouter

Update `ActionRouter.js`:

```javascript
const SmartRouter = require('../SmartRouter');

class ActionRouter {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.handlers = require('./actions/index.js');
    this.smartRouter = new SmartRouter(); // NEW!
  }

  executeAction(gameId, playerIndex, action) {
    const { type, payload } = action;

    // 1. Guard: unknown action
    if (!this.handlers[type]) {
      throw new Error(`Unknown action "${type}"`);
    }

    // 2. Get current state
    const state = this.gameManager.getGameState(gameId);
    if (!state) throw new Error(`Game "${gameId}" not found`);

    // 3. Guard: wrong player's turn
    if (state.currentPlayer !== playerIndex) {
      throw new Error(`Not your turn (current player: ${state.currentPlayer})`);
    }

    // 4. Smart routing: let SmartRouter decide
    const { type: finalType, payload: finalPayload } = this.smartRouter.route(
      type, 
      payload, 
      state, 
      playerIndex
    );

    // 5. Execute handler
    const handler = this.handlers[finalType];
    const newState = handler(state, finalPayload || {}, playerIndex);

    // 6. Persist updated state
    this.gameManager.saveGameState(gameId, newState);

    return newState;
  }
}
```

### Step 3: Add Tests

Create `test/SmartRouter.test.js`:

```javascript
const SmartRouter = require('../../multiplayer/server/game/SmartRouter');

describe('SmartRouter', () => {
  let router;
  
  beforeEach(() => {
    router = new SmartRouter();
  });

  describe('routeCapture - opponent build', () => {
    test('card value matches build = capture', () => {
      const state = {
        tableCards: [{
          type: 'build_stack',
          stackId: 'build1',
          owner: 1,
          value: 9,
          cards: [{ rank: '9', suit: 'hearts', value: 9 }]
        }]
      };
      
      const result = router.routeCapture(
        { targetType: 'build', targetStackId: 'build1', card: { rank: '9', suit: 'spades', value: 9 } },
        state,
        0
      );
      
      expect(result.type).toBe('capture');
    });

    test('base build = reject', () => {
      const state = {
        tableCards: [{
          type: 'build_stack',
          stackId: 'build1',
          owner: 1,
          value: 7,
          hasBase: true,
          cards: [{ rank: '7', suit: 'hearts', value: 7 }]
        }]
      };
      
      expect(() => 
        router.routeCapture(
          { targetType: 'build', targetStackId: 'build1', card: { rank: '3', suit: 'spades', value: 3 } },
          state,
          0
        )
      ).toThrow('Cannot steal: base builds cannot be stolen');
    });

    test('build value 10 = reject', () => {
      const state = {
        tableCards: [{
          type: 'build_stack',
          stackId: 'build1',
          owner: 1,
          value: 10,
          cards: [{ rank: '10', suit: 'hearts', value: 10 }]
        }]
      };
      
      expect(() => 
        router.routeCapture(
          { targetType: 'build', targetStackId: 'build1', card: { rank: '5', suit: 'spades', value: 5 } },
          state,
          0
        )
      ).toThrow('Cannot steal: builds with value 10 cannot be stolen');
    });
  });

  describe('routeExtendBuild', () => {
    test('no pending = startBuildExtension', () => {
      const state = {
        tableCards: [{
          type: 'build_stack',
          stackId: 'build1',
          owner: 0,
          value: 9,
          cards: [{ rank: '9', suit: 'hearts', value: 9 }]
        }]
      };
      
      const result = router.routeExtendBuild(
        { stackId: 'build1', card: { rank: '5', suit: 'spades', value: 5 }, cardSource: 'hand' },
        state
      );
      
      expect(result.type).toBe('startBuildExtension');
    });

    test('has pending = acceptBuildExtension', () => {
      const state = {
        tableCards: [{
          type: 'build_stack',
          stackId: 'build1',
          owner: 0,
          value: 9,
          pendingExtension: { looseCard: { rank: '2', suit: 'clubs', value: 2 } },
          cards: [{ rank: '9', suit: 'hearts', value: 9 }]
        }]
      };
      
      const result = router.routeExtendBuild(
        { stackId: 'build1', card: { rank: '5', suit: 'spades', value: 5 }, cardSource: 'hand' },
        state
      );
      
      expect(result.type).toBe('acceptBuildExtension');
    });
  });
});
```

## Benefits

### Testing
- Pure functions = easy to test
- No mocks needed for state
- Test game rules in isolation

### Maintainability
- Game rules in ONE place
- New rule? Update SmartRouter only
- Clear separation of concerns

### Debugging
- "Error in SmartRouter" → game rules issue
- "Error in ActionRouter" → infrastructure issue
