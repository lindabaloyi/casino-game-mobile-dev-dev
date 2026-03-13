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

// Helper to sort cards in ascending order by value (smallest on top)
function sortBuildCards(cards) {
  return cards.sort((a, b) => a.value - b.value);
}

function calculateBuildValue(cards) {
  const totalSum = cards.reduce((sum, c) => sum + c.value, 0);
  
  if (totalSum <= 10) {
    return { value: totalSum, base: totalSum, need: 0, buildType: 'sum' };
  } else {
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    const base = sorted[0].value;
    const otherSum = sorted.slice(1).reduce((sum, c) => sum + c.value, 0);
    const need = base - otherSum;
    return { value: base, base: base, need: need, buildType: need === 0 ? 'diff' : 'diff-incomplete' };
  }
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

  if (addedPendingValue === originalValue) {
    buildResult = { value: originalValue, base: originalValue, need: 0, buildType: 'extend-same' };
  } else if (addedPendingValue < originalValue) {
    const need = originalValue - addedPendingValue;
    buildResult = { value: originalValue, base: originalValue, need: need, buildType: 'extend-need' };
  } else {
    const allCards = [...buildStack.cards, ...pendingCards];
    buildResult = calculateBuildValue(allCards);
  }

  // Merge cards
  buildStack.cards = [...buildStack.cards, ...pendingCards];

  // --- AUTO-SORT: smallest on top, largest at bottom ---
  sortBuildCards(buildStack.cards);

  buildStack.value = buildResult.value;
  buildStack.base = buildResult.base;
  buildStack.need = buildResult.need;
  buildStack.buildType = buildResult.buildType;
  buildStack.pendingExtension = null;

  return nextTurn(newState);
}

module.exports = acceptBuildExtension;
