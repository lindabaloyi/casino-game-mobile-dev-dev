/**
 * FriendlyBuildHandler
 * Handles card drops on builds owned by the player or a teammate.
 * Delegates to ExtendRouter for extensions and CaptureRouter for captures.
 */

const ExtendRouter = require('../routers/ExtendRouter');
const CaptureRouter = require('../routers/CaptureRouter');

class FriendlyBuildHandler {
  constructor() {
    this.extendRouter = new ExtendRouter();
    this.captureRouter = new CaptureRouter();
  }

  /**
   * Handle a card drop on a friendly build.
   * @param {object} payload - { stackId, card, cardSource }
   * @param {object} stack - The build stack
   * @param {object} state - Game state
   * @param {number} playerIndex - Player making the drop
   * @returns {object} - { type: string, payload: object }
   */
  handle(payload, stack, state, playerIndex) {
    const { stackId, card, cardSource } = payload;

    console.log('[FriendlyBuildHandler] Handling drop on friendly build:', stackId);
    console.log('[FriendlyBuildHandler] Card:', card?.rank, card?.value);
    console.log('[FriendlyBuildHandler] Stack owner:', stack.owner);
    console.log('[FriendlyBuildHandler] Has pendingExtension:', !!(stack.pendingExtension?.looseCard || stack.pendingExtension?.cards));

    // Step 1: Check for pending extension - delegate to ExtendRouter
    if (stack.pendingExtension?.looseCard || stack.pendingExtension?.cards) {
      console.log('[FriendlyBuildHandler] Has pending extension - delegating to ExtendRouter');
      const source = this.getCardSource(state, playerIndex, card);
      return this.extendRouter.route(
        { stackId, card, cardSource: source },
        state,
        playerIndex
      );
    }

    // Step 2: Determine card source
    const source = cardSource || this.getCardSource(state, playerIndex, card);
    console.log('[FriendlyBuildHandler] Card source:', source);

    // Step 3: Check if player can extend this build (has spare cards of same rank)
    // Both own builds AND teammate's builds can be extended
    const hand = state.players?.[playerIndex]?.hand || [];
    const sameRankCount = hand.filter(c => c.rank === card.rank).length;
    
    if (sameRankCount > 1) {
      // Player has spare cards of same rank - can extend this build
      console.log('[FriendlyBuildHandler] Has spare cards of same rank - starting extension');
      return {
        type: 'startBuildExtension',
        payload: { card, stackId, cardSource: source }
      };
    }

    // Step 4: For OWN builds only - check if card from hand can capture
    // (Cannot capture teammate's build - it's friendly)
    if (stack.owner === playerIndex && source === 'hand') {
      // Check if card value matches build value (can capture own build)
      const canCapture = this.checkCanCaptureOwn(card.value, stack);
      
      if (canCapture) {
        console.log('[FriendlyBuildHandler] Hand card can capture own build - delegating to CaptureRouter');
        return this.captureRouter.route(
          { card, targetType: 'build', targetStackId: stackId },
          state,
          playerIndex
        );
      }
    }

    // Step 5: Default - delegate to ExtendRouter (stack the card)
    console.log('[FriendlyBuildHandler] Default - delegating to ExtendRouter (stack card)');
    return this.extendRouter.route(
      { stackId, card, cardSource: source },
      state,
      playerIndex
    );
  }

  /**
   * Check if a card can capture the player's own build.
   */
  checkCanCaptureOwn(cardValue, stack) {
    if (!stack.cards || stack.cards.length === 0) {
      return false;
    }

    // Use the build calculator for proper multi-card build validation
    const buildValues = stack.cards.map(c => c.value);
    
    // Check if card value can capture this build
    // For sum builds: card value equals build value
    // For diff builds: card value equals build value
    return buildValues.includes(cardValue);
  }

  /**
   * Determine the source of a card.
   */
  getCardSource(state, playerIndex, card) {
    // Check player's hand first
    const playerHand = state.players?.[playerIndex]?.hand || [];
    if (playerHand.some(c => c.rank === card.rank && c.suit === card.suit)) {
      return 'hand';
    }

    // Check table
    const onTable = state.tableCards?.some(
      tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit
    );
    if (onTable) {
      return 'table';
    }

    // Fallback to table (will be validated later)
    return 'table';
  }
}

module.exports = FriendlyBuildHandler;
