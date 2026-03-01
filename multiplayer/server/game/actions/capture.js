/**
 * capture
 * Player captures either:
 *   1. A loose table card (matching the hand card's value)
 *   2. A build stack (matching the build's total value)
 *
 * Rules:
 *  - Card must be in player's hand
 *  - Card value must match target value
 *  - Player can capture their own builds or opponent's builds
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

    // Validate: card RANK must match target RANK (identical cards only)
    if (capturingCard.rank !== targetCard.rank) {
      throw new Error(
        `capture: can only capture identical cards (${capturingCard.rank}${capturingCard.suit} vs ${targetRank}${targetSuit})`,
      );
    }

    // Remove from table and add to captured
    newState.tableCards.splice(tableIdx, 1);
    capturedCards.push(targetCard);

  } else if (targetType === 'build') {
    // Capture a build stack (can be own or opponent's)
    if (!targetStackId) {
      throw new Error('capture: build target missing stackId');
    }

    // Find the stack (either build_stack or temp_stack)
    const stackIdx = newState.tableCards.findIndex(
      tc => (tc.type === 'build_stack' || tc.type === 'temp_stack') && tc.stackId === targetStackId,
    );
    if (stackIdx === -1) {
      throw new Error(`capture: build stack "${targetStackId}" not found`);
    }

    const buildStack = newState.tableCards[stackIdx];

    // Validate: card RANK must match stack's RANK (identical cards only)
    // For builds, check that all cards in build have same rank
    if (buildStack.cards.length > 0) {
      const buildRank = buildStack.cards[0].rank;
      const allSameRank = buildStack.cards.every(c => c.rank === buildRank);
      if (!allSameRank || capturingCard.rank !== buildRank) {
        throw new Error(
          `capture: can only capture builds of identical cards (need ${buildRank}, have ${capturingCard.rank})`,
        );
      }
    } else {
      // Empty build - use value check
      if (capturingCard.value !== buildStack.value) {
        throw new Error(
          `capture: card value ${capturingCard.value} does not match build value ${buildStack.value}`,
        );
      }
    }

    // Remove stack from table and add all its cards to captured
    newState.tableCards.splice(stackIdx, 1);
    capturedCards.push(...buildStack.cards);

  } else {
    throw new Error(`capture: unknown targetType "${targetType}"`);
  }

  // Add captured cards first, then the capturing card on top
  // Example: capture 7+3 with 10 -> pile becomes [7, 3, 10] with 10 on top
  newState.playerCaptures[playerIndex].push(...capturedCards, capturingCard);

  // Advance turn to opponent
  return nextTurn(newState);
}

module.exports = capture;
