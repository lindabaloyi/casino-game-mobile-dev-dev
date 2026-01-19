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

  // Recalculate final scores after cleanup
  const { calculateFinalScores } = require("../scoring");
  gameState.scores = calculateFinalScores(gameState.playerCaptures);

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

  // 🎮 Automatically trigger game over after cleanup
  console.log(
    "🧹 [CLEANUP] Cleanup complete - automatically triggering game over",
  );
  console.log("🧹 [CLEANUP] Final game state:", {
    playerCaptures: gameState.playerCaptures.map(
      (captures, i) => `${i}:${captures.length}`,
    ),
    tableCleared: gameState.tableCards.length === 0,
    scores: gameState.scores,
  });

  logger.info("🎮 Cleanup complete - automatically triggering game over");

  // Immediately trigger game over action on the server
  try {
    const handleGameOver = require("./game-over");
    console.log("🧹 [CLEANUP] Calling game over action directly...");

    // Create a mock player index (doesn't matter for game over)
    const gameOverResult = await handleGameOver(
      gameManager,
      0,
      { type: "game-over" },
      gameId,
    );

    console.log("🧹 [CLEANUP] Game over completed successfully");
    console.log("🧹 [CLEANUP] Final result:", {
      gameOver: gameOverResult.gameOver,
      tableCardsCount: gameOverResult.tableCards.length,
      finalScores: gameOverResult.scores,
    });

    // Return the game over result instead of the cleanup result
    return gameOverResult;
  } catch (error) {
    console.error("🧹 [CLEANUP] Error triggering game over:", error);
    logger.error("Failed to trigger game over after cleanup", error);
    return gameState;
  }
}

module.exports = handleCleanup;
