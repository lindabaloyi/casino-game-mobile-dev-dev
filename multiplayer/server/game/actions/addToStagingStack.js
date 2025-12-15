/**
 * Add To Staging Stack Action Handler
 * Player adds card to existing temporary stack
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('AddToStagingStack');

function handleAddToStagingStack(gameManager, playerIndex, action) {
  const { gameId, stackId, card, source } = action.payload;

  console.log('[SIMPLE STAGING] Adding card to temp stack:', {
    gameId,
    stackId,
    card: `${card.rank}${card.suit}`,
    source,
    playerIndex
  });

  const gameState = gameManager.getGameState(gameId);

  // Find or create temp stack (senior lead's approach)
  let tempStack = gameState.tableCards.find(item =>
    item.type === 'temporary_stack' && item.stackId === stackId
  );

  if (!tempStack) {
    console.log('[SIMPLE STAGING] Creating new temp stack for player');
    tempStack = {
      type: 'temporary_stack',
      stackId: stackId || `staging-${Date.now()}`,
      cards: [],
      owner: playerIndex,
      value: 0
    };
    gameState.tableCards.push(tempStack);
  }

  // SIMPLE: Just add the card, no validation
  console.log('[SIMPLE STAGING] Adding card to stack:', {
    beforeCount: tempStack.cards.length,
    card: `${card.rank}${card.suit}`,
    source
  });

  tempStack.cards.push({
    ...card,
    source: source || 'unknown'
  });

  // Update value if available
  if (card.value) {
    tempStack.value = (tempStack.value || 0) + card.value;
  }

  // Remove from source (hand or captures)
  if (source === 'hand') {
    const handIndex = gameState.playerHands[playerIndex].findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );
    if (handIndex >= 0) {
      gameState.playerHands[playerIndex].splice(handIndex, 1);
    }
  } else if (source === 'captured') {
    // Remove from player's captures
    const captureIndex = gameState.playerCaptures[playerIndex].findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );
    if (captureIndex >= 0) {
      gameState.playerCaptures[playerIndex].splice(captureIndex, 1);
    }
  }

  console.log('[SIMPLE STAGING] Card added successfully:', {
    stackId: tempStack.stackId,
    newCardCount: tempStack.cards.length,
    newValue: tempStack.value,
    remainingHand: gameState.playerHands[playerIndex].length
  });

  return gameState;
}

module.exports = handleAddToStagingStack;
