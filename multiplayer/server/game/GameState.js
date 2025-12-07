/**
 * Game State Module
 * Provides pure game state management, helpers, and validation
 * No networking or external dependencies
 */

const { createLogger } = require('../utils/logger');
const logger = createLogger('GameState');

// Game configuration constants
const GAME_CONFIG = {
  MAX_PLAYERS: 2,
  INITIAL_CARDS_PER_PLAYER: 10,  // 10 cards per player for round 1 (total 20 cards)
  MAX_BUILD_VALUE: 10
};

// Validation rules for game state
const VALIDATION_RULES = {
  playerHands: (hands) => Array.isArray(hands) && hands.length === GAME_CONFIG.MAX_PLAYERS,
  playerCaptures: (captures) => Array.isArray(captures) && captures.length === GAME_CONFIG.MAX_PLAYERS,
  currentPlayer: (player) => typeof player === 'number' && player >= 0 && player < GAME_CONFIG.MAX_PLAYERS
};

// ============================================================================
// CORE FUNCTIONS (Extracted from shared-game-logic.js)
// ============================================================================

/**
 * Initialize a new game state
 */
function initializeGame() {
  logger.debug('Initializing new game state...');

  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  let deck = [];

  // Create standard 52-card deck
  for (const suit of suits) {
    for (const rank of ranks) {
      let value;
      if (rank === 'A') value = 1;
      else if (['J', 'Q', 'K', '10'].includes(rank)) value = 10; // Face cards and 10 = 10
      else value = parseInt(rank, 10);

      deck.push({
        suit,
        rank,
        value
      });
    }
  }

  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // Deal cards
  const playerHands = Array(GAME_CONFIG.MAX_PLAYERS).fill(null).map(() => []);
  const totalCardsToDeal = GAME_CONFIG.INITIAL_CARDS_PER_PLAYER * GAME_CONFIG.MAX_PLAYERS;

  for (let i = 0; i < totalCardsToDeal; i++) {
    const playerIndex = i % GAME_CONFIG.MAX_PLAYERS;
    playerHands[playerIndex].push(deck.pop());
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

  // Use centralized validation rules
  if (!VALIDATION_RULES.playerHands(gameState.playerHands)) {
    errors.push(`playerHands must be an array of ${GAME_CONFIG.MAX_PLAYERS} elements`);
  }

  if (!Array.isArray(gameState.tableCards)) {
    errors.push('tableCards must be an array');
  }

  if (!VALIDATION_RULES.playerCaptures(gameState.playerCaptures)) {
    errors.push(`playerCaptures must be an array of ${GAME_CONFIG.MAX_PLAYERS} elements`);
  }

  if (!VALIDATION_RULES.currentPlayer(gameState.currentPlayer)) {
    errors.push(`currentPlayer must be a number between 0 and ${GAME_CONFIG.MAX_PLAYERS - 1}`);
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get card rank value (A=1, 2-10, J/Q/K=10)
 */
function rankValue(rank) {
  if (rank === 'A') return 1;
  if (['J', 'Q', 'K', '10'].includes(rank)) return 10;
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
