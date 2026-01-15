/**
 * Stack Actions Module
 * Handles all temporary stack-related action determination logic
 * Extracted from determineActions.js for better separation of concerns
 */

const { rankValue } = require('../../GameState');
const { createLogger } = require('../../../utils/logger');
const logger = createLogger('StackActions');

/**
 * Determine stack actions available when dropping a card
 * Checks for table-to-table drops, temporary stack additions, and stack validation
 */
function determineStackActions(draggedItem, targetInfo, gameState) {
  const actions = [];
  const draggedCard = draggedItem.card;
  const draggedValue = rankValue(draggedCard.rank);
  const { tableCards, currentPlayer, gameId } = gameState;

  logger.info('[STAGING_DEBUG] 🎯 determineStackActions STARTED:', {
    gameId: gameId || 'unknown',
    draggedCard: `${draggedCard.rank}${draggedCard.suit} (val:${draggedValue})`,
    draggedSource: draggedItem.source,
    targetType: targetInfo.type,
    targetCard: targetInfo.card ? `${targetInfo.card.rank}${targetInfo.card.suit} (val:${targetInfo.card.value})` : null,
    currentPlayer,
    tableCardsCount: tableCards.length,
    timestamp: new Date().toISOString()
  });

  // Check for staging drops: table-to-table OR hand-to-loose card drops
  logger.info('[STAGING_DEBUG] 🔍 CHECKING STAGING DROP CONDITIONS:', {
    draggedSource: draggedItem.source,
    targetType: targetInfo.type,
    isTableDrop: draggedItem.source === 'table',
    isHandToLoose: draggedItem.source === 'hand' && targetInfo.type === 'loose',
    stagingConditionMet: draggedItem.source === 'table' || (draggedItem.source === 'hand' && targetInfo.type === 'loose'),
    timestamp: new Date().toISOString()
  });

  if (draggedItem.source === 'table' || (draggedItem.source === 'hand' && targetInfo.type === 'loose') ||
      (draggedItem.source === 'table' && targetInfo.type === 'temporary_stack')) {
    logger.info('[STAGING_DEBUG] ✅ STAGING CONDITION MET:', {
      gameId: gameId || 'unknown',
      draggedSource: draggedItem.source,
      targetType: targetInfo.type,
      draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
      targetCard: targetInfo.card ? `${targetInfo.card.rank}${targetInfo.card.suit}` : 'null',
      combinedValue: targetInfo.card ? draggedValue + rankValue(targetInfo.card.rank) : 'n/a',
      canCreateStacked: true,
      timestamp: new Date().toISOString()
    });

    logger.info('[STAGING_DEBUG] 🔧 PROCESSING STAGING DROP:', {
      gameId: gameId || 'unknown',
      draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
      targetType: targetInfo.type,
      proceedingToValidation: true,
      timestamp: new Date().toISOString()
    });

    if (targetInfo.type === 'loose') {
      logger.info('[STAGING_DEBUG] 🎴 LOOSE TARGET DETECTED - CREATING NEW STAGING STACK:', {
        gameId: gameId || 'unknown',
        draggedCard: `${draggedCard.rank}${draggedCard.suit} (val:${draggedValue})`,
        targetCard: `${targetInfo.card.rank}${targetInfo.card.suit} (val:${rankValue(targetInfo.card.rank)})`,
        calculatedStackValue: draggedValue + rankValue(targetInfo.card.rank),
        timestamp: new Date().toISOString()
      });

      // Create temporary stack action for new stack
      const tableCardDropAction = {
        type: 'tableCardDrop',
        label: `Create Stack (${draggedValue + rankValue(targetInfo.card.rank)})`,
        payload: {
          gameId: gameId,
          draggedCard: draggedCard,
          targetCard: targetInfo.card,
          draggedSource: draggedItem.source,
          player: currentPlayer
        }
      };

      actions.push(tableCardDropAction);

      logger.info('[STAGING_DEBUG] 🎯 NEW STAGING STACK ACTION CREATED:', {
        gameId: gameId || 'unknown',
        actionType: tableCardDropAction.type,
        draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
        targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`,
        timestamp: new Date().toISOString()
      });

      return {
        actions,
        requiresModal: false,
        errorMessage: null
      };
    } else if (targetInfo.type === 'temporary_stack') {
      logger.info('[STAGING_DEBUG] 📦 TEMPORARY STACK TARGET DETECTED - ADDING TO EXISTING STAGING STACK:', {
        gameId: gameId || 'unknown',
        draggedCard: `${draggedCard.rank}${draggedCard.suit} (val:${draggedValue})`,
        targetStackId: targetInfo.stackId,
        unlimitedStagingAddition: true,
        timestamp: new Date().toISOString()
      });

      // Find the target temporary stack
      const targetStack = tableCards.find(c =>
        c.type === 'temporary_stack' && c.stackId === targetInfo.stackId
      );

      if (targetStack) {
        // Create action to add to existing temporary stack
        const addToStagingAction = {
          type: 'addToStagingStack',
          label: `Add to Stack (${targetStack.value} → ${targetStack.value + draggedValue})`,
          payload: {
            gameId: gameState.gameId,
            draggedItem,
            targetStack
          }
        };

        actions.push(addToStagingAction);

        logger.info('[STAGING_DEBUG] 🎯 ADD TO STAGING STACK ACTION CREATED:', {
          gameId: gameId || 'unknown',
          actionType: addToStagingAction.type,
          draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
          targetStackId: targetInfo.stackId,
          currentValue: targetStack.value,
          newValue: targetStack.value + draggedValue,
          timestamp: new Date().toISOString()
        });

        return {
          actions,
          requiresModal: false,
          errorMessage: null
        };
      } else {
        logger.warn('[STAGING_DEBUG] ⚠️ TARGET TEMPORARY STACK NOT FOUND:', {
          gameId: gameId || 'unknown',
          targetStackId: targetInfo.stackId,
          availableStacks: tableCards.filter(c => c.type === 'temporary_stack').map(c => c.stackId),
          timestamp: new Date().toISOString()
        });

        return {
          actions: [],
          requiresModal: false,
          errorMessage: 'Target temporary stack not found'
        };
      }
    } else {
      logger.warn('[STAGING_DEBUG] ⚠️ STAGING DROP ON UNSUPPORTED TARGET TYPE:', {
        gameId: gameId || 'unknown',
        targetType: targetInfo.type,
        draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
        supportedTypes: ['loose', 'temporary_stack'],
        timestamp: new Date().toISOString()
      });

      return {
        actions: [],
        requiresModal: false,
        errorMessage: 'Unsupported staging target type'
      };
    }
  } else {
    logger.info('[STAGING_DEBUG] ⏭️ STAGING CONDITION NOT MET - NO STACK ACTIONS:', {
      gameId: gameId || 'unknown',
      draggedSource: draggedItem.source,
      targetType: targetInfo.type,
      stagingCondition: draggedItem.source === 'table' || (draggedItem.source === 'hand' && targetInfo.type === 'loose'),
      returningEmptyActions: true,
      timestamp: new Date().toISOString()
    });
  }

  return actions;
}

/**
 * Validate stack actions and return appropriate results
 */
function validateStackActions(actions, draggedItem) {
  if (draggedItem.source === 'table') {
    // For table-to-table drops, return the result directly (may include error messages)
    return {
      actions,
      requiresModal: false,
      errorMessage: null
    };
  }

  // For other stack actions, return just the actions array
  return actions;
}

module.exports = {
  determineStackActions,
  validateStackActions
};
