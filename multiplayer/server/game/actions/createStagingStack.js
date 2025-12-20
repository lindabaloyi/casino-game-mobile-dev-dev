/**
 * Create Staging Stack Action Handler
 * Player creates staging stack by dropping hand card on loose table card
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('CreateStagingStack');

function handleCreateStagingStack(gameManager, playerIndex, action) {
  const { gameId, source, card: draggedCard, targetIndex, isTableToTable } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  logger.info('Creating unified staging stack', {
    playerIndex,
    source,
    isTableToTable,
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    targetIndex,
    gameId
  });

  // Find the target table card at the specified index
  if (!gameState.tableCards || targetIndex >= gameState.tableCards.length) {
    const error = new Error("Target table card not found at specified index.");
    logger.error('Staging stack creation failed - invalid target index', { targetIndex, tableCardsCount: gameState.tableCards?.length });
    throw error;
  }

  const targetCard = gameState.tableCards[targetIndex];
  if (!targetCard || targetCard.type === 'temporary_stack') {
    const error = new Error("Target card is not a valid loose card.");
    logger.error('Staging stack creation failed - invalid target card', { targetCard, targetIndex });
    throw error;
  }

  // Validate dragged card based on source
  if (source === 'hand') {
    // Hand-to-table: validate card exists in player's hand
    const playerHand = gameState.playerHands[playerIndex];
    const handExists = playerHand.some(card =>
      card.rank === draggedCard.rank && card.suit === draggedCard.suit
    );

    if (!handExists) {
      const error = new Error("Hand card not found.");
      logger.error('Staging stack creation failed - hand card not in hand', { playerIndex, draggedCard });
      throw error;
    }
  } else if (source === 'table') {
    // Table-to-table: validate card exists on table (different from target)
    const draggedExistsOnTable = gameState.tableCards.some((card, index) =>
      index !== targetIndex && // Not the target card
      card.rank === draggedCard.rank && card.suit === draggedCard.suit
    );

    if (!draggedExistsOnTable) {
      const error = new Error("Dragged table card not found.");
      logger.error('Staging stack creation failed - dragged table card not found', { draggedCard, targetIndex });
      throw error;
    }
  } else {
    const error = new Error("Invalid source for staging.");
    logger.error('Staging stack creation failed - invalid source', { source });
    throw error;
  }

  // Check that player doesn't already have a staging stack
  const hasStagingStack = gameState.tableCards.some(card =>
    card.type === 'temporary_stack' && card.owner === playerIndex
  );

  if (hasStagingStack) {
    const error = new Error("You can only have one staging stack at a time.");
    logger.error('Staging stack creation failed - player already has staging stack', { playerIndex });
    throw error;
  }

  // Create staging stack
  const stagingStack = {
    type: 'temporary_stack',
    stackId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    cards: [
      { ...targetCard, source: 'table' }, // ✅ Bottom card first (target)
      { ...draggedCard, source }          // ✅ Top card second (dragged)
    ],
    owner: playerIndex,
    value: draggedCard.value + targetCard.value,
    combinedValue: draggedCard.value + targetCard.value,
    possibleBuilds: [draggedCard.value + targetCard.value],
    isTableToTable: isTableToTable || false
  };

  const newGameState = { ...gameState };

  // Remove dragged card from appropriate location
  if (source === 'hand') {
    // Remove from player's hand
    newGameState.playerHands = gameState.playerHands.map((hand, idx) =>
      idx === playerIndex ? hand.filter(card =>
        !(card.rank === draggedCard.rank && card.suit === draggedCard.suit)
      ) : hand
    );
  } else if (source === 'table') {
    // Create mutable variable for target index adjustment
    let adjustedTargetIndex = targetIndex;

    // Remove from table (find the dragged card, excluding the target)
    const draggedIndex = gameState.tableCards.findIndex((card, index) =>
      index !== targetIndex && // Not the target card
      card.rank === draggedCard.rank && card.suit === draggedCard.suit
    );

    if (draggedIndex !== -1) {
      newGameState.tableCards = [...gameState.tableCards];
      newGameState.tableCards.splice(draggedIndex, 1);
      // ✅ FIX: Use adjustedTargetIndex instead of targetIndex
      // Adjust if we removed a card before the target
      if (draggedIndex < adjustedTargetIndex) {
        adjustedTargetIndex--; // ✅ CORRECT: Modifying mutable variable
      }

      // Replace target card with staging stack using adjusted index
      newGameState.tableCards.splice(adjustedTargetIndex, 1, stagingStack);
    } else {
      // If dragged card not found (shouldn't happen due to earlier validation)
      newGameState.tableCards = [...(newGameState.tableCards || gameState.tableCards)];
      newGameState.tableCards.splice(targetIndex, 1, stagingStack);
    }
  } else {
    // For other sources (shouldn't happen due to earlier validation)
    newGameState.tableCards = [...(newGameState.tableCards || gameState.tableCards)];
    newGameState.tableCards.splice(targetIndex, 1, stagingStack);
  }

  // Only need to handle hand source separately for table replacement
  if (source === 'hand') {
    newGameState.tableCards = [...(newGameState.tableCards || gameState.tableCards)];
    newGameState.tableCards.splice(targetIndex, 1, stagingStack);
  }

  logger.info('Unified staging stack created successfully', {
    stackId: stagingStack.stackId,
    source,
    isTableToTable,
    value: stagingStack.value,
    tableCardsCount: newGameState.tableCards.length,
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    targetCard: `${targetCard.rank}${targetCard.suit}`
  });

  return newGameState;
}

module.exports = handleCreateStagingStack;
