/**
 * Game Over Action
 * Calculates final scores and determines winner - does not modify table cards
 */
const { createLogger } = require("../../utils/logger");

const logger = createLogger("GameOver");

async function handleGameOver(gameManager, playerIndex, action, gameId) {
  console.log("🎮 [GAME_OVER] Starting game over action");

  logger.info("🎮 Executing game over - calculating final scores and determining winner");

  const gameState = gameManager.getGameState(gameId);

  // Final score calculation and winner determination
  console.log("🎮 [GAME_OVER] Calculating final scores and determining winner");
  const { updateScores } = require("../scoring");
  updateScores(gameState);

  // Mark game as over
  console.log("🎮 [GAME_OVER] Marking game as over");
  gameState.gameOver = true;
  gameState.gameOverTimestamp = Date.now();

  // DO NOT modify table cards - leave them as they were after cleanup

  console.log("🎮 [GAME_OVER] Final game state:", {
    gameOver: gameState.gameOver,
    tableCardsCount: gameState.tableCards.length,
    finalScores: gameState.scores,
    totalPoints: gameState.scores[0] + gameState.scores[1],
    winner: gameState.winner
  });

  logger.info("� Game over complete", {
    finalScores: gameState.scores,
    totalPoints: gameState.scores[0] + gameState.scores[1],
    winner: gameState.winner !== null ? `Player ${gameState.winner}` : 'Tie'
  });

  console.log("🎮 [GAME_OVER] Game over action completed successfully");
  return gameState;
}



module.exports = handleGameOver;
