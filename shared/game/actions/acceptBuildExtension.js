/**
 * acceptBuildExtension
 * Player accepts their build extension.
 */

const { cloneState, nextTurn } = require('../');

// Helper: Convert card rank to numeric value (Ace = 1, 2-10 as numbers)
function rankToValue(rank) {
  console.log(`[rankToValue] Converting rank: ${rank}`);
  if (rank === 'A') {
    console.log(`[rankToValue] Rank "A" -> 1`);
    return 1;
  }
  const result = parseInt(rank, 10);
  console.log(`[rankToValue] Rank "${rank}" -> ${result}`);
  return result;
}

// Helper: Check if a contiguous subarray sums to target
function hasContiguousSubset(values, target) {
  console.log(`[hasContiguousSubset] Checking if any contiguous subset of [${values}] sums to ${target}`);
  for (let start = 0; start < values.length; start++) {
    console.log(`[hasContiguousSubset] Starting at index ${start}`);
    let sum = 0;
    let subset = [];
    for (let end = start; end < values.length; end++) {
      sum += values[end];
      subset.push(values[end]);
      console.log(`[hasContiguousSubset] start=${start}, end=${end}, subset=[${subset}], sum=${sum}`);
      if (sum === target) {
        console.log(`[hasContiguousSubset] ✅ FOUND! subset [${subset}] sums to ${target}`);
        return true;
      }
      if (sum > target) {
        console.log(`[hasContiguousSubset] sum ${sum} > target ${target}, breaking`);
        break;
      }
    }
  }
  console.log(`[hasContiguousSubset] ❌ No contiguous subset found that sums to ${target}`);
  return false;
}

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
    console.log(`[acceptBuildExtension] Pending extension has cards array with ${buildStack.pendingExtension.cards.length} cards`);
    pendingCards = buildStack.pendingExtension.cards.map(p => p.card);
  } else {
    console.log(`[acceptBuildExtension] Pending extension has looseCard`);
    pendingCards = [buildStack.pendingExtension.looseCard];
  }

  console.log(`[acceptBuildExtension] Pending cards: ${pendingCards.map(c => `${c.rank}${c.suit}`).join(', ')}`);

  // Get the build's target value and type
  const target = buildStack.value;
  console.log(`[acceptBuildExtension] Build target (raw): ${target}, type: ${typeof target}`);
  const targetNum = typeof target === 'number' ? target : rankToValue(target);
  console.log(`[acceptBuildExtension] Build target (numeric): ${targetNum}`);

  // Extract numeric values from pending cards (in order they were added)
  console.log(`[acceptBuildExtension] Converting pending card ranks to values...`);
  const pendingValues = pendingCards.map(p => rankToValue(p.rank));
  console.log(`[acceptBuildExtension] Pending card values: [${pendingValues.join(', ')}]`);

  // Determine build type – default to 'sum' if not specified
  const buildType = buildStack.buildType || 'sum';
  console.log(`[acceptBuildExtension] Build type: ${buildType}`);

  let isValid = false;

  // Use contiguous subset detection for ALL build types (sum and diff)
  // This allows pending cards like [6,3,1,10,8,2] with target 10 to be valid
  // if any contiguous subset sums to the target (e.g., 6+3+1=10, 8+2=10, or single 10)
  console.log(`[acceptBuildExtension] Using contiguous subset validation for all build types`);
  isValid = hasContiguousSubset(pendingValues, targetNum);
  console.log(`[acceptBuildExtension] Validation result: ${isValid ? 'PASSED' : 'FAILED'}`);

  if (!isValid) {
    throw new Error(
      `acceptBuildExtension: pending cards cannot form build of value ${targetNum} (${buildType} build)`
    );
  }

  // Calculate the new build result based on the extension
  let buildResult;
  const addedPendingValue = pendingCards.reduce((sum, c) => sum + c.value, 0);
  console.log(`[acceptBuildExtension] Added pending value: ${addedPendingValue}`);

  if (addedPendingValue === targetNum) {
    console.log(`[acceptBuildExtension] addedPendingValue (${addedPendingValue}) === targetNum (${targetNum}) -> extend-same`);
    buildResult = { value: targetNum, base: targetNum, need: 0, buildType: 'extend-same' };
  } else if (addedPendingValue < targetNum) {
    const need = targetNum - addedPendingValue;
    console.log(`[acceptBuildExtension] addedPendingValue (${addedPendingValue}) < targetNum (${targetNum}) -> extend-need, need=${need}`);
    buildResult = { value: targetNum, base: targetNum, need: need, buildType: 'extend-need' };
  } else {
    console.log(`[acceptBuildExtension] addedPendingValue (${addedPendingValue}) > targetNum (${targetNum}) -> recalculating build value`);
    const allCards = [...buildStack.cards, ...pendingCards];
    console.log(`[acceptBuildExtension] All cards for recalculation: ${allCards.map(c => `${c.rank}${c.suit}`).join(', ')}`);
    buildResult = calculateBuildValue(allCards);
    console.log(`[acceptBuildExtension] Recalculated build result:`, buildResult);
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
