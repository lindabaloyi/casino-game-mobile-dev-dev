/**
 * Card Distribution Validation
 * Validates that all cards in the game are properly distributed
 */

const { DECK_SIZE } = require('./constants');

/**
 * Validate card distribution - ensure no duplicates across players
 * @param {object} state - Game state to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateCardDistribution(state) {
  const errors = [];
  const allCards = [];

  // Collect all cards from all players
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];
    for (const card of player.hand) {
      const cardId = `${card.rank}${card.suit}`;
      if (allCards.includes(cardId)) {
        errors.push(`DUPLICATE: ${cardId} found in player ${i}'s hand (was already in another player's hand)`);
      }
      allCards.push(cardId);
    }
    for (const card of player.captures) {
      const cardId = `${card.rank}${card.suit}`;
      if (allCards.includes(cardId)) {
        errors.push(`DUPLICATE: ${cardId} found in player ${i}'s captures`);
      }
      allCards.push(cardId);
    }
  }

  // Check table cards
  for (const card of state.tableCards) {
    const cardId = `${card.rank}${card.suit}`;
    if (allCards.includes(cardId)) {
      errors.push(`DUPLICATE: ${cardId} found on table`);
    }
    allCards.push(cardId);
  }

  // Check deck cards
  for (const card of state.deck) {
    const cardId = `${card.rank}${card.suit}`;
    if (allCards.includes(cardId)) {
      errors.push(`DUPLICATE: ${cardId} found in deck`);
    }
    allCards.push(cardId);
  }

  // Total should be exactly 40 (no more, no less)
  if (allCards.length !== DECK_SIZE) {
    errors.push(`CARD COUNT: Expected ${DECK_SIZE} unique cards, got ${allCards.length}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateCardDistribution,
};
