/**
 * recallBuild
 * Allows a player to retrieve a recently captured build by their teammate
 * from the teammate's capture pile and place it back on the table as a build stack.
 * 
 * Party mode only (4 players).
 * Out-of-turn allowed.
 * 
 * Payload: { stackId: string } - identifies which recall to use
 * 
 * When recalled:
 * - Both build cards AND capture cards are removed from capturer's captures
 * - The new build contains build cards + capture cards on top
 * - The recalling player becomes the new owner
 */

const { cloneState, generateStackId, triggerAction } = require('../');
const { calculateBuildValue } = require('../buildCalculator');

function recallBuild(state, payload, playerIndex) {
  // Only in party mode
  if (state.playerCount !== 4) {
    throw new Error('recallBuild is only available in 4-player mode');
  }

  // Get stackId from payload (required for multiple recalls per player)
  const { stackId } = payload || {};
  
  if (!stackId) {
    throw new Error('recallBuild: stackId is required in payload');
  }

  // Get the recall offer for this player from shiyaRecalls[playerIndex][stackId]
  const playerRecalls = state.shiyaRecalls?.[playerIndex];
  
  if (!playerRecalls || !playerRecalls[stackId]) {
    console.warn(`[recallBuild] ⚠️ No active recall found for player ${playerIndex} with stackId ${stackId}. Available:`, Object.keys(playerRecalls || {}));
    throw new Error(`recallBuild: no active recall for stackId ${stackId}`);
  }

  const recall = playerRecalls[stackId];
  
  // Support both old format (cards) and new format (buildCards + captureCards)
  const buildCards = recall.buildCards || recall.cards || [];
  const captureCards = recall.captureCards || [];

  console.log(`[recallBuild] ✅ Player ${playerIndex} is recalling build: stackId=${recall.stackId}, value=${recall.value}, buildCards=${buildCards.length}, captureCards=${captureCards.length}`);
  console.log(`[recallBuild] 📋 Recall details: capturedBy=${recall.capturedBy}, originalOwner=${recall.originalOwner}`);
  
  // Identify teammate index - use capturedBy (who captured the build)
  const capturingPlayerIdx = recall.capturedBy;

  // Verify all cards of the build are in captures
  const playerCaptures = state.players[capturingPlayerIdx]?.captures || [];
  
  console.log(`[recallBuild] Checking recall - player: ${playerIndex}, capturingPlayerIdx: ${capturingPlayerIdx}`);
  console.log(`[recallBuild] Capturing player captures: ${JSON.stringify(playerCaptures.map(c => `${c.rank}${c.suit}`))}`);
  
  // Verify build cards exist
  for (const card of buildCards) {
    const normalizeSuit = (s) => String(s).replace(/[♥♠♦♣]/g, c => c);
    const cardSuit = normalizeSuit(card.suit);
    
    const found = playerCaptures.some(c => 
      c.rank === card.rank && normalizeSuit(c.suit) === cardSuit
    );
    if (!found) {
      console.log(`[recallBuild] Build card not found: ${card.rank}${card.suit}`);
      throw new Error(`recallBuild: build card ${card.rank}${card.suit} missing from captures`);
    }
  }
  
  // Verify capture cards exist
  for (const card of captureCards) {
    const normalizeSuit = (s) => String(s).replace(/[♥♠♦♣]/g, c => c);
    const cardSuit = normalizeSuit(card.suit);
    
    const found = playerCaptures.some(c => 
      c.rank === card.rank && normalizeSuit(c.suit) === cardSuit
    );
    if (!found) {
      console.log(`[recallBuild] Capture card not found: ${card.rank}${card.suit}`);
      throw new Error(`recallBuild: capture card ${card.rank}${card.suit} missing from captures`);
    }
  }

  // Clone state for modifications
  const newState = cloneState(state);

  // Get the captures array to modify
  const playerCapturesNew = newState.players[capturingPlayerIdx].captures;
  console.log(`[recallBuild] Before removal - captures: ${JSON.stringify(playerCapturesNew.map(c => `${c.rank}${c.suit}`))}`);
  
  // 1. Remove build cards from capturing player's captures
  for (const card of buildCards) {
    const idx = playerCapturesNew.findIndex(c => c.rank === card.rank && c.suit === card.suit);
    if (idx !== -1) {
      const removed = playerCapturesNew.splice(idx, 1);
      console.log(`[recallBuild] Removed build card: ${JSON.stringify(removed)}`);
    }
  }
  
  // 2. Remove capture cards from capturing player's captures
  for (const card of captureCards) {
    const idx = playerCapturesNew.findIndex(c => c.rank === card.rank && c.suit === card.suit);
    if (idx !== -1) {
      const removed = playerCapturesNew.splice(idx, 1);
      console.log(`[recallBuild] Removed capture card: ${JSON.stringify(removed)}`);
    }
  }
  
  console.log(`[recallBuild] After removal - captures: ${JSON.stringify(playerCapturesNew.map(c => `${c.rank}${c.suit}`))}`);

  // 3. Recreate the build on the table with capture cards on top
  // Capture cards are added last (on top) - last in array = top of stack
  const newBuildCards = [...buildCards, ...captureCards];
  
  // Calculate build value from build cards only (not including capture cards on top)
  const buildValues = buildCards.map(c => c.value);
  const buildInfo = recall.base && recall.need 
    ? { value: recall.value, base: recall.base, need: recall.need, buildType: recall.buildType }
    : calculateBuildValue(buildValues);

  const newBuild = {
    type: 'build_stack',
    stackId: generateStackId(newState, 'build', playerIndex), // Owner is the recalling player
    cards: newBuildCards,  // Build cards + capture cards on top
    owner: playerIndex,    // Owner is the recalling player
    value: buildInfo.value,
    base: buildInfo.base,
    need: buildInfo.need,
    buildType: buildInfo.buildType,
    // Shiya state is cleared after recall (one-time use)
    shiyaActive: false,
    shiyaPlayer: undefined,
  };

  newState.tableCards.push(newBuild);

  // 4. Clear this specific recall entry
  if (newState.shiyaRecalls && newState.shiyaRecalls[playerIndex]) {
    delete newState.shiyaRecalls[playerIndex][stackId];
    // Clean up empty player recalls
    if (Object.keys(newState.shiyaRecalls[playerIndex]).length === 0) {
      delete newState.shiyaRecalls[playerIndex];
    }
  }

  // Note: Do NOT remove anything from teamCapturedBuilds.
  // The captured build remains in teamCapturedBuilds for cooperative rebuild.

  // Mark action as triggered (but don't end turn - player can continue)
  triggerAction(newState, playerIndex);

  return newState;
}

module.exports = recallBuild;
