/**
 * MatchmakingService
 * Handles player queuing, game creation, and matchmaking logic
 * Extracted from socket-server.js for better separation of concerns
 */

const { createLogger } = require('../utils/logger');

class MatchmakingService {
  constructor(gameManager) {
    this.logger = createLogger('MatchmakingService');
    this.gameManager = gameManager;
    this.waitingPlayers = []; // Array of waiting socket objects
    this.activeGames = new Map(); // socketId -> gameId mapping
    this.gamePlayerIndex = new Map(); // gameId -> socketId[] mapping
  }

  /**
   * Add a player to the matchmaking queue
   */
  addToQueue(socket) {
    this.logger.info(`Adding ${socket.id} to waiting queue. Total waiting: ${this.waitingPlayers.length + 1}`);

    this.waitingPlayers.push(socket);
    this.activeGames.set(socket.id, null); // Not in a game yet

    // Try to create a game if we have enough players
    return this.tryCreateGame();
  }

  /**
   * Try to create a game if we have enough waiting players
   */
  tryCreateGame() {
    if (this.waitingPlayers.length < 2) {
      return null; // Not enough players
    }

    this.logger.info('Two players ready - starting game');

    const [player1Socket, player2Socket] = this.waitingPlayers;
    this.waitingPlayers = []; // Clear waiting queue

    try {
      // Create new game via GameManager
      const { gameId, gameState } = this.gameManager.startGame();
      this.activeGames.set(player1Socket.id, gameId);
      this.activeGames.set(player2Socket.id, gameId);

      // Register players with GameManager for proper indexing
      this.gameManager.addPlayerToGame(gameId, player1Socket.id, 0);
      this.gameManager.addPlayerToGame(gameId, player2Socket.id, 1);

      // Track which sockets are in which games
      this.gamePlayerIndex.set(gameId, [player1Socket.id, player2Socket.id]);

      // Create game result for socket server to use
      const gameResult = {
        gameId,
        gameState,
        players: [
          { socket: player1Socket, playerNumber: 0 },
          { socket: player2Socket, playerNumber: 1 }
        ]
      };

      this.logger.info(`Game ${gameId} started with ${gameResult.players.length} players`);
      return gameResult;

    } catch (error) {
      this.logger.error('Failed to start game:', error);

      // Return players to waiting queue on error
      this.waitingPlayers.push(player1Socket, player2Socket);
      throw error;
    }
  }

  /**
   * Handle player disconnection
   */
  handleDisconnection(socket) {
    this.logger.info(`Disconnect: ${socket.id}`);

    // Remove from waiting queue
    const wasWaiting = this.waitingPlayers.some(p => p.id === socket.id);
    this.waitingPlayers = this.waitingPlayers.filter(p => p.id !== socket.id);

    // Get game they were in (if any)
    const gameId = this.activeGames.get(socket.id);

    let disconnectedGame = null;
    if (gameId) {
      // Clean up game player tracking
      const gameSockets = this.gamePlayerIndex.get(gameId) || [];
      const updatedSockets = gameSockets.filter(socketId => socketId !== socket.id);
      this.gamePlayerIndex.set(gameId, updatedSockets);

      disconnectedGame = {
        gameId,
        remainingSockets: updatedSockets
      };
    }

    // Remove from active games
    this.activeGames.delete(socket.id);

    this.logger.info(`Cleanup complete. Waiting: ${this.waitingPlayers.length}, Active games: ${this.getActiveGamesCount()}`);
    return disconnectedGame;
  }

  /**
   * Check if a socket is in an active game
   */
  getGameId(socketId) {
    return this.activeGames.get(socketId) || null;
  }

  /**
   * Get all active games count
   */
  getActiveGamesCount() {
    // Count unique game IDs
    const uniqueGameIds = new Set();
    for (const gameId of this.activeGames.values()) {
      if (gameId) uniqueGameIds.add(gameId);
    }
    return uniqueGameIds.size;
  }

  /**
   * Get waiting players count
   */
  getWaitingPlayersCount() {
    return this.waitingPlayers.length;
  }

  /**
   * Get all sockets for a specific game
   */
  getGameSockets(gameId, io) {
    return Array.from(this.activeGames.entries())
      .filter(([_, gId]) => gId === gameId)
      .map(([socketId, _]) => io.sockets.sockets.get(socketId))
      .filter(Boolean);
  }

  /**
   * Clean up all state (for testing/shutdown)
   */
  reset() {
    this.waitingPlayers = [];
    this.activeGames.clear();
    this.gamePlayerIndex.clear();
    this.logger.info('MatchmakingService state reset');
  }
}

module.exports = MatchmakingService;
