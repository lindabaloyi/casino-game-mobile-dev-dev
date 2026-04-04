/**
 * GameFactory - Handles game creation and player registration
 * Strategy pattern for different game types
 */
class GameFactory {
  constructor() {
    this.gameConfigs = new Map();
  }

  /**
   * Register a game type configuration
   * @param {string} gameType - Type of game
   * @param {Object} config - Configuration object
   * @param {number} config.minPlayers - Minimum players required
   * @param {Function} config.createGame - Function to create game (gameManager) => {gameId, gameState}
   * @param {Function} config.registerPlayers - Function to register players (gameId, players, gameManager, userIds)
   */
  register(gameType, config) {
    this.gameConfigs.set(gameType, {
      minPlayers: config.minPlayers,
      createGame: config.createGame,
      registerPlayers: config.registerPlayers
    });
  }

  /**
   * Create and register a game with players
   * @param {string} gameType - Type of game
   * @param {Array} playerEntries - Array of socket entries
   * @param {Object} gameManager - Game manager instance
   * @param {Object} socketRegistry - Socket registry instance
   * @returns {Object|null} - {gameId, gameState, players} or null on failure
   */
  createAndRegister(gameType, playerEntries, gameManager, socketRegistry) {
    const config = this.gameConfigs.get(gameType);
    if (!config) {
      console.error(`[GameFactory] Unknown game type: ${gameType}`);
      return null;
    }

    if (playerEntries.length !== config.minPlayers) {
      console.error(`[GameFactory] Wrong number of players for ${gameType}: got ${playerEntries.length}, need ${config.minPlayers}`);
      return null;
    }

    try {
      // Create the game
      const { gameId, gameState } = config.createGame(gameManager);
      if (!gameState) {
        throw new Error('Game creation returned null gameState');
      }

      // Extract players and user IDs
      const players = playerEntries.map(e => e.socket);
      const userIds = playerEntries.map(e => e.userId);

      // Register players with game
      config.registerPlayers(gameId, players, gameManager, userIds);

      // Register with socket registry
      players.forEach((socket, index) => {
        socketRegistry.set(socket.id, gameId, gameType, userIds[index]);
      });

      // Set user IDs on game state
      userIds.forEach((userId, index) => {
        if (userId) {
          gameManager.setPlayerUserId(gameId, index, userId);
        }
      });

      console.log(`[GameFactory] Successfully created ${gameType} game ${gameId} with ${players.length} players`);

      return {
        gameId,
        gameState,
        players: players.map((socket, index) => ({
          socket,
          playerNumber: index,
          userId: userIds[index]
        }))
      };

    } catch (error) {
      console.error(`[GameFactory] Failed to create ${gameType} game:`, error);
      return null;
    }
  }

  /**
   * Get configuration for a game type
   * @param {string} gameType - Type of game
   * @returns {Object|null} - Game configuration or null
   */
  getConfig(gameType) {
    return this.gameConfigs.get(gameType) || null;
  }

  /**
   * Get all registered game types
   * @returns {Array<string>} - Array of game types
   */
  getRegisteredTypes() {
    return Array.from(this.gameConfigs.keys());
  }
}

module.exports = GameFactory;