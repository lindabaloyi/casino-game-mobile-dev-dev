/**
 * addToTemp
 * Player drags a loose TABLE card onto their existing temp stack —
 * appending it to the stack.
 *
 * Rules:
 *  - tableCard must be a loose table card (no .type)
 *  - stackId must exist in tableCards as a temp_stack
 *  - Player must own that temp stack
 *  - Turn does NOT advance — player must Accept/Cancel
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState } = require('../GameState');

/**
 * @param {object} state
 * @param {{ tableCard: object, stackId: string }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function addToTemp(state, payload, playerIndex) {
  const { tableCard, stackId } = payload;

  if (!tableCard?.rank || !tableCard?.suit) {
    throw new Error('addToTemp: invalid tableCard payload');
  }
  if (!stackId) {
    throw new Error('addToTemp: missing stackId');
  }

  const newState = cloneState(state);

  // Find and validate the temp stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`addToTemp: temp stack "${stackId}" not found`);
  }
  const stack = newState.tableCards[stackIdx];
  if (stack.owner !== playerIndex) {
    throw new Error(`addToTemp: player ${playerIndex} does not own stack "${stackId}"`);
  }

  // Remove the loose table card
  const cardIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === tableCard.rank && tc.suit === tableCard.suit,
  );
  if (cardIdx === -1) {
    throw new Error(
      `addToTemp: tableCard ${tableCard.rank}${tableCard.suit} not found as a loose table card`,
    );
  }
  const [looseCard] = newState.tableCards.splice(cardIdx, 1);

  // Append to the temp stack — tag as 'table' so cancelTemp returns it correctly
  stack.cards.push({ ...looseCard, source: 'table' });
  stack.value += looseCard.value;

  // Log the number of cards in temp stack
  console.log(`[addToTemp] Stack "${stackId}" now has ${stack.cards.length} cards:`, stack.cards.map(c => `${c.rank}${c.suit}`));

  // ⚠️  No nextTurn() — turn advances when player Accepts
  return newState;
}

module.exports = addToTemp;
