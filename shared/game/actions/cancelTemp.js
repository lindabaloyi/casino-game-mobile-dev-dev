/**
 * cancelTemp
 * Player cancels their pending temp stack.
 * 
 * Enhanced to:
 * 1. Handle pendingExtension.cards (for dual builds)
 * 2. Restore cards to their original positions using originalIndex
 * 3. Handle party mode captured cards correctly
 */

const { cloneState } = require('../');

function cancelTemp(state, payload, playerIndex) {
  const { stackId } = payload;

  if (!stackId) throw new Error('cancelTemp: missing stackId');

  const newState = cloneState(state);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );

  if (stackIdx === -1) {
    return newState;
  }

  const stack = newState.tableCards[stackIdx];
  
  if (stack.owner !== playerIndex) {
    throw new Error(`cancelTemp: player ${playerIndex} does not own stack "${stackId}"`);
  }

  // Helper function to restore a single card to its original position
  // Handles both regular cards and cards from pendingExtension (which may have different structure)
  const restoreCard = (cardData) => {
    // Handle wrapped card format from pendingExtension: { card: {...}, source: 'hand' }
    let card;
    let source;
    let originalIndex;
    let originalOwner;
    
    if (cardData.card) {
      // Wrapped format from pendingExtension
      card = cardData.card;
      source = cardData.source;
      originalIndex = card.originalIndex;
      originalOwner = card.originalOwner;
    } else {
      // Direct format from stack.cards
      card = cardData;
      source = cardData.source;
      originalIndex = cardData.originalIndex;
      originalOwner = cardData.originalOwner;
    }
    
    // Create a clean card object for restoration (preserve value for card processing)
    const pureCard = { rank: card.rank, suit: card.suit, value: card.value };
    
    console.log('[cancelTemp] restoreCard - rank:', card.rank, 'suit:', card.suit, 'source:', source, 'originalIndex:', originalIndex, 'originalOwner:', originalOwner);
    console.log('[cancelTemp] source check - is captured?:', source && source.startsWith('captured'), '- source type:', typeof source);
    
    if (source === 'hand') {
      const hand = newState.players[playerIndex].hand;
      // Insert at original index, or at end if index is out of bounds
      if (originalIndex !== undefined && originalIndex >= 0 && originalIndex <= hand.length) {
        hand.splice(originalIndex, 0, pureCard);
        console.log('[cancelTemp] Restored to hand at index:', originalIndex, '- hand now has', hand.length, 'cards');
      } else {
        hand.push(pureCard);
        console.log('[cancelTemp] Restored to hand at end (index out of bounds) - hand now has', hand.length, 'cards');
      }
    } else if (source === 'table') {
      // Insert at original index, or at end if index is out of bounds
      if (originalIndex !== undefined && originalIndex >= 0 && originalIndex <= newState.tableCards.length) {
        newState.tableCards.splice(originalIndex, 0, pureCard);
        console.log('[cancelTemp] Restored to table at index:', originalIndex, '- table now has', newState.tableCards.length, 'cards');
      } else {
        newState.tableCards.push(pureCard);
        console.log('[cancelTemp] Restored to table at end (index out of bounds) - table now has', newState.tableCards.length, 'cards');
      }
    } else if (source && (source.startsWith('captured') || source === 'captured')) {
      // Determine the correct owner (originalOwner or fallback to playerIndex)
      console.log('[cancelTemp] Checking captured source - originalOwner:', originalOwner);
      const owner = (originalOwner !== undefined) ? originalOwner : playerIndex;
      console.log('[cancelTemp] Using owner:', owner, 'for captured card restoration');
      const captures = newState.players[owner].captures;
      console.log('[cancelTemp] Restoring to captures of player:', owner, '- captures currently has', captures.length, 'cards');
      
      // Insert at original index, or at end if index is out of bounds
      if (originalIndex !== undefined && originalIndex >= 0 && originalIndex <= captures.length) {
        captures.splice(originalIndex, 0, pureCard);
        console.log('[cancelTemp] Restored to captures at index:', originalIndex, '- captures now has', captures.length, 'cards');
      } else {
        captures.push(pureCard);
        console.log('[cancelTemp] Restored to captures at end (index out of bounds) - captures now has', captures.length, 'cards');
      }
    } else {
      console.warn('[cancelTemp] Unknown source "' + source + '" for card, pushing to table');
      newState.tableCards.push(pureCard);
    }
  };

  // Remove the temp stack from the table
  // CRITICAL: We must remove the stack BEFORE restoring cards to avoid index shifting!
  const removedStack = newState.tableCards.splice(stackIdx, 1);
  console.log('[cancelTemp] Stack removed from tableCards, removed stackId:', removedStack[0]?.stackId);
  
  // Now restore ALL cards - first captured, then hand, then table
  // We restore in reverse order to preserve original indices
  
  // Helper to collect all cards from stack (including pendingExtension)
  const allStackCards = [...(stack.cards || [])];
  
  // Also collect cards from pendingExtension (dual builds)
  if (stack.pendingExtension && stack.pendingExtension.cards) {
    console.log('[cancelTemp] Found', stack.pendingExtension.cards.length, 'cards in pendingExtension');
    allStackCards.push(...stack.pendingExtension.cards.map(p => p.card));
  }
  
  if (allStackCards.length) {
    // First, restore captured cards
    const capturedCardRestorations = allStackCards.filter(c => c.source && c.source.startsWith('captured'));
    console.log('[cancelTemp] Now restoring', capturedCardRestorations.length, 'captured cards after stack removal');
    for (let i = capturedCardRestorations.length - 1; i >= 0; i--) {
      console.log('[cancelTemp] Processing captured card:', capturedCardRestorations[i].rank, capturedCardRestorations[i].suit);
      restoreCard(capturedCardRestorations[i]);
    }
    
    // Then restore hand cards
    const handCardRestorations = allStackCards.filter(c => c.source === 'hand');
    console.log('[cancelTemp] Now restoring', handCardRestorations.length, 'hand cards after stack removal');
    for (let i = handCardRestorations.length - 1; i >= 0; i--) {
      console.log('[cancelTemp] Processing hand card:', handCardRestorations[i].rank, handCardRestorations[i].suit);
      restoreCard(handCardRestorations[i]);
    }
    
    // Finally restore table cards
    const tableCardRestorations = allStackCards.filter(c => c.source === 'table');
    console.log('[cancelTemp] Now restoring', tableCardRestorations.length, 'table cards after stack removal');
    for (let i = tableCardRestorations.length - 1; i >= 0; i--) {
      console.log('[cancelTemp] Processing table card:', tableCardRestorations[i].rank, tableCardRestorations[i].suit);
      restoreCard(tableCardRestorations[i]);
    }
  }
  
  console.log('[cancelTemp] Final tableCards count:', newState.tableCards.length);
  // Use optional chaining for safety with different player counts
  const playerCount = newState.playerCount || newState.players.length;
  const p0Captures = newState.players[0]?.captures?.length ?? 0;
  const p1Captures = newState.players[1]?.captures?.length ?? 0;
  const p2Captures = newState.players[2]?.captures?.length ?? 0;
  console.log('[cancelTemp] Final players captures (PC' + playerCount + '): - P0:', p0Captures, ', P1:', p1Captures, ', P2:', p2Captures);
  
  // After removing stack, verify we have the right cards on table
  console.log('[cancelTemp] Final tableCards:', newState.tableCards.map(tc => tc.type ? `stack-${tc.stackId}` : `${tc.rank}${tc.suit}`).join(', '));
  console.log('[cancelTemp] Final tempStacks count:', newState.tableCards.filter(tc => tc.type === 'temp_stack').length);

  return newState;
}

module.exports = cancelTemp;
