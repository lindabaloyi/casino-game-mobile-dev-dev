/**
 * recallBuild
 * Allows a player to retrieve a recently captured build by their teammate
 * from the teammate's capture pile and place it back on the table as a build stack.
 * 
 * Party mode only (4 players).
 * Out-of-turn allowed.
 * 
 * Payload: { buildId: string }
 */

const { cloneState, generateStackId, triggerAction } = require('../');
const { calculateBuildValue } = require('../buildCalculator');

function recallBuild(state, payload, playerIndex) {
  const { buildId } = payload;

  // Only in party mode
  if (state.playerCount !== 4) {
    throw new Error('recallBuild is only available in 4-player mode');
  }

  // Find the player's team (0 or 1)
  const playerTeam = playerIndex < 2 ? 0 : 1;
  
  // Find the captured build in the team's array
  const teamBuilds = state.teamCapturedBuilds?.[playerTeam] || [];
  const capturedBuild = teamBuilds.find(b => b.stackId === buildId);
  
  if (!capturedBuild) {
    throw new Error(`recallBuild: build ${buildId} not found in teamCapturedBuilds`);
  }

  // Identify teammate index - use capturedBy (who captured the build), not originalOwner
  // The cards are in the capturing player's captures
  const teammateIndex = capturedBuild.capturedBy;

  // Verify all cards of the build are still in teammate's captures
  const teammateCaptures = state.players[teammateIndex]?.captures || [];
  const buildCards = capturedBuild.cards || [];
  
  console.log(`[recallBuild] Checking recall - buildId: ${buildId}, teammateIndex: ${teammateIndex}, buildCards: ${JSON.stringify(buildCards)}`);
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
  const values = buildCards.map(c => c.value);
  const buildInfo = calculateBuildValue(values);

  const newBuild = {
    type: 'build_stack',
    stackId: generateStackId(newState, 'build', capturedBuild.capturedBy), // new ID, owner is the capturer
    cards: buildCards,
    owner: capturedBuild.capturedBy, // Owner is the player who captured it
    value: buildInfo.value,
    base: buildInfo.value,
    need: buildInfo.need,
    buildType: buildInfo.buildType,
  };

  newState.tableCards.push(newBuild);

  // Remove the build from teamCapturedBuilds
  if (newState.teamCapturedBuilds && newState.teamCapturedBuilds[playerTeam]) {
    newState.teamCapturedBuilds[playerTeam] = newState.teamCapturedBuilds[playerTeam].filter(
      b => b.stackId !== buildId
    );
  }

  // Mark action as triggered (but don't end turn - player can continue)
  triggerAction(newState, playerIndex);

  return newState;
}

module.exports = recallBuild;
