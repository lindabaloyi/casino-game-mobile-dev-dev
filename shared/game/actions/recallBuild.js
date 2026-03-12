/**
 * recallBuild
 * Allows a player to retrieve a recently captured build by their teammate
 * from the teammate's capture pile and place it back on the table as a build stack.
 * 
 * Party mode only (4 players).
 * Out-of-turn allowed.
 * 
 * Payload: {} (empty - server reads from shiyaRecalls[playerIndex])
 * 
 * Note: In the new architecture, recall data comes from shiyaRecalls in game state.
 */

const { cloneState, generateStackId, triggerAction } = require('../');
const { calculateBuildValue } = require('../buildCalculator');

function recallBuild(state, payload, playerIndex) {
  // Only in party mode
  if (state.playerCount !== 4) {
    throw new Error('recallBuild is only available in 4-player mode');
  }

  // Get the recall offer for this player from shiyaRecalls
  const recall = state.shiyaRecalls?.[playerIndex];
  
  if (!recall) {
    console.warn(`[recallBuild] ⚠️ No active recall found for player ${playerIndex}. Available recalls:`, Object.keys(state.shiyaRecalls || {}));
    throw new Error('recallBuild: no active recall for this player');
  }

  console.log(`[recallBuild] ✅ Player ${playerIndex} is recalling build: stackId=${recall.stackId}, value=${recall.value}, cards=${recall.cards.length}`);
  console.log(`[recallBuild] 📋 Recall details: capturedBy=${recall.capturedBy}, originalOwner=${recall.originalOwner}`);
  
  // Identify teammate index - use capturedBy (who captured the build)
  const teammateIndex = recall.capturedBy;

  // Verify all cards of the build are in teammate's captures
  const teammateCaptures = state.players[teammateIndex]?.captures || [];
  const buildCards = recall.cards;
  
  console.log(`[recallBuild] Checking recall - player: ${playerIndex}, teammateIndex: ${teammateIndex}, buildCards: ${JSON.stringify(buildCards)}`);
  console.log(`[recallBuild] Teammate captures: ${JSON.stringify(teammateCaptures.map(c => `${c.rank}${c.suit}`))}`);
  
  for (const card of buildCards) {
    // Normalize suit for comparison (handle different suit representations)
    const normalizeSuit = (s) => String(s).replace(/[♥♠♦♣]/g, c => c);
    const cardSuit = normalizeSuit(card.suit);
    
    const found = teammateCaptures.some(c => 
      c.rank === card.rank && normalizeSuit(c.suit) === cardSuit
    );
    if (!found) {
      console.log(`[recallBuild] Card not found: ${card.rank}${card.suit}`);
      throw new Error(`recallBuild: card ${card.rank}${card.suit} missing from teammate's captures`);
    }
  }

  // Clone state for modifications
  const newState = cloneState(state);

  // Remove each card from teammate's captures
  const teammateCapturesNew = newState.players[teammateIndex].captures;
  console.log(`[recallBuild] Before removal - teammate captures: ${JSON.stringify(teammateCapturesNew.map(c => `${c.rank}${c.suit}`))}`);
  
  for (const card of buildCards) {
    const idx = teammateCapturesNew.findIndex(c => c.rank === card.rank && c.suit === card.suit);
    console.log(`[recallBuild] Looking for card ${card.rank}${card.suit}, found at index: ${idx}`);
    if (idx !== -1) {
      const removed = teammateCapturesNew.splice(idx, 1);
      console.log(`[recallBuild] Removed card: ${JSON.stringify(removed)}`);
    }
  }
  
  console.log(`[recallBuild] After removal - teammate captures: ${JSON.stringify(teammateCapturesNew.map(c => `${c.rank}${c.suit}`))}`);

  // Recreate the build stack on table
  // The build ownership goes to the player who is recalling it
  const values = buildCards.map(c => c.value);
  const buildInfo = calculateBuildValue(values);

  const newBuild = {
    type: 'build_stack',
    stackId: generateStackId(newState, 'build', playerIndex), // Owner is the recalling player
    cards: buildCards,
    owner: playerIndex, // Owner is the recalling player
    value: buildInfo.value,
    base: buildInfo.value,
    need: buildInfo.need,
    buildType: buildInfo.buildType,
    // Shiya state is cleared after recall (one-time use)
    shiyaActive: false,
    shiyaPlayer: undefined,
  };

  newState.tableCards.push(newBuild);

  // Clear the recall offer from shiyaRecalls
  if (newState.shiyaRecalls) {
    delete newState.shiyaRecalls[playerIndex];
  }

  // Note: Do NOT remove anything from teamCapturedBuilds.
  // The captured build remains in teamCapturedBuilds for cooperative rebuild.

  // Mark action as triggered (but don't end turn - player can continue)
  triggerAction(newState, playerIndex);

  return newState;
}

module.exports = recallBuild;
