/**
 * stealBuild
 * Player steals an opponent's build by adding a card from their hand.
 */

const { cloneState } = require('../');

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

  const hand = newState.players[playerIndex].hand;
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
  // Debug: Log before and after hasBase assignment
  const beforeHasBase = buildStack.hasBase;
  console.log(`[stealBuild] BEFORE: buildStack.buildType: ${buildStack.buildType}, hasBase: ${beforeHasBase}`);
  
  buildStack.hasBase = (buildStack.buildType !== 'sum');
  
  console.log(`[stealBuild] AFTER: buildStack.buildType: ${buildStack.buildType}, hasBase: ${buildStack.hasBase} (buildType !== 'sum' is ${buildStack.hasBase})`);
  
  // --- VALIDATION: Check if opponent already has a build with the same value ---
  // In party mode: check ALL opponents; in duel mode: check single opponent
  let opponentHasSameValue = false;
  
  if (state.isPartyMode) {
    // Party mode: check both opponents
    const opponentIndices = playerIndex < 2 ? [2, 3] : [0, 1];
    for (const oIdx of opponentIndices) {
      const opponentBuilds = newState.tableCards.filter(
        tc => tc.type === 'build_stack' && tc.owner === oIdx && tc.stackId !== stackId
      );
      if (opponentBuilds.some(build => build.value === buildStack.value)) {
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
    opponentHasSameValue = opponentBuilds.some(build => build.value === buildStack.value);
  }
  
  if (opponentHasSameValue) {
    throw new Error(
      `stealBuild: Cannot have build with value ${buildStack.value} - opponent already has a build with this value`
    );
  }
  
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
