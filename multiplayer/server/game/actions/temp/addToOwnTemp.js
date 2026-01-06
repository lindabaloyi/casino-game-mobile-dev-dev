/**
 * Add To Own Temp Action Handler
 * Player adds card to existing temp stack
 * Implements freedom of play approach like addToOwnBuild
 */

const handleCaptureTempStack = require('../capture/captureTempStack');

function handleAddToOwnTemp(gameManager, playerIndex, action, gameId) {
  console.log('[TEMP_STACK] 🏃 ADD_TO_OWN_TEMP executing (FREEDOM OF PLAY)');
  console.log('[TEMP_STACK] Input action payload:', JSON.stringify(action.payload, null, 2));

  // 🎯 DEBUG: Log opponent card handling specifically
  if (action.payload.source === 'oppTopCard') {
    console.log('[🎯 OPP-TEMP-STACK-SERVER] Processing opponent card for temp stack:', {
      opponentId: action.payload.opponentId,
      card: `${action.payload.card.rank}${action.payload.card.suit}`,
      stackId: action.payload.stackId,
      playerIndex,
      gameId
    });
  }

  const { stackId, card, source } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  console.log('[TEMP_STACK] Operation details:', {
    gameId,
    stackId,
    card: `${card.rank}${card.suit}`,
    cardValue: card.value,
    source,
    playerIndex,
    philosophy: 'ALWAYS FIND OR CREATE'
  });

  // 🎯 DIRECT CAPTURE CHECK: FIRST CHECK - If dragging hand card that equals temp stack value
  if (source === 'hand') {
    // Find the temp stack to check its value
    const tempStack = gameState.tableCards.find(item =>
      item.type === 'temporary_stack' && item.stackId === stackId
    );

    if (tempStack && card.value === tempStack.value) {
      console.log('[DIRECT_CAPTURE] 🎯 Hand card matches temp stack value - executing direct capture:', {
        cardValue: card.value,
        stackValue: tempStack.value,
        stackId: tempStack.stackId
      });

      // Execute capture instead of adding to stack
      return handleCaptureTempStack(gameManager, playerIndex, {
        type: 'captureTempStack',
        payload: {
          tempStackId: tempStack.stackId,
          captureValue: card.value
        }
      }, gameId);
    }
  }

  // Find the temp stack - no auto-creation fallback
  const tempStack = gameState.tableCards.find(item =>
    item.type === 'temporary_stack' && item.stackId === stackId
  );

  if (!tempStack) {
    const error = new Error(`Temp stack '${stackId}' not found. Cannot add card to non-existent stack.`);
    console.error('[TEMP_STACK_ERROR] Stack not found:', {
      requestedStackId: stackId,
      availableStacks: gameState.tableCards
        .filter(item => item.type === 'temporary_stack')
        .map(stack => ({ id: stack.stackId, owner: stack.owner, cards: stack.cards.length }))
    });
    throw error;
  }

  // 🎯 COMPLETE FREEDOM: No validation for temp stack building
  // All validation deferred to finalizeStagingStack
  console.log('[VALIDATION] 🎯 Skipping validation for temp stack (player freedom)');

  // Basic sanity checks only (no game rule validation)
  if (!card || !card.rank || !card.suit) {
    console.error('[VALIDATION_ERROR] Invalid card data');
    throw new Error('Invalid card data');
  }

  if (!source) {
    console.error('[VALIDATION_ERROR] Card source not specified');
    throw new Error('Card source not specified');
  }

  // NOTE: No ownership, size, or rule validation for temp stacks
  // Freedom-first approach: Let players build anything during temp phase

  // 🎯 EXECUTION: Add card to stack (no size limits)
  console.log('[EXECUTION] Adding card to stack (unlimited):', {
    stackId: tempStack.stackId,
    beforeCount: tempStack.cards.length,
    card: `${card.rank}${card.suit}`,
    source,
    flexibleStacking: true
  });

  // Initialize cardPositions array if it doesn't exist (for backward compatibility)
  if (!tempStack.cardPositions) {
    tempStack.cardPositions = [];
    // Populate with existing cards' positions (best effort)
    tempStack.cards.forEach((existingCard, index) => {
      tempStack.cardPositions.push({
        cardId: `${existingCard.rank}${existingCard.suit}`,
        originalIndex: null, // Unknown for existing cards
        source: existingCard.source || 'unknown'
      });
    });
  }

  tempStack.cards.push({
    ...card,
    source: source || 'unknown',
    addedAt: Date.now(),
    addedBy: playerIndex
  });

  // Track the position of the newly added card
  let originalIndex = null;
  if (source === 'table' || source === 'loose') {
    // For table cards, find their original position
    // Note: This is approximate since we don't have perfect tracking
    // In a real implementation, this would need better state management
    originalIndex = gameState.tableCards.findIndex(tableCard =>
      tableCard.rank === card.rank &&
      tableCard.suit === card.suit &&
      (!tableCard.type || tableCard.type === 'loose')
    );
  }

  tempStack.cardPositions.push({
    cardId: `${card.rank}${card.suit}`,
    originalIndex: originalIndex,
    source: source || 'unknown'
  });

  // Update stack value (simple sum)
  tempStack.value = tempStack.cards.reduce((sum, c) => sum + (c.value || 0), 0);
  tempStack.lastUpdated = Date.now();

  // 🎯 SOURCE REMOVAL: Remove card from original source
  console.log('[EXECUTION] Removing card from source:', { source, card: `${card.rank}${card.suit}` });

  try {
    removeCardFromSource(gameState, card, source, playerIndex, action.payload.opponentId);
    console.log('[EXECUTION] ✅ Card successfully removed from source');
  } catch (error) {
    console.error('[EXECUTION_ERROR] Failed to remove card from source:', error.message);
    throw error;
  }

  console.log('[EXECUTION] ✅ Card added successfully (game-appropriate):', {
    stackId: tempStack.stackId,
    newCardCount: tempStack.cards.length,
    newValue: tempStack.value,
    remainingHand: gameState.playerHands[playerIndex]?.length || 0,
    unlimitedStacking: true,
    autoCreated: !!tempStack.createdAt
  });

  return gameState;
}

/**
 * Remove card from its source location
 * Handles hand, captures, and table sources
 */
function removeCardFromSource(gameState, card, source, playerIndex, opponentId) {
  console.log('[SOURCE_REMOVAL] Removing card from source:', {
    card: `${card.rank}${card.suit}`,
    source,
    playerIndex
  });

  if (source === 'hand') {
    const handIndex = gameState.playerHands[playerIndex].findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );
    if (handIndex >= 0) {
      gameState.playerHands[playerIndex].splice(handIndex, 1);
      console.log('[SOURCE_REMOVAL] ✅ Removed from hand at index:', handIndex);
    } else {
      throw new Error(`Card ${card.rank}${card.suit} not found in player's hand`);
    }
  } else if (source === 'table' || source === 'loose') {
    // 🎯 FIX: Handle 'loose' source same as 'table' (loose cards are table cards)
    console.log('[SOURCE_REMOVAL] Removing loose card from table');
    const cardIndex = gameState.tableCards.findIndex(tableCard =>
      tableCard.rank === card.rank &&
      tableCard.suit === card.suit &&
      (!tableCard.type || tableCard.type === 'loose')
    );
    if (cardIndex >= 0) {
      gameState.tableCards.splice(cardIndex, 1);
      console.log('[SOURCE_REMOVAL] ✅ Removed from table at index:', cardIndex);
    } else {
      throw new Error(`Card ${card.rank}${card.suit} not found on table`);
    }
  } else if (source === 'captured') {
    const captureIndex = gameState.playerCaptures[playerIndex].findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );
    if (captureIndex >= 0) {
      gameState.playerCaptures[playerIndex].splice(captureIndex, 1);
      console.log('[SOURCE_REMOVAL] ✅ Removed from captures at index:', captureIndex);
    } else {
      throw new Error(`Card ${card.rank}${card.suit} not found in player's captures`);
    }
  } else if (source === 'oppTopCard') {
    // Handle opponent top card - validate it's the top card and remove it
    if (opponentId === undefined) {
      throw new Error("opponentId is required for oppTopCard source");
    }

    const opponentCaptures = gameState.playerCaptures[opponentId] || [];
    if (opponentCaptures.length === 0) {
      throw new Error(`Opponent ${opponentId} has no captured cards`);
    }

    // Check if it's the top card (last element in array)
    const actualTopCard = opponentCaptures[opponentCaptures.length - 1];
    if (actualTopCard.rank !== card.rank || actualTopCard.suit !== card.suit) {
      throw new Error(`Card ${card.rank}${card.suit} is not opponent ${opponentId}'s top card`);
    }

    // Remove the top card from opponent's captures
    gameState.playerCaptures[opponentId].pop();
    console.log('[SOURCE_REMOVAL] ✅ Removed opponent top card from captures');
  } else {
    throw new Error(`Unknown source type: ${source}`);
  }
}

module.exports = handleAddToOwnTemp;
