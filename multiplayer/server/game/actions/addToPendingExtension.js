/**
 * addToPendingExtension
 * Player adds another card to an existing pending extension.
 * 
 * Payload:
 * - stackId: required - the build stack ID
 * - card: required - the card being added
 * - cardSource: required - source of the card ('table', 'hand', 'captured')
 * 
 * Rules:
 * - Player must own the build
 * - There must be an existing pending extension
 * - Card must be available from the specified source
 * - Does NOT advance turn
 * 
 * Contract: (state, payload, playerIndex) => newState (pure)
 */

const { cloneState } = require('../GameState');

/**
 * @param {object} state
 * @param {{ stackId: string, card: object, cardSource: string }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function addToPendingExtension(state, payload, playerIndex) {
  const { stackId, card, cardSource } = payload;

  if (!stackId) {
    throw new Error('addToPendingExtension: missing stackId');
  }
  if (!card?.rank || !card?.suit) {
    throw new Error('addToPendingExtension: invalid card');
  }
  if (!cardSource) {
    throw new Error('addToPendingExtension: missing cardSource');
  }

  const newState = cloneState(state);

  // Find the build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`addToPendingExtension: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  // Validate ownership - only owner can extend their build
  if (buildStack.owner !== playerIndex) {
    throw new Error('addToPendingExtension: only owner can extend their build');
  }

  // Check if there's a pending extension
  if (!buildStack.pendingExtension) {
    throw new Error('addToPendingExtension: no pending extension to add to');
  }

  // Remove card from its source
  let usedCard;
  
  if (cardSource === 'table') {
    // Find and remove loose card from table
    const tableIdx = newState.tableCards.findIndex(
      tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
    );
    
    if (tableIdx === -1) {
      throw new Error(`addToPendingExtension: card ${card.rank}${card.suit} not on table`);
    }
    
    usedCard = { ...newState.tableCards[tableIdx], source: 'table' };
    newState.tableCards.splice(tableIdx, 1);
    
  } else if (cardSource === 'hand') {
    // Find and remove card from player's hand
    const playerHand = newState.playerHands[playerIndex];
    if (!playerHand) {
      throw new Error('addToPendingExtension: player has no hand');
    }
    
    const handIdx = playerHand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    
    if (handIdx === -1) {
      throw new Error(`addToPendingExtension: card ${card.rank}${card.suit} not in player's hand`);
    }
    
    usedCard = { ...playerHand[handIdx], source: 'hand' };
    playerHand.splice(handIdx, 1);
    
  } else if (cardSource === 'captured') {
    // Find and remove card from player's captured cards
    const playerCaptures = newState.playerCaptures[playerIndex];
    if (!playerCaptures) {
      throw new Error('addToPendingExtension: player has no captured cards');
    }
    
    const captureIdx = playerCaptures.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    
    if (captureIdx === -1) {
      throw new Error(`addToPendingExtension: card ${card.rank}${card.suit} not in player's captures`);
    }
    
    usedCard = { ...playerCaptures[captureIdx], source: 'captured' };
    playerCaptures.splice(captureIdx, 1);
    
  } else {
    throw new Error(`addToPendingExtension: unknown cardSource "${cardSource}"`);
  }

  // Add to pending extension array
  if (!buildStack.pendingExtension.cards) {
    // Convert from old single-card format to array format
    buildStack.pendingExtension.cards = [buildStack.pendingExtension.looseCard];
    delete buildStack.pendingExtension.looseCard;
  }
  
  buildStack.pendingExtension.cards.push({ card: usedCard, source: cardSource });

  console.log(`[addToPendingExtension] Player ${playerIndex} added ${usedCard.rank}${usedCard.suit} from ${cardSource}`);
  console.log(`[addToPendingExtension] Build ${stackId} now has ${buildStack.pendingExtension.cards.length} pending cards`);

  // Turn does NOT advance - player continues to add more cards
  return newState;
}

module.exports = addToPendingExtension;
