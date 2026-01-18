/**
 * Game Cleanup Action
 * Awards remaining table cards to the last capturer at turn 40
 */
const { createLogger } = require("../../utils/logger");
const logger = createLogger("Cleanup");

async function handleCleanup(gameManager, playerIndex, action, gameId) {
  logger.info(
    "🧹 Executing game cleanup - awarding remaining table cards to last capturer",
  );

  const gameState = gameManager.getGameState(gameId);

  // Get current table cards
  const tableCards = [...gameState.tableCards];
  const tableCardCount = tableCards.length;

  if (tableCardCount === 0) {
    logger.info("🧹 Cleanup called but no cards on table - skipping");
    return gameState;
  }

  // Determine who gets the cards (last capturer, or current player if no last capturer)
  const recipientPlayer =
    gameState.lastCapturer !== null
      ? gameState.lastCapturer
      : gameState.currentPlayer;

  logger.info(
    `🧹 Awarding ${tableCardCount} table cards to Player ${recipientPlayer}`,
    {
      lastCapturer: gameState.lastCapturer,
      currentPlayer: gameState.currentPlayer,
      recipient: recipientPlayer,
      cards: tableCards.map((c) => `${c.rank}${c.suit}`),
    },
  );

  // Initialize captures array if needed
  if (!gameState.playerCaptures) gameState.playerCaptures = [[], []];
  if (!gameState.playerCaptures[recipientPlayer])
    gameState.playerCaptures[recipientPlayer] = [];

  // Add all table cards to the recipient's captures
  gameState.playerCaptures[recipientPlayer].push(...tableCards);

  // Clear the table
  gameState.tableCards = [];

  // Add cleanup action info for client-side visualization
  gameState.cleanupAction = {
    type: "turn40_cleanup",
    cardsAwarded: tableCardCount,
    awardedToPlayer: recipientPlayer,
    timestamp: Date.now(),
  };

  logger.info(
    `✅ Cleanup complete - ${tableCardCount} cards awarded to Player ${recipientPlayer}`,
    {
      recipientFinalCaptures: gameState.playerCaptures[recipientPlayer].length,
      tableCleared: gameState.tableCards.length === 0,
      cleanupActionLogged: true,
    },
  );

  return gameState;
}

module.exports = handleCleanup;
