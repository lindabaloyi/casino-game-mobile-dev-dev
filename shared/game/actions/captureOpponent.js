/**
 * captureOpponent
 * Player captures an OPPONENT'S build stack.
 */

const { cloneState, nextTurn } = require('../GameState');

function captureOpponent(state, payload, playerIndex) {
  const { card, targetStackId } = payload;

  if (!card?.rank || !card?.suit) {
    throw new Error('captureOpponent: invalid card payload');
  }
  if (!targetStackId) {
    throw new Error('captureOpponent: targetStackId is required');
  }

  const newState = cloneState(state);
  const hand = newState.playerHands[playerIndex];

  const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
  if (handIdx === -1) {
    throw new Error(`captureOpponent: card ${card.rank}${card.suit} not in player ${playerIndex}'s hand`);
  }
  const [capturingCard] = hand.splice(handIdx, 1);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === targetStackId,
  );
  if (stackIdx === -1) {
    throw new Error(`captureOpponent: build stack "${targetStackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];
  if (buildStack.owner === playerIndex) {
    throw new Error('captureOpponent: cannot capture your own build - use captureOwn');
  }

  if (capturingCard.value !== buildStack.value) {
    throw new Error(`captureOpponent: card value ${capturingCard.value} doesn't match build value ${buildStack.value}`);
  }

  const capturedCards = [...buildStack.cards];
  newState.tableCards.splice(stackIdx, 1);
  newState.playerCaptures[playerIndex].push(...capturedCards, capturingCard);

  return nextTurn(newState);
}

module.exports = captureOpponent;
