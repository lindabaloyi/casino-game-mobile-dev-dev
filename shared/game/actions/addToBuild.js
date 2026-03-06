/**
 * addToBuild
 * Player adds a card to their existing build.
 */

const { cloneState } = require('../');

function addToBuild(state, payload, playerIndex) {
  const card = payload.card || payload.handCard;
  const stackId = payload.stackId;

  if (!card || !stackId) {
    throw new Error('addToBuild: missing card or stackId');
  }

  const newState = cloneState(state);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`addToBuild: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  if (buildStack.owner !== playerIndex) {
    throw new Error('addToBuild: cannot add to opponent\'s build');
  }

  const hand = newState.players[playerIndex].hand;
  const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
  if (handIdx === -1) {
    throw new Error(`addToBuild: card ${card.rank}${card.suit} not in hand`);
  }

  const [playedCard] = hand.splice(handIdx, 1);
  buildStack.cards.push({ ...playedCard, source: 'hand' });

  const newValue = buildStack.cards.reduce((sum, c) => sum + c.value, 0);
  buildStack.value = newValue;
  
  // --- VALIDATION: Check if opponent already has a build with the same value ---
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const opponentBuilds = newState.tableCards.filter(
    tc => tc.type === 'build_stack' && tc.owner === opponentIndex && tc.stackId !== stackId
  );
  
  const opponentHasSameValue = opponentBuilds.some(build => build.value === newValue);
  
  if (opponentHasSameValue) {
    throw new Error(
      `addToBuild: Cannot have build with value ${newValue} - opponent already has a build with this value`
    );
  }

  return newState;
}

module.exports = addToBuild;
