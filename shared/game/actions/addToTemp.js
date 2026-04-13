/**
 * addToTemp
 * Player adds a card to their existing temp stack.
 * 
 * OPTIMIZATION: Uses source from payload to directly access the card location
 * instead of searching everywhere. This simplifies logic and reduces bugs.
 */

const { cloneState } = require('../');
const { calculateBuildValue } = require('../buildCalculator');

/**
 * Find card at specific source location
 * Returns { found: true, card, index } or { found: false }
 * 
 * Source format:
 * - 'hand' - current player's hand
 * - 'table' - table cards
 * - 'captured' - current player's own captures (backward compat)
 * - 'captured_<playerIndex>' - specific player's captures (e.g., 'captured_2')
 */
function findCardAtSource(state, card, source, playerIndex) {
  const cardKey = `${card.rank}${card.suit}`;
  
  switch (source) {
    case 'table': {
      const tableIdx = state.tableCards.findIndex(
        tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
      );
      if (tableIdx !== -1) {
        return { found: true, card: state.tableCards[tableIdx], index: tableIdx };
      }
      break;
    }
    
    case 'hand': {
      const hand = state.players[playerIndex].hand;
      const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
      if (handIdx !== -1) {
        return { found: true, card: hand[handIdx], index: handIdx };
      }
      break;
    }
    
    case 'captured':
    default: {
      // Handle both 'captured' (backward compat) and 'captured_<playerIndex>'
      let ownerIndex = playerIndex;
      
      if (source && source.startsWith('captured_')) {
        const parsed = parseInt(source.split('_')[1], 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < state.players.length) {
          ownerIndex = parsed;
        }
      }
      
      // Check the specified player's captures
      const captures = state.players[ownerIndex].captures;
      const captureIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
      
      if (captureIdx !== -1) {
        return { found: true, card: captures[captureIdx], index: captureIdx, ownerIndex };
      }
      
      // For backward compatibility, also check own captures if source was just 'captured'
      if (source === 'captured' && ownerIndex !== playerIndex) {
        const ownCaptures = state.players[playerIndex].captures;
        const ownCaptureIdx = ownCaptures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
        if (ownCaptureIdx !== -1) {
          return { found: true, card: ownCaptures[ownCaptureIdx], index: ownCaptureIdx, ownerIndex: playerIndex };
        }
      }
      break;
    }
  }
  
  return { found: false };
}

/**
 * Helper: Check if a card exists in any temp stack (optionally excluding a specific stack ID)
 */
function isCardInAnyTempStack(state, card, excludeStackId = null) {
  for (const tc of state.tableCards) {
    if (tc.type === 'temp_stack') {
      if (excludeStackId !== null && tc.stackId === excludeStackId) continue;
      if (tc.cards && tc.cards.some(c => c.rank === card.rank && c.suit === card.suit)) {
        return true;
      }
      if (tc.pendingExtension && tc.pendingExtension.cards) {
        if (tc.pendingExtension.cards.some(pc => pc.card.rank === card.rank && pc.card.suit === card.suit)) {
          return true;
        }
      }
    }
  }
  return false;
}

function addToTemp(state, payload, playerIndex) {
  const card = payload.card || payload.tableCard || payload.handCard;
  const stackId = payload.stackId;
  const source = payload.source; // Get source from payload

  if (!card || !stackId) {
    throw new Error('addToTemp: missing card or stackId');
  }

  // Default to 'hand' for backward compatibility
  const cardSource = source || 'hand';

  const newState = cloneState(state);

  // Find the temp stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`addToTemp: temp stack "${stackId}" not found`);
  }
  const stack = newState.tableCards[stackIdx];

  // Find card at SPECIFIED source only (single source of truth)
  // If source is invalid or card not found there, it will error
  let cardInfo = findCardAtSource(state, card, cardSource, playerIndex);
  let actualSource = cardSource;
  
  if (!cardInfo.found) {
    // 1. Check if card is already in the current stack (original state)
    const inCurrentStackOriginal = stack.cards?.some(c => c.rank === card.rank && c.suit === card.suit) ||
      (stack.pendingExtension?.cards?.some(pc => pc.card.rank === card.rank && pc.card.suit === card.suit));
    if (inCurrentStackOriginal) {
      console.log('[addToTemp] Card already in target stack (original state) - returning state unchanged');
      return state;
    }

    // 2. Check if card is in any other temp stack in original state
    if (isCardInAnyTempStack(state, card, stackId)) {
      console.log('[addToTemp] Card already in another temp stack - returning state unchanged');
      return state;
    }

    // 3. Check the new state (in case the card was added by a previous action in the batch)
    const inCurrentStackNew = newState.tableCards[stackIdx]?.cards?.some(c => c.rank === card.rank && c.suit === card.suit) ||
      (newState.tableCards[stackIdx]?.pendingExtension?.cards?.some(pc => pc.card.rank === card.rank && pc.card.suit === card.suit));
    if (inCurrentStackNew) {
      console.log('[addToTemp] Card already in target stack (new state) - returning state unchanged');
      return newState;
    }
    if (isCardInAnyTempStack(newState, card, stackId)) {
      console.log('[addToTemp] Card already in another temp stack (new state) - returning state unchanged');
      return newState;
    }

    // If still not found at specified source, it's a genuine error
    console.error('[addToTemp] Card not found at specified source:', cardSource);
    throw new Error(`addToTemp: card ${card.rank}${card.suit} not found at source "${cardSource}"`);
  }
  
  // Log where we found the card for debugging
  console.log(`[addToTemp] Found card ${card.rank}${card.suit} at source: ${actualSource}`);

  // Remove card from the ACTUAL source where we found it
  let firstCard = null;
  let originalIndex = -1;
  let originalOwner = playerIndex;
  
  if (actualSource === 'table') {
    originalIndex = cardInfo.index;
    [firstCard] = newState.tableCards.splice(cardInfo.index, 1);
  } else if (actualSource === 'hand') {
    originalIndex = cardInfo.index;
    const hand = newState.players[playerIndex].hand;
    [firstCard] = hand.splice(cardInfo.index, 1);
  } else if (actualSource === 'captured' || (actualSource && actualSource.startsWith('captured_'))) {
    // Use the ownerIndex from cardInfo if available, otherwise fall back to playerIndex
    originalOwner = cardInfo.ownerIndex !== undefined ? cardInfo.ownerIndex : playerIndex;
    originalIndex = cardInfo.index;
    [firstCard] = newState.players[originalOwner].captures.splice(cardInfo.index, 1);
  }

  console.log('[addToTemp] Removed card from source:', actualSource, 'at index:', originalIndex, 'originalOwner:', originalOwner);

  if (!firstCard) {
    throw new Error('addToTemp: failed to remove card after validation');
  }

  // Store card with original index and owner for proper restoration on cancel
  const storedCard = {
    ...firstCard,
    source: actualSource,
    originalIndex: originalIndex,
    originalOwner: originalOwner
  };

  // LIMIT: Max 2 cards from player's hand per temp stack per turn
  // Cards from table or captures don't count toward this limit
  if (actualSource === 'hand') {
    const handCardsCount = stack.cards.filter(c => c.source === 'hand').length;
    if (handCardsCount >= 1) {
      throw new Error('Cannot add more than 1 card from hand to temp stack (limit is 1)');
    }
  }

  // Handle baseFixed temp stacks (dual builds)
  if (stack.baseFixed) {
    console.log('[addToTemp] Dual build - baseFixed is true');
    console.log('[addToTemp] Stack value:', stack.value, ', Card rank:', card.rank, '=', card.value);
    console.log('[addToTemp] Current pendingExtension:', JSON.stringify(stack.pendingExtension));
    
    // Validate card rank <= stack value (like build extension)
    if (card.value > stack.value) {
      console.log('[addToTemp] VALIDATION FAILED: card value', card.value, '> stack value', stack.value);
      throw new Error(`addToTemp: cannot extend fixed temp stack with card rank ${card.rank} (would over-extend)`);
    }
    
    // Add to pendingExtension instead of main cards
    if (!stack.pendingExtension) {
      stack.pendingExtension = { cards: [] };
    }
    stack.pendingExtension.cards.push({ card: storedCard, source: cardSource });
    
    console.log('[addToTemp] Added to pendingExtension:', stack.pendingExtension.cards.map(p => `${p.card.rank}${p.card.suit}`).join(', '));
    console.log('[addToTemp] FULL pendingExtension after push:', JSON.stringify(stack.pendingExtension));
    
    const pendingSum = stack.pendingExtension?.cards?.reduce((sum, p) => sum + p.card.value, 0) || 0;
    const need = stack.value - pendingSum;
    console.log('[addToTemp:DEBUG] added:', card.rank+card.suit, '| target:', stack.value, '| pending:', stack.pendingExtension?.cards?.map(p => p.card.rank+p.card.suit).join(','), '| need:', need);
    
    return newState;
  }

  stack.cards.push(storedCard);

  // Use the shared build calculator to compute value for multi-card builds
  const values = stack.cards.map(c => c.value);
  const buildInfo = calculateBuildValue(values);
  
  stack.value = buildInfo.value;
  stack.base = buildInfo.value;
  stack.need = buildInfo.need;
  stack.buildType = buildInfo.buildType;

  console.log('[addToTemp:DEBUG] added:', card.rank+card.suit, '| value:', stack.value, '| cards:', stack.cards.map(c => c.rank+c.suit).join(','), '| need:', stack.need);

  return newState;
}

module.exports = addToTemp;
