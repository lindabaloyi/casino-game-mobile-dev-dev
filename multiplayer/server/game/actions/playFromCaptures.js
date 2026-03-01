/**
 * playFromCaptures
 * Player uses opponent's captured top card to create a temp stack on the table.
 *
 * Rules:
 *  - Player drags opponent's top captured card
 *  - Drops onto a loose card on the table to create a temp stack
 *  - Or drops onto own temp stack to add to it
 *  - Card is removed from opponent's capture pile
 *  - Turn does NOT advance — player continues
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState } = require('../GameState');

/**
 * @param {object} state
 * @param {{
 *   capturedCard: object,      // the card from opponent's captures
 *   targetCard?: object,       // loose card on table to stack with (for createTemp)
 *   targetStackId?: string    // own temp stack to add to (for addToTemp)
 * }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function playFromCaptures(state, payload, playerIndex) {
  const { capturedCard, targetCard, targetStackId } = payload;

  if (!capturedCard?.rank || !capturedCard?.suit) {
    throw new Error('playFromCaptures: invalid capturedCard payload');
  }

  const newState = cloneState(state);
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const opponentCaptures = newState.playerCaptures[opponentIndex];

  // Remove the top card from opponent's captures
  const capturedIdx = opponentCaptures.findIndex(
    c => c.rank === capturedCard.rank && c.suit === capturedCard.suit,
  );
  if (capturedIdx === -1) {
    throw new Error(
      `playFromCaptures: captured card ${capturedCard.rank}${capturedCard.suit} not found in opponent's captures`,
    );
  }
  const [usedCard] = opponentCaptures.splice(capturedIdx, 1);

  // Case 1: Adding to own existing temp stack
  if (targetStackId) {
    const tempStack = newState.tableCards.find(
      tc => tc.type === 'temp_stack' && tc.stackId === targetStackId,
    );
    if (!tempStack) {
      throw new Error(`playFromCaptures: temp stack "${targetStackId}" not found`);
    }
    if (tempStack.owner !== playerIndex) {
      throw new Error(`playFromCaptures: cannot add to opponent's temp stack`);
    }

    tempStack.cards.push({ ...usedCard, source: 'captured' });
    tempStack.value += usedCard.value;
    return newState;
  }

  // Case 2: Creating new temp stack with loose card
  if (!targetCard?.rank || !targetCard?.suit) {
    throw new Error('playFromCaptures: no targetCard or targetStackId provided');
  }

  // Find and remove the loose target card from table
  const tableIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  if (tableIdx === -1) {
    throw new Error(
      `playFromCaptures: targetCard ${targetCard.rank}${targetCard.suit} not found as loose table card`,
    );
  }
  const [tableCard] = newState.tableCards.splice(tableIdx, 1);

  // Validate: Only allow identical ranks (pairs like 7+7, 10+10)
  if (usedCard.rank !== tableCard.rank) {
    throw new Error(
      `playFromCaptures: can only combine identical cards (${usedCard.rank} + ${tableCard.rank})`,
    );
  }

  // Tag cards with source and sort: higher-value card is base (bottom), lower-value on top
  const taggedCapturedCard = { ...usedCard, source: 'captured' };
  const taggedTableCard = { ...tableCard, source: 'table' };
  const [bottom, top] = taggedCapturedCard.value >= taggedTableCard.value
    ? [taggedCapturedCard, taggedTableCard]
    : [taggedTableCard, taggedCapturedCard];

  newState.tableCards.push({
    type: 'temp_stack',
    stackId: `temp_${Date.now()}_p${playerIndex}`,
    cards: [bottom, top],
    owner: playerIndex,
    value: tableCard.value + usedCard.value,
  });

  // No turn advance — player continues
  return newState;
}

module.exports = playFromCaptures;
