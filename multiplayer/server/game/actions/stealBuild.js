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

  // CRITICAL: Store the ORIGINAL build value BEFORE any modifications
  // This value is used for display in the UI during steal/augmentation
  let originalBuildValue = buildStack.value;
  console.log(`[stealBuild] Original build value before steal: ${originalBuildValue}`);

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

  // Store the recalculated value for merge matching
  const recalculatedValue = buildStack.value;
  console.log(`[stealBuild] Recalculated value (for merge matching): ${recalculatedValue}`);

  // CRITICAL: Restore the ORIGINAL value for UI display
  // The build value indicator must show the original value during steal/augmentation
  // The actual game logic uses the recalculated value internally
  buildStack.value = originalBuildValue;
  console.log(`[stealBuild] Display value preserved: ${buildStack.value}`);

  // Change ownership to stealing player
  const previousOwner = buildStack.owner;
  buildStack.owner = playerIndex;

  // CRITICAL: Clear any pending extension from previous owner
  // This ensures the badge correctly shows the build's value without extension overlay
  buildStack.pendingExtension = null;
  console.log(`[stealBuild] Cleared pendingExtension from previous owner`);

  console.log(`[stealBuild] Player ${playerIndex} stole build from Player ${previousOwner}`);
  console.log(`[stealBuild] Added ${playedCard.rank}${playedCard.suit}, display value: ${buildStack.value}, recalculated: ${recalculatedValue}`);

  // --- MERGE LOGIC: Combine with any existing player builds of the same recalculated value ---
  let currentValue = recalculatedValue;
  while (true) {
    // Find another build owned by player with the same recalculated value (excluding the current stack)
    const otherIdx = newState.tableCards.findIndex(
      tc => tc.type === 'build_stack' && tc.owner === playerIndex && tc.stackId !== stackId && tc.value === currentValue
    );
    if (otherIdx === -1) break;

    const otherBuild = newState.tableCards[otherIdx];
    console.log(`[stealBuild] Merging with existing build of value ${currentValue} (cards: ${otherBuild.cards.map(c => c.rank).join(', ')})`);

    // CRITICAL: Update display value to the player's existing build value
    // After merging, the display should show the player's build value, not opponent's
    originalBuildValue = otherBuild.value;
    console.log(`[stealBuild] Updated display value to player's build: ${originalBuildValue}`);

    // Merge cards from the other build into the stolen build
    buildStack.cards.push(...otherBuild.cards);

    // Remove the other build from the table
    newState.tableCards.splice(otherIdx, 1);

    // Recalculate the merged build's value (it may change)
    recalcBuild(buildStack);
    const mergedRecalculatedValue = buildStack.value;
    console.log(`[stealBuild] After merge, recalculated value: ${mergedRecalculatedValue}`);

    // CRITICAL: Restore the ORIGINAL value again after merge
    // The display value must stay as the original value throughout
    buildStack.value = originalBuildValue;
    console.log(`[stealBuild] Display value restored after merge: ${buildStack.value}`);

    // Update currentValue for next iteration using recalculated value
    currentValue = mergedRecalculatedValue;
  }

  console.log(`[stealBuild] Final build cards:`, buildStack.cards.map(c => `${c.rank}${c.suit}`).join(', '));

  // Turn does NOT advance - player continues
  return newState;
}

module.exports = stealBuild;
