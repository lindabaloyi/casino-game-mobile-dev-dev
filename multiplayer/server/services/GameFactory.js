/**
 * GameFactory
 * Handles game creation and player registration logic
 */

const GAME_TYPES = require('../config/gameTypes');

class GameFactory {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  createGame(gameType, playerEntries) {
    const config = GAME_TYPES[gameType];
    if (!config) {
      console.error(`[GameFactory] Unknown game type: ${gameType}`);
      return null;
    }

    const sockets = playerEntries.map(e => e.socket);
    const userIds = playerEntries.map(e => e.userId);

    console.log(`[GameFactory] Creating ${gameType} game with userIds:`, userIds);

    const { gameId, gameState } = config.createGame(this.gameManager);
    if (!gameState) {
      console.error(`[GameFactory] Failed to create ${gameType} game state`);
      return null;
    }

    if (gameState.players.length !== config.minPlayers) {
      console.error(`[GameFactory] ${gameType} game has wrong player count: ${gameState.players.length}`);
      return null;
    }

    config.registerPlayers(gameId, sockets, this.gameManager, userIds);

    for (let i = 0; i < sockets.length; i++) {
      if (userIds[i]) {
        this.gameManager.setPlayerUserId?.(gameId, i, userIds[i]);
      }
    }

    return {
      gameId,
      gameState,
      players: sockets.map((socket, index) => ({
        socket,
        playerNumber: index,
        userId: userIds[index]
      }))
    };
  }
}

module.exports = GameFactory;
