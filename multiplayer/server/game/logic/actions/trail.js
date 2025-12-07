/**
 * Trail Action Determination Module
 * Determines available trail actions for a dragged card
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('DetermineTrailActions');
const { canTrailCard } = require('../validation/canTrailCard');

/**
 * Determine trail actions for a card drop
 * @param {Object} draggedItem - The dragged item with card property
 * @param {Object} targetInfo - Information about the drop target
 * @param {Object} gameState - Current game state
 * @returns {Array} Array of action objects, or empty array if no trail possible
 */
function determineTrailActions(draggedItem, targetInfo, gameState) {
  // Trail actions are only available when:
  // 1. No other actions are found (trail is the fallback)
  // 2. Target is the table area
  // 3. The card can be trailed (no duplicates, no build restrictions)

  if (!draggedItem?.card || !targetInfo) {
    return [];
  }

  // Only consider trail when target is table area
  if (targetInfo.type && targetInfo.type !== 'table') {
    return [];
  }

  // Only consider trail if no other actions are available
  // This would be checked by the caller - determineActions() handles the priority

  // Check if this specific card can be trailed
  const canTrail = canTrailCard(draggedItem.card, gameState);
  if (!canTrail) {
    logger.debug('Trail blocked for card:', {
      card: `${draggedItem.card.rank}${draggedItem.card.suit}`,
      gameId: gameState.gameId || 'unknown'
    });
    return [];
  }

  // Return the trail action (but note: modal requirement handled by caller)
  return [{
    type: 'trail',
    label: 'Trail Card',
    payload: {
      gameId: gameState.gameId,
      draggedItem,
      card: draggedItem.card  // Direct card reference for handler
    }
  }];
}

module.exports = { determineTrailActions };
