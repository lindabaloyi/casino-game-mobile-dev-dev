/**
 * Unified Recall Action
 * 
 * Works for any captured item: single card, temp stack, or build stack.
 * Party mode only (4 players). Out-of-turn allowed.
 * 
 * NEW BEHAVIOR: Any teammate of the capturer can recall by double-tapping
 * the capturer's capture pile. No Shiya activation required.
 * 
 * Payload: { recallId: string }
 * 
 * Flow:
 * 1. Validate party mode and recall entry exists
 * 2. Validate player is a teammate of the capturer
 * 3. Verify cards still exist in capturer's captures
 * 4. Remove cards from capturer's captures
 * 5. Verify player has matching card in hand (stays in hand - used as validation key)
 * 6. Restore the exact captured item to table
 * 7. Clear recall entry
 */

const { cloneState, generateStackId } = require('../');
const { areTeammates } = require('../team');
const { calculateBuildValue } = require('../buildCalculator');
const { 
  deepClone, 
  getCardsFromItem,
  generateDescription 
} = require('../recallHelpers');

function recall(state, payload, playerIndex) {
  const { recallId } = payload;
  
  console.log(`[recall] Player ${playerIndex} attempting recall: ${recallId}`);
  
  // Validation: Party mode
  if (state.playerCount !== 4) {
    throw new Error('Recall is only available in 4-player party mode');
  }
  
  // Validation: recallId required
  if (!recallId) {
    throw new Error('recall: recallId is required');
  }
  
  // Get recall entry
  const recallEntry = state.shiyaRecalls?.[playerIndex]?.[recallId];
  if (!recallEntry) {
    throw new Error(`No active recall found for ID: ${recallId}`);
  }
  
  const { capturedItem, capturedBy } = recallEntry;
  
  // Validation: Player must be a teammate of the capturer
  if (!areTeammates(playerIndex, capturedBy)) {
    throw new Error('You can only recall from your teammate\'s capture pile');
  }
  
  // Get cards from the captured item
  const capturedCards = getCardsFromItem(capturedItem);
  
  if (!capturedCards || capturedCards.length === 0) {
    throw new Error('No cards in captured item');
  }
  
  console.log(`[recall] Captured cards:`, capturedCards.map(c => `${c.rank}${c.suit}`));
  
  // Clone state for modifications
  const newState = cloneState(state);
  
  // Verify and remove cards from capturer's captures
  const capturerCaptures = newState.players[capturedBy].captures;
  
  for (const card of capturedCards) {
    const idx = capturerCaptures.findIndex(
      c => c.rank === card.rank && c.suit === card.suit
    );
    
    if (idx === -1) {
      throw new Error(`Card ${card.rank}${card.suit} not found in captures`);
    }
    
    // Remove the card
    capturerCaptures.splice(idx, 1);
  }
  
  console.log(`[recall] Removed ${capturedCards.length} cards from captures`);
  
  // Verify player has a matching card in hand (required for recall)
  // The card stays in hand - it's just used as validation/"key" to trigger recall
  const playerHand = newState.players[playerIndex].hand;
  const hasMatchingCard = playerHand.some(card =>
    capturedCards.some(cc => cc.rank === card.rank)
  );
  
  if (!hasMatchingCard) {
    const neededRank = capturedCards[0]?.rank;
    throw new Error(`Need a ${neededRank} card to recall`);
  }
  
  console.log(`[recall] Player ${playerIndex} has matching card - recall validated`);
   
  // Convert to normal build stack - remove all Shiya/temp flags and overlays
  const cards = getCardsFromItem(capturedItem);
   
  // Create a normal build stack (not temp_stack, no Shiya overlays)
  // Preserve original build values from capturedItem
  const restoredItem = {
    type: 'build_stack',
    stackId: generateStackId(newState, 'build', playerIndex),
    cards: cards.map(c => ({ ...c })),
    owner: playerIndex,  // New owner is the recalling player
    value: capturedItem.value,        // Preserve original build value
    base: capturedItem.base,          // Preserve original base
    need: capturedItem.need,          // Preserve original need
    buildType: capturedItem.buildType, // Preserve original build type
    // Clear all Shiya flags - this is now a normal build
    shiyaActive: false,
    shiyaPlayer: undefined,
  };
  
  newState.tableCards.push(restoredItem);
  
  console.log(`[recall] Restored item to table:`, {
    stackId: restoredItem.stackId,
    type: restoredItem.type,
    cards: restoredItem.cards?.length || 1,
  });
   
  // Clear the recall entry
  delete newState.shiyaRecalls[playerIndex][recallId];
    
  // Clean up empty recall objects
  if (newState.shiyaRecalls[playerIndex] && 
      Object.keys(newState.shiyaRecalls[playerIndex]).length === 0) {
    delete newState.shiyaRecalls[playerIndex];
  }
    
  return newState;
}

module.exports = recall;
