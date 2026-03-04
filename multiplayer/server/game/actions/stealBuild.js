/**
 * stealBuild
 * Player steals an opponent's build by adding a card from their hand.
 * 
 * Rules:
 * - Target must be an opponent's build (build_stack)
 * - Card must be from stealing player's hand
 * - Adding the card must create a valid new build (subset sum check)
 * - **OWNERSHIP CHANGES** to the stealing player
 * - If the player already has a build of the same value as the new stolen build,
 *   the two builds are merged into one (cards combined, value recalculated).
 * - Turn does NOT advance - player continues
 */

const { cloneState } = require('../GameState');

function stealBuild(state, payload, playerIndex) {
  const card = payload.card || payload.handCard;
  const stackId = payload.stackId;

  if (!card || !stackId) {
    throw new Error('stealBuild: missing card or stackId');
  }

  const newState = cloneState(state);

  // Find the opponent's build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`stealBuild: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  // Validate: must be opponent's build
  if (buildStack.owner === playerIndex) {
    throw new Error('stealBuild: cannot steal your own build');
  }

  // Validate: cannot steal base builds
  if (buildStack.hasBase === true) {
    throw new Error('stealBuild: cannot steal base builds');
  }

  // Check if player already has any builds
  const playerBuilds = newState.tableCards.filter(
    tc => tc.type === 'build_stack' && tc.owner === playerIndex
  );
  const hasExistingBuild = playerBuilds.length > 0;

  // Store the original build value of the opponent (for potential display in non‑merge case)
  const opponentOriginalValue = buildStack.value;

  // Find and remove card from player's hand
  const hand = newState.playerHands[playerIndex];
  const handIdx = hand.findIndex(
    c => c.rank === card.rank && c.suit === card.suit,
  );
  if (handIdx === -1) {
    throw new Error(`stealBuild: card ${card.rank}${card.suit} not in hand`);
  }

  const [playedCard] = hand.splice(handIdx, 1);

  // Add card to the opponent's build
  buildStack.cards.push({ ...playedCard, source: 'hand' });

  // Recalculate build value using same logic as addToTemp
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
  console.log(`[stealBuild] Recalculated value: ${recalculatedValue}`);

  // Change ownership to stealing player
  const previousOwner = buildStack.owner;
  buildStack.owner = playerIndex;

  // Clear any pending extension from previous owner
  buildStack.pendingExtension = null;

  console.log(`[stealBuild] Player ${playerIndex} stole build from Player ${previousOwner}`);
  console.log(`[stealBuild] Added ${playedCard.rank}${playedCard.suit}`);

  // --- MERGE LOGIC (only if player has existing builds) ---
  let finalDisplayValue;
  if (hasExistingBuild) {
    // Player has at least one build – we will merge any that match the recalculated value.
    let currentValue = recalculatedValue;
    let mergedWithAny = false;
    while (true) {
      // Find another build owned by player with the same current value (excluding the current stack)
      const otherIdx = newState.tableCards.findIndex(
        tc => tc.type === 'build_stack' && tc.owner === playerIndex && tc.stackId !== stackId && tc.value === currentValue
      );
      if (otherIdx === -1) break;

      const otherBuild = newState.tableCards[otherIdx];
      console.log(`[stealBuild] Merging with existing build of value ${currentValue} (cards: ${otherBuild.cards.map(c => c.rank).join(', ')})`);

      // The display value after merge should be the player's original build value (the one we are merging with)
      finalDisplayValue = otherBuild.value; // will be overwritten if multiple merges, but they are same value

      // Merge cards from the other build into the stolen build
      buildStack.cards.push(...otherBuild.cards);

      // Remove the other build from the table
      newState.tableCards.splice(otherIdx, 1);

      // Recalculate the merged build's value (it may change)
      recalcBuild(buildStack);
      const newRecalcValue = buildStack.value;
      console.log(`[stealBuild] After merge, recalculated value: ${newRecalcValue}`);

      // Update currentValue for the next iteration
      currentValue = newRecalcValue;
      mergedWithAny = true;
    }

    if (mergedWithAny) {
      // After all merges, set the displayed value to the original player build's value (which we captured)
      buildStack.value = finalDisplayValue;
      console.log(`[stealBuild] Display value set to player's original build value: ${buildStack.value}`);
    } else {
      // Player had builds, but none matched the recalculated value – this should never happen because validator would have blocked it.
      // As a fallback, use the recalculated value.
      buildStack.value = recalculatedValue;
      console.warn(`[stealBuild] No matching build found despite validation – using recalculated value`);
    }
  } else {
    // No existing builds – use the recalculated value as the final display value
    buildStack.value = recalculatedValue;
    console.log(`[stealBuild] No existing builds – display value set to recalculated: ${buildStack.value}`);
  }

  console.log(`[stealBuild] Final build cards:`, buildStack.cards.map(c => `${c.rank}${c.suit}`).join(', '));

  // Turn does NOT advance - player continues
  return newState;
}

module.exports = stealBuild;
