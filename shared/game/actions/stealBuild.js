/**
 * stealBuild
 * Player steals an opponent's build by adding a card from their hand.
 */

const { cloneState } = require('../GameState');

function stealBuild(state, payload, playerIndex) {
  const card = payload.card || payload.handCard;
  const stackId = payload.stackId;

  if (!card || !stackId) {
    throw new Error('stealBuild: missing card or stackId');
  }

  const newState = cloneState(state);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`stealBuild: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  if (buildStack.owner === playerIndex) {
    throw new Error('stealBuild: cannot steal your own build');
  }

  if (buildStack.hasBase === true) {
    throw new Error('stealBuild: cannot steal base builds');
  }

  const playerBuilds = newState.tableCards.filter(
    tc => tc.type === 'build_stack' && tc.owner === playerIndex
  );
  const hasExistingBuild = playerBuilds.length > 0;

  const opponentOriginalValue = buildStack.value;

  const hand = newState.playerHands[playerIndex];
  const handIdx = hand.findIndex(
    c => c.rank === card.rank && c.suit === card.suit,
  );
  if (handIdx === -1) {
    throw new Error(`stealBuild: card ${card.rank}${card.suit} not in hand`);
  }

  const [playedCard] = hand.splice(handIdx, 1);
  buildStack.cards.push({ ...playedCard, source: 'hand' });

  const recalcBuild = (build) => {
    const totalSum = build.cards.reduce((sum, c) => sum + c.value, 0);
    if (totalSum <= 10) {
      build.value = totalSum;
      build.base = totalSum;
      build.need = 0;
      build.buildType = 'sum';
    } else {
      const sorted = [...build.cards].sort((a, b) => b.value - a.value);
      const base = sorted[0].value;
      const otherSum = sorted.slice(1).reduce((sum, c) => sum + c.value, 0);
      build.value = base;
      build.base = base;
      build.need = base - otherSum;
      build.buildType = 'diff';
    }
  };

  recalcBuild(buildStack);
  const recalculatedValue = buildStack.value;

  const previousOwner = buildStack.owner;
  buildStack.owner = playerIndex;
  buildStack.pendingExtension = null;

  let finalDisplayValue;
  if (hasExistingBuild) {
    let currentValue = recalculatedValue;
    let mergedWithAny = false;
    while (true) {
      const otherIdx = newState.tableCards.findIndex(
        tc => tc.type === 'build_stack' && tc.owner === playerIndex && tc.stackId !== stackId && tc.value === currentValue
      );
      if (otherIdx === -1) break;

      const otherBuild = newState.tableCards[otherIdx];
      finalDisplayValue = otherBuild.value;
      buildStack.cards.push(...otherBuild.cards);
      newState.tableCards.splice(otherIdx, 1);
      recalcBuild(buildStack);
      const newRecalcValue = buildStack.value;
      currentValue = newRecalcValue;
      mergedWithAny = true;
    }

    if (mergedWithAny) {
      buildStack.value = finalDisplayValue;
    } else {
      buildStack.value = recalculatedValue;
    }
  } else {
    buildStack.value = recalculatedValue;
  }

  return newState;
}

module.exports = stealBuild;
