/**
 * capture
 * Player captures either:
 *   1. A loose table card (matching the hand card's value)
 *   2. An opponent's build stack (matching the build's total value)
 *
 * Rules:
 *  - Card must be in player's hand
 *  - Card value must match target value
 *  - If target is opponent's build, player must NOT own it
 *  - Turn advances after capture
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState, nextTurn } = require('../GameState');

/**
 * @param {object} state
 * @param {{
 *   card: object,           // hand card being used to capture
 *   targetType: 'loose' | 'build',
 *   targetRank?: string,
 *   targetSuit?: string,
 *   targetStackId?: string
 * }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function capture(state, payload, playerIndex) {
  const { card, targetType, targetRank, targetSuit, targetStackId } = payload;

  // Validate card from hand
  if (!card?.rank || !card?.suit) {
    throw new Error('capture: invalid card payload');
  }

  const newState = cloneState(state);
  const hand = newState.playerHands[playerIndex];

  // Remove the capturing card from player's hand
  const handIdx = hand.findIndex(
    c => c.rank === card.rank && c.suit === card.suit,
  );
  if (handIdx === -1) {
    throw new Error(
      `capture: card ${card.rank}${card.suit} not in player ${playerIndex}'s hand`,
    );
  }
  const [capturingCard] = hand.splice(handIdx, 1);

  // Initialize captured cards array
  const capturedCards = [];

  if (targetType === 'loose') {
    // Capture a loose table card
    if (!targetRank || !targetSuit) {
      throw new Error('capture: loose target missing rank/suit');
    }

    // Find and remove the loose card from table
    const tableIdx = newState.tableCards.findIndex(
      tc => !tc.type && tc.rank === targetRank && tc.suit === targetSuit,
    );
    if (tableIdx === -1) {
      throw new Error(
        `capture: target card ${targetRank}${targetSuit} not found on table`,
      );
    }

    const targetCard = newState.tableCards[tableIdx];

    // Validate: card value must match target value
    if (capturingCard.value !== targetCard.value) {
      throw new Error(
        `capture: card value ${capturingCard.value} does not match target ${targetCard.value}`,
      );
    }

    // Remove from table and add to captured
    newState.tableCards.splice(tableIdx, 1);
    capturedCards.push(targetCard);

  } else if (targetType === 'build') {
    // Capture an opponent's build stack
    if (!targetStackId) {
      throw new Error('capture: build target missing stackId');
    }

    // Find the build stack
    const stackIdx = newState.tableCards.findIndex(
      tc => tc.type === 'build_stack' && tc.stackId === targetStackId,
    );
    if (stackIdx === -1) {
      throw new Error(`capture: build stack "${targetStackId}" not found`);
    }

    const buildStack = newState.tableCards[stackIdx];

    // Validate: player must NOT own this build
    if (buildStack.owner === playerIndex) {
      throw new Error(
        `capture: cannot capture your own build stack "${targetStackId}"`,
      );
    }

    // Validate: card value must match build's total value
    if (capturingCard.value !== buildStack.value) {
      throw new Error(
        `capture: card value ${capturingCard.value} does not match build value ${buildStack.value}`,
      );
    }

    // Remove stack from table and add all its cards to captured
    newState.tableCards.splice(stackIdx, 1);
    capturedCards.push(...buildStack.cards);

  } else {
    throw new Error(`capture: unknown targetType "${targetType}"`);
  }

  // Add all captured cards + the capturing card to player's captures
  newState.playerCaptures[playerIndex].push(capturingCard, ...capturedCards);

  // Advance turn to opponent
  return nextTurn(newState);
}

module.exports = capture;
