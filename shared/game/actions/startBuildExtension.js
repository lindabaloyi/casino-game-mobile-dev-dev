/**
 * startBuildExtension
 * Player starts extending their own build by locking a card to it.
 */

const { cloneState } = require('../GameState');

function startBuildExtension(state, payload, playerIndex) {
  const { stackId, card, cardSource = 'table' } = payload;

  if (!stackId) {
    throw new Error('startBuildExtension: missing stackId');
  }
  if (!card?.rank || !card?.suit) {
    throw new Error('startBuildExtension: invalid card');
  }

  const newState = cloneState(state);

  // Find the build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`startBuildExtension: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  // Validate ownership
  if (buildStack.owner !== playerIndex) {
    throw new Error('startBuildExtension: only owner can extend their build');
  }

  // Remove card from its source
  let usedCard;
  
  if (cardSource === 'table') {
    const tableIdx = newState.tableCards.findIndex(
      tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
    );
    if (tableIdx === -1) {
      throw new Error(`startBuildExtension: card ${card.rank}${card.suit} not on table`);
    }
    usedCard = { ...newState.tableCards[tableIdx], source: 'table' };
    newState.tableCards.splice(tableIdx, 1);
    
  } else if (cardSource === 'hand') {
    const playerHand = newState.players[playerIndex].hand;
    const handIdx = playerHand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (handIdx === -1) {
      throw new Error(`startBuildExtension: card ${card.rank}${card.suit} not in player's hand`);
    }
    usedCard = { ...playerHand[handIdx], source: 'hand' };
    playerHand.splice(handIdx, 1);
    
  } else if (cardSource === 'captured') {
    const playerCaptures = newState.players[playerIndex].captures;
    const captureIdx = playerCaptures.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (captureIdx === -1) {
      throw new Error(`startBuildExtension: card ${card.rank}${card.suit} not in player's captures`);
    }
    usedCard = { ...playerCaptures[captureIdx], source: 'captured' };
    playerCaptures.splice(captureIdx, 1);
  } else {
    throw new Error(`startBuildExtension: unknown cardSource "${cardSource}"`);
  }

  // Set pending extension
  buildStack.pendingExtension = {
    cards: [{ card: usedCard, source: cardSource }]
  };

  return newState;
}

module.exports = startBuildExtension;
