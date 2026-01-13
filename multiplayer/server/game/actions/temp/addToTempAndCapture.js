/**
 * Add To Temp And Capture Action Handler
 * Strategic play: Add card to temp stack, then capture with remaining card
 * Used when player has multiple capture cards and chooses to build larger stack
 */

const handleAddToOwnTemp = require('./addToOwnTemp');
const handleCapture = require('../capture/capture');

function handleAddToTempAndCapture(gameManager, playerIndex, action, gameId) {
  console.log('[STRATEGIC_CAPTURE] 🎯 Executing addToTempAndCapture action');
  console.log('[STRATEGIC_CAPTURE] Payload:', JSON.stringify(action.payload, null, 2));

  const { tempStackId, addedCard, captureCard } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  // Step 1: Add the specified card to the temp stack
  console.log('[STRATEGIC_CAPTURE] Step 1: Adding card to temp stack');
  const addToTempAction = {
    type: 'addToOwnTemp',
    payload: {
      stackId: tempStackId,
      card: addedCard,
      source: 'hand'
    }
  };

  const tempStackAddedState = handleAddToOwnTemp(gameManager, playerIndex, addToTempAction, gameId);
  console.log('[STRATEGIC_CAPTURE] ✅ Card added to temp stack, new state ready');

  // Step 2: Capture the larger temp stack
  console.log('[STRATEGIC_CAPTURE] Step 2: Capturing the larger temp stack');

  // Find the updated temp stack
  const updatedGameState = gameManager.getGameState(gameId);
  const tempStack = updatedGameState.tableCards.find(tc =>
    tc.type === 'temporary_stack' && tc.stackId === tempStackId
  );

  if (!tempStack) {
    throw new Error(`Temp stack ${tempStackId} not found after adding card`);
  }

  const newStackValue = tempStack.displayValue || tempStack.value || tempStack.combinedValue;

  console.log('[STRATEGIC_CAPTURE] 📊 Temp stack after addition:', {
    stackId: tempStack.stackId,
    newValue: newStackValue,
    cardsCount: tempStack.cards?.length || 0,
    cards: tempStack.cards?.map(c => `${c.rank}${c.suit}(${c.value})`) || []
  });

  // Create capture action for the larger temp stack
  const captureAction = {
    type: 'capture',
    payload: {
      tempStackId: tempStack.stackId,
      captureValue: newStackValue,
      targetCards: [...(tempStack.cards || [])], // All cards in the temp stack
      capturingCard: captureCard || addedCard, // Use the capture card (should be the remaining card)
      captureType: 'strategic_temp_stack_capture'
    }
  };

  console.log('[STRATEGIC_CAPTURE] 🎯 Executing capture with value:', newStackValue);
  const finalState = handleCapture(gameManager, playerIndex, captureAction, gameId);

  console.log('[STRATEGIC_CAPTURE] ✅ Strategic capture completed successfully');
  return finalState;
}

module.exports = handleAddToTempAndCapture;
