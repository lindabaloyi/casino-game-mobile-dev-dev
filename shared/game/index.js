/**
 * Game State Module
 * Public API - re-exports all game state functions
 */

// Constants
const {
  SUITS,
  RANKS,
  STARTING_CARDS_PER_PLAYER,
  DECK_SIZE,
} = require('./constants');

// Clone utility
const { cloneState } = require('./clone');

// Deck management
const { rankValue, createDeck } = require('./deck');

// Team helpers
const { getTeamFromIndex, getTeammateIndex } = require('./team');

// Turn tracking
const {
  createRoundPlayers,
  startPlayerTurn,
  endPlayerTurn,
  triggerAction,
  allPlayersTurnEnded,
  forceEndTurn,
  resetRoundPlayers,
  resetTurnFlags,
  nextTurn,
  getCurrentPlayer,
  isPlayerTurn,
} = require('./turn');

// Stack ID generation
const { generateStackId } = require('./stackId');

// Validation
const { validateCardDistribution } = require('./validation');

// Round progression
const { startNextRound } = require('./round');

// Game end
const { finalizeGame } = require('./gameEnd');

// Initialization
const { initializeGame, initializeTestGame } = require('./initialization');

module.exports = {
  // Constants
  SUITS,
  RANKS,
  STARTING_CARDS_PER_PLAYER,
  DECK_SIZE,

  // Clone
  cloneState,

  // Deck
  rankValue,
  createDeck,

  // Team
  getTeamFromIndex,
  getTeammateIndex,

  // Turn
  createRoundPlayers,
  startPlayerTurn,
  endPlayerTurn,
  triggerAction,
  allPlayersTurnEnded,
  forceEndTurn,
  resetRoundPlayers,
  resetTurnFlags,
  nextTurn,
  getCurrentPlayer,
  isPlayerTurn,

  // Stack
  generateStackId,

  // Validation
  validateCardDistribution,

  // Round
  startNextRound,

  // Game End
  finalizeGame,

  // Initialization
  initializeGame,
  initializeTestGame,
};
