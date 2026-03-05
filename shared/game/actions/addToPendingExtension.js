/**
 * addToPendingExtension
 * Player adds another card to an existing pending extension.
 */

const { cloneState } = require('../GameState');

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

  // Validate ownership
  if (buildStack.owner !== playerIndex) {
    throw new Error('addToPendingExtension: only owner can extend their build');
  }

  // Check pending extension
  if (!buildStack.pendingExtension) {
    throw new Error('addToPendingExtension: no pending extension to add to');
  }

  // Remove card from its source
  let usedCard;
  
  if (cardSource === 'table') {
    const tableIdx = newState.tableCards.findIndex(
      tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
    );
    if (tableIdx === -1) {
      throw new Error(`addToPendingExtension: card ${card.rank}${card.suit} not on table`);
    }
    usedCard = { ...newState.tableCards[tableIdx], source: 'table' };
    newState.tableCards.splice(tableIdx, 1);
  } else if (cardSource === 'hand') {
    const playerHand = newState.players[playerIndex].hand;
    const handIdx = playerHand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (handIdx === -1) {
      throw new Error(`addToPendingExtension: card ${card.rank}${card.suit} not in player's hand`);
    }
    usedCard = { ...playerHand[handIdx], source: 'hand' };
    playerHand.splice(handIdx, 1);
  } else if (cardSource === 'captured') {
    const playerCaptures = newState.players[playerIndex].captures;
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
    buildStack.pendingExtension.cards = [buildStack.pendingExtension.looseCard];
    delete buildStack.pendingExtension.looseCard;
  }
  
  buildStack.pendingExtension.cards.push({ card: usedCard, source: cardSource });

  return newState;
}

module.exports = addToPendingExtension;
