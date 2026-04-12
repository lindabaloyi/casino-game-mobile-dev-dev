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
const { hasAnyActiveTempStack } = require('../tempStackHelpers');

/**
 * Helper: Find card specifically on table
 * Used for target card validation
 */
function findCardOnTable(state, targetCard) {
  const tableIdx = state.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
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

function createTemp(state, payload, playerIndex) {
  const { card, targetCard, source } = payload;

  const cardSource = source || 'hand';

  if (!card?.rank || !card?.suit || card?.value === undefined) {
    throw new Error('createTemp: invalid card payload - missing rank, suit, or value');
  }
  if (!targetCard?.rank || !targetCard?.suit || targetCard?.value === undefined) {
    throw new Error('createTemp: invalid targetCard payload - missing rank, suit, or value');
  }

  // --- GUARDRAIL: Prevent create temp when any player has active temp stack ---
  if (hasAnyActiveTempStack(state)) {
    throw new Error('Cannot create temp stack - there is already an active temp stack on the table. Capture or cancel it first.');
  }

  // STEP 1: Validate the card exists at the claimed source
  const cardInfo = findCardAtSource(state, card, cardSource, playerIndex);
  
  if (!cardInfo.found) {
    // Check if card already exists in a temp stack (action was already processed)
    const existingTempStack = state.tableCards.find(
      tc => tc.type === 'temp_stack' && tc.cards?.some(c => c.rank === card.rank && c.suit === card.suit)
    );
    if (existingTempStack) {
      return state;
    }
    
    // Card not at claimed source - this is a genuine error
    throw new Error(`createTemp: card ${card.rank}${card.suit} not found at source ${cardSource}`);
  }

  // STEP 2: Validate target card exists on table
  const targetInfo = findCardOnTable(state, targetCard);
  if (!targetInfo.found) {
    throw new Error(`createTemp: target card ${targetCard.rank}${targetCard.suit} not found on table`);
  }

  // --- GUARDRAIL: Opponent capture card must be <= loose card ---
  if (cardSource && (cardSource === 'captured' || cardSource.startsWith('captured_'))) {
    const ownerIdx = cardInfo.ownerIndex !== undefined ? cardInfo.ownerIndex : playerIndex;
    if (ownerIdx !== playerIndex) {
      if (card.value > targetCard.value) {
        throw new Error(
          `Cannot create temp stack: opponent capture card (${card.rank}${card.suit}, value ${card.value}) ` +
          `is greater than loose card (${targetCard.rank}${targetCard.suit}, value ${targetCard.value})`
        );
      }
    }
  }

  // STEP 3: Clone state and perform operations
  const newState = cloneState(state);

  // Remove card from the source location in cloned state
  // Track original index and owner for proper restoration on cancel
  let firstCard = null;
  let firstCardFoundOnTable = false;
  let firstCardOriginalIndex = -1;
  let firstCardOriginalOwner = playerIndex;
  
  if (cardSource === 'table') {
    firstCardOriginalIndex = cardInfo.index;
    [firstCard] = newState.tableCards.splice(cardInfo.index, 1);
    firstCardFoundOnTable = true;
  } else if (cardSource === 'hand') {
    firstCardOriginalIndex = cardInfo.index;
    const hand = newState.players[playerIndex].hand;
    [firstCard] = hand.splice(cardInfo.index, 1);
  } else if (cardSource === 'captured' || (cardSource && cardSource.startsWith('captured_'))) {
    const ownerIndex = cardInfo.ownerIndex !== undefined ? cardInfo.ownerIndex : playerIndex;
    firstCardOriginalOwner = ownerIndex;
    firstCardOriginalIndex = cardInfo.index;
    [firstCard] = newState.players[ownerIndex].captures.splice(cardInfo.index, 1);
  }

  console.log('[createTemp] Removed first card from source:', cardSource, 'at index:', firstCardOriginalIndex, 'originalOwner:', firstCardOriginalOwner);

  if (!firstCard) {
    throw new Error('createTemp: failed to remove card after validation');
  }

  const originalFirstCardIdx = firstCardFoundOnTable ? cardInfo.index : newState.tableCards.length;

  // STEP 5: Remove target from table in cloned state
  const targetIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  
  if (targetIdx === -1) {
    throw new Error('createTemp: target card disappeared during operation');
  }
  
  let insertIdx = Math.min(originalFirstCardIdx, targetIdx);
  if (!firstCardFoundOnTable) {
    insertIdx = targetIdx;
  }

  const [tableCard] = newState.tableCards.splice(targetIdx, 1);

  // STEP 6: Create temp stack
  // Order by value (higher first), but if values are equal and hand card is used, put hand card on top (last)
  let bottom, top;
  
  if (firstCard.value > tableCard.value) {
    // Hand card has higher value - hand card at bottom, table card on top
    bottom = { ...firstCard, source: cardSource, originalIndex: firstCardOriginalIndex, originalOwner: firstCardOriginalOwner };
    top = { ...tableCard, source: 'table', originalIndex: targetInfo.index, originalOwner: undefined };
  } else if (firstCard.value < tableCard.value) {
    // Table card has higher value - table card at bottom, hand card on top
    bottom = { ...tableCard, source: 'table', originalIndex: targetInfo.index, originalOwner: undefined };
    top = { ...firstCard, source: cardSource, originalIndex: firstCardOriginalIndex, originalOwner: firstCardOriginalOwner };
  } else {
    // Values are equal - put table card at bottom, hand card on top (hand card captures)
    bottom = { ...tableCard, source: 'table', originalIndex: targetInfo.index, originalOwner: undefined };
    top = { ...firstCard, source: cardSource, originalIndex: firstCardOriginalIndex, originalOwner: firstCardOriginalOwner };
  }

  const cards = [bottom, top];
  
  // Use the shared build calculator to compute value
  const values = cards.map(c => c.value);
  const buildInfo = calculateBuildValue(values);

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
  
  console.log('[createTemp] Created temp stack:', newTempStack.stackId);
  console.log('[createTemp] Cards with sources:', newTempStack.cards.map(c => `${c.rank}${c.suit} (source: ${c.source})`).join(', '));
  
  newState.tableCards.splice(insertIdx, 0, newTempStack);

  // Mark turn as started and action triggered (but NOT ended - player can continue)
  startPlayerTurn(newState, playerIndex);
  triggerAction(newState, playerIndex);
  
  return newState;
}

module.exports = createTemp;
