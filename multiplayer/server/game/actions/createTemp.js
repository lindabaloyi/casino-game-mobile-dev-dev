/**
 * createTemp
 * Player drops a hand card onto a loose table card — creating a temporary stack.
 *
 * Rules:
 *  - Dragged card must be in player's hand
 *  - Target must be a loose card on the table (not already part of a temp_stack)
 *  - Player must not already own a temp stack
 *  - Turn does NOT advance — the player must still confirm (accept/cancel)
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState } = require('../GameState');

/**
 * @param {object} state
 * @param {{ card: object, targetCard: object }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function createTemp(state, payload, playerIndex) {
  const { card, targetCard } = payload;

  if (!card?.rank || !card?.suit) {
    throw new Error('createTemp: invalid card payload');
  }
  if (!targetCard?.rank || !targetCard?.suit) {
    throw new Error('createTemp: invalid targetCard payload');
  }

  const newState = cloneState(state);
  const hand = newState.playerHands[playerIndex];

  // Guard: player must not already own a pending temp stack
  const existingTemp = newState.tableCards.find(
    tc => tc.type === 'temp_stack' && tc.owner === playerIndex,
  );
  if (existingTemp) {
    throw new Error('createTemp: player already has an active temp stack');
  }

  // Remove dragged card from hand
  const handIdx = hand.findIndex(
    c => c.rank === card.rank && c.suit === card.suit,
  );
  if (handIdx === -1) {
    throw new Error(
      `createTemp: card ${card.rank}${card.suit} not in player ${playerIndex}'s hand`,
    );
  }
  const [handCard] = hand.splice(handIdx, 1);

  // Remove target from table — must be a plain loose card (no .type)
  const tableIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  if (tableIdx === -1) {
    throw new Error(
      `createTemp: targetCard ${targetCard.rank}${targetCard.suit} not found as a loose table card`,
    );
  }
  const [tableCard] = newState.tableCards.splice(tableIdx, 1);

  // Sort: higher-value card is the base (bottom), lower-value sits on top
  const [bottom, top] = handCard.value >= tableCard.value
    ? [handCard, tableCard]
    : [tableCard, handCard];

  newState.tableCards.push({
    type: 'temp_stack',
    stackId: `temp_${Date.now()}_p${playerIndex}`,
    cards: [bottom, top],
    owner: playerIndex,
    value: tableCard.value + handCard.value,
  });

  // ⚠️  No nextTurn() — turn advances when the overlay Accept/Cancel is added
  return newState;
}

module.exports = createTemp;
