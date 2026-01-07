/**
 * Unified Capture Action
 * Handles all types of captures: temp stacks, builds, and single cards
 */
const { createLogger } = require('../../../utils/logger');
const logger = createLogger('Capture');

async function handleCapture(gameManager, playerIndex, action, gameId) {
  const { tempStackId, captureValue, targetCards, buildId, capturingCard } = action.payload;

  logger.info('Capturing temp stack or direct cards', {
    tempStackId,
    captureValue,
    hasTargetCards: !!targetCards,
    targetCardCount: targetCards?.length || 0,
    capturingCard: capturingCard ? `${capturingCard.rank}${capturingCard.suit}` : 'none',
    buildId,
    playerIndex
  });

  const gameState = gameManager.getGameState(gameId);

  let cardsToCapture = [];

  if (tempStackId !== null && tempStackId !== undefined) {
    // 1A. Handle temp stack capture (existing logic)
    logger.info('Capturing from temp stack', { tempStackId });

    const tempStackIndex = gameState.tableCards.findIndex(card =>
      card.stackId === tempStackId
    );

    if (tempStackIndex === -1) {
      logger.warn('Temp stack not found', { tempStackId });
      return gameState;
    }

    const tempStack = gameState.tableCards[tempStackIndex];
    cardsToCapture = tempStack.cards || [];

    logger.debug('Found temp stack', {
      tempStackCards: cardsToCapture.map(c => `${c.rank}${c.suit}`),
      captureValue
    });

    // Remove temp stack from table
    gameState.tableCards.splice(tempStackIndex, 1);

  } else if (targetCards && targetCards.length > 0) {
    // 1B. Handle direct card capture (new logic for builds/single cards)
    logger.info('Capturing target cards directly', {
      targetCards: targetCards.map(c => `${c.rank}${c.suit}`)
    });

    cardsToCapture = targetCards;

    // If this is a build capture, remove the build from table
    if (buildId) {
      logger.info('Removing build from table', { buildId });

      const buildIndex = gameState.tableCards.findIndex(card =>
        card.buildId === buildId
      );

      if (buildIndex !== -1) {
        gameState.tableCards.splice(buildIndex, 1);
        logger.debug('Build removed from table', { buildId, buildIndex });
      } else {
        logger.warn('Build not found for removal', { buildId });
      }
    }

    // For direct captures, remove the captured cards from table (if they're loose cards)
    // Build cards are already handled above, single cards need to be removed
    if (!buildId && targetCards.length === 1) {
      const singleCard = targetCards[0];
      const cardIndex = gameState.tableCards.findIndex(card =>
        card.rank === singleCard.rank && card.suit === singleCard.suit
      );

      if (cardIndex !== -1) {
        gameState.tableCards.splice(cardIndex, 1);
        logger.debug('Single card removed from table', {
          card: `${singleCard.rank}${singleCard.suit}`,
          index: cardIndex
        });
      }
    }

  } else {
    logger.error('Invalid capture payload - no tempStackId or targetCards');
    return gameState;
  }

  // 2. Handle capturing card removal from hand (for direct captures)
  // For temp stack captures, the capturing card is already in the temp stack
  // For direct captures (builds/single cards), we need to remove it from hand
  if (capturingCard && tempStackId === null) {
    logger.info('Removing capturing card from hand', {
      card: `${capturingCard.rank}${capturingCard.suit}`,
      playerIndex
    });

    const handIndex = gameState.playerHands[playerIndex].findIndex(card =>
      card.rank === capturingCard.rank && card.suit === capturingCard.suit
    );

    if (handIndex >= 0) {
      gameState.playerHands[playerIndex].splice(handIndex, 1);
      logger.debug('Capturing card removed from hand', { handIndex });
    } else {
      logger.warn('Capturing card not found in hand', {
        card: `${capturingCard.rank}${capturingCard.suit}`,
        handSize: gameState.playerHands[playerIndex].length
      });
    }
  }

  // 3. Add captured cards to player's captures
  if (!gameState.playerCaptures) gameState.playerCaptures = [[], []];
  if (!gameState.playerCaptures[playerIndex]) gameState.playerCaptures[playerIndex] = [];

  gameState.playerCaptures[playerIndex].push(...cardsToCapture);

  // 4. Auto-turn switch
  const nextPlayer = (playerIndex + 1) % 2;
  gameState.currentPlayer = nextPlayer;

  logger.info('Capture complete', {
    player: playerIndex,
    cardsCaptured: cardsToCapture.length,
    cards: cardsToCapture.map(c => `${c.rank}${c.suit}`),
    captureType: tempStackId ? 'tempStack' : (buildId ? 'build' : 'direct'),
    nextPlayer: nextPlayer
  });

  return gameState;
}

module.exports = handleCapture;