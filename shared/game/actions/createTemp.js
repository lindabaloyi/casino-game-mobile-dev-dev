/**
 * createTemp
 * Creates a temporary stack from hand card + loose table card.
 * NOTE: This does NOT end the turn - player can continue with more actions.
 * 
 * OPTIMIZATION: Uses source from payload to directly access the card location
 * instead of searching everywhere. This simplifies logic and reduces bugs.
 */

const { cloneState, generateStackId, startPlayerTurn, triggerAction } = require('../');
const { calculateBuildValue } = require('../buildCalculator');

/**
 * Helper: Find card specifically on table
 * Used for target card validation
 */
function findCardOnTable(state, targetCard) {
  console.log('[findCardOnTable] Looking for target:', `${targetCard.rank}${targetCard.suit}`);
  console.log('[findCardOnTable] Table cards:', state.tableCards.map(tc => {
    if (tc.type) {
      return `{${tc.type}: ${tc.cards?.map(c => c.rank + c.suit).join(',')}}`;
    }
    return tc.rank + tc.suit;
  }));
  
  const tableIdx = state.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  console.log('[findCardOnTable] Result index:', tableIdx);
  if (tableIdx !== -1) {
    return { found: true, card: state.tableCards[tableIdx], index: tableIdx };
  }
  return { found: false };
}

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
  console.log(`[findCardAtSource] Looking for ${cardKey} at source:`, source);
  
  switch (source) {
    case 'table': {
      const tableIdx = state.tableCards.findIndex(
        tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
      );
      console.log('[findCardAtSource] Table search result:', tableIdx);
      if (tableIdx !== -1) {
        return { found: true, card: state.tableCards[tableIdx], index: tableIdx };
      }
      break;
    }
    
    case 'hand': {
      const hand = state.players[playerIndex].hand;
      const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
      console.log('[findCardAtSource] Hand search result:', handIdx, 'hand:', hand.map(c => c.rank + c.suit));
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
          console.log(`[findCardAtSource] Parsed owner index from source: ${source} -> ${ownerIndex}`);
        }
      }
      
      // Check the specified player's captures
      const captures = state.players[ownerIndex].captures;
      const captureIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
      console.log(`[findCardAtSource] Captures search result for player ${ownerIndex}:`, captureIdx, 'captures:', captures.map(c => c.rank + c.suit));
      
      if (captureIdx !== -1) {
        return { found: true, card: captures[captureIdx], index: captureIdx, ownerIndex };
      }
      
      // For backward compatibility, also check own captures if source was just 'captured'
      if (source === 'captured' && ownerIndex !== playerIndex) {
        const ownCaptures = state.players[playerIndex].captures;
        const ownCaptureIdx = ownCaptures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
        if (ownCaptureIdx !== -1) {
          console.log('[findCardAtSource] Found in own captures (backward compat)');
          return { found: true, card: ownCaptures[ownCaptureIdx], index: ownCaptureIdx, ownerIndex: playerIndex };
        }
      }
      break;
    }
  }
  
  return { found: false };
}

function createTemp(state, payload, playerIndex) {
  const { card, targetCard, source } = payload;

  const cardSource = source || 'hand';

  console.log('[createTemp] ===== SOURCE-BASED LOOKUP =====');
  console.log('[createTemp] Card source (from client):', cardSource);
  console.log('[createTemp] Card:', card ? `${card.rank}${card.suit}` : 'NONE');
  console.log('[createTemp] Target:', targetCard ? `${targetCard.rank}${targetCard.suit}` : 'NONE');
  console.log('[createTemp] Player index:', playerIndex);

  // Debug: Log all table cards
  console.log('[createTemp] Table cards:', state.tableCards.map(tc => {
    if (tc.type) {
      return `{${tc.type}: ${tc.cards?.map(c => c.rank + c.suit).join(',')}}`;
    }
    return tc.rank + tc.suit;
  }));

  if (!card?.rank || !card?.suit || card?.value === undefined) {
    throw new Error('createTemp: invalid card payload - missing rank, suit, or value');
  }
  if (!targetCard?.rank || !targetCard?.suit || targetCard?.value === undefined) {
    throw new Error('createTemp: invalid targetCard payload - missing rank, suit, or value');
  }

  // STEP 1: Check if player already has a temp stack - only ONE temp stack per player allowed
  // This check happens FIRST to avoid any card manipulation if player already has a temp stack
  const existingTempStacks = state.tableCards.filter(
    tc => tc.type === 'temp_stack' && tc.owner === playerIndex
  );
  if (existingTempStacks.length > 0) {
    console.error('[createTemp] ===== PLAYER ALREADY HAS TEMP STACK =====');
    console.error(`[createTemp] Player ${playerIndex} already has ${existingTempStacks.length} temp stack(s)`);
    throw new Error(`Cannot create temp stack: player already has an active temp stack`);
  }

  // STEP 2: Validate the card exists at the claimed source
  console.log('[createTemp] Validating card at source:', cardSource);
  const cardInfo = findCardAtSource(state, card, cardSource, playerIndex);
  
  if (!cardInfo.found) {
    // Check if card already exists in a temp stack (action was already processed)
    const existingTempStack = state.tableCards.find(
      tc => tc.type === 'temp_stack' && tc.cards?.some(c => c.rank === card.rank && c.suit === card.suit)
    );
    if (existingTempStack) {
      console.log('[createTemp] Card already in temp stack - action was already processed, returning current state');
      return state;
    }
    
    // Card not at claimed source - this is a genuine error, not lenient mode
    console.error('[createTemp] ===== CARD NOT AT CLAIMED SOURCE =====');
    console.error('[createTemp] Client claimed card was from:', cardSource);
    
    // Log more details about what we searched
    if (cardSource === 'captured' || (cardSource && cardSource.startsWith('captured_'))) {
      let ownerIndex = playerIndex;
      if (cardSource.startsWith('captured_')) {
        ownerIndex = parseInt(cardSource.split('_')[1], 10);
      }
      console.error(`[createTemp] Searched capture pile of player ${ownerIndex} (playerIndex=${playerIndex})`);
      console.error('[createTemp] Captures at that index:', state.players[ownerIndex]?.captures?.map(c => c.rank + c.suit) || 'EMPTY');
      
      // Also log all players' captures for debugging
      console.error('[createTemp] All players captures:');
      state.players.forEach((p, idx) => {
        console.error(`  Player ${idx}:`, p.captures?.map(c => c.rank + c.suit) || []);
      });
    }
    
    console.error('[createTemp] This indicates a sync issue or client bug');
    throw new Error(`createTemp: card ${card.rank}${card.suit} not found at source ${cardSource}`);
  }
  console.log('[createTemp] Card validated at source:', cardSource, 'at index:', cardInfo.index);

  // STEP 3: Validate target card exists on table
  console.log('[createTemp] Validating target on table...');
  const targetInfo = findCardOnTable(state, targetCard);
  if (!targetInfo.found) {
    console.error('[createTemp] Target card not on table:', `${targetCard.rank}${targetCard.suit}`);
    throw new Error(`createTemp: target card ${targetCard.rank}${targetCard.suit} not found on table`);
  }
  console.log('[createTemp] Target found on table at index:', targetInfo.index);

  // STEP 3: Clone state and perform operations
  const newState = cloneState(state);

  // Remove card from the source location in cloned state
  let firstCard = null;
  let firstCardFoundOnTable = false;
  
  if (cardSource === 'table') {
    [firstCard] = newState.tableCards.splice(cardInfo.index, 1);
    firstCardFoundOnTable = true;
    console.log('[createTemp] Removed card from table');
  } else if (cardSource === 'hand') {
    const hand = newState.players[playerIndex].hand;
    [firstCard] = hand.splice(cardInfo.index, 1);
    console.log('[createTemp] Removed card from hand');
  } else if (cardSource === 'captured' || (cardSource && cardSource.startsWith('captured_'))) {
    // Use the ownerIndex from cardInfo if available, otherwise fall back to playerIndex
    const ownerIndex = cardInfo.ownerIndex !== undefined ? cardInfo.ownerIndex : playerIndex;
    [firstCard] = newState.players[ownerIndex].captures.splice(cardInfo.index, 1);
    console.log('[createTemp] Removed card from captures (owner:', ownerIndex, ')');
  }

  if (!firstCard) {
    throw new Error('createTemp: failed to remove card after validation');
  }

  const originalFirstCardIdx = firstCardFoundOnTable ? cardInfo.index : newState.tableCards.length;

  // STEP 4: Remove target from table in cloned state
  // Find the target again in the cloned state
  const targetIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  
  if (targetIdx === -1) {
    // Target disappeared - this shouldn't happen if validation passed
    // but we handle it gracefully
    console.error('[createTemp] Target card disappeared after validation');
    throw new Error('createTemp: target card disappeared during operation');
  }
  
  let insertIdx = Math.min(originalFirstCardIdx, targetIdx);
  if (!firstCardFoundOnTable) {
    insertIdx = targetIdx;
  }

  const [tableCard] = newState.tableCards.splice(targetIdx, 1);
  console.log('[createTemp] Removed target card from table');

  // STEP 5: Create temp stack
  const [bottom, top] = firstCard.value >= tableCard.value
    ? [{ ...firstCard, source: cardSource }, { ...tableCard, source: 'table' }]
    : [{ ...tableCard, source: 'table' }, { ...firstCard, source: cardSource }];

  const cards = [bottom, top];
  
  // Use the shared build calculator to compute value
  const values = cards.map(c => c.value);
  const buildInfo = calculateBuildValue(values);
  console.log('[createTemp] Build info:', buildInfo);

  const newTempStack = {
    type: 'temp_stack',
    stackId: generateStackId(newState, 'temp', playerIndex),
    cards: [bottom, top],
    owner: playerIndex,
    value: buildInfo.value,
    base: buildInfo.value,
    need: buildInfo.need,
    buildType: buildInfo.buildType,
  };
  
  console.log('[createTemp] Created temp stack:', {
    stackId: newTempStack.stackId,
    owner: newTempStack.owner,
    cards: newTempStack.cards.map(c => `${c.rank}${c.suit}(${c.source})`),
    value: newTempStack.value,
    need: newTempStack.need
  });
  
  newState.tableCards.splice(insertIdx, 0, newTempStack);

  // Mark turn as started and action triggered (but NOT ended - player can continue)
  startPlayerTurn(newState, playerIndex);
  triggerAction(newState, playerIndex);
  
  console.log('[createTemp] SUCCESS - created temp stack');
  
  return newState;
}

module.exports = createTemp;
