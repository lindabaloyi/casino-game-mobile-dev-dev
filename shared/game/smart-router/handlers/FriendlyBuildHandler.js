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

    // Step 1: Determine card source
    const source = cardSource || this.getCardSource(state, playerIndex, card);
    console.log('[FriendlyBuildHandler] Card source:', source);

    // Step 2: For hand cards, check for spare first
    // If has spare, can extend the build. If no spare (last card), should capture instead.
    if (source === 'hand') {
      const playerHand = state.players[playerIndex]?.hand || [];
      const sameRankCards = playerHand.filter(c => c.rank === card.rank);
      const hasSpare = sameRankCards.length > 1; // includes the card being played

      console.log('[FriendlyBuildHandler] Has spare:', hasSpare);
      
      // If NO spare (this is the last card of this rank), route to captureOwn
      // This ensures the build gets captured automatically when player has no more cards
      if (!hasSpare) {
        console.log('[FriendlyBuildHandler] No spare cards - routing to captureOwn');
        const CaptureOwnAction = require('../../actions/captureOwn');
        return {
          type: 'captureOwn',
          payload: {
            card,
            targetType: 'build',
            targetStackId: stackId
          }
        };
      }
      
      // Has spare - try to extend the build first
      if (stack.pendingExtension?.looseCard || stack.pendingExtension?.cards) {
        console.log('[FriendlyBuildHandler] Has pending extension - delegating to ExtendRouter');
        return this.extendRouter.route(
          { stackId, card, cardSource: source },
          state,
          playerIndex
        );
      }
      
      // Try to extend/build
      console.log('[FriendlyBuildHandler] Trying to extend build first');
      return this.extendRouter.route(
        { stackId, card, cardSource: source },
        state,
        playerIndex
      );
    }

    // Step 3: Card from table - proceed with extension
    if (stack.pendingExtension?.looseCard || stack.pendingExtension?.cards) {
      console.log('[FriendlyBuildHandler] Has pending extension - delegating to ExtendRouter');
      return this.extendRouter.route(
        { stackId, card, cardSource: source },
        state,
        playerIndex
      );
    }

    // Step 4: Start new extension
    console.log('[FriendlyBuildHandler] Starting new extension - delegating to ExtendRouter');
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

    // Check if this is a same-rank build
    const isSameRankBuild = stack.cards.length > 0 && 
                            stack.cards.every(c => c.rank === stack.cards[0].rank);
    
    if (isSameRankBuild) {
      // Same-rank build: card can capture if its rank matches the build rank
      // (This is handled by the spare card check in handle() - not here)
      return false;
    }
    
    // Sum/diff build: card can capture if its value equals the build value
    return cardValue === stack.value;
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
