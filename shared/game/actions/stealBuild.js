/**
 * stealBuild
 * Player steals an opponent's build by adding a card from their hand.
 */

const { cloneState } = require('../');
const { getConsecutivePartition } = require('../buildCalculator');

function stealBuild(state, payload, playerIndex) {
  const card = payload.card || payload.handCard;
  const stackId = payload.stackId;
  const cardSource = payload.cardSource || 'hand';

  if (!card || !stackId) {
    throw new Error('stealBuild: missing card or stackId');
  }

  // ========== DEFENSE-IN-DEPTH VALIDATION ==========
  // This validation exists as a safeguard in case the action is called
  // directly without going through CaptureRouter.
  // CaptureRouter already validates that cardSource === 'hand' before
  // routing to stealBuild.
  // ========================================================
  
  // Validate that the card comes from hand (defense in depth)
  if (cardSource !== 'hand') {
    throw new Error(`stealBuild: card source must be 'hand', got '${cardSource}'`);
  }

  // Additional validation: verify the card actually exists in the player's hand
  const handCheck = state.players[playerIndex].hand;
  const handIdxCheck = handCheck.findIndex(
    c => c.rank === card.rank && c.suit === card.suit,
  );
  if (handIdxCheck === -1) {
    throw new Error(`stealBuild: card ${card.rank}${card.suit} not in hand`);
  }

  const newState = cloneState(state);
  // Clear any pending choice from previous modal interactions
  newState.pendingChoice = null;
  
  // Determine party mode: check if any player has a team property (indicates party mode)
  // In party mode, players have team: 'A' or 'B'. In four-hands, they have no team.
  const isPartyMode = state.playerCount === 4 && state.players.some(p => p.team);

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

  // Remove card from player's hand
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
  // Descending order by value - keeps stolen build's cards in proper order
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
  
  // Determine hasBase from partition
  const cardValues = buildStack.cards.map(c => c.value);
  const groups = getConsecutivePartition(cardValues, buildStack.value);
  buildStack.hasBase = groups.length > 1;
  
  // --- VALIDATION: Check opponent(s) don't have build with same value ---
  // In party mode: check both opponents (not teammates); in four-hands: check all other players
  // In three-hands mode: check the other two players
  let opponentHasSameValue = false;
  
  if (isPartyMode) {
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
  } else if (state.playerCount === 4) {
    // Free-for-all mode: check ALL other players (everyone is opponent)
    const otherPlayerIndices = [0, 1, 2, 3].filter(i => i !== playerIndex);
    for (const oIdx of otherPlayerIndices) {
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
        `stealBuild: Cannot have build with value ${buildStack.value} - another player already has a build with this value`
      );
    }
    
    console.log(`[stealBuild] ✅ Free-for-all steal allowed - player will become owner (hasExistingBuild: ${hasExistingBuild})`);
  } else if (state.playerCount === 3) {
    // Three-hands mode: check BOTH other players (all solo)
    const otherPlayerIndices = [0, 1, 2].filter(i => i !== playerIndex);
    for (const oIdx of otherPlayerIndices) {
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
        `stealBuild: Cannot have build with value ${buildStack.value} - another player already has a build with this value`
      );
    }
    
    console.log(`[stealBuild] ✅ Three-hands steal allowed - player will become owner (hasExistingBuild: ${hasExistingBuild})`);
  } else {
    // Duel mode (2 players): check single opponent
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
  // - Three-hands mode: always take ownership (no teams)
  // - Otherwise: transfer to current player
  let newOwner = playerIndex;
  
  // Check if we're merging with teammate (party mode only)
  if (isPartyMode) {
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
  // Three-hands mode: always take ownership (no teams)
  
  buildStack.owner = newOwner;
  buildStack.pendingExtension = null;

  let finalDisplayValue;
  
  // REVERSED MERGE: If player has matching build, merge stolen build INTO player's build
  // This puts player's cards first, then stolen cards appended
  
  // Party mode: Check for merge with MY build OR TEAMMATE'S build
  // Free-for-all: merge with MY builds only (no teammates)
  // Three-hands mode: Only merge with MY builds (no teams)
  if (isPartyMode) {
    const teammateIndex = playerIndex ^ 1;
    
    // Try to find target build: player's own first, then teammate's
    let targetBuild = null;
    let targetOwner = null;
    
    // Check player's own builds for matching value
    const myBuildIdx = newState.tableCards.findIndex(
      tc => tc.type === 'build_stack' && tc.owner === playerIndex && tc.stackId !== stackId && tc.value === recalculatedValue
    );
    if (myBuildIdx !== -1) {
      targetBuild = newState.tableCards[myBuildIdx];
      targetOwner = playerIndex;
      console.log(`[stealBuild] Found player's own matching build at index ${myBuildIdx}`);
    } else {
      // Check teammate's builds
      const teammateBuildIdx = newState.tableCards.findIndex(
        tc => tc.type === 'build_stack' && tc.owner === teammateIndex && tc.stackId !== stackId && tc.value === recalculatedValue
      );
      if (teammateBuildIdx !== -1) {
        targetBuild = newState.tableCards[teammateBuildIdx];
        targetOwner = teammateIndex;
        console.log(`[stealBuild] Found teammate's matching build at index ${teammateBuildIdx}`);
      }
    }
    
    if (targetBuild) {
      // Merge stolen build INTO target build (reversed direction)
      // No recalc - keep target build's original value and type
      targetBuild.cards.push(...buildStack.cards);
      
      // Remove the stolen build from table
      newState.tableCards.splice(stackIdx, 1);
      
      // Update ownership to target owner
      targetBuild.owner = targetOwner;
      targetBuild.pendingExtension = null;
      
      // Continue merging more builds that have the SAME VALUE as target's original
      const targetValue = targetBuild.value;  // original value, unchanged
      while (true) {
        // Look for player's builds with matching value
        const nextMyBuildIdx = newState.tableCards.findIndex(
          tc => tc.type === 'build_stack' && tc.owner === playerIndex && tc.stackId !== targetBuild.stackId && tc.value === targetValue
        );
        if (nextMyBuildIdx !== -1) {
          const nextBuild = newState.tableCards[nextMyBuildIdx];
          targetBuild.cards.push(...nextBuild.cards);
          newState.tableCards.splice(nextMyBuildIdx, 1);
          // No recalc - keep target build's value unchanged
          continue;
        }
        
        // Look for teammate's builds with matching value
        const nextTeammateIdx = newState.tableCards.findIndex(
          tc => tc.type === 'build_stack' && tc.owner === teammateIndex && tc.stackId !== targetBuild.stackId && tc.value === targetValue
        );
        if (nextTeammateIdx !== -1) {
          const nextBuild = newState.tableCards[nextTeammateIdx];
          targetBuild.cards.push(...nextBuild.cards);
          newState.tableCards.splice(nextTeammateIdx, 1);
          // No recalc - keep target build's value unchanged
          continue;
        }
        
        break;
      }
      
      console.log(`[stealBuild] Final merged build value (unchanged): ${targetBuild.value}, cards: ${targetBuild.cards.map(c => c.value).join(', ')}`);
      return newState;
    } else {
      // No matching build - keep stolen build as target, update ownership
      buildStack.owner = newOwner;
      buildStack.pendingExtension = null;
      finalDisplayValue = recalculatedValue;
      buildStack.value = recalculatedValue;
      // Update hasBase after potential merge loop
      const cardValues2 = buildStack.cards.map(c => c.value);
      const groups2 = getConsecutivePartition(cardValues2, buildStack.value);
      buildStack.hasBase = groups2.length > 1;
      
      // Still try to absorb other builds of same value (into stolen build)
      let currentValue = recalculatedValue;
      while (true) {
        const otherIdx = newState.tableCards.findIndex(
          tc => tc.type === 'build_stack' && tc.owner === playerIndex && tc.stackId !== stackId && tc.value === currentValue
        );
        if (otherIdx === -1) break;
        const otherBuild = newState.tableCards[otherIdx];
        buildStack.cards.push(...otherBuild.cards);
        newState.tableCards.splice(otherIdx, 1);
        recalcBuild(buildStack);
        currentValue = buildStack.value;
      }
      
      console.log(`[stealBuild] No matching target - stolen build final value: ${buildStack.value}, cards: ${buildStack.cards.map(c => c.value).join(', ')}`);
      return newState;
    }
  } else {
    // Duel mode (2 players) or Three-hands mode (3 players) or Free-for-all: merge with MY builds only
    if (hasExistingBuild) {
      // Check if player has a build with matching value
      const myBuildIdx = newState.tableCards.findIndex(
        tc => tc.type === 'build_stack' && tc.owner === playerIndex && tc.stackId !== stackId && tc.value === recalculatedValue
      );
      
      if (myBuildIdx !== -1) {
        // Merge stolen build INTO player's build (reversed direction)
        // No recalc - keep target build's original value
        const targetBuild = newState.tableCards[myBuildIdx];
        targetBuild.cards.push(...buildStack.cards);
        
        // Remove the stolen build from table
        newState.tableCards.splice(stackIdx, 1);
        
        // Update ownership
        targetBuild.owner = playerIndex;
        targetBuild.pendingExtension = null;
        
        // Continue merging more builds with the SAME VALUE as target's original
        const targetValue = targetBuild.value;  // original value, unchanged
        while (true) {
          const nextIdx = newState.tableCards.findIndex(
            tc => tc.type === 'build_stack' && tc.owner === playerIndex && tc.stackId !== targetBuild.stackId && tc.value === targetValue
          );
          if (nextIdx === -1) break;
          const nextBuild = newState.tableCards[nextIdx];
          targetBuild.cards.push(...nextBuild.cards);
          newState.tableCards.splice(nextIdx, 1);
          // No recalc - keep target build's value unchanged
        }
        
        console.log(`[stealBuild] Merged into player build - final value (unchanged): ${targetBuild.value}, cards: ${targetBuild.cards.map(c => c.value).join(', ')}`);
        return newState;
      } else {
        // No matching build - keep stolen build, absorb other builds
        buildStack.owner = playerIndex;
        buildStack.pendingExtension = null;
        finalDisplayValue = recalculatedValue;
        buildStack.value = recalculatedValue;
        // Update hasBase after potential merge loop
        const cardValues3 = buildStack.cards.map(c => c.value);
        const groups3 = getConsecutivePartition(cardValues3, buildStack.value);
        buildStack.hasBase = groups3.length > 1;
        
        let currentValue = recalculatedValue;
        while (true) {
          const otherIdx = newState.tableCards.findIndex(
            tc => tc.type === 'build_stack' && tc.owner === playerIndex && tc.stackId !== stackId && tc.value === currentValue
          );
          if (otherIdx === -1) break;
          const otherBuild = newState.tableCards[otherIdx];
          buildStack.cards.push(...otherBuild.cards);
          newState.tableCards.splice(otherIdx, 1);
          recalcBuild(buildStack);
          currentValue = buildStack.value;
        }
        
        console.log(`[stealBuild] No matching target - final value: ${buildStack.value}, cards: ${buildStack.cards.map(c => c.value).join(', ')}`);
        return newState;
      }
    } else {
      // No existing build - keep stolen build
      buildStack.owner = playerIndex;
      buildStack.pendingExtension = null;
      buildStack.value = recalculatedValue;
      // Update hasBase after potential merge loop
      const cardValues4 = buildStack.cards.map(c => c.value);
      const groups4 = getConsecutivePartition(cardValues4, buildStack.value);
      buildStack.hasBase = groups4.length > 1;
      console.log(`[stealBuild] No existing builds - final value: ${buildStack.value}, cards: ${buildStack.cards.map(c => c.value).join(', ')}`);
      return newState;
    }
  }

  // DEBUG: Final card order before returning
  console.log(`[stealBuild] DEBUG: Final card order: ${buildStack.cards.map(c => c.value).join(', ')}`);
  
  return newState;
}

module.exports = stealBuild;
