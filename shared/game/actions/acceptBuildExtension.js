/**
 * acceptBuildExtension
 * Player accepts their build extension.
 * Simplified: accepts any pending extension without excess/need validation.
 * In party mode (4-player), teammates can accept each other's build extensions.
 */

const { cloneState, nextTurn } = require('../');

// Helper to check if two players are teammates in a 4‑player game
function areTeammates(playerA, playerB) {
  // Players 0,1 = Team A ; Players 2,3 = Team B
  return (playerA < 2 && playerB < 2) || (playerA >= 2 && playerB >= 2);
}


function acceptBuildExtension(state, payload, playerIndex) {
  const { stackId } = payload;

  if (!stackId) {
    throw new Error('acceptBuildExtension: missing stackId');
  }

  const newState = cloneState(state);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`acceptBuildExtension: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  const isPartyMode = newState.playerCount === 4;
  const owner = buildStack.owner;

  // Validate permission to accept extension
  let allowed = false;
  if (isPartyMode) {
    // Teammates can accept each other's build extensions
    allowed = areTeammates(owner, playerIndex);
  } else {
    // Duel mode: only the owner can accept
    allowed = owner === playerIndex;
  }

  if (!allowed) {
    throw new Error('acceptBuildExtension: only owner can extend their build');
  }

  if (!buildStack.pendingExtension?.looseCard && !buildStack.pendingExtension?.cards) {
    throw new Error('acceptBuildExtension: no pending extension to accept');
  }

  let pendingCards = [];
  if (buildStack.pendingExtension.cards) {
    pendingCards = buildStack.pendingExtension.cards.map(p => p.card);
  } else {
    pendingCards = [buildStack.pendingExtension.looseCard];
  }

  const originalValue = buildStack.value;
  const addedPendingValue = pendingCards.reduce((sum, c) => sum + c.value, 0);
  let buildResult;

  // Keep original build value - only merge cards, don't recalculate
  if (addedPendingValue <= originalValue) {
    // Exact match or need - keep original value
    const need = originalValue - addedPendingValue;
    buildResult = { 
      value: originalValue, 
      base: originalValue, 
      need: need, 
      buildType: need === 0 ? 'extend-same' : 'extend-need' 
    };
  } else {
    // Excess - keep original value, calculate need based on excess
    const excess = addedPendingValue - originalValue;
    // For excess, treat as need = 0 since we have more than needed
    buildResult = { 
      value: originalValue, 
      base: originalValue, 
      need: 0, 
      buildType: 'extend-same' 
    };
  }

  // Merge cards (preserving insertion order)
  buildStack.cards = [...buildStack.cards, ...pendingCards];

  buildStack.value = buildResult.value;
  buildStack.base = buildResult.base;
  buildStack.need = buildResult.need;
  buildStack.buildType = buildResult.buildType;
  buildStack.pendingExtension = null;

  return nextTurn(newState);
}

module.exports = acceptBuildExtension;
