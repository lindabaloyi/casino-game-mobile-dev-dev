/**
 * KISS: Just move temp stack + capture card to captures
 * No validation, no points, no checks - client already validated rules
 */
const { createLogger } = require('../../utils/logger');
const logger = createLogger('CaptureTempStack');

async function handleCaptureTempStack(gameManager, playerIndex, action, gameId) {
  const { tempStackId, captureValue } = action.payload;

  logger.info('Starting capture', {
    tempStackId,
    captureValue,
    playerIndex
  });

  const gameState = gameManager.getGameState(gameId);

  // Log BEFORE state
  logger.debug('Before capture state', {
    tableCards: gameState.tableCards.length,
    playerHandSize: gameState.playerHands[playerIndex]?.length,
    playerCapturesSize: gameState.playerCaptures?.[playerIndex]?.length
  });

  // 1. Find temp stack
  const tempStackIndex = gameState.tableCards.findIndex(card =>
    card.stackId === tempStackId
  );

  if (tempStackIndex === -1) {
    logger.warn('Temp stack not found', { tempStackId });
    return gameState; // Return unchanged state for error case
  }

  const tempStack = gameState.tableCards[tempStackIndex];

  // 2. Find capture card in hand
  const playerHand = gameState.playerHands[playerIndex] || [];
  const captureCardIndex = playerHand.findIndex(card => card.value === captureValue);

  let captureCard = null;
  if (captureCardIndex === -1) {
    logger.warn('Capture card not found in hand, using first card', { captureValue, handSize: playerHand.length });
    if (playerHand.length > 0) {
      captureCard = playerHand[0];
      gameState.playerHands[playerIndex].splice(0, 1);
    }
  } else {
    captureCard = playerHand[captureCardIndex];
    gameState.playerHands[playerIndex].splice(captureCardIndex, 1);
  }

  // 3. Remove temp stack from table
  const tempStackCards = tempStack.cards || [];
  gameState.tableCards.splice(tempStackIndex, 1);

  // 4. CRITICAL FIX: Add to playerCaptures NOT capturedCards
  const allCards = captureCard ? [...tempStackCards, captureCard] : tempStackCards;

  // Ensure playerCaptures array exists
  if (!gameState.playerCaptures) {
    logger.warn('playerCaptures undefined, initializing', { gameId });
    gameState.playerCaptures = [[], []];
  }
  if (!gameState.playerCaptures[playerIndex]) {
    logger.warn(`playerCaptures[${playerIndex}] undefined, initializing`, { gameId, playerIndex });
    gameState.playerCaptures[playerIndex] = [];
  }

  // Add cards to CORRECT property
  gameState.playerCaptures[playerIndex].push(...allCards);

  // ✅ AUTO-TURN SWITCH: Capturing ends your turn (casino rule)
  const nextPlayer = (playerIndex + 1) % 2;
  gameState.currentPlayer = nextPlayer;

  logger.info('Auto-turn switch after capture', {
    fromPlayer: playerIndex,
    toPlayer: nextPlayer,
    cardsCaptured: allCards.length
  });

  // Return the modified game state (ActionRouter will handle updating GameManager)
  return gameState;
}

module.exports = handleCaptureTempStack;
