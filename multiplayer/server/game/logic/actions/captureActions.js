/**
 * Capture Actions Module
 * Handles all capture-related action determination logic
 * Extracted from determineActions.js for better separation of concerns
 */

const { rankValue, calculateCardSum, isCard, isBuild, isTemporaryStack } = require('../../GameState');

/**
 * Determine capture actions available when dropping a card
 * Checks for captures of loose cards, builds, and temporary stacks
 */
function determineCaptureActions(draggedItem, gameState) {
  const actions = [];
  const draggedValue = rankValue(draggedItem.card.rank);
  const { tableCards } = gameState;

  // Check for captures on table cards
  tableCards.forEach((tableCard) => {
    if (isCard(tableCard)) {
      const cardValue = tableCard.rank ? rankValue(tableCard.rank) : 0;
      if (cardValue === draggedValue) {
        actions.push({
          type: 'capture',
          label: `Capture ${tableCard.rank}`,
          payload: {
            gameId: gameState.gameId,
            draggedItem,
            selectedTableCards: [tableCard],
            targetCard: tableCard
          }
        });
      }
    } else if (isBuild(tableCard) && tableCard.value === draggedValue) {
      actions.push({
        type: 'capture',
        label: `Capture Build (${tableCard.value})`,
        payload: {
          gameId: gameState.gameId,
          draggedItem,
          selectedTableCards: [tableCard],
          targetCard: tableCard
        }
      });
    } else if (isTemporaryStack(tableCard)) {
      const stackCaptureValue = tableCard.captureValue || calculateCardSum(tableCard.cards || []);
      if (stackCaptureValue === draggedValue) {
        actions.push({
          type: 'capture',
          label: `Capture Stack (${stackCaptureValue})`,
          payload: {
            gameId: gameState.gameId,
            draggedItem,
            selectedTableCards: [tableCard],
            targetCard: tableCard
          }
        });
      }
    }
  });

  return actions;
}

/**
 * Check if a capture action should be auto-executed (single capture scenario)
 */
function shouldAutoExecuteCapture(actions, draggedCard, tableCards, gameState) {
  if (actions.length !== 1 || actions[0].type !== 'capture') {
    return false;
  }

  const draggedValue = rankValue(draggedCard.rank);

  // Check for duplicate loose cards before auto-executing capture
  const duplicateLooseCards = tableCards.filter(tableItem =>
    isCard(tableItem) &&
    tableItem.rank &&
    rankValue(tableItem.rank) === draggedValue
  );

  // Block auto-capture if there are duplicate cards on table
  if (duplicateLooseCards.length >= 1) {
    return {
      autoExecute: false,
      errorMessage: `Cannot trail loose card: ${draggedCard.rank} cards already exist on the table.`
    };
  }

  return { autoExecute: true, errorMessage: null };
}

module.exports = {
  determineCaptureActions,
  shouldAutoExecuteCapture
};
