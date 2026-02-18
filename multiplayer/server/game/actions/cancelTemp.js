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

  // Return every card in the stack to its original location.
  // Each card carries a `source` tag ('hand' | 'table') set when it was added.
  for (const card of stack.cards) {
    // Strip the source metadata — return a clean card object
    const pureCard = { rank: card.rank, suit: card.suit, value: card.value };
    if (card.source === 'hand') {
      newState.playerHands[playerIndex].push(pureCard);
    } else {
      newState.tableCards.push(pureCard);
    }
  }

  // Turn does NOT advance — player can make a different move
  return newState;
}

module.exports = cancelTemp;
