/**
 * directCapture
 * Player drops a card on a loose card of the SAME value, but has NO build option.
 * This is an immediate capture - both cards go to captures, turn advances.
 *
 * Rules:
 *  - card.value === targetCard.value (same value)
 *  - Player has NO card with value = card.value * 2 (no build possible)
 *  - Only applies to cards 1-5 (since 6*2 > 10)
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState, nextTurn } = require('../GameState');

/**
 * @param {object} state
 * @param {{ card: object, targetCard: object }} payload
 *   card       — the hand card being dropped
 *   targetCard — the loose table card
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function directCapture(state, payload, playerIndex) {
  const { card, targetCard } = payload;

  if (!card?.rank || !card?.suit) {
    throw new Error('directCapture: invalid card payload');
  }
  if (!targetCard?.rank || !targetCard?.suit) {
    throw new Error('directCapture: invalid targetCard payload');
  }

  // Validate same value
  if (card.value !== targetCard.value) {
    throw new Error(`directCapture: card values must match (${card.value} vs ${targetCard.value})`);
  }

  // Only for cards 1-5
  if (card.value > 5) {
    throw new Error(`directCapture: only applies to cards 1-5, got ${card.value}`);
  }

  const newState = cloneState(state);

  // Remove the hand card from player's hand
  const hand = newState.playerHands[playerIndex];
  const handIdx = hand.findIndex(
    c => c.rank === card.rank && c.suit === card.suit,
  );
  if (handIdx === -1) {
    throw new Error(`directCapture: card ${card.rank}${card.suit} not in player ${playerIndex}'s hand`);
  }
  const [playedCard] = hand.splice(handIdx, 1);

  // Remove the loose table card from table
  const tableIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  if (tableIdx === -1) {
    throw new Error(`directCapture: targetCard ${targetCard.rank}${targetCard.suit} not found as loose table card`);
  }
  const [tableCard] = newState.tableCards.splice(tableIdx, 1);

  // Add both cards to player's captured pile
  if (!newState.playerCaptures[playerIndex]) {
    newState.playerCaptures[playerIndex] = [];
  }
  newState.playerCaptures[playerIndex].push(playedCard, tableCard);

  console.log(`[directCapture] Player ${playerIndex} captured ${playedCard.rank}${playedCard.suit} + ${tableCard.rank}${tableCard.suit} (value ${card.value})`);

  // Advance to next player using nextTurn
  return nextTurn(newState);
}

module.exports = directCapture;
