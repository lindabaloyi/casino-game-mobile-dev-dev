/**
 * Add To Staging Stack Action Handler
 * Player adds card to existing temporary stack
 * Implements Rule-Based Validation approach from specification
 */

const { createLogger } = require('../../utils/logger');
const { validateStagingAddition } = require('../logic/staging');
const logger = createLogger('AddToStagingStack');

function handleAddToStagingStack(gameManager, playerIndex, action) {
  console.log('[TEMP_STACK] 🏃 ADD_TO_STAGING_STACK executing (GAME-APPROPRIATE)');
  console.log('[TEMP_STACK] Input action payload:', JSON.stringify(action.payload, null, 2));

  const { gameId, stackId, card, source } = action.payload;
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

  // 🎯 FIX 4: AUTO-CREATE STACKS - Always find or create (race condition fix)
  let tempStack = gameState.tableCards.find(item =>
    item.type === 'temporary_stack' && item.stackId === stackId
  );

  if (!tempStack) {
    console.log('[AUTO_CREATE] Stack not found, creating new temp stack:', {
      requestedStackId: stackId,
      playerIndex,
      philosophy: 'never fail, always create'
    });

    tempStack = {
      type: 'temporary_stack',
      stackId: stackId || `temp-${Date.now()}-${playerIndex}`,
      cards: [],
      owner: playerIndex,  // Default to current player
      value: 0,
      createdAt: Date.now()
    };
    gameState.tableCards.push(tempStack);
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

  tempStack.cards.push({
    ...card,
    source: source || 'unknown',
    addedAt: Date.now(),
    addedBy: playerIndex
  });

  // Update stack value (simple sum)
  tempStack.value = tempStack.cards.reduce((sum, c) => sum + (c.value || 0), 0);
  tempStack.lastUpdated = Date.now();

  // 🎯 SOURCE REMOVAL: Remove card from original source
  console.log('[EXECUTION] Removing card from source:', { source, card: `${card.rank}${card.suit}` });

  try {
    removeCardFromSource(gameState, card, source, playerIndex);
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
function removeCardFromSource(gameState, card, source, playerIndex) {
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
  } else {
    throw new Error(`Unknown source type: ${source}`);
  }
}

module.exports = handleAddToStagingStack;
