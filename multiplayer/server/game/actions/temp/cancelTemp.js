/**
 * Cancel Temp Action Handler
 * Player cancels temp, returning cards to original positions
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('CancelTemp');

function handleCancelTemp(gameManager, playerIndex, action, gameId) {
  const gameState = gameManager.getGameState(gameId);
  const { stackToCancel } = action.payload;

  logger.info('[STAGING_CANCEL] 🔄 Starting position-aware staging stack cancellation', {
    playerIndex,
    stackId: stackToCancel.stackId,
    gameId,
    currentPlayer: gameState.currentPlayer,
    isPlayerTurn: playerIndex === gameState.currentPlayer
  });

  logger.debug('[STAGING_CANCEL] 📋 Stack to cancel details', {
    stackOwner: stackToCancel.owner,
    stackCards: stackToCancel.cards?.map(c => `${c.rank}${c.suit}(${c.source})`) || [],
    hasPositionData: !!stackToCancel.cardPositions,
    positionCount: stackToCancel.cardPositions?.length || 0,
    stackValue: stackToCancel.value
  });

  // Find the temp stack to cancel
  const stackIndex = gameState.tableCards.findIndex(card =>
    card.type === 'temporary_stack' && card.stackId === stackToCancel.stackId
  );

  if (stackIndex === -1) {
    logger.error('[STAGING_CANCEL] ❌ Temporary stack not found - aborting', {
      requestedStackId: stackToCancel.stackId,
      availableStacks: gameState.tableCards.filter(card =>
        card.type === 'temporary_stack'
      ).map(s => s.stackId)
    });
    throw new Error('Temporary stack not found');
  }

  const tempStack = gameState.tableCards[stackIndex];
  logger.info('[STAGING_CANCEL] 🎯 Temporary stack found - preparing smart restoration', {
    stackIndex,
    stackId: tempStack.stackId,
    totalCards: tempStack.cards.length,
    hasPositionTracking: !!tempStack.cardPositions,
    positionDataComplete: tempStack.cardPositions?.every(p => p.originalIndex !== undefined)
  });

  // Create new table cards array without the temp stack
  const newTableCards = [...gameState.tableCards];
  newTableCards.splice(stackIndex, 1);

  // Track restoration results
  const restorationResults = {
    tableCards: [],
    handCards: [],
    captureCards: [],
    conflicts: []
  };

  // Smart restoration using position data
  if (tempStack.cardPositions && tempStack.cardPositions.length > 0) {
    logger.debug('[STAGING_CANCEL] 📍 Using position-aware restoration');

    // Sort positions to restore in correct order (lowest index first to avoid shifting issues)
    const sortedPositions = tempStack.cardPositions
      .map((pos, cardIndex) => ({ ...pos, cardIndex }))
      .sort((a, b) => {
        // Table cards with known positions first, then by index
        if (a.source === 'table' && a.originalIndex !== null && (b.source !== 'table' || b.originalIndex === null)) return -1;
        if (b.source === 'table' && b.originalIndex !== null && (a.source !== 'table' || a.originalIndex === null)) return 1;
        if (a.originalIndex !== null && b.originalIndex !== null) return a.originalIndex - b.originalIndex;
        return 0; // Keep original order for unknown positions
      });

    sortedPositions.forEach(({ cardId, originalIndex, source, cardIndex }) => {
      const card = tempStack.cards[cardIndex];
      if (!card) {
        logger.warn(`[STAGING_CANCEL] ⚠️ Card not found for position data: ${cardId}`);
        return;
      }

      // Use source from cardPositions metadata (authoritative source)
      const authoritativeSource = source;

      logger.debug(`[STAGING_CANCEL] 🔄 Restoring ${cardId} from ${authoritativeSource}`, {
        originalIndex,
        source: authoritativeSource,
        cardValue: card.value,
        cardSource: card.source // For comparison
      });

      // Restore based on authoritative source
      if (authoritativeSource === 'table' || authoritativeSource === 'loose') {
        // Table card - try to restore to original position
        let restoreIndex = originalIndex;

        if (restoreIndex === null || restoreIndex >= newTableCards.length) {
          // Original position not available, append to end
          restoreIndex = newTableCards.length;
          restorationResults.conflicts.push({
            cardId,
            reason: 'original_position_unavailable',
            restoredTo: restoreIndex
          });
        }

        const cleanCard = {
          rank: card.rank,
          suit: card.suit,
          value: card.value
        };

        newTableCards.splice(restoreIndex, 0, cleanCard);
        restorationResults.tableCards.push({
          cardId,
          restoredTo: restoreIndex,
          originalIndex
        });

        logger.debug(`[STAGING_CANCEL] ✅ Restored table card ${cardId} to position ${restoreIndex}`, {
          wasOriginal: restoreIndex === originalIndex
        });

      } else if (authoritativeSource === 'hand') {
        // Hand card - return to player's hand
        const playerHand = gameState.playerHands[playerIndex];
        if (!playerHand) {
          logger.error(`[STAGING_CANCEL] ❌ Player hand not found for index ${playerIndex}`);
          return;
        }

        const cleanCard = {
          rank: card.rank,
          suit: card.suit,
          value: card.value
        };

        playerHand.push(cleanCard);
        restorationResults.handCards.push({
          cardId,
          playerIndex
        });

        logger.debug(`[STAGING_CANCEL] ✅ Returned hand card ${cardId} to player ${playerIndex}`);

      } else if (authoritativeSource === 'captured' || authoritativeSource === 'captures') {
        // Captured card - return to player's captures
        const playerCaptures = gameState.playerCaptures[playerIndex];
        if (!playerCaptures) {
          logger.error(`[STAGING_CANCEL] ❌ Player captures not found for index ${playerIndex}`);
          return;
        }

        const cleanCard = {
          rank: card.rank,
          suit: card.suit,
          value: card.value
        };

        playerCaptures.push(cleanCard);
        restorationResults.captureCards.push({
          cardId,
          playerIndex
        });

        logger.debug(`[STAGING_CANCEL] ✅ Returned captured card ${cardId} to player ${playerIndex} captures`);
      } else {
        logger.warn(`[STAGING_CANCEL] ⚠️ Unknown source '${authoritativeSource}' for card ${cardId}, appending to table`);
        const cleanCard = {
          rank: card.rank,
          suit: card.suit,
          value: card.value
        };
        newTableCards.push(cleanCard);
      }
    });

  } else {
    // Fallback for stacks without position data (backward compatibility)
    logger.warn('[STAGING_CANCEL] ⚠️ No position data available, using legacy restoration');

    const reversedCards = tempStack.cards.slice().reverse();
    reversedCards.forEach((card) => {
      const cleanCard = { rank: card.rank, suit: card.suit, value: card.value };

      // Try to determine source from card metadata
      const source = card.source || 'table';

      if (source === 'hand') {
        gameState.playerHands[playerIndex].push(cleanCard);
        restorationResults.handCards.push({
          cardId: `${card.rank}${card.suit}`,
          playerIndex
        });
      } else {
        newTableCards.push(cleanCard);
        restorationResults.tableCards.push({
          cardId: `${card.rank}${card.suit}`,
          restoredTo: newTableCards.length - 1,
          originalIndex: null
        });
      }
    });
  }

  // Log comprehensive restoration results
  logger.info('[STAGING_CANCEL] ✅ Position-aware staging stack canceled successfully', {
    stackId: stackToCancel.stackId,
    totalCards: tempStack.cards.length,
    tableCardsBefore: gameState.tableCards.length,
    tableCardsAfter: newTableCards.length,
    restorationSummary: {
      tableCardsRestored: restorationResults.tableCards.length,
      handCardsReturned: restorationResults.handCards.length,
      captureCardsReturned: restorationResults.captureCards.length,
      positionConflicts: restorationResults.conflicts.length
    },
    turnNotAdvanced: true
  });

  if (restorationResults.conflicts.length > 0) {
    logger.warn('[STAGING_CANCEL] ⚠️ Position conflicts during restoration', {
      conflicts: restorationResults.conflicts
    });
  }

  logger.debug('[STAGING_CANCEL] 📊 Final restoration details', {
    tableCards: newTableCards.map((card, idx) => ({
      index: idx,
      type: card.type || 'loose',
      card: `${card.rank}${card.suit}`,
      source: card.source || 'restored'
    })),
    handSizes: gameState.playerHands.map((hand, idx) => ({
      player: idx,
      handSize: hand.length
    })),
    captureSizes: gameState.playerCaptures.map((captures, idx) => ({
      player: idx,
      captureSize: captures.length
    }))
  });

  return {
    ...gameState,
    tableCards: newTableCards
    // Note: Turn does NOT advance when canceling
  };
}

module.exports = handleCancelTemp;
