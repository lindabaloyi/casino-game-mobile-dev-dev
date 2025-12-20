/**
 * KISS: Just move temp stack + capture card to captures
 * No validation, no points, no checks - client already validated rules
 */
async function handleCaptureTempStack(gameManager, action, playerIndex) {
  console.log('🎯 [CAPTURE_TEMP_STACK] Moving cards to captures...');

  const gameState = gameManager.getGameState();
  const { tempStackId, captureValue } = action.payload;

  // 1. Find temp stack
  const tempStackIndex = gameState.tableCards.findIndex(card =>
    card.stackId === tempStackId
  );

  if (tempStackIndex === -1) {
    console.log('⚠️ Temp stack already gone, ignoring');
    return { success: true }; // Don't crash if already gone
  }

  const tempStack = gameState.tableCards[tempStackIndex];

  // 2. Find capture card in hand (take first matching value)
  const playerHand = gameState.playerHands[playerIndex] || [];
  const captureCardIndex = playerHand.findIndex(card => card.value === captureValue);

  if (captureCardIndex === -1) {
    console.log('⚠️ Capture card not in hand, using first card');
    // Just use first card if not found (shouldn't happen)
    if (playerHand.length > 0) {
      var captureCard = playerHand[0];
      playerHand.splice(0, 1);
    } else {
      console.log('⚠️ No cards in hand, skipping capture card');
      var captureCard = null;
    }
  } else {
    var captureCard = playerHand[captureCardIndex];
    playerHand.splice(captureCardIndex, 1);
  }

  // 3. Remove temp stack from table
  const tempStackCards = tempStack.cards || [];
  gameState.tableCards.splice(tempStackIndex, 1);

  // 4. Add all cards to captures
  const allCards = captureCard ? [...tempStackCards, captureCard] : tempStackCards;

  if (!gameState.capturedCards[playerIndex]) {
    gameState.capturedCards[playerIndex] = [];
  }

  gameState.capturedCards[playerIndex].push(...allCards);

  console.log('✅ [CAPTURE_TEMP_STACK] Done:', {
    tempStackCards: tempStackCards.length,
    captureCard: captureCard ? `${captureCard.value}${captureCard.suit}` : 'none',
    totalCaptured: allCards.length
  });

  gameManager.updateGameState(gameState);

  return { success: true };
}

module.exports = handleCaptureTempStack;
