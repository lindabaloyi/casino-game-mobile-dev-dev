/**
 * addToBuild
 * Player adds a card to their existing build.
 */

const { cloneState } = require('../');

// Helper to check if two players are teammates in a 4‑player game
function areTeammates(playerA, playerB) {
  // Players 0,1 = Team A ; Players 2,3 = Team B
  return (playerA < 2 && playerB < 2) || (playerA >= 2 && playerB >= 2);
}

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

  const isPartyMode = newState.playerCount === 4 && newState.players.some(p => p.team);
  const owner = buildStack.owner;

  // Validate permission to add to build
  let allowed = false;
  if (isPartyMode) {
    // Teammates can add to each other's builds
    allowed = areTeammates(owner, playerIndex);
  } else {
    // Duel mode: only the owner can add to their build
    allowed = owner === playerIndex;
  }

  if (!allowed) {
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
  // In party mode: check ALL opponents; in duel mode: check single opponent
  let opponentHasSameValue = false;
  
  if (newState.isPartyMode) {
    // Party mode: check both opponents
    const opponentIndices = playerIndex < 2 ? [2, 3] : [0, 1];
    for (const oIdx of opponentIndices) {
      const opponentBuilds = newState.tableCards.filter(
        tc => tc.type === 'build_stack' && tc.owner === oIdx && tc.stackId !== stackId
      );
      if (opponentBuilds.some(build => build.value === newValue)) {
        opponentHasSameValue = true;
        break;
      }
    }
  } else {
    // Duel mode: check single opponent
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponentBuilds = newState.tableCards.filter(
      tc => tc.type === 'build_stack' && tc.owner === opponentIndex && tc.stackId !== stackId
    );
    opponentHasSameValue = opponentBuilds.some(build => build.value === newValue);
  }
  
  if (opponentHasSameValue) {
    throw new Error(
      `addToBuild: Cannot have build with value ${newValue} - opponent already has a build with this value`
    );
  }

  return newState;
}

module.exports = addToBuild;
