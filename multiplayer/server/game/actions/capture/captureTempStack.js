/**
 * KISS: Capture ONLY the temp stack cards
 * Hand card is already in the temp stack from the drag
 */
const { createLogger } = require('../../../utils/logger');
const logger = createLogger('CaptureTempStack');

async function handleCaptureTempStack(gameManager, playerIndex, action, gameId) {
  const { tempStackId, captureValue } = action.payload;

  logger.info('Capturing temp stack', {
    tempStackId,
    captureValue,
    playerIndex
  });

  const gameState = gameManager.getGameState(gameId);

  // 1. Find temp stack
  const tempStackIndex = gameState.tableCards.findIndex(card =>
    card.stackId === tempStackId
  );

  if (tempStackIndex === -1) {
    logger.warn('Temp stack not found', { tempStackId });
    return gameState;
  }

  const tempStack = gameState.tableCards[tempStackIndex];
  const tempStackCards = tempStack.cards || [];

  logger.debug('Found temp stack', {
    tempStackCards: tempStackCards.map(c => `${c.rank}${c.suit}`),
    captureValue
  });

  // 2. ✅ CRITICAL FIX: DO NOT look for or remove hand card!
  // The hand card is already IN the temp stack from the drag
  // Example: Temp stack [hand8, table8] - both cards already accounted for

  // 3. Remove temp stack from table
  gameState.tableCards.splice(tempStackIndex, 1);

  // 4. Add ONLY temp stack cards to captures
  if (!gameState.playerCaptures) gameState.playerCaptures = [[], []];
  if (!gameState.playerCaptures[playerIndex]) gameState.playerCaptures[playerIndex] = [];

  // ✅ FIX: Only add temp stack cards, NO hand card
  gameState.playerCaptures[playerIndex].push(...tempStackCards);

  // 5. Auto-turn switch
  const nextPlayer = (playerIndex + 1) % 2;
  gameState.currentPlayer = nextPlayer;

  logger.info('Capture complete', {
    player: playerIndex,
    cardsCaptured: tempStackCards.length,
    cards: tempStackCards.map(c => `${c.rank}${c.suit}`),
    nextPlayer: nextPlayer
  });

  return gameState;
}

module.exports = handleCaptureTempStack;
