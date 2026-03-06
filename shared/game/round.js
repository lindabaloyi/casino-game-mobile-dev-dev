/**
 * Round Progression
 * Handles round transitions and card dealing for new rounds
 */

const { STARTING_CARDS_PER_PLAYER } = require('./constants');
const { cloneState } = require('./clone');
const { createRoundPlayers } = require('./turn');

/**
 * Start the next round by dealing cards from the remaining deck.
 * For 2-player mode: allows up to 2 rounds total
 * For 4-player mode: returns null (no Round 2 allowed - game ends after Round 1)
 * 
 * @param {object} state - Current game state
 * @param {number} playerCount - Number of players (2 or 4)
 * @returns {object|null} Updated state for next round, or null if no more rounds allowed
 */
function startNextRound(state, playerCount) {
  console.log(`[round] startNextRound: current round=${state.round}, playerCount=${playerCount}`);

  // For 4-player: only 1 round allowed (no Round 2)
  if (playerCount >= 4) {
    console.log('[round] startNextRound: 4-player mode, no Round 2 allowed, returning null');
    return null;
  }

  // For 2-player: allow up to 2 rounds
  if (state.round >= 2) {
    console.log('[round] startNextRound: Round 2 already completed, returning null');
    return null;
  }

  // Check if we have enough cards in the deck
  const cardsNeeded = playerCount * STARTING_CARDS_PER_PLAYER; // 20 for 2-player
  if (state.deck.length < cardsNeeded) {
    console.log(`[round] startNextRound: Not enough cards in deck (have ${state.deck.length}, need ${cardsNeeded}), returning null`);
    return null;
  }

  console.log(`[round] startNextRound: Dealing 10 new cards to each player from remaining deck (${state.deck.length} cards left)`);

  // Clone state first to avoid mutation!
  const newState = cloneState(state);

  // Deal 10 new cards to each player from remaining deck
  const newPlayers = newState.players.map(player => {
    const newHand = newState.deck.splice(0, STARTING_CARDS_PER_PLAYER);
    return {
      ...player,
      hand: newHand,
      // Keep captures from previous round
    };
  });

  console.log(`[round] startNextRound: New hands dealt, deck now has ${newState.deck.length} cards`);

  // Preserve loose (non-stack) cards from previous round's table
  // Filter to keep only cards without 'type' property (loose cards)
  const looseTableCards = newState.tableCards.filter(tc => !tc.type);
  console.log(`[round] startNextRound: Preserving ${looseTableCards.length} loose cards from previous round`);

  // Update newState with the new players and other round changes
  newState.players = newPlayers;
  newState.tableCards = looseTableCards;  // Keep loose cards, temp stacks are cleared
  newState.currentPlayer = 0;
  newState.round = state.round + 1;
  newState.turnCounter = 1;
  newState.moveCount = 0;
  // Reset round players for turn tracking
  newState.roundPlayers = createRoundPlayers(playerCount);

  console.log(`[round] startNextRound: Round ${newState.round} initialized with fresh hands`);

  return newState;
}

module.exports = {
  startNextRound,
};
