/**
 * Table Card Drop Action Handler
 * Player drops table card onto another table card to create staging stack
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('TableCardDrop');

function handleTableCardDrop(gameManager, playerIndex, action) {
  const { gameId } = action.payload;
  const gameState = gameManager.getGameState(gameId);
  const { draggedCard, targetCard, draggedSource } = action.payload;

  logger.info('[STAGING_DEBUG] 🚀 handleTableCardDrop STARTED - EXECUTING STAGING CREATION:', {
    gameId,
    playerIndex,
    draggedCard: `${draggedCard.rank}${draggedCard.suit} (val:${draggedCard.value})`,
    draggedSource: draggedSource || 'unknown',
    targetCard: `${targetCard.rank}${targetCard.suit} (val:${targetCard.value})`,
    currentPlayer: gameState.currentPlayer,
    currentPlayerMatches: gameState.currentPlayer === playerIndex,
    timestamp: new Date().toISOString()
  });

  // Casino rule: Players can only have one temp stack active at a time
  const existingTempStacks = gameState.tableCards.filter(card =>
    card.type === 'temporary_stack' && card.owner === playerIndex
  );

  logger.info('[STAGING_DEBUG] 🔍 VALIDATING TEMP STACK LIMIT:', {
    gameId,
    playerIndex,
    existingTempStackCount: existingTempStacks.length,
    existingStackIds: existingTempStacks.map(s => s.stackId),
    limitExceeded: existingTempStacks.length > 0,
    timestamp: new Date().toISOString()
  });

  const alreadyHasTempStack = existingTempStacks.length > 0;

  if (alreadyHasTempStack) {
    logger.error('[STAGING_DEBUG] ❌ STAGING BLOCKED - PLAYER ALREADY HAS TEMP STACK:', {
      gameId,
      player: playerIndex,
      existingStacks: existingTempStacks.map(s => s.stackId),
      draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
      targetCard: `${targetCard.rank}${targetCard.suit}`,
      throwingError: true,
      timestamp: new Date().toISOString()
    });
    throw new Error('You can only have one staging stack at a time.');
  }

  logger.info('[STAGING_DEBUG] ✅ TEMP STACK VALIDATION PASSED - PROCEEDING WITH CARD LOCATION:', {
    gameId,
    playerIndex,
    draggedSource,
    draggedFromHandCheck: draggedSource === 'hand',
    timestamp: new Date().toISOString()
  });

  let draggedIndex = -1;
  let targetIndex = -1;
  let draggedFromHand = false;

  // Handle dragged card (could be from hand or table)
  if (draggedSource === 'hand') {
    // Dragged card is from hand - will remove from player hand later
    draggedFromHand = true;
    logger.debug('[TABLE_DROP] Dragged card is from hand - will remove from hand', {
      draggedCard: `${draggedCard.rank}${draggedCard.suit}`
    });
  } else {
    // Dragged card should be on table
    draggedIndex = gameState.tableCards.findIndex(card =>
      (!card.type || card.type === 'loose') &&
      card.rank === draggedCard.rank &&
      card.suit === draggedCard.suit
    );

    if (draggedIndex === -1) {
      logger.error('[TABLE_DROP] Dragged card not found on table', {
        draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
        tableCards: gameState.tableCards.map(c => `${c.rank}${c.suit}`)
      });
      throw new Error('Dragged card not found on table');
    }
    logger.debug('[TABLE_DROP] Dragged card found on table', {
      card: `${draggedCard.rank}${draggedCard.suit}`,
      index: draggedIndex
    });
  }

  // Target card should always be on table
  targetIndex = gameState.tableCards.findIndex(card =>
    (!card.type || card.type === 'loose') &&
    card.rank === targetCard.rank &&
    card.suit === targetCard.suit
  );

  if (targetIndex === -1) {
    logger.error('[TABLE_DROP] Target card not found on table', {
      targetCard: `${targetCard.rank}${targetCard.suit}`,
      tableCards: gameState.tableCards.map(c => `${c.rank}${c.suit}`)
    });
    throw new Error('Target card not found on table');
  }

  logger.info('[TABLE_DROP] Cards located successfully', {
    draggedFromHand,
    draggedIndex: draggedFromHand ? 'n/a' : draggedIndex,
    targetIndex,
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    targetCard: `${targetCard.rank}${targetCard.suit}`
  });

  // Create temporary stack object
  const stackId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const tempStack = {
    type: 'temporary_stack',
    stackId: stackId,
    cards: [targetCard, draggedCard], // Target first, then dragged
    owner: playerIndex,
    value: targetCard.value + draggedCard.value,
    stackControls: true // Enable finalize/cancel buttons
  };

  logger.info('[TABLE_DROP] Created staging stack object', {
    stackId: tempStack.stackId,
    cards: [
      `${targetCard.rank}${targetCard.suit} (val:${targetCard.value})`,
      `${draggedCard.rank}${draggedCard.suit} (val:${draggedCard.value})`
    ],
    totalValue: tempStack.value,
    owner: playerIndex,
    stackControlsEnabled: tempStack.stackControls
  });

  // Update game state
  const newGameState = { ...gameState };

  // Update table cards
  logger.debug('[TABLE_DROP] Updating table cards', {
    beforeCount: gameState.tableCards.length,
    targetIndex,
    draggedIndex: draggedFromHand ? 'from-hand' : draggedIndex,
    operation: draggedFromHand ? 'replace target with stack (dragged from hand)' : 'replace target with stack, remove dragged from table'
  });

  newGameState.tableCards = [...gameState.tableCards];
  newGameState.tableCards[targetIndex] = tempStack; // Replace target with stack

  if (!draggedFromHand) {
    // Remove dragged card from table
    newGameState.tableCards.splice(draggedIndex, 1);
  }

  // If card was from hand, remove it from player's hand
  if (draggedFromHand) {
    logger.debug('[TABLE_DROP] Removing dragged card from player hand', {
      player: playerIndex,
      cardToRemove: `${draggedCard.rank}${draggedCard.suit}`,
      handSizeBefore: gameState.playerHands[playerIndex].length
    });

    newGameState.playerHands = gameState.playerHands.map((hand, idx) =>
      idx === playerIndex ?
        hand.filter(card => !(card.rank === draggedCard.rank && card.suit === draggedCard.suit)) :
        hand
    );

    const handSizeAfter = newGameState.playerHands[playerIndex].length;
    logger.info('[TABLE_DROP] Hand card removed from player hand', {
      player: playerIndex,
      cardRemoved: `${draggedCard.rank}${draggedCard.suit}`,
      handSizeBefore: gameState.playerHands[playerIndex].length,
      handSizeAfter
    });
  }

  logger.info('[STAGING_DEBUG] ✅ STAGING STACK CREATION COMPLETED:', {
    gameId,
    stackId: tempStack.stackId,
    value: tempStack.value,
    owner: playerIndex,
    tableCardsBefore: gameState.tableCards.length,
    tableCardsAfter: newGameState.tableCards.length,
    draggedFromHand,
    handSizeBefore: draggedFromHand ? gameState.playerHands[playerIndex].length : 'n/a',
    handSizeAfter: draggedFromHand ? newGameState.playerHands[playerIndex].length : 'n/a',
    gameStateUpdated: true,
    timestamp: new Date().toISOString()
  });

  logger.info('[STAGING_DEBUG] 📊 FINAL TABLE STATE SUMMARY:', {
    gameId,
    tableCards: newGameState.tableCards.map((card, idx) => ({
      index: idx,
      type: card.type || 'loose',
      stackId: card.stackId || null,
      card: card.type === 'temporary_stack' ? `stack (${card.cards?.length || 0} cards, val:${card.value})` : `${card.rank}${card.suit} (val:${card.value})`,
      owner: card.owner !== undefined ? card.owner : 'n/a'
    })),
    timestamp: new Date().toISOString()
  });

  logger.info('[STAGING_DEBUG] 🎯 RETURNING UPDATED GAME STATE - STAGING COMPLETE:', {
    gameId,
    playerIndex,
    actionSuccess: true,
    stackCreated: tempStack.stackId,
    broadcastingToClients: true,
    timestamp: new Date().toISOString()
  });

  return newGameState;
}

module.exports = handleTableCardDrop;
