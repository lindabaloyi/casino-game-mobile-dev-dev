/**
 * TempStackDropHandler
 * Handles card drops on temp stacks.
 * Uses BuildCalculator to determine if the drop captures or adds to the temp stack.
 */

const { calculateBuildValue } = require('../../buildCalculator');

class TempStackDropHandler {
  /**
   * Handle a card drop on a temp stack.
   * @param {object} payload - { stackId, card, cardSource }
   * @param {object} state - Game state
   * @param {number} playerIndex - Player making the drop
   * @returns {object} - { type: string, payload: object }
   */
  handle(payload, state, playerIndex) {
    const { stackId, card, source: cardSource } = payload;

    console.log('[TempStackDropHandler] Handling drop on temp stack:', stackId);
    console.log('[TempStackDropHandler] Card:', card?.rank, card?.value);
    console.log('[TempStackDropHandler] Source:', cardSource);
    console.log('[TempStackDropHandler] Player:', playerIndex);

    // Find the temp stack
    const stack = state.tableCards.find(
      tc => tc.type === 'temp_stack' && tc.stackId === stackId
    );

    if (!stack) {
      console.log('[TempStackDropHandler] Stack NOT found, throwing error');
      throw new Error(`Temp stack "${stackId}" not found`);
    }

    console.log('[TempStackDropHandler] Stack owner:', stack.owner);
    console.log('[TempStackDropHandler] Stack cards:', stack.cards?.map(c => c.rank));

    // Only the owner's stack can trigger capture
    // Other players can only add to the temp stack
    if (stack.owner !== playerIndex) {
      console.log('[TempStackDropHandler] Not owner - adding to temp');
      return {
        type: 'addToTemp',
        payload: { card, stackId, source: cardSource }
      };
    }

    // Use build calculator to determine if capture is possible
    const stackValues = stack.cards.map(c => c.value);
    const buildInfo = calculateBuildValue(stackValues);

    console.log('[TempStackDropHandler] stackValues:', stackValues);
    console.log('[TempStackDropHandler] buildInfo:', buildInfo);

    const playerHand = state.players[playerIndex].hand || [];
    console.log('[TempStackDropHandler] Player hand:', playerHand.map(c => c.rank));

    // Check 1: Complete build (need === 0) - card value matches build value
    // Also handles multi-build: cards form multiple valid builds (e.g., 6+3=9 AND 7+2=9)
    // CRITICAL: Only allow capture when card is from player's HAND
    if (buildInfo && buildInfo.need === 0 && buildInfo.value > 0) {
      if (card.value === buildInfo.value && cardSource === 'hand') {
        // Spare check: Does player have another card of same rank in hand?
        const sameRankCount = playerHand.filter(c => c.rank === card.rank).length;
        const hasSpare = sameRankCount > 1;
        
        if (!hasSpare) {
          // Multi-build: log the build type for debugging
          if (buildInfo.buildType === 'multi') {
            console.log(`[TempStackDropHandler] Multi-build (${stackValues.join('+')}=${buildInfo.value}), no spare → CAPTURE`);
          } else {
            console.log(`[TempStackDropHandler] Complete build, no spare → CAPTURE`);
          }
          return {
            type: 'captureTemp',
            payload: { card, stackId, source: cardSource }
          };
        } else {
          if (buildInfo.buildType === 'multi') {
            console.log(`[TempStackDropHandler] Multi-build, has spare → ADD TO TEMP`);
          } else {
            console.log(`[TempStackDropHandler] Complete build, has spare → ADD TO TEMP`);
          }
          return {
            type: 'addToTemp',
            payload: { card, stackId, source: cardSource }
          };
        }
      }
    }

    // Check 2: Incomplete build - card matches the "need" values
    // REMOVED: Don't auto-capture incomplete builds - let player choose to extend or capture
    // Players should be able to add cards to incomplete builds without forced capture
    /*
    if (buildInfo && buildInfo.need > 0) {
      if (card.value === buildInfo.need) {
        const matchingCards = playerHand.filter(c => c.value === buildInfo.need);
        
        // Only auto-capture if player has EXACTLY ONE matching card
        if (matchingCards.length === 1) {
          console.log(`[TempStackDropHandler] Incomplete build, single matching need card - capturing!`);
          return {
            type: 'captureTemp',
            payload: { card, stackId, source: cardSource }
          };
        } else if (matchingCards.length > 1) {
          console.log(`[TempStackDropHandler] Multiple matching cards (${matchingCards.length}), adding to temp for choice`);
        }
      }
    }
    */

    // Check 3: Same-rank capture (all cards same rank)
    // CRITICAL: Only allow capture when card is from player's HAND
    const allSameRank = stack.cards.length > 0 &&
      stack.cards.every(c => c.rank === stack.cards[0].rank);
    
    if (allSameRank && card.rank === stack.cards[0].rank && cardSource === 'hand') {
      // Spare check: Does player have another card of same rank in hand?
      const sameRankCount = playerHand.filter(c => c.rank === card.rank).length;
      const hasSpare = sameRankCount > 1;
      
      if (!hasSpare) {
        console.log(`[TempStackDropHandler] Same rank, no spare → CAPTURE`);
        return {
          type: 'captureTemp',
          payload: { card, stackId, source: cardSource }
        };
      } else {
        console.log(`[TempStackDropHandler] Same rank, has spare → ADD TO TEMP`);
        return {
          type: 'addToTemp',
          payload: { card, stackId, source: cardSource }
        };
      }
    }

    // No capture possible - add to temp
    console.log('[TempStackDropHandler] No capture - adding to temp');
    return {
      type: 'addToTemp',
      payload: { card, stackId, source: cardSource }
    };
  }
}

module.exports = TempStackDropHandler;
