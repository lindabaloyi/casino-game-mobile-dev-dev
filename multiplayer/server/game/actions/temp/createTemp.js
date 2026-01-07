/**
 * Create Temp Action Handler
 * Player creates temp by dropping hand card on loose table card
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('CreateTemp');

const {
  validateBasic,
  validateTargetCard,
  validateSource,
  validateNoExistingStagingStack
} = require('./validators');

const { removeCardsBySource } = require('./cardRemovers');

/**
 * Dedicated Same-Value Auto-Capture Handler
 * Handles auto-capture of same-value cards without affecting existing temp stack logic
 */
function handleSameValueAutoCapture(gameState, playerIndex, targetCard, draggedCard, targetIndex, source) {
  console.log('[AUTO_CAPTURE_HANDLER] 🎯 Processing same-value auto-capture', {
    targetCard: `${targetCard.rank}${targetCard.suit}`,
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    targetIndex,
    source,
    playerIndex
  });

  // ✅ STEP 1: Remove target card from table at targetIndex
  // This is the key fix - target card was being left on table
  gameState.tableCards.splice(targetIndex, 1);
  console.log('[AUTO_CAPTURE_HANDLER] ✅ Removed target card from table at index', targetIndex);

  // ✅ STEP 2: Ensure dragged card is properly handled
  // For hand source, it's already removed above in main function
  // For table source, it should also be removed (table-to-table auto-capture)
  if (source === 'table') {
    // Find and remove the dragged card from table (it should be before targetIndex since target was removed)
    const draggedTableIndex = gameState.tableCards.findIndex(card =>
      card.rank === draggedCard.rank && card.suit === draggedCard.suit
    );
    if (draggedTableIndex !== -1) {
      gameState.tableCards.splice(draggedTableIndex, 1);
      console.log('[AUTO_CAPTURE_HANDLER] ✅ Removed dragged table card from table');
    }
  }

  // ✅ STEP 3: Add both cards to player's captures
  if (!gameState.playerCaptures[playerIndex]) {
    gameState.playerCaptures[playerIndex] = [];
  }
  gameState.playerCaptures[playerIndex].push(targetCard, draggedCard);
  console.log('[AUTO_CAPTURE_HANDLER] ✅ Added both cards to captures');

  // ✅ STEP 4: Auto-turn switch
  const nextPlayer = (playerIndex + 1) % 2;
  gameState.currentPlayer = nextPlayer;
  console.log('[AUTO_CAPTURE_HANDLER] ✅ Switched turn to player', nextPlayer);

  console.log('[AUTO_CAPTURE_HANDLER] ✅ Same-value auto-capture complete', {
    cardsCaptured: [`${targetCard.rank}${targetCard.suit}`, `${draggedCard.rank}${draggedCard.suit}`],
    tableCardsRemaining: gameState.tableCards.length,
    nextPlayer
  });

  return gameState;
}

function handleCreateTemp(gameManager, playerIndex, action, gameId) {
  const { source, card: draggedCard, targetIndex, isTableToTable } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  logger.info('Creating unified staging stack', {
    playerIndex,
    source,
    isTableToTable,
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    targetIndex,
    gameId
  });

  // 🎯 VALIDATION PIPELINE (clear, sequential)
  const validatedTargetIndex = validateBasic(action, gameState);
  const targetCard = validateTargetCard(gameState, validatedTargetIndex);
  validateSource(source, draggedCard, targetCard, gameState, playerIndex, action.payload);
  validateNoExistingStagingStack(gameState, playerIndex);

  // Create universal staging stack with position tracking
  // Sort cards by value: highest value at bottom, lowest at top
  const sortedCards = global.buildSortDetector ?
    global.buildSortDetector([targetCard, draggedCard], (a, b) => b.value - a.value) :
    [targetCard, draggedCard].sort((a, b) => b.value - a.value);
  const stagingStack = {
    type: 'temporary_stack',
    stackId: `temp-${playerIndex}`,  // ✅ SIMPLE: player-based ID (players can only have one temp stack)
    cards: sortedCards.map(card => ({
      ...card,
      source: card === targetCard ? 'table' : source
    })),
    // Track original positions for proper restoration
    cardPositions: [
      {
        cardId: `${targetCard.rank}${targetCard.suit}`,
        originalIndex: targetIndex,
        source: 'table'
      },
      {
        cardId: `${draggedCard.rank}${draggedCard.suit}`,
        originalIndex: source === 'hand' ? null : (gameState.tableCards.findIndex((card, index) =>
          index !== targetIndex && card.rank === draggedCard.rank && card.suit === draggedCard.suit
        )),
        source: source
      }
    ],
    owner: playerIndex,
    value: draggedCard.value + targetCard.value,
    combinedValue: draggedCard.value + targetCard.value,
    possibleBuilds: [draggedCard.value + targetCard.value],
    isTableToTable: isTableToTable || false,
    // Universal staging: include build augmentation capability
    canAugmentBuilds: action.payload.canAugmentBuilds || false,
    // Mark same-value stacks for special strategic handling
    isSameValueStack: action.payload.isSameValueStack || false
  };

  // 🎯 CARD REMOVAL PIPELINE (Phase 2)
  const newGameState = removeCardsBySource(
    gameState,
    playerIndex,
    source,
    draggedCard,
    targetCard,
    targetIndex,
    {
      ...action.payload,
      stagingStack
    }
  );

  // 🎯 AUTO-CAPTURE CHECK: If this is a same-value stack with no build options, capture immediately
  if (stagingStack.isSameValueStack) {
    console.log('[CREATE_TEMP] 🎯 Same-value stack created, checking for auto-capture...');

    // Import the build checking function
    const { checkBuildOptionsForStack } = require('../../logic/utils/buildUtils');

    // Check if current player has build options
    const playerHand = newGameState.playerHands[playerIndex];
    const hasBuildOptions = checkBuildOptionsForStack(stagingStack, playerHand);

    if (!hasBuildOptions) {
      console.log('[CREATE_TEMP] 🚀 NO BUILD OPTIONS - AUTO-CAPTURING SAME-VALUE STACK');

      // 🎯 USE DEDICATED HANDLER: Clean separation, proper table cleanup
      return handleSameValueAutoCapture(
        gameState,
        playerIndex,
        targetCard,
        draggedCard,
        targetIndex,
        source
      );
    } else {
      console.log('[CREATE_TEMP] 📋 HAS BUILD OPTIONS - CREATING TEMP STACK FOR MODAL');
    }
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

module.exports = handleCreateTemp;



