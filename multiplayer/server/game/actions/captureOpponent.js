/**
 * captureOpponent
 * Player captures an OPPONENT'S build stack.
 * 
 * SIMPLE RULE: Card value must match build value.
 * No complex "identical card" logic needed - opponent builds
 * can only be captured by matching the total value.
 * 
 * Contract: (state, payload, playerIndex) => newState (pure)
 */

const { cloneState, nextTurn } = require('../GameState');

/**
 * @param {object} state
 * @param {{
 *   card: object,           // hand card being used to capture
 *   targetStackId: string   // build stack ID to capture
 * }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function captureOpponent(state, payload, playerIndex) {
  const { card, targetStackId } = payload;

  // Validate card from hand
  if (!card?.rank || !card?.suit) {
    throw new Error('captureOpponent: invalid card payload');
  }

  if (!targetStackId) {
    throw new Error('captureOpponent: targetStackId is required');
  }

  const newState = cloneState(state);
  const hand = newState.playerHands[playerIndex];

  // Remove the capturing card from player's hand
  const handIdx = hand.findIndex(
    c => c.rank === card.rank && c.suit === card.suit,
  );
  if (handIdx === -1) {
    throw new Error(
      `captureOpponent: card ${card.rank}${card.suit} not in player ${playerIndex}'s hand`,
    );
  }
  const [capturingCard] = hand.splice(handIdx, 1);

  // Find the opponent's build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === targetStackId,
  );
  if (stackIdx === -1) {
    throw new Error(`captureOpponent: build stack "${targetStackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  // Validate: build must belong to opponent (not the player)
  // This handler is specifically for capturing OPPONENT's builds
  if (buildStack.owner === playerIndex) {
    throw new Error('captureOpponent: cannot capture your own build - use captureOwn');
  }

  // SIMPLE VALIDATION: Card value must match build value
  // No "identical card" logic for opponent builds
  if (capturingCard.value !== buildStack.value) {
    throw new Error(
      `captureOpponent: card value ${capturingCard.value} doesn't match build value ${buildStack.value}`,
    );
  }

  // Remove stack from table and add all its cards to captured
  const capturedCards = [...buildStack.cards];
  newState.tableCards.splice(stackIdx, 1);

  // Add captured cards first, then the capturing card on top
  // Example: capture 7+3 with 10 -> pile becomes [7, 3, 10] with 10 on top
  newState.playerCaptures[playerIndex].push(...capturedCards, capturingCard);

  // Advance turn to opponent
  return nextTurn(newState);
}

module.exports = captureOpponent;
