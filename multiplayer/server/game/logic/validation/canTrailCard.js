/**
 * Trail Card Validation Module
 * Validates if a specific card can be trailed
 */

const { rankValue } = require('../../GameState');

/**
 * Check if a card can be trailed
 */
function canTrailCard(card, gameState) {
  const { tableCards, round } = gameState;
  const cardValue = rankValue(card.rank);

  // Check for round 1 build restrictions
  if (round === 1) {
    const hasActiveBuild = tableCards.some(tc =>
      tc.type === 'build' && tc.owner === gameState.currentPlayer
    );
    if (hasActiveBuild) {
      return false;
    }
  }

  // Check for duplicate loose cards
  const duplicateExists = tableCards.some(tc =>
    tc.type === undefined || tc.type === 'loose' &&
    rankValue(tc.rank) === cardValue
  );

  return !duplicateExists;
}

module.exports = { canTrailCard };
