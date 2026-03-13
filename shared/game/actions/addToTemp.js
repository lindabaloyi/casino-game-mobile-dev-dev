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

  // Validate card exists at claimed source
  const cardInfo = findCardAtSource(state, card, cardSource, playerIndex);
  
  if (!cardInfo.found) {
    // Check if card already exists in a temp stack (action was already processed)
    const existingTempStack = state.tableCards.find(
      tc => tc.type === 'temp_stack' && tc.stackId !== stackId && tc.cards?.some(c => c.rank === card.rank && c.suit === card.suit)
    );
    if (existingTempStack) {
      return state;
    }
    
    console.error('[addToTemp] ===== CARD NOT AT CLAIMED SOURCE =====');
    console.error('[addToTemp] Client claimed card was from:', cardSource);
    
    // Log more details about what we searched
    if (cardSource === 'captured' || (cardSource && cardSource.startsWith('captured_'))) {
      let ownerIndex = playerIndex;
      if (cardSource.startsWith('captured_')) {
        ownerIndex = parseInt(cardSource.split('_')[1], 10);
      }
      console.error(`[addToTemp] Searched capture pile of player ${ownerIndex} (playerIndex=${playerIndex})`);
      console.error('[addToTemp] Captures at that index:', state.players[ownerIndex]?.captures?.map(c => c.rank + c.suit) || 'EMPTY');
      
      // Also log all players' captures for debugging
      console.error('[addToTemp] All players captures:');
      state.players.forEach((p, idx) => {
        console.error(`  Player ${idx}:`, p.captures?.map(c => c.rank + c.suit) || []);
      });
    }
    
    console.error('[addToTemp] This indicates a sync issue or client bug');
    throw new Error(`addToTemp: card ${card.rank}${card.suit} not found at source ${cardSource}`);
  }

  // Remove card from the source location in cloned state
  let firstCard = null;
  
  if (cardSource === 'table') {
    [firstCard] = newState.tableCards.splice(cardInfo.index, 1);
  } else if (cardSource === 'hand') {
    const hand = newState.players[playerIndex].hand;
    [firstCard] = hand.splice(cardInfo.index, 1);
  } else if (cardSource === 'captured' || (cardSource && cardSource.startsWith('captured_'))) {
    // Use the ownerIndex from cardInfo if available, otherwise fall back to playerIndex
    const ownerIndex = cardInfo.ownerIndex !== undefined ? cardInfo.ownerIndex : playerIndex;
    [firstCard] = newState.players[ownerIndex].captures.splice(cardInfo.index, 1);
  }

  if (!firstCard) {
    throw new Error('addToTemp: failed to remove card after validation');
  }

  // LIMIT: Max 2 cards from player's hand per temp stack per turn
  // Cards from table or captures don't count toward this limit
  if (cardSource === 'hand') {
    const handCardsCount = stack.cards.filter(c => c.source === 'hand').length;
    if (handCardsCount >= 1) {
      throw new Error('Cannot add more than 1 card from hand to temp stack (limit is 1)');
    }
  }

  // Handle baseFixed temp stacks (dual builds)
  if (stack.baseFixed) {
    console.log('[addToTemp] Dual build - baseFixed is true');
    console.log('[addToTemp] Stack value:', stack.value, ', Card rank:', card.rank, '=', card.value);
    
    // Validate card rank <= stack value (like build extension)
    if (card.value > stack.value) {
      console.log('[addToTemp] VALIDATION FAILED: card value', card.value, '> stack value', stack.value);
      throw new Error(`addToTemp: cannot extend fixed temp stack with card rank ${card.rank} (would over-extend)`);
    }
    
    // Add to pendingExtension instead of main cards
    if (!stack.pendingExtension) {
      stack.pendingExtension = { cards: [] };
    }
    stack.pendingExtension.cards.push({ card: { ...firstCard, source: cardSource }, source: cardSource });
    
    console.log('[addToTemp] Added to pendingExtension:', stack.pendingExtension.cards.map(p => `${p.card.rank}${p.card.suit}`).join(', '));
    
    return newState;
  }

  stack.cards.push({ ...firstCard, source: cardSource });

  // Use the shared build calculator to compute value for multi-card builds
  const values = stack.cards.map(c => c.value);
  const buildInfo = calculateBuildValue(values);
  
  stack.value = buildInfo.value;
  stack.base = buildInfo.value;
  stack.need = buildInfo.need;
  stack.buildType = buildInfo.buildType;

  return newState;
}

module.exports = addToTemp;
