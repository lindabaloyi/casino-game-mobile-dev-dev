/**
 * OpponentBuildHandler
 * Handles card drops on opponent builds.
 * Manages the multi-card capture flow (pendingCapture).
 * Delegates single-card drops to CaptureRouter.
 */

const CaptureRouter = require('../routers/CaptureRouter');

class OpponentBuildHandler {
  constructor() {
    this.captureRouter = new CaptureRouter();
  }

  /**
   * Handle a card drop on an opponent's build.
   * @param {object} payload - { stackId, card, cardSource }
   * @param {object} stack - The build stack
   * @param {object} state - Game state
   * @param {number} playerIndex - Player making the drop
   * @returns {object} - { type: string, payload: object }
   */
  handle(payload, stack, state, playerIndex) {
    const { stackId, card, cardSource } = payload;

    console.log('===========================================');
    console.log('[OpponentBuildHandler] 🚀 START');
    console.log('[OpponentBuildHandler] 📋 stackId:', stackId);
    console.log('[OpponentBuildHandler] 🃏 card:', card?.rank, card?.suit, '- value:', card?.value);
    console.log('[OpponentBuildHandler] 📦 source:', cardSource);
    console.log('[OpponentBuildHandler] 🎯 build value:', stack.value);
    console.log('[OpponentBuildHandler] 📊 pendingCapture:', stack.pendingCapture ? 'YES' : 'NO');
    console.log('[OpponentBuildHandler] 👤 player:', playerIndex, 'vs owner:', stack.owner);
    console.log('===========================================');

    // Determine card source
    const source = cardSource || this.getCardSource(state, playerIndex, card);
    console.log('[OpponentBuildHandler] Determined source:', source);

    // Check for existing pending capture (multi-card capture in progress)
    if (stack.pendingCapture) {
      return this.handlePendingCapture(payload, stack, state, playerIndex, source);
    }

    // No pending capture - handle based on card source
    if (source === 'table' || source.startsWith('captured')) {
      return this.handleTableOrCapturedCard(payload, stack, state, playerIndex, source);
    }

    // Hand card dropped - delegate to CaptureRouter (capture or steal)
    console.log('[OpponentBuildHandler] 🤚 Hand card - delegating to CaptureRouter');
    return this.captureRouter.route(
      { card, targetType: 'build', targetStackId: stackId },
      state,
      playerIndex
    );
  }

  /**
   * Handle adding to an existing pending capture.
   */
  handlePendingCapture(payload, stack, state, playerIndex, source) {
    const { stackId, card } = payload;
    const currentSum = stack.pendingCapture.cards.reduce(
      (sum, item) => sum + item.card.value,
      0
    );

    console.log('[OpponentBuildHandler] 📊 Current pending sum:', currentSum);
    console.log('[OpponentBuildHandler] 📦 Source:', source);

    // Hand card trying to complete capture
    if (source === 'hand') {
      console.log('[OpponentBuildHandler] 🤚 Hand card with pending capture');
      
      // Hand card must equal build value to complete capture
      if (card.value === stack.value) {
        console.log('[OpponentBuildHandler] ✅ Complete capture with hand card!');
        return { 
          type: 'completeCapture', 
          payload: { 
            stackId,
            captureCard: card,
            captureCardSource: source
          } 
        };
      } else {
        console.log('[OpponentBuildHandler] ❌ Hand card cannot complete - must match build value');
        throw new Error(
          `Hand card ${card.value} cannot complete - must match build value ${stack.value}`
        );
      }
    }

    // Table or captured card adding to pending
    console.log('[OpponentBuildHandler] 📥 Adding table/captured card to pending');
    
    // Captured cards can exceed the build value (no limits like extendBuild)
    const isCaptured = source === 'captured' || (typeof source === 'string' && source.startsWith('captured_'));
    
    if (isCaptured) {
      // Captured cards have no limits - can add any value
      console.log('[OpponentBuildHandler] ✅ Adding captured card without limit check');
      return {
        type: 'addToCapture',
        payload: { stackId, card, cardSource: source }
      };
    }
    
    // Table cards still have the limit check
    if (currentSum + card.value < stack.value) {
      // Add to existing pending capture
      console.log('[OpponentBuildHandler] ✅ Adding to pending capture (need more)');
      return {
        type: 'addToCapture',
        payload: { stackId, card, cardSource: source }
      };
    } else if (currentSum + card.value === stack.value) {
      // Would exactly equal - but need hand card to complete
      console.log('[OpponentBuildHandler] ✅ Adding card (need hand card to complete)');
      return {
        type: 'addToCapture',
        payload: { stackId, card, cardSource: source }
      };
    } else {
      // Would exceed build value
      console.log('[OpponentBuildHandler] ❌ Would exceed build value');
      throw new Error(
        `Cannot add ${card.value} - sum would exceed build value ${stack.value}`
      );
    }
  }

  /**
   * Handle a table or captured card dropped on opponent's build (no pending capture).
   */
  handleTableOrCapturedCard(payload, stack, state, playerIndex, source) {
    const { stackId, card } = payload;

    console.log('[OpponentBuildHandler] 📦 Table/captured card dropped');

    // Captured cards can exceed the build value (no limits like extendBuild)
    const isCaptured = source === 'captured' || (typeof source === 'string' && source.startsWith('captured_'));
    
    if (isCaptured) {
      // Captured cards can start a multi-card capture even if value > build
      console.log('[OpponentBuildHandler] ✅ Starting multi-card capture with captured card (no limit)');
      return {
        type: 'startBuildCapture',
        payload: { stackId, card, cardSource: source }
      };
    }
    
    // Table cards still have the limit check
    if (card.value < stack.value) {
      // Start multi-card capture with table card
      console.log('[OpponentBuildHandler] ✅ Starting multi-card capture (startBuildCapture)');
      return {
        type: 'startBuildCapture',
        payload: { stackId, card, cardSource: source }
      };
    } else if (card.value === stack.value) {
      // Single card capture - use existing logic
      console.log('[OpponentBuildHandler] Single card capture - delegating to CaptureRouter');
      return this.captureRouter.route(
        { card, targetType: 'build', targetStackId: stackId },
        state,
        playerIndex
      );
    } else {
      // card.value > stack.value - use steal logic
      console.log('[OpponentBuildHandler] Steal - delegating to CaptureRouter');
      return this.captureRouter.route(
        { card, targetType: 'build', targetStackId: stackId },
        state,
        playerIndex
      );
    }
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

    // Check captures
    const captures = state.players?.[playerIndex]?.captures || [];
    if (captures.some(c => c.rank === card.rank && c.suit === card.suit)) {
      return 'captured';
    }

    // Fallback to table (will be validated later)
    return 'table';
  }
}

module.exports = OpponentBuildHandler;
