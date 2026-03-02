/**
 * SmartRouter
 * Pure routing logic for game actions.
 * 
 * Separated from ActionRouter for:
 * - Testability: Pure functions = easy to unit test
 * - Maintainability: Game rules in one place
 * - Clarity: Clear separation of concerns
 * 
 * SmartRouter ONLY decides: "Given this action + state, what should happen?"
 * It does NOT: validate turn, execute handlers, or persist state
 */

class SmartRouter {
  /**
   * Main route function - decides what handler to call
   * @param {string} actionType - The incoming action type
   * @param {object} payload - The action payload
   * @param {object} state - Current game state
   * @param {number} playerIndex - The player making the action
   * @returns {{ type: string, payload: object }} - The routed action
   */
  route(actionType, payload, state, playerIndex) {
    switch (actionType) {
      case 'capture':
        return this.routeCapture(payload, state, playerIndex);
      case 'extendBuild':
        return this.routeExtendBuild(payload, state);
      case 'createTemp':
        // Allow temp stack creation - no validation needed
        return { type: actionType, payload };
      case 'acceptTemp':
        return this.routeAcceptTemp(payload, state, playerIndex);
      default:
        // No routing needed for other actions
        return { type: actionType, payload };
    }
  }

  /**
   * Route capture action
   * - Own build + value mismatch → addToTemp
   * - Own build + value match → capture
   * - Opponent build + value match → capture
   * - Opponent build + value mismatch → stealBuild (if valid)
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
    // Own build: can addToTemp if card value doesn't match build value
    if (payload.card.value !== stack.value) {
      return { 
        type: 'addToTemp', 
        payload: { card: payload.card, stackId: payload.targetStackId } 
      };
    }
    // Value matches = capture
    return { type: 'capture', payload };
  }

  routeOpponentBuildCapture(payload, stack) {
    // Card value matches build value = capture (not steal)
    if (payload.card.value === stack.value) {
      return { type: 'capture', payload };
    }
    
    // Validate steal attempt
    if (!this.isValidSteal(stack, payload.card)) {
      throw new Error(this.getStealErrorMessage(stack, payload.card));
    }
    
    return { 
      type: 'stealBuild', 
      payload: { card: payload.card, stackId: payload.targetStackId } 
    };
  }

  /**
   * Check if a steal would be valid
   */
  isValidSteal(stack, card) {
    // Check 1: Cannot steal base builds
    if (stack.hasBase === true) {
      return false;
    }
    
    // Check 2: Cannot steal build value 10
    if (stack.value === 10) {
      return false;
    }
    
    // Check 3: Must create valid build (need >= 0)
    const newNeed = this.calculateNewNeed(stack, card);
    return newNeed >= 0;
  }

  /**
   * Calculate what the new need would be if card is added
   */
  calculateNewNeed(stack, card) {
    const cards = [...(stack.cards || []), card];
    const totalSum = cards.reduce((sum, c) => sum + c.value, 0);
    
    // Sum builds are always valid
    if (totalSum <= 10) {
      return 0;
    }
    
    // Diff build: need = base - otherSum
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    const base = sorted[0].value;
    const otherSum = sorted.slice(1).reduce((sum, c) => sum + c.value, 0);
    return base - otherSum;
  }

  /**
   * Get error message for invalid steal attempt
   */
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
    return 'Cannot steal this build';
  }

  /**
   * Route extendBuild action
   * - Has pending extension → acceptBuildExtension
   * - No pending extension → startBuildExtension
   */
  routeExtendBuild(payload, state) {
    const { stackId, card, cardSource } = payload;
    const stack = this.findStack(state, stackId);
    
    if (!stack) {
      throw new Error(`Build "${stackId}" not found`);
    }
    
    if (stack.pendingExtension?.looseCard) {
      // Has pending = accept the extension
      return { 
        type: 'acceptBuildExtension', 
        payload: { 
          stackId, 
          card, 
          cardSource: cardSource || 'hand' 
        } 
      };
    }
    
    // No pending = start new extension
    return { 
      type: 'startBuildExtension', 
      payload: { 
        stackId, 
        card, 
        cardSource: cardSource || 'hand' 
      } 
    };
  }

  /**
   * Find a stack in the game state
   */
  findStack(state, stackId) {
    return state.tableCards.find(
      tc => (tc.type === 'build_stack' || tc.type === 'temp_stack') && tc.stackId === stackId
    );
  }

  /**
   * Check if player already has an active build
   * Each player can only have one build at a time
   * @param {object} state - Game state
   * @param {number} playerIndex - Player to check
   * @returns {boolean} True if player owns any build_stack
   */
  playerHasActiveBuild(state, playerIndex) {
    return state.tableCards.some(
      tc => tc.type === 'build_stack' && tc.owner === playerIndex
    );
  }

  /**
   * Route acceptTemp action
   * Validates that player doesn't already have ANOTHER active build
   * (The temp being accepted will become a build, so we check if they already have one)
   * @param {object} payload - Action payload
   * @param {object} state - Game state
   * @param {number} playerIndex - Player making the action
   * @returns {{ type: string, payload: object }} - Routed action
   */
  routeAcceptTemp(payload, state, playerIndex) {
    const { stackId } = payload;
    
    // Find the temp stack being accepted
    const tempStack = state.tableCards.find(
      tc => tc.type === 'temp_stack' && tc.stackId === stackId
    );
    
    // If temp stack not found, let the handler deal with it
    if (!tempStack) {
      return { type: 'acceptTemp', payload };
    }
    
    // Check if this temp stack is already owned by this player
    const isOwnTemp = tempStack.owner === playerIndex;
    
    // If player doesn't own this temp, they can't accept it
    // (Let the handler deal with ownership validation)
    if (!isOwnTemp) {
      return { type: 'acceptTemp', payload };
    }
    
    // Player is accepting their own temp - check if they already have ANOTHER build
    // Count builds owned by this player (excluding the temp being converted)
    const existingBuilds = state.tableCards.filter(
      tc => tc.type === 'build_stack' && tc.owner === playerIndex
    );
    
    if (existingBuilds.length > 0) {
      throw new Error(
        'You already have an active build. Complete or capture it before converting this temporary stack to a build.'
      );
    }
    
    // Allow acceptTemp
    return { type: 'acceptTemp', payload };
  }
}

module.exports = SmartRouter;
