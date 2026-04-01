/**
 * Tournament Test Utilities
 * Helper functions for testing tournament mode with playerId strings
 */

const { initializeGame } = require('../../shared/game/initialization');
const { startTournament } = require('../../shared/game/actions/startTournament');
const { endTournamentRound } = require('../../shared/game/actions/endTournamentRound');
const { startQualificationReview } = require('../../shared/game/actions/startQualificationReview');
const { compressStateForNewPhase } = require('../../shared/game/actions/compressStateForNewPhase');

/**
 * Creates a mock tournament state with playerId strings
 * @param {object} overrides - Optional overrides for default state
 * @returns {object} Mock tournament state
 */
function createMockTournamentState(overrides = {}) {
  const state = initializeGame(4, false);
  
  // Start tournament mode
  state.tournamentMode = 'knockout';
  state.tournamentPhase = 'QUALIFYING';
  state.tournamentRound = 1;
  
  // Initialize with playerId strings
  state.playerStatuses = {
    'player_0': 'ACTIVE',
    'player_1': 'ACTIVE',
    'player_2': 'ACTIVE',
    'player_3': 'ACTIVE'
  };
  state.tournamentScores = {
    'player_0': 0,
    'player_1': 0,
    'player_2': 0,
    'player_3': 0
  };
  state.qualifiedPlayers = [];
  state.eliminationOrder = [];
  
  return { ...state, ...overrides };
}

/**
 * Helper to verify playerId to player number mapping
 * @param {string} playerId - Player ID string (e.g., 'player_0')
 * @param {number} expectedNumber - Expected player number (1-4)
 */
function verifyPlayerIdMapping(playerId, expectedNumber) {
  const actualNumber = parseInt(playerId.replace('player_', '')) + 1;
  expect(actualNumber).toBe(expectedNumber);
}

/**
 * Simulates a tournament round transition
 * @param {object} state - Current game state
 * @param {string} fromPhase - Current phase
 * @param {string} toPhase - Target phase
 * @returns {object} New state after transition
 */
function simulateTournamentRoundTransition(state, fromPhase, toPhase) {
  let newState = { ...state };
  
  if (fromPhase === 'QUALIFYING' && toPhase === 'SEMI_FINAL') {
    // Simulate end of qualifying round
    // Set some players as eliminated
    newState.playerStatuses['player_1'] = 'ELIMINATED';
    newState.playerStatuses['player_3'] = 'ELIMINATED';
    newState.eliminationOrder = ['player_1', 'player_3'];
    newState.qualifiedPlayers = ['player_0', 'player_2'];
    
    // Transition to semi-final
    newState = compressStateForNewPhase(newState, [0, 2]);
    newState.tournamentPhase = 'SEMI_FINAL';
  }
  
  if (fromPhase === 'SEMI_FINAL' && toPhase === 'FINAL_SHOWDOWN') {
    // Simulate end of semi-final
    newState.playerStatuses['player_2'] = 'ELIMINATED';
    newState.eliminationOrder.push('player_2');
    newState.qualifiedPlayers = ['player_0'];
    
    // Transition to final showdown
    newState = compressStateForNewPhase(newState, [0]);
    newState.tournamentPhase = 'FINAL_SHOWDOWN';
  }
  
  return newState;
}

/**
 * Extracts player number from playerId string
 * @param {string} playerId - Player ID (e.g., 'player_0')
 * @returns {number} Player number (1-4)
 */
function getPlayerNumber(playerId) {
  return parseInt(playerId.replace('player_', '')) + 1;
}

/**
 * Verifies that tournament data uses playerId strings instead of numeric indices
 * @param {object} state - Game state to verify
 */
function verifyPlayerIdStrings(state) {
  // Check playerStatuses keys
  const statusKeys = Object.keys(state.playerStatuses || {});
  statusKeys.forEach(key => {
    expect(key).toMatch(/^player_\d+$/);
  });
  
  // Check tournamentScores keys
  const scoreKeys = Object.keys(state.tournamentScores || {});
  scoreKeys.forEach(key => {
    expect(key).toMatch(/^player_\d+$/);
  });
  
  // Check eliminationOrder items
  if (state.eliminationOrder) {
    state.eliminationOrder.forEach(item => {
      expect(item).toMatch(/^player_\d+$/);
    });
  }
  
  // Check qualifiedPlayers items
  if (state.qualifiedPlayers) {
    state.qualifiedPlayers.forEach(item => {
      expect(item).toMatch(/^player_\d+$/);
    });
  }
}

module.exports = {
  createMockTournamentState,
  verifyPlayerIdMapping,
  simulateTournamentRoundTransition,
  getPlayerNumber,
  verifyPlayerIdStrings
};