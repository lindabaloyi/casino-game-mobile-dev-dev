/**
 * declineBuildExtension
 * Player declines/cancels their build extension.
 */

const { cloneState } = require('../');

// Helper to check if two players are teammates in a 4‑player game
function areTeammates(playerA, playerB) {
  // Players 0,1 = Team A ; Players 2,3 = Team B
  return (playerA < 2 && playerB < 2) || (playerA >= 2 && playerB >= 2);
}

function declineBuildExtension(state, payload, playerIndex) {
  const { stackId } = payload;

  if (!stackId) {
    throw new Error('declineBuildExtension: missing stackId');
  }

  const newState = cloneState(state);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`declineBuildExtension: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  const isPartyMode = newState.playerCount === 4;
  const owner = buildStack.owner;

  // Validate permission to decline extension
  let allowed = false;
  if (isPartyMode) {
    // Teammates can decline each other's build extensions
    allowed = areTeammates(owner, playerIndex);
  } else {
    // Duel mode: only the owner can decline
    allowed = owner === playerIndex;
  }

  if (!allowed) {
    throw new Error('declineBuildExtension: only owner can decline their build extension');
  }

  if (!buildStack.pendingExtension?.looseCard && !buildStack.pendingExtension?.cards) {
    throw new Error('declineBuildExtension: no pending extension to decline');
  }

  let pendingCards = [];
  if (buildStack.pendingExtension.cards) {
    pendingCards = buildStack.pendingExtension.cards;
  } else {
    pendingCards = [{ card: buildStack.pendingExtension.looseCard, source: buildStack.pendingExtension.looseCard.source }];
  }

  // Return each pending card to its original source
  for (const pending of pendingCards) {
    const { card, source } = pending;
    if (source === 'hand') {
      newState.players[playerIndex].hand.push({ ...card });
    } else if (source === 'table' || source === undefined) {
      newState.tableCards.push({ rank: card.rank, suit: card.suit, value: card.value });
    } else if (source === 'captured') {
      newState.players[playerIndex].captures.push({ ...card });
    }
  }

  buildStack.pendingExtension = null;

  return newState;
}

module.exports = declineBuildExtension;
