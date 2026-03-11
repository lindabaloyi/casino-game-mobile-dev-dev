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
  console.log(`[addToTemp-findCardAtSource] Looking for ${cardKey} at source:`, source);
  
  switch (source) {
    case 'table': {
      const tableIdx = state.tableCards.findIndex(
        tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
      );
      console.log('[addToTemp-findCardAtSource] Table search result:', tableIdx);
      if (tableIdx !== -1) {
        return { found: true, card: state.tableCards[tableIdx], index: tableIdx };
      }
      break;
    }
    
    case 'hand': {
      const hand = state.players[playerIndex].hand;
      const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
      console.log('[addToTemp-findCardAtSource] Hand search result:', handIdx, 'hand:', hand.map(c => c.rank + c.suit));
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
          console.log(`[addToTemp-findCardAtSource] Parsed owner index from source: ${source} -> ${ownerIndex}`);
        }
      }
      
      // Check the specified player's captures
      const captures = state.players[ownerIndex].captures;
      const captureIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
      console.log(`[addToTemp-findCardAtSource] Captures search result for player ${ownerIndex}:`, captureIdx, 'captures:', captures.map(c => c.rank + c.suit));
      
      if (captureIdx !== -1) {
        return { found: true, card: captures[captureIdx], index: captureIdx, ownerIndex };
      }
      
      // For backward compatibility, also check own captures if source was just 'captured'
      if (source === 'captured' && ownerIndex !== playerIndex) {
        const ownCaptures = state.players[playerIndex].captures;
        const ownCaptureIdx = ownCaptures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
        if (ownCaptureIdx !== -1) {
          console.log('[addToTemp-findCardAtSource] Found in own captures (backward compat)');
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
  const source = payload.source; // NEW: Get source from payload

  console.log('[addToTemp] ===== SOURCE-BASED LOOKUP =====');
  console.log('[addToTemp] Card:', card ? `${card.rank}${card.suit}` : 'NONE');
  console.log('[addToTemp] StackId:', stackId);
  console.log('[addToTemp] Source (from client):', source);
  console.log('[addToTemp] Player index:', playerIndex);

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
  console.log('[addToTemp] Card validated at source:', cardSource, 'at index:', cardInfo.index);

  // Remove card from the source location in cloned state
  let firstCard = null;
  
  if (cardSource === 'table') {
    [firstCard] = newState.tableCards.splice(cardInfo.index, 1);
    console.log('[addToTemp] Removed card from table');
  } else if (cardSource === 'hand') {
    const hand = newState.players[playerIndex].hand;
    [firstCard] = hand.splice(cardInfo.index, 1);
    console.log('[addToTemp] Removed card from hand');
  } else if (cardSource === 'captured' || (cardSource && cardSource.startsWith('captured_'))) {
    // Use the ownerIndex from cardInfo if available, otherwise fall back to playerIndex
    const ownerIndex = cardInfo.ownerIndex !== undefined ? cardInfo.ownerIndex : playerIndex;
    [firstCard] = newState.players[ownerIndex].captures.splice(cardInfo.index, 1);
    console.log('[addToTemp] Removed card from captures (owner:', ownerIndex, ')');
  }

  if (!firstCard) {
    throw new Error('addToTemp: failed to remove card after validation');
  }

  // LIMIT: Max 2 cards from player's hand per temp stack per turn
  // Cards from table or captures don't count toward this limit
  console.log(`[addToTemp] Card source: ${cardSource}, stackId: ${stackId}`);
  console.log(`[addToTemp] Total cards in stack before add: ${stack.cards.length}`);
  console.log(`[addToTemp] Stack cards breakdown:`, stack.cards.map(c => `${c.rank}${c.suit}(${c.source})`).join(', '));
  
  if (cardSource === 'hand') {
    const handCardsCount = stack.cards.filter(c => c.source === 'hand').length;
    console.log(`[addToTemp] Hand cards count: ${handCardsCount}, limit: 1 (can add max 1 more from hand after initial)`);
    if (handCardsCount >= 1) {
      console.log(`[addToTemp] REJECTED: Cannot add more than 1 card from hand (limit is 1)`);
      throw new Error('Cannot add more than 1 card from hand to temp stack (limit is 1)');
    }
    console.log(`[addToTemp] ALLOWED: Adding card from hand`);
  } else {
    console.log(`[addToTemp] ALLOWED: Source is ${cardSource} - no hand card limit applies`);
  }

  stack.cards.push({ ...firstCard, source: cardSource });

  // Use the shared build calculator to compute value for multi-card builds
  const values = stack.cards.map(c => c.value);
  const buildInfo = calculateBuildValue(values);
  
  stack.value = buildInfo.value;
  stack.base = buildInfo.value;
  stack.need = buildInfo.need;
  stack.buildType = buildInfo.buildType;

  // Debug: Log the full stack state after update
  console.log('[addToTemp] Updated stack:', {
    stackId: stack.stackId,
    cards: stack.cards.map(c => `${c.rank}${c.suit}(${c.source})`),
    value: stack.value,
    base: stack.base,
    need: stack.need,
    buildType: stack.buildType
  });

  return newState;
}

module.exports = addToTemp;
