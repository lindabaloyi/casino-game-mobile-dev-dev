/**
 * Game State Module
 * Provides pure game state management, helpers, and validation
 * No networking or external dependencies
 */

const { createLogger } = require('../utils/logger');
const logger = createLogger('GameState');

// ============================================================================
// CORE FUNCTIONS (Extracted from shared-game-logic.js)
// ============================================================================

/**
 * Initialize a new game state
 */
function initializeGame() {
  logger.debug('Initializing new game state...');

  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  let deck = [];

  // Create deck
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        value: rank === 'A' ? 1 : parseInt(rank, 10)
      });
    }
  }

  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // Deal cards
  const playerHands = [[], []];
  for (let i = 0; i < 10; i++) {
    playerHands[0].push(deck.pop());
    playerHands[1].push(deck.pop());
  }

  return {
    deck,
    playerHands,
    tableCards: [],
    playerCaptures: [[], []],
    currentPlayer: 0,
    round: 1,
    scores: [0, 0],
    gameOver: false,
    winner: null,
    lastCapturer: null,
    scoreDetails: null,
  };
}

/**
 * Validate game state structure
 */
function validateGameState(gameState) {
  const errors = [];

  if (!gameState) {
    errors.push('Game state is null or undefined');
    return { valid: false, errors };
  }

  if (!Array.isArray(gameState.playerHands) || gameState.playerHands.length !== 2) {
    errors.push('playerHands must be an array of 2 elements');
  }

  if (!Array.isArray(gameState.tableCards)) {
    errors.push('tableCards must be an array');
  }

  if (!Array.isArray(gameState.playerCaptures) || gameState.playerCaptures.length !== 2) {
    errors.push('playerCaptures must be an array of 2 elements');
  }

  if (typeof gameState.currentPlayer !== 'number' || gameState.currentPlayer < 0 || gameState.currentPlayer > 1) {
    errors.push('currentPlayer must be 0 or 1');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get card rank value (A=1, 2-10=face value)
 */
function rankValue(rank) {
  if (rank === 'A') return 1;
  if (typeof rank === 'number') return rank;
  if (typeof rank === 'string') {
    const parsed = parseInt(rank, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Calculate sum of card values in array
 */
function calculateCardSum(cards) {
  return cards.reduce((sum, card) => sum + rankValue(card.rank), 0);
}

/**
 * Check if card is a loose table card (not part of build or stack)
 */
function isCard(obj) {
  return obj && typeof obj === 'object' && !obj.type;
}

/**
 * Check if object is a build
 */
function isBuild(obj) {
  return obj && typeof obj === 'object' && obj.type === 'build';
}

/**
 * Check if object is a temporary stack
 */
function isTemporaryStack(obj) {
  return obj && typeof obj === 'object' && obj.type === 'temporary_stack';
}

/**
 * Clone game state (deep clone for state mutations)
 */
function clone(gameState) {
  return JSON.parse(JSON.stringify(gameState));
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  initializeGame,
  validateGameState,
  clone,
  rankValue,
  calculateCardSum,
  isCard,
  isBuild,
  isTemporaryStack
};
