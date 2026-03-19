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

  // Sort cards: big cards at bottom (index 0), small cards at top (last index)
  // Descending order by value
  buildStack.cards.sort((a, b) => b.value - a.value);

  // DEBUG: Log card order after sorting
  console.log(`[stealBuild] DEBUG: Cards AFTER sort: ${buildStack.cards.map(c => c.value).join(', ')}`);

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
  // DEBUG: Log card order after recalcBuild (first call after adding stolen card)
  console.log(`[stealBuild] DEBUG: Cards AFTER recalcBuild: ${buildStack.cards.map(c => c.value).join(', ')}`);
  // Debug: Log before and after hasBase assignment
  const beforeHasBase = buildStack.hasBase;
  console.log(`[stealBuild] BEFORE: buildStack.buildType: ${buildStack.buildType}, hasBase: ${beforeHasBase}`);
  
  buildStack.hasBase = (buildStack.buildType !== 'sum');
  
  console.log(`[stealBuild] AFTER: buildStack.buildType: ${buildStack.buildType}, hasBase: ${buildStack.hasBase} (buildType !== 'sum' is ${buildStack.hasBase})`);
  
  // --- VALIDATION: Check opponent(s) don't have build with same value ---
  // In party mode: check both opponents; in 2-hands mode: check single opponent
  let opponentHasSameValue = false;
  
  if (state.playerCount === 4) {
    // Party mode: check BOTH opponents (not teammates)
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
    
    if (opponentHasSameValue) {
      throw new Error(
        `stealBuild: Cannot have build with value ${buildStack.value} - opponent already has a build with this value`
      );
    }
    
    // Note: We DON'T require a merge target - player can steal to own!
    // If they have no existing builds, they become the owner.
    // If they have a build with same value, merge logic below handles it.
    console.log(`[stealBuild] ✅ Steal allowed - player will become owner (hasExistingBuild: ${hasExistingBuild})`);
  } else {
    // Duel mode: check single opponent (original behavior)
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponentBuilds = newState.tableCards.filter(
      tc => tc.type === 'build_stack' && tc.owner === opponentIndex && tc.stackId !== stackId
    );
    opponentHasSameValue = opponentBuilds.some(build => build.value === buildStack.value);
    
    if (opponentHasSameValue) {
      throw new Error(
        `stealBuild: Cannot have build with value ${buildStack.value} - opponent already has a build with this value`
      );
    }
  }
  
  const recalculatedValue = buildStack.value;

  const previousOwner = buildStack.owner;
  
  // Determine ownership after steal:
  // - Party mode: if merging with teammate, keep teammate as owner
  // - Otherwise: transfer to current player
  let newOwner = playerIndex;
  
  // Check if we're merging with teammate (we already checked this above)
  if (state.playerCount === 4) {
    const teammateIndex = playerIndex ^ 1;
    const myMatch = hasExistingBuild && newState.tableCards.some(
      tc => tc.type === 'build_stack' && tc.owner === playerIndex && tc.stackId !== stackId && tc.value === recalculatedValue
    );
    
    if (!myMatch) {
      // Check if merging with teammate
      const teammateMatch = newState.tableCards.some(
        tc => tc.type === 'build_stack' && tc.owner === teammateIndex && tc.stackId !== stackId && tc.value === recalculatedValue
      );
      
      if (teammateMatch) {
        // Keep teammate as owner when merging with teammate's build
        newOwner = teammateIndex;
        console.log(`[stealBuild] 🏠 Keeping teammate (Player ${teammateIndex}) as owner after merge`);
      }
    }
  }
  
  buildStack.owner = newOwner;
  buildStack.pendingExtension = null;

  let finalDisplayValue;
  
  // Party mode: Check for merge with MY build OR TEAMMATE'S build
  if (state.playerCount === 4) {
    const teammateIndex = playerIndex ^ 1;
    
    // First try to merge with MY builds
    if (hasExistingBuild) {
      let currentValue = recalculatedValue;
      let mergedWithMyBuild = false;
      
      while (true) {
        const myBuildIdx = newState.tableCards.findIndex(
          tc => tc.type === 'build_stack' && tc.owner === playerIndex && tc.stackId !== stackId && tc.value === currentValue
        );
        if (myBuildIdx === -1) break;

        const myBuild = newState.tableCards[myBuildIdx];
        finalDisplayValue = myBuild.value;
        buildStack.cards.push(...myBuild.cards);
        newState.tableCards.splice(myBuildIdx, 1);
        // Sort after merge: big cards at bottom, small cards at top
        buildStack.cards.sort((a, b) => b.value - a.value);
        recalcBuild(buildStack);
        const newRecalcValue = buildStack.value;
        currentValue = newRecalcValue;
        mergedWithMyBuild = true;
      }

      if (mergedWithMyBuild) {
        buildStack.value = finalDisplayValue;
      } else {
        // Try to merge with TEAMMATE'S builds
        let currentValue = recalculatedValue;
        let mergedWithTeammate = false;
        
        while (true) {
          const teammateBuildIdx = newState.tableCards.findIndex(
            tc => tc.type === 'build_stack' && tc.owner === teammateIndex && tc.stackId !== stackId && tc.value === currentValue
          );
          if (teammateBuildIdx === -1) break;

          const teammateBuild = newState.tableCards[teammateBuildIdx];
          finalDisplayValue = teammateBuild.value;
          buildStack.cards.push(...teammateBuild.cards);
          newState.tableCards.splice(teammateBuildIdx, 1);
          // Sort after merge: big cards at bottom, small cards at top
          buildStack.cards.sort((a, b) => b.value - a.value);
          recalcBuild(buildStack);
          const newRecalcValue = buildStack.value;
          currentValue = newRecalcValue;
          mergedWithTeammate = true;
        }

        if (mergedWithTeammate) {
          buildStack.value = finalDisplayValue;
        } else {
          buildStack.value = recalculatedValue;
        }
      }
    } else {
      // No existing build - try to merge with teammate
      let currentValue = recalculatedValue;
      let mergedWithTeammate = false;
      
      while (true) {
        const teammateBuildIdx = newState.tableCards.findIndex(
          tc => tc.type === 'build_stack' && tc.owner === teammateIndex && tc.stackId !== stackId && tc.value === currentValue
        );
        if (teammateBuildIdx === -1) break;

        const teammateBuild = newState.tableCards[teammateBuildIdx];
        finalDisplayValue = teammateBuild.value;
        buildStack.cards.push(...teammateBuild.cards);
        newState.tableCards.splice(teammateBuildIdx, 1);
        // Sort after merge: big cards at bottom, small cards at top
        buildStack.cards.sort((a, b) => b.value - a.value);
        recalcBuild(buildStack);
        const newRecalcValue = buildStack.value;
        currentValue = newRecalcValue;
        mergedWithTeammate = true;
      }

      if (mergedWithTeammate) {
        buildStack.value = finalDisplayValue;
      } else {
        buildStack.value = recalculatedValue;
      }
    }
  } else {
    // Duel mode: original merge logic
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
        // Sort after merge: big cards at bottom, small cards at top
        buildStack.cards.sort((a, b) => b.value - a.value);
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
  }

  // DEBUG: Final card order before returning
  console.log(`[stealBuild] DEBUG: Final card order: ${buildStack.cards.map(c => c.value).join(', ')}`);
  
  return newState;
}

module.exports = stealBuild;
