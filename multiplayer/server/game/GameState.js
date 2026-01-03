/**
 * Game State Module
 * Provides pure game state management, helpers, and validation
 * No networking or external dependencies
 */

const { createLogger } = require('../utils/logger');
const logger = createLogger('GameState');

// Global build lifecycle tracker for debugging build creation/extension flow
const buildLifecycleTracker = {
  createdBuilds: new Map(),

  trackCreation(buildId, context, metadata = {}) {
    this.createdBuilds.set(buildId, {
      createdAt: Date.now(),
      context,
      extensions: [],
      metadata
    });
    console.log('[BUILD_LIFECYCLE] Build created:', { buildId, context, metadata });
  },

  trackExtension(buildId, context, metadata = {}) {
    const build = this.createdBuilds.get(buildId);
    if (build) {
      build.extensions.push({ timestamp: Date.now(), context, metadata });
      console.log('[BUILD_LIFECYCLE] Build extended:', {
        buildId,
        extensionCount: build.extensions.length,
        context,
        metadata
      });
    } else {
      console.warn('[BUILD_LIFECYCLE] Attempting to extend unknown build:', { buildId, context, metadata });
    }
  },

  getBuildInfo(buildId) {
    return this.createdBuilds.get(buildId);
  },

  debugAllBuilds(gameState, context) {
    const builds = gameState.tableCards.filter(item => item.type === 'build');
    console.log(`[ALL_BUILDS:${context}]`, {
      totalBuilds: builds.length,
      builds: builds.map((b, i) => ({
        index: i,
        id: b.buildId,
        owner: b.owner,
        cards: b.cards.map(c => `${c.rank}${c.suit}`),
        cardCount: b.cards.length,
        value: b.value,
        lifecycle: this.createdBuilds.get(b.buildId) ? {
          createdAt: this.createdBuilds.get(b.buildId).createdAt,
          extensions: this.createdBuilds.get(b.buildId).extensions.length
        } : 'NOT_TRACKED'
      }))
    });
  }
};

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
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  let deck = [];

  // Create casino deck (A-10 only, no face cards)
  for (const suit of suits) {
    for (const rank of ranks) {
      let value;
      if (rank === 'A') value = 1;
      else if (rank === '10') value = 10; // 10 equals 10
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Order two cards for temp stack creation: bigger card at bottom
 * Returns [bottomCard, topCard] where bottomCard has higher or equal value
 */
function orderCardsBigToSmall(card1, card2) {
  // Bigger value card = bottom (index 0)
  // Smaller value card = top (index 1)
  return (card1.value || 0) >= (card2.value || 0)
    ? [card1, card2]   // card1 bigger or equal = bottom
    : [card2, card1];  // card2 bigger = bottom
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

/**
 * Validate that no duplicate cards exist in game state
 * Checks for card duplication issues in temp stacks, loose cards, and player hands
 */
function validateNoDuplicates(gameState) {
  console.log('[VALIDATION] 🔍 Checking for card duplicates across all game locations...');

  const allCards = [];
  const cardLocations = [];

  // Collect all cards from table (loose + temp stacks)
  gameState.tableCards.forEach((item, tableIndex) => {
    if (item.type === 'temporary_stack' && item.cards) {
      // Add all cards from temp stacks
      item.cards.forEach((card, stackIndex) => {
        const cardId = `${card.rank}${card.suit}`;
        allCards.push(cardId);
        cardLocations.push(`table-temp-stack-${item.stackId}-pos${stackIndex}`);
      });
    } else if (item.rank && item.suit) {
      // Add loose cards
      const cardId = `${item.rank}${item.suit}`;
      allCards.push(cardId);
      cardLocations.push(`table-loose-index${tableIndex}`);
    }
  });

  // Check player hands to ensure no cross-contamination
  gameState.playerHands.forEach((hand, playerIndex) => {
    hand.forEach((card, handIndex) => {
      const cardId = `${card.rank}${card.suit}`;
      allCards.push(cardId);
      cardLocations.push(`hand-p${playerIndex}-pos${handIndex}`);
    });
  });

  // Check player captures for completeness
  gameState.playerCaptures.forEach((captures, playerIndex) => {
    captures.forEach((card, captureIndex) => {
      const cardId = `${card.rank}${card.suit}`;
      allCards.push(cardId);
      cardLocations.push(`captures-p${playerIndex}-pos${captureIndex}`);
    });
  });

  const uniqueCards = [...new Set(allCards)];
  const hasDuplicates = allCards.length !== uniqueCards.length;

  if (hasDuplicates) {
    // Find which cards are duplicated and where they appear
    const duplicateCards = [];
    const locationMap = {};

    allCards.forEach((cardId, index) => {
      if (!locationMap[cardId]) {
        locationMap[cardId] = [];
      }
      locationMap[cardId].push(cardLocations[index]);

      // Count occurrences
      const occurrences = allCards.filter(c => c === cardId).length;
      if (occurrences > 1 && !duplicateCards.includes(cardId)) {
        duplicateCards.push(cardId);
      }
    });

    console.error('[VALIDATION] ❌ DUPLICATES FOUND:', {
      totalCards: allCards.length,
      uniqueCards: uniqueCards.length,
      duplicateCards: duplicateCards,
      duplicateCount: duplicateCards.length,
      detailedLocations: duplicateCards.map(cardId => ({
        card: cardId,
        locations: locationMap[cardId],
        occurrenceCount: locationMap[cardId].length
      }))
    });
    return false;
  }

  console.log('[VALIDATION] ✅ No duplicates found across all game locations');
  return true;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  initializeGame,
  validateGameState,
  validateNoDuplicates,
  clone,
  rankValue,
  calculateCardSum,
  isCard,
  isBuild,
  isTemporaryStack,
  orderCardsBigToSmall,
  buildLifecycleTracker
};
