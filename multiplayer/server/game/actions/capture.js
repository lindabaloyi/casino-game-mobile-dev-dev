/**
 * Capture Action Handler
 * Player captures matching cards from the table
 */

const { createLogger } = require('../../utils/logger');
const { isBuild, isTemporaryStack } = require('../GameState');

const logger = createLogger('CaptureAction');

function handleCapture(gameManager, playerIndex, action) {
  const { gameId } = action.payload;
  const gameState = gameManager.getGameState(gameId);
  const { draggedItem, selectedTableCards } = action.payload;

  logger.info('Starting capture', {
    playerIndex,
    draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    tableCards: selectedTableCards.length,
    gameId
  });

  let capturedCard;

  // Find and remove capturing card from appropriate source
  if (draggedItem.source === 'captured') {
    // Capturing with a card from the player's own captures
    if (gameState.playerCaptures[playerIndex].length === 0) {
      throw new Error(`No cards in Player ${playerIndex}'s captures`);
    }
    capturedCard = gameState.playerCaptures[playerIndex].pop();
  } else {
    // Capturing with hand card
    const playerHand = gameState.playerHands[playerIndex];
    const handCardIndex = playerHand.findIndex(c =>
      c.rank === draggedItem.card.rank && c.suit === draggedItem.card.suit
    );

    if (handCardIndex === -1) {
      throw new Error(`Hand card ${draggedItem.card.rank}${draggedItem.card.suit} not found in Player ${playerIndex}'s hand`);
    }

    // Remove hand card
    capturedCard = playerHand.splice(handCardIndex, 1)[0];
  }

  // Flatten selectedTableCards: expand builds/stacks into constituent cards
  const flattenedTableCards = selectedTableCards.flatMap(tableCard => {
    if (isBuild(tableCard) || isTemporaryStack(tableCard)) {
      return tableCard.cards; // Return individual cards that make up the build/stack
    }
    return [tableCard]; // Keep loose cards as-is
  });

  // Create list of all cards being captured (table cards + hand card on top)
  const allCapturedCards = [...flattenedTableCards, capturedCard];

  logger.debug('Capture details', {
    draggedCard: `${capturedCard.rank}${capturedCard.suit}`,
    tableCards: flattenedTableCards.length,
    totalCaptured: allCapturedCards.length
  });

  // Remove table cards from table
  let updatedTableCards = [...gameState.tableCards];
  selectedTableCards.forEach(tableCard => {
    const tableCardIndex = updatedTableCards.findIndex(tc =>
      tc.rank === tableCard.rank && tc.suit === tableCard.suit
    );
    if (tableCardIndex !== -1) {
      updatedTableCards.splice(tableCardIndex, 1);
    }
  });

  // Add captured cards to player's captures
  const updatedPlayerCaptures = [...gameState.playerCaptures];
  updatedPlayerCaptures[playerIndex] = [
    ...gameState.playerCaptures[playerIndex],
    ...allCapturedCards
  ];

  const newGameState = {
    ...gameState,
    playerHands: gameState.playerHands.map((hand, idx) =>
      idx === playerIndex ? gameState.playerHands[playerIndex] : hand
    ),
    tableCards: updatedTableCards,
    playerCaptures: updatedPlayerCaptures
  };

  logger.info('Capture completed', {
    playerIndex,
    capturedCount: allCapturedCards.length,
    remainingTableCards: newGameState.tableCards.length
  });

  return newGameState;
}

module.exports = handleCapture;
