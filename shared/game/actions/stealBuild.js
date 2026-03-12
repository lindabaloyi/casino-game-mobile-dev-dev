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
  
  // --- VALIDATION: Party Mode - Check self + teammate for merge ---
  // In party mode: check if we or our teammate has a build with same value
  // If match found → will merge (no error). If no match → error (duplicate not allowed)
  let hasMergeTarget = false;
  
  if (state.playerCount === 4) {
    // Check 1: MY builds (already done in merge logic below, but track here)
    const myBuilds = newState.tableCards.filter(
      tc => tc.type === 'build_stack' && tc.owner === playerIndex && tc.stackId !== stackId
    );
    const myMatch = myBuilds.some(build => build.value === buildStack.value);
    
    if (myMatch) {
      console.log(`[stealBuild] ✅ Will merge with MY build (value ${buildStack.value})`);
      hasMergeTarget = true;
    } else {
      // Check 2: TEAMMATE'S builds
      const teammateIndex = playerIndex ^ 1; // XOR to get teammate
      const teammateBuilds = newState.tableCards.filter(
        tc => tc.type === 'build_stack' && tc.owner === teammateIndex
      );
      const teammateMatch = teammateBuilds.some(build => build.value === buildStack.value);
      
      if (teammateMatch) {
        console.log(`[stealBuild] ✅ Will merge with TEAMMATE (Player ${teammateIndex}) build (value ${buildStack.value})`);
        hasMergeTarget = true;
      }
    }
    
    // If no merge target found → error (cannot have duplicate builds)
    if (!hasMergeTarget) {
      throw new Error(
        `stealBuild: Cannot steal - no merge target. Must match MY or TEAMMATE'S build value (${buildStack.value})`
      );
    }
  } else {
    // Duel mode: check single opponent (original behavior)
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponentBuilds = newState.tableCards.filter(
      tc => tc.type === 'build_stack' && tc.owner === opponentIndex && tc.stackId !== stackId
    );
    const opponentHasSameValue = opponentBuilds.some(build => build.value === buildStack.value);
    
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

  return newState;
}

module.exports = stealBuild;
