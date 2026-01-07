/**
 * Create Temp Action Handler
 * Player creates temp by dropping hand card on loose table card
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('CreateTemp');

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

  // ✅ CRITICAL: Add null checks to prevent server crashes
  if (!gameState) {
    const error = new Error(`Game ${gameId} not found`);
    logger.error('Staging stack creation failed - game not found', { gameId, playerIndex });
    throw error;
  }

  if (!gameState.tableCards) {
    const error = new Error(`Game ${gameId} has no tableCards`);
    logger.error('Staging stack creation failed - no tableCards', { gameId, playerIndex });
    throw error;
  }

  // Find the target table card at the specified index
  if (targetIndex >= gameState.tableCards.length) {
    const error = new Error("Target table card not found at specified index.");
    logger.error('Staging stack creation failed - invalid target index', { targetIndex, tableCardsCount: gameState.tableCards.length });
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
  } else if (source === 'oppTopCard') {
    // Opponent card: validate it's the top card in opponent's captures
    const opponentId = action.payload.opponentId;
    if (opponentId === undefined) {
      const error = new Error("opponentId is required for oppTopCard source");
      logger.error('Staging stack creation failed - missing opponentId', { source });
      throw error;
    }

    const opponentCaptures = gameState.playerCaptures[opponentId] || [];
    if (opponentCaptures.length === 0) {
      const error = new Error(`Opponent ${opponentId} has no captured cards`);
      logger.error('Staging stack creation failed - opponent has no cards', { opponentId });
      throw error;
    }

    // Check if it's the top card (last element in array)
    const actualTopCard = opponentCaptures[opponentCaptures.length - 1];
    if (actualTopCard.rank !== draggedCard.rank ||
        actualTopCard.suit !== draggedCard.suit) {
      const error = new Error(`Card ${draggedCard.rank}${draggedCard.suit} is not opponent ${opponentId}'s top card`);
      logger.error('Staging stack creation failed - card is not top card', {
        draggedCard,
        actualTopCard,
        opponentId
      });
      throw error;
    }
  } else if (source === 'capturedTopCard') {
    // Player's own captured card: validate it's the top card in player's captures
    const playerCaptures = gameState.playerCaptures[playerIndex] || [];
    if (playerCaptures.length === 0) {
      const error = new Error(`Player ${playerIndex} has no captured cards`);
      logger.error('Staging stack creation failed - player has no captured cards', { playerIndex });
      throw error;
    }

    // Check if it's the top card (last element in array)
    const actualTopCard = playerCaptures[playerCaptures.length - 1];
    if (actualTopCard.rank !== draggedCard.rank ||
        actualTopCard.suit !== draggedCard.suit) {
      const error = new Error(`Card ${draggedCard.rank}${draggedCard.suit} is not player ${playerIndex}'s top captured card`);
      logger.error('Staging stack creation failed - card is not top captured card', {
        draggedCard,
        actualTopCard,
        playerIndex
      });
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
  } else if (source === 'oppTopCard') {
    // Remove from opponent's captures (the top card)
    const opponentId = action.payload.opponentId;
    newGameState.playerCaptures = gameState.playerCaptures.map((captures, idx) =>
      idx === opponentId ? captures.slice(0, -1) : captures // Remove last element (top card)
    );

    logger.info(`Removed top card ${draggedCard.rank}${draggedCard.suit} from opponent ${opponentId}'s captures`);
  } else if (source === 'capturedTopCard') {
    // Remove from player's own captures (the top card)
    newGameState.playerCaptures = gameState.playerCaptures.map((captures, idx) =>
      idx === playerIndex ? captures.slice(0, -1) : captures // Remove last element (top card)
    );

    logger.info(`Removed top card ${draggedCard.rank}${draggedCard.suit} from player ${playerIndex}'s captures`);
  } else {
    // For other sources (shouldn't happen due to earlier validation)
    newGameState.tableCards = [...(newGameState.tableCards || gameState.tableCards)];
    newGameState.tableCards.splice(targetIndex, 1, stagingStack);
  }

  // Handle table replacement for hand, captured, and opponent sources
  if (source === 'hand' || source === 'oppTopCard' || source === 'capturedTopCard') {
    newGameState.tableCards = [...(newGameState.tableCards || gameState.tableCards)];
    newGameState.tableCards.splice(targetIndex, 1, stagingStack);
  }

  // 🎯 AUTO-CAPTURE CHECK: If this is a same-value stack with no build options, capture immediately
  if (stagingStack.isSameValueStack) {
    console.log('[CREATE_TEMP] 🎯 Same-value stack created, checking for auto-capture...');

    // Import the build checking function
    const { checkBuildOptionsForStack } = require('../logic/rules/tempRules');

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
