/**
 * trail
 * Player places a card from their hand onto the table (trailing).
 *
 * Rules:
 *  - Player must have the card in their hand
 *  - Card is removed from hand and added to tableCards
 *  - Turn advances to the other player
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState, nextTurn } = require('../GameState');

/**
 * @param {object} state       Current game state
 * @param {{ card: object }} payload  Card to trail
 * @param {number} playerIndex Who is trailing
 * @returns {object} New game state
 */
function trail(state, payload, playerIndex) {
  const { card } = payload;

  if (!card || !card.rank || !card.suit) {
    throw new Error('trail: invalid card payload');
  }

  const newState = cloneState(state);
  const hand = newState.playerHands[playerIndex];

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

  // Advance turn
  return nextTurn(newState);
}

module.exports = trail;
