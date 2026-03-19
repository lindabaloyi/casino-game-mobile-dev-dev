/**
 * cancelTemp
 * Player cancels their pending temp stack.
 */

const { cloneState } = require('../');

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

  newState.tableCards.splice(stackIdx, 1);

  for (const card of stack.cards) {
    const pureCard = { rank: card.rank, suit: card.suit, value: card.value };
    if (card.source === 'hand') {
      newState.players[playerIndex].hand.push(pureCard);
    } else if (card.source === 'captured') {
      // In party mode, try to return to original owner if available
      if (card.originalOwner !== undefined) {
        newState.players[card.originalOwner].captures.push(pureCard);
      } else {
        // Fallback to 2-hands mode logic (return to opponent)
        const opponentIndex = playerIndex === 0 ? 1 : 0;
        newState.players[opponentIndex].captures.push(pureCard);
      }
    } else {
      newState.tableCards.push(pureCard);
    }
  }

  return newState;
}

module.exports = cancelTemp;
