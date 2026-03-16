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
    const { stackId, card, cardSource } = payload;

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
    if (buildInfo && buildInfo.need === 0 && buildInfo.value > 0) {
      if (card.value === buildInfo.value) {
        const matchingCards = playerHand.filter(c => c.value === buildInfo.value);
        
        // Only auto-capture if player has EXACTLY ONE matching card
        if (matchingCards.length === 1) {
          console.log(`[TempStackDropHandler] Complete build, single matching card - capturing!`);
          return {
            type: 'captureTemp',
            payload: { card, stackId, source: cardSource }
          };
        } else if (matchingCards.length > 1) {
          console.log(`[TempStackDropHandler] Multiple matching cards (${matchingCards.length}), adding to temp for choice`);
        }
      }
    }

    // Check 2: Incomplete build - card matches the "need" value
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

    // Check 3: Same-rank capture (all cards same rank)
    const allSameRank = stack.cards.length > 0 &&
      stack.cards.every(c => c.rank === stack.cards[0].rank);
    
    if (allSameRank && card.rank === stack.cards[0].rank) {
      const matchingCards = playerHand.filter(c => c.rank === stack.cards[0].rank);
      
      // Only auto-capture if player has EXACTLY ONE matching card
      if (matchingCards.length === 1) {
        console.log(`[TempStackDropHandler] Same rank capture - single matching card`);
        return {
          type: 'captureTemp',
          payload: { card, stackId, source: cardSource }
        };
      } else if (matchingCards.length > 1) {
        console.log(`[TempStackDropHandler] Multiple matching cards (${matchingCards.length}), adding to temp for choice`);
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
