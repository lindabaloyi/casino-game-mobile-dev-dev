/**
 * createSingleTemp
 * Creates a temporary stack from a single loose card (hand or table).
 * The stack's value is the card's value.
 * Does NOT end the turn - player can continue with more actions.
 * 
 * Guardrails:
 * - Only cards with value ≤ 5 may be used
 * - Cannot create when another temp stack exists
 */

const { cloneState, generateStackId, startPlayerTurn, triggerAction } = require('../');
const { hasAnyActiveTempStack } = require('../tempStackHelpers');

/**
 * Find card at specific source location
 * Returns { found: true, card, index } or { found: false }
 * 
 * Source format:
 * - 'hand' - current player's hand
 * - 'table' - table cards
 */
function findCardAtSource(state, card, source, playerIndex) {
  const cardKey = `${card.rank}${card.suit}`;
  
  switch (source) {
    case 'table': {
      // Find loose card on table (not a stack)
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
    
    default:
      break;
  }
  
  return { found: false };
}

function createSingleTemp(state, payload, playerIndex) {
  const { card, source } = payload;

  console.log('[createSingleTemp] Called with card:', card?.rank, card?.suit);
  console.log('[createSingleTemp] source:', source, 'playerIndex:', playerIndex);

  const cardSource = source || 'hand';

  // Validate card payload
  if (!card?.rank || !card?.suit || card?.value === undefined) {
    throw new Error('createSingleTemp: invalid card payload - missing rank, suit, or value');
  }

  // --- GUARDRAIL 1: Only allow cards with value ≤ 5 ---
  if (card.value > 5) {
    throw new Error(`Cannot create single temp stack with card value ${card.value}. Only cards 5 or lower are allowed.`);
  }

  // --- GUARDRAIL 2: Prevent creating temp when any player has active temp stack ---
  if (hasAnyActiveTempStack(state)) {
    throw new Error('Cannot create new temp stack - there is already an active temp stack on the table. Capture or cancel it first.');
  }

  // STEP 1: Validate the card exists at the claimed source
  const cardInfo = findCardAtSource(state, card, cardSource, playerIndex);
  
  if (!cardInfo.found) {
    // Check if card already exists in a temp stack (action was already processed)
    const existingTempStack = state.tableCards.find(
      tc => tc.type === 'temp_stack' && tc.cards?.some(c => c.rank === card.rank && c.suit === card.suit)
    );
    if (existingTempStack) {
      return state; // already processed
    }
    
    throw new Error(`createSingleTemp: card ${card.rank}${card.suit} not found at source ${cardSource}`);
  }

  // STEP 2: Clone state and perform operations
  const newState = cloneState(state);

  // Remove the card from its source
  let removedCard;
  let originalIndex = cardInfo.index;
  
  if (cardSource === 'table') {
    [removedCard] = newState.tableCards.splice(cardInfo.index, 1);
  } else if (cardSource === 'hand') {
    const hand = newState.players[playerIndex].hand;
    [removedCard] = hand.splice(cardInfo.index, 1);
  } else {
    throw new Error(`createSingleTemp: unsupported source ${cardSource}`);
  }

  console.log('[createSingleTemp] Removed card from source:', cardSource, 'at index:', originalIndex);

  if (!removedCard) {
    throw new Error('createSingleTemp: failed to remove card after validation');
  }

  // STEP 3: Create the temp stack with one card
  const newTempStack = {
    type: 'temp_stack',
    stackId: generateStackId(newState, 'temp', playerIndex),
    cards: [{ 
      ...removedCard, 
      source: cardSource, 
      originalIndex: originalIndex 
    }],
    owner: playerIndex,
    value: removedCard.value,
    base: removedCard.value,
    need: 0, // no need because it's just the single card
    buildType: 'single', // identifies as single-card temp stack
  };

  console.log('[createSingleTemp] Created temp stack:', newTempStack.stackId, 'value:', newTempStack.value);

  // STEP 4: Insert at the original position if it came from table, else at the end
  let insertIdx = newState.tableCards.length;
  if (cardSource === 'table') {
    insertIdx = Math.min(originalIndex, newState.tableCards.length);
  }
  newState.tableCards.splice(insertIdx, 0, newTempStack);

  console.log('[createSingleTemp] Inserted at index:', insertIdx);

  // Mark turn as started and action triggered (but NOT ended - player can continue)
  startPlayerTurn(newState, playerIndex);
  triggerAction(newState, playerIndex);
  
  return newState;
}

module.exports = createSingleTemp;