/**
 * cancelTemp
 * Player cancels their pending temp stack — cards are returned to their
 * original positions and the player can make a different move.
 *
 * Rules:
 *  - Player must own an active temp stack
 *  - It must be that player's turn
 *  - Turn does NOT advance — player gets another chance to act
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState } = require('../GameState');

/**
 * @param {object} state
 * @param {{ stackId: string }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function cancelTemp(state, payload, playerIndex) {
  const { stackId } = payload;

  if (!stackId) throw new Error('cancelTemp: missing stackId');

  const newState = cloneState(state);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );

  if (stackIdx === -1) {
    throw new Error(`cancelTemp: temp stack "${stackId}" not found`);
  }

  const stack = newState.tableCards[stackIdx];
  if (stack.owner !== playerIndex) {
    throw new Error(`cancelTemp: player ${playerIndex} does not own stack "${stackId}"`);
  }

  // Remove the temp stack
  newState.tableCards.splice(stackIdx, 1);

  // cards[0] = original table card → back to table as a loose card
  // cards[1] = player's hand card → back to hand
  const [tableCard, handCard] = stack.cards;

  if (tableCard) {
    newState.tableCards.push({ rank: tableCard.rank, suit: tableCard.suit, value: tableCard.value });
  }
  if (handCard) {
    newState.playerHands[playerIndex].push({ rank: handCard.rank, suit: handCard.suit, value: handCard.value });
  }

  // Turn does NOT advance — player can make a different move
  return newState;
}

module.exports = cancelTemp;
