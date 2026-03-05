/**
 * StackDropRouter
 * Handles all stack drop decisions.
 * - temp_stack → addToTemp
 * - build_stack → check ownership + hand for smart routing
 * - loose card (via createTemp pathway) → check hand for capture vs temp
 */

const StackHelper = require('../helpers/StackHelper');
const CaptureRouter = require('./CaptureRouter');
const ExtendRouter = require('./ExtendRouter');
const LooseCardRouter = require('./LooseCardRouter');

class StackDropRouter {
  constructor() {
    this.captureRouter = new CaptureRouter();
    this.extendRouter = new ExtendRouter();
    this.looseCardRouter = new LooseCardRouter();
  }

  /**
   * Main entry point for stack drop routing
   */
  route(payload, state, playerIndex) {
    const { stackType, stackId, card, targetCard } = payload;
    
    // Temp stack drops
    if (stackType === 'temp_stack') {
      return { 
        type: 'addToTemp', 
        payload: { card, stackId } 
      };
    }
    
    // Build stack drops
    if (stackType === 'build_stack') {
      return this.routeBuildStackDrop(payload, state, playerIndex);
    }
    
    // Loose card drops (no stack) - delegate to LooseCardRouter
    const source = this.getCardSource(state, playerIndex, card);
    return this.looseCardRouter.routeCreateTemp({ ...payload, source }, state, playerIndex);
  }

  /**
   * Route drop on a build stack
   */
  routeBuildStackDrop(payload, state, playerIndex) {
    const { stackId, card } = payload;
    
    const stack = StackHelper.findStack(state, stackId);
    if (!stack) {
      throw new Error(`Build stack "${stackId}" not found`);
    }
    
    const isOwnBuild = stack.owner === playerIndex;
    
    if (isOwnBuild) {
      return this.routeOwnBuildDrop(payload, stack, state, playerIndex);
    } else {
      return this.routeOpponentBuildDrop(payload, stack, state, playerIndex);
    }
  }

  /**
   * Determine the source of a card (hand or table)
   * @param {object} state - Game state
   * @param {number} playerIndex - Player index
   * @param {object} card - Card to check
   * @returns {string} 'hand' or 'table'
   */
  getCardSource(state, playerIndex, card) {
    // Check if card is in player's hand
    const playerHand = state.playerHands?.[playerIndex] || [];
    const inHand = playerHand.some(
      c => c.rank === card.rank && c.suit === card.suit
    );
    if (inHand) {
      return 'hand';
    }

    // Check if card is on table (loose card)
    const onTable = state.tableCards.find(
      tc => !tc.type && 
            tc.rank === card.rank && tc.suit === card.suit
    );
    if (onTable) {
      return 'table';
    }

    // Default to 'hand' if not found (fallback to avoid breaking)
    return 'hand';
  }

  /**
   * Calculate possible capture values for a set of cards (same rank)
   * Used for determining if a hand card can capture a build
   * @param {Array} cards - Array of cards (all same rank)
   * @returns {Array} Array of possible sum values
   */
  getPossibleCaptureValues(cards) {
    if (!cards || cards.length === 0) return [];
    
    const cardValue = cards[0].value;
    const count = cards.length;
    const possibleValues = [];
    
    for (let i = 1; i <= count; i++) {
      const sum = cardValue * i;
      possibleValues.push(sum);
      
      // Handle Ace (A=1 or 14) edge case
      if (cards[0].rank === 'A') {
        const altSum = 14 + (cardValue - 1) * (i - 1);
        if (!possibleValues.includes(altSum) && altSum <= 14) {
          possibleValues.push(altSum);
        }
      }
    }
    
    return [...new Set(possibleValues)].sort((a, b) => a - b);
  }

  /**
   * Route drop on own build
   */
  routeOwnBuildDrop(payload, stack, state, playerIndex) {
    const { stackId, card } = payload;
    
    // 1. Pending extension? Delegate to ExtendRouter
    if (stack.pendingExtension?.looseCard || stack.pendingExtension?.cards) {
      const cardSource = this.getCardSource(state, playerIndex, card);
      return this.extendRouter.route({ stackId, card, cardSource }, state);
    }

    // 2. Determine where the dropped card is coming from.
    const source = this.getCardSource(state, playerIndex, card);

    // 3. If card is from hand, check if it can capture this build.
    if (source === 'hand') {
      let canCapture = false;
      const buildCards = stack.cards || [];

      if (buildCards.length > 0) {
        const allSameRank = buildCards.every(c => c.rank === buildCards[0].rank);
        
        if (allSameRank) {
          // Identical cards: possible capture values = subset sums.
          const possibleValues = this.getPossibleCaptureValues(buildCards);
          if (possibleValues.includes(card.value)) canCapture = true;
        } else {
          // Mixed cards: must match build.value.
          if (card.value === stack.value) canCapture = true;
        }
      } else {
        // Empty build (shouldn't happen), fallback to value match.
        if (card.value === stack.value) canCapture = true;
      }

      if (canCapture) {
        return {
          type: 'captureOwn',
          payload: { card, targetType: 'build', targetStackId: stackId }
        };
      }
    }

    // 4. Otherwise, it's an extension
    return this.extendRouter.route({ stackId, card, cardSource: source }, state);
  }

  /**
   * Route drop on opponent's build
   */
  routeOpponentBuildDrop(payload, stack, state, playerIndex) {
    // Delegate to CaptureRouter for opponent build logic
    return this.captureRouter.route(
      { card: payload.card, targetType: 'build', targetStackId: payload.stackId },
      state,
      playerIndex
    );
  }
}

module.exports = StackDropRouter;
