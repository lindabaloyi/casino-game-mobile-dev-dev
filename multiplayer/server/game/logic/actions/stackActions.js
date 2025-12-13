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
  console.log('[determineStackActions] entered', {
    source: draggedItem.source,
    targetType: targetInfo.type,
    playerId: gameState.currentPlayer
  });

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

  if (draggedItem.source === 'table' || (draggedItem.source === 'hand' && targetInfo.type === 'loose')) {
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
      logger.info('[STAGING_DEBUG] 🎴 LOOSE TARGET DETECTED - PREPARING STAGING STACK:', {
        gameId: gameId || 'unknown',
        draggedCard: `${draggedCard.rank}${draggedCard.suit} (val:${draggedValue})`,
        targetCard: `${targetInfo.card.rank}${targetInfo.card.suit} (val:${rankValue(targetInfo.card.rank)})`,
        calculatedStackValue: draggedValue + rankValue(targetInfo.card.rank),
        timestamp: new Date().toISOString()
      });

      // STAGING STACKS BYPASS ALL VALIDATION - No checks for existing temp stacks
      // According to bug report: "Staging stacks should be unconditional and must bypass all stack validation rules"
      logger.info('[STAGING_DEBUG] ✅ STAGING STACKS BYPASS VALIDATION - NO EXISTING STACK CHECK:', {
        gameId: gameId || 'unknown',
        draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
        targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`,
        bypassedValidation: true,
        timestamp: new Date().toISOString()
      });

      logger.info('[STAGING_DEBUG] ✅ TEMP STACK VALIDATION PASSED - CREATING tableCardDrop ACTION:', {
        gameId: gameId || 'unknown',
        actionType: 'tableCardDrop',
        draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
        targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`,
        player: currentPlayer,
        newStackValue: draggedValue + rankValue(targetInfo.card.rank),
        timestamp: new Date().toISOString()
      });

      console.log('[determineStackActions] creating staging action', {
        draggedCardId: draggedItem.card.id,
        targetCardId: targetInfo.card.id
      });

      // Create temporary stack action
      const tableCardDropAction = {
        type: 'tableCardDrop',
        label: `Create Stack (${draggedValue + rankValue(targetInfo.card.rank)})`,
        payload: {
          gameId: gameId, // Will be set by caller
          draggedCard: draggedCard,
          targetCard: targetInfo.card,
          draggedSource: draggedItem.source,
          player: currentPlayer
        }
      };

      actions.push(tableCardDropAction);

      logger.info('[STAGING_DEBUG] 🎯 TABLE DROP ACTION CREATED - RETURNING FOR AUTO-EXECUTION:', {
        gameId: gameId || 'unknown',
        actionCount: actions.length,
        actionType: tableCardDropAction.type,
        requiresModal: false,
        errorMessage: null,
        timestamp: new Date().toISOString()
      });

      // Auto-execute single table drop actions (don't require modal)
      return {
        actions,
        requiresModal: false,
        errorMessage: null
      };
    } else {
      logger.warn('[STAGING_DEBUG] ⚠️ TABLE DROP ON NON-LOOSE TARGET NOT SUPPORTED:', {
        gameId: gameId || 'unknown',
        targetType: targetInfo.type,
        draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
        returningError: true,
        timestamp: new Date().toISOString()
      });
      console.warn('[determineStackActions] STAGING REJECTED', {
        reason: 'Invalid table card drop target - not a loose card'
      });

      // Table drop on non-loose targets not supported
      return {
        actions: [],
        requiresModal: false,
        errorMessage: 'Invalid table card drop target'
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

  // Check for adding to existing temporary stacks
  if (targetInfo.type === 'temporary_stack') {
    const targetStack = tableCards.find(c =>
      c.type === 'temporary_stack' && c.stackId === targetInfo.stackId
    );

    if (targetStack) {
      actions.push({
        type: 'addToStagingStack',
        label: `Add to Stack (${targetStack.value} → ${targetStack.value + draggedValue})`,
        payload: {
          gameId: gameState.gameId,
          draggedItem,
          targetStack
        }
      });
    }
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
