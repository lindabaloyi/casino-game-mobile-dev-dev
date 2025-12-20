/**
 * Capture Temp Stack Action Handler
 * Handles capturing a temp stack with automatic validation
 * Called when player confirms capture from the validation modal
 */

const { createLogger } = require('../../utils/logger');

const logger = createLogger('CaptureTempStack');

function handleCaptureTempStack(gameManager, playerIndex, action) {
  console.log('🎯 [CAPTURE_TEMP_STACK] Starting temp stack capture...', {
    playerIndex,
    payload: action.payload
  });

  const { gameId } = action.payload;
  const gameState = gameManager.getGameState(gameId);
  const { tempStackId, captureValue } = action.payload;

  logger.info('Starting temp stack capture', {
    playerIndex,
    tempStackId,
    captureValue,
    gameId
  });

  // 1. Find the temp stack
  const tempStackIndex = gameState.tableCards.findIndex(card =>
    card.type === 'temporary_stack' && card.stackId === tempStackId
  );

  if (tempStackIndex === -1) {
    const errorMsg = `Temp stack ${tempStackId} not found`;
    logger.error('Temp stack not found', { tempStackId, tableCards: gameState.tableCards.length });
    throw new Error(errorMsg);
  }

  const tempStack = gameState.tableCards[tempStackIndex];
  console.log('✅ [CAPTURE_TEMP_STACK] Found temp stack:', {
    stackId: tempStack.stackId,
    cards: tempStack.cards.map(c => `${c.rank}${c.suit}`),
    cardCount: tempStack.cards.length
  });

  // 2. Validate player has the capture card
  const playerHand = gameState.playerHands[playerIndex] || [];
  const captureCardIndex = playerHand.findIndex(card => card.value === captureValue);

  if (captureCardIndex === -1) {
    const errorMsg = `Player doesn't have ${captureValue} in hand to capture`;
    logger.error('Player lacks capture card', {
      requiredValue: captureValue,
      playerHand: playerHand.map(c => `${c.rank}${c.suit}(${c.value})`)
    });
    throw new Error(errorMsg);
  }

  const captureCard = playerHand[captureCardIndex];
  console.log('✅ [CAPTURE_TEMP_STACK] Found capture card:', {
    card: `${captureCard.rank}${captureCard.suit}(${captureCard.value})`,
    index: captureCardIndex
  });

  // 3. Remove capture card from player's hand
  const updatedPlayerHands = [...gameState.playerHands];
  updatedPlayerHands[playerIndex] = [...playerHand];
  updatedPlayerHands[playerIndex].splice(captureCardIndex, 1);

  console.log('✂️ [CAPTURE_TEMP_STACK] Removed capture card from hand');

  // 4. Remove temp stack from table
  const updatedTableCards = [...gameState.tableCards];
  updatedTableCards.splice(tempStackIndex, 1);

  console.log('🗑️ [CAPTURE_TEMP_STACK] Removed temp stack from table:', {
    removed: 1,
    remainingTableCards: updatedTableCards.length
  });

  // 5. Add all cards to player's captured pile
  const allCapturedCards = [...tempStack.cards, captureCard];
  const updatedPlayerCaptures = [...gameState.playerCaptures];
  updatedPlayerCaptures[playerIndex] = [
    ...gameState.playerCaptures[playerIndex],
    ...allCapturedCards
  ];

  console.log('🏆 [CAPTURE_TEMP_STACK] Added cards to captures:', {
    capturedCount: allCapturedCards.length,
    cards: allCapturedCards.map(c => `${c.rank}${c.suit}`)
  });

  // 6. Create updated game state
  const newGameState = {
    ...gameState,
    playerHands: updatedPlayerHands,
    tableCards: updatedTableCards,
    playerCaptures: updatedPlayerCaptures
  };

  logger.info('Temp stack capture completed', {
    playerIndex,
    captureValue,
    capturedCards: allCapturedCards.length,
    remainingTableCards: newGameState.tableCards.length,
    newHandSize: updatedPlayerHands[playerIndex].length
  });

  console.log('✅ [CAPTURE_TEMP_STACK] Capture successful');

  return newGameState;
}

module.exports = handleCaptureTempStack;
