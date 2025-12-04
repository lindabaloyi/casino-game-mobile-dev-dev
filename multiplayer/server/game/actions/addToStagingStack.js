/**
 * Add To Staging Stack Action Handler
 * Player adds card to existing temporary stack
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('AddToStagingStack');

function handleAddToStagingStack(gameManager, playerIndex, action) {
  const { gameId } = action.payload;
  const gameState = gameManager.getGameState(gameId);
  const { draggedItem, targetStack } = action.payload;

  logger.info('Adding to staging stack', {
    playerIndex,
    draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    stackId: targetStack.stackId,
    gameId
  });

  // Find the temp stack
  const stackIndex = gameState.tableCards.findIndex(card =>
    card.type === 'temporary_stack' && card.stackId === targetStack.stackId
  );

  if (stackIndex === -1) {
    throw new Error('Temporary stack not found');
  }

  // Validation and card removal based on source
  let addedCard;

  if (draggedItem.source === 'captured') {
    // Add opponent's captured card to temp stack
    const opponentIndex = draggedItem.player; // Note: this seems wrong in original - should be current player's captures?
    if (gameState.playerCaptures[playerIndex].length === 0) {
      throw new Error("No captured cards available");
    }
    addedCard = gameState.playerCaptures[playerIndex].pop();
  } else {
    // Add from player's hand
    const playerHand = gameState.playerHands[playerIndex];
    const handIndex = playerHand.findIndex(c =>
      c.rank === draggedItem.card.rank && c.suit === draggedItem.card.suit
    );

    if (handIndex === -1) {
      throw new Error("Hand card not found");
    }

    addedCard = playerHand.splice(handIndex, 1)[0];
  }

  // Update the temp stack
  const tempStack = gameState.tableCards[stackIndex];
  const updatedStack = {
    ...tempStack,
    cards: [...tempStack.cards, { ...addedCard, source: draggedItem.source }],
    value: tempStack.value + addedCard.value,
    possibleBuilds: [...(tempStack.possibleBuilds || [tempStack.value]), tempStack.value + addedCard.value]
  };

  const newGameState = {
    ...gameState,
    tableCards: gameState.tableCards.map((card, idx) =>
      idx === stackIndex ? updatedStack : card
    ),
    playerHands: draggedItem.source === 'hand' ? gameState.playerHands.map((hand, idx) =>
      idx === playerIndex ? [...gameState.playerHands[playerIndex]] : hand
    ) : gameState.playerHands,
    playerCaptures: draggedItem.source === 'captured' ? gameState.playerCaptures.map((captures, idx) =>
      idx === playerIndex ? [...gameState.playerCaptures[playerIndex]] : captures
    ) : gameState.playerCaptures
  };

  logger.info('Added to staging stack successfully', {
    stackId: targetStack.stackId,
    newValue: updatedStack.value,
    cardCount: updatedStack.cards.length
  });

  return newGameState;
}

module.exports = handleAddToStagingStack;
