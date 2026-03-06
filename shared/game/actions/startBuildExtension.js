/**
 * startBuildExtension
 * Player starts extending their own build by locking a card to it.
 */

const { cloneState } = require('../');

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
    // Check player's own captures first, then opponent's captures
    // (allows using cards from opponent's capture pile when extending build)
    let playerCaptures = newState.players[playerIndex].captures;
    let captureIdx = playerCaptures.findIndex(
      c => String(c.rank).toLowerCase() === String(card.rank).toLowerCase() && 
           String(c.suit).toLowerCase() === String(card.suit).toLowerCase(),
    );
    
    // If not found in player's captures, check opponent's captures
    if (captureIdx === -1) {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentCaptures = newState.players[opponentIndex].captures;
      captureIdx = opponentCaptures.findIndex(
        c => String(c.rank).toLowerCase() === String(card.rank).toLowerCase() && 
             String(c.suit).toLowerCase() === String(card.suit).toLowerCase(),
      );
      if (captureIdx !== -1) {
        playerCaptures = opponentCaptures;
      }
    }
    
    if (captureIdx === -1) {
      throw new Error(`startBuildExtension: card ${card.rank}${card.suit} not in player's or opponent's captures`);
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
