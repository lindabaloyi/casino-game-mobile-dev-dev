/**
 * Deck Management
 * Card deck creation, shuffling, and rank value mapping
 */

const { SUITS, RANKS, DECK_SIZE } = require('./constants');

/**
 * Get numeric value for a card rank
 * @param {string} rank - Card rank (A, 2-10)
 * @returns {number} Numeric value
 */
function rankValue(rank) {
  if (rank === 'A') return 1;
  return parseInt(rank, 10);
}

/**
 * Create and shuffle a new deck
 * @returns {Array} Shuffled deck of card objects
 */
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: rankValue(rank) });
    }
  }

  // Validate deck has exactly 40 unique cards
  const cardIds = deck.map(c => `${c.rank}${c.suit}`);
  const uniqueIds = new Set(cardIds);
  if (uniqueIds.size !== DECK_SIZE) {
    console.error(`[deck] ❌ Deck validation failed: expected ${DECK_SIZE} unique cards, got ${uniqueIds.size}`);
  } else {
    console.log(`[deck] ✅ Deck created with ${DECK_SIZE} unique cards`);
  }

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

module.exports = {
  rankValue,
  createDeck,
};
