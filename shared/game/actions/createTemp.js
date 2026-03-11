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

  // STEP 3: Clone state and perform operations
  const newState = cloneState(state);

  // Remove card from the source location in cloned state
  let firstCard = null;
  let firstCardFoundOnTable = false;
  
  if (cardSource === 'table') {
    [firstCard] = newState.tableCards.splice(cardInfo.index, 1);
    firstCardFoundOnTable = true;
  } else if (cardSource === 'hand') {
    const hand = newState.players[playerIndex].hand;
    [firstCard] = hand.splice(cardInfo.index, 1);
  } else if (cardSource === 'captured' || (cardSource && cardSource.startsWith('captured_'))) {
    const ownerIndex = cardInfo.ownerIndex !== undefined ? cardInfo.ownerIndex : playerIndex;
    [firstCard] = newState.players[ownerIndex].captures.splice(cardInfo.index, 1);
  }

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
  const [bottom, top] = firstCard.value >= tableCard.value
    ? [{ ...firstCard, source: cardSource }, { ...tableCard, source: 'table' }]
    : [{ ...tableCard, source: 'table' }, { ...firstCard, source: cardSource }];

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
  
  newState.tableCards.splice(insertIdx, 0, newTempStack);

  // Mark turn as started and action triggered (but NOT ended - player can continue)
  startPlayerTurn(newState, playerIndex);
  triggerAction(newState, playerIndex);
  
  return newState;
}

module.exports = createTemp;
