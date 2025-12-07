/**
 * Stack Actions Module
 * Handles all temporary stack-related action determination logic
 * Extracted from determineActions.js for better separation of concerns
 */

const { rankValue } = require('../../GameState');

/**
 * Determine stack actions available when dropping a card
 * Checks for table-to-table drops, temporary stack additions, and stack validation
 */
function determineStackActions(draggedItem, targetInfo, gameState) {
  const actions = [];
  const draggedCard = draggedItem.card;
  const draggedValue = rankValue(draggedCard.rank);
  const { tableCards, currentPlayer } = gameState;

  // Check for table-to-table drops (creating temporary stacks)
  if (draggedItem.source === 'table') {
    if (targetInfo.type === 'loose') {
      // Check if player already has a temp stack (can only have one)
      const alreadyHasTempStack = tableCards.some(card =>
        card.type === 'temporary_stack' && card.owner === currentPlayer
      );

      if (alreadyHasTempStack) {
        return {
          actions: [],
          requiresModal: false,
          errorMessage: 'You can only have one staging stack at a time.'
        };
      }

      // Create temporary stack action
      actions.push({
        type: 'tableCardDrop',
        label: `Create Stack (${draggedValue + rankValue(targetInfo.card.rank)})`,
        payload: {
          gameId: gameState.gameId, // Will be set by caller
          draggedCard: draggedCard,
          targetCard: targetInfo.card,
          player: currentPlayer
        }
      });

      // Auto-execute single table drop actions (don't require modal)
      return {
        actions,
        requiresModal: false,
        errorMessage: null
      };
    } else {
      // Table drop on non-loose targets not supported
      return {
        actions: [],
        requiresModal: false,
        errorMessage: 'Invalid table card drop target'
      };
    }
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
