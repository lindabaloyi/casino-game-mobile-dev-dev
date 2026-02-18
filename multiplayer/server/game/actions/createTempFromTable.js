/**
 * createTempFromTable
 * Player drags a loose TABLE card onto another loose table card —
 * creating a temporary stack from two table cards.
 *
 * Rules:
 *  - Both cards must be loose table cards (no .type)
 *  - Cards must not be the same card
 *  - Player must not already own a temp stack
 *  - Turn does NOT advance — player must Accept/Cancel
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState } = require('../GameState');

/**
 * @param {object} state
 * @param {{ card: object, targetCard: object }} payload
 *   card       — the dragged loose table card
 *   targetCard — the loose table card it was dropped onto
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function createTempFromTable(state, payload, playerIndex) {
  const { card, targetCard } = payload;

  if (!card?.rank || !card?.suit) {
    throw new Error('createTempFromTable: invalid card payload');
  }
  if (!targetCard?.rank || !targetCard?.suit) {
    throw new Error('createTempFromTable: invalid targetCard payload');
  }
  if (card.rank === targetCard.rank && card.suit === targetCard.suit) {
    throw new Error('createTempFromTable: card and targetCard must be different');
  }

  const newState = cloneState(state);

  // Guard: player must not already own a pending temp stack
  const existingTemp = newState.tableCards.find(
    tc => tc.type === 'temp_stack' && tc.owner === playerIndex,
  );
  if (existingTemp) {
    throw new Error('createTempFromTable: player already has an active temp stack');
  }

  // Remove the dragged card from table (must be a loose card)
  const draggedIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
  );
  if (draggedIdx === -1) {
    throw new Error(
      `createTempFromTable: dragged card ${card.rank}${card.suit} not found as a loose table card`,
    );
  }
  const [draggedCard] = newState.tableCards.splice(draggedIdx, 1);

  // Remove the target card from table (must be a loose card)
  const targetIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  if (targetIdx === -1) {
    throw new Error(
      `createTempFromTable: target card ${targetCard.rank}${targetCard.suit} not found as a loose table card`,
    );
  }
  const [tableCard] = newState.tableCards.splice(targetIdx, 1);

  // Sort: higher-value card is the base (bottom), lower-value sits on top
  const [bottom, top] = draggedCard.value >= tableCard.value
    ? [draggedCard, tableCard]
    : [tableCard, draggedCard];

  newState.tableCards.push({
    type: 'temp_stack',
    stackId: `temp_${Date.now()}_p${playerIndex}`,
    cards: [bottom, top],
    owner: playerIndex,
    value: tableCard.value + draggedCard.value,
  });

  // ⚠️  No nextTurn() — turn advances when player Accepts
  return newState;
}

module.exports = createTempFromTable;
