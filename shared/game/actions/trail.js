/**
 * trail
 * Player places a card from their hand onto the table (trailing).
 *
 * Rules:
 *  - Player must have the card in their hand
 *  - Card is removed from hand and added to tableCards
 *  - Player CANNOT play a card whose rank already exists on the table
 *  - Turn advances to the other player
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState, nextTurn, startPlayerTurn, triggerAction } = require('../GameState');

/**
 * @param {object} state       Current game state
 * @param {{ card: object }} payload  Card to trail
 * @param {number} playerIndex Who is trailing
 * @returns {object} New game state
 */
function trail(state, payload, playerIndex) {
  const { card } = payload;

  // Validate card payload
  if (!card || !card.rank || !card.suit) {
    throw new Error('trail: invalid card payload');
  }

  // Check if a card with the same rank already exists on the table as a LOOSE card only
  // (temp_stack and build_stack objects don't block trailing - they have cards inside)
  const looseCards = state.tableCards.filter(tc => !tc.type);
  const existingCardOfSameRank = looseCards.some(
    looseCard => looseCard.rank === card.rank
  );
  
  if (existingCardOfSameRank) {
    throw new Error(
      `trail: Cannot play ${card.rank}${card.suit} - ` +
      `there's already a ${card.rank} on the table`
    );
  }

  // Clone state for pure function
  const newState = cloneState(state);
  const hand = newState.players[playerIndex].hand;

  // Find the card in the player's hand (match by rank + suit)
  const cardIndex = hand.findIndex(
    c => c.rank === card.rank && c.suit === card.suit,
  );

  if (cardIndex === -1) {
    throw new Error(
      `trail: card ${card.rank}${card.suit} not found in player ${playerIndex}'s hand`,
    );
  }

  // Remove from hand, add to table
  const [trailedCard] = hand.splice(cardIndex, 1);
  newState.tableCards.push(trailedCard);

  console.log(`[trail] Player ${playerIndex} played ${card.rank}${card.suit}, cards in hand: ${hand.length}`);

  // Mark turn as started and ended (trail auto-ends turn)
  startPlayerTurn(newState, playerIndex);
  triggerAction(newState, playerIndex);
  // Explicitly set turnEnded since trail ends the turn
  if (newState.roundPlayers && newState.roundPlayers[playerIndex]) {
    newState.roundPlayers[playerIndex].turnEnded = true;
    console.log(`[trail] Player ${playerIndex} turnEnded set to true`);
  }

  // Advance turn
  return nextTurn(newState);
}

module.exports = trail;
