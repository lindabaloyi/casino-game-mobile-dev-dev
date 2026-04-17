/**
 * BroadcasterService
 * Handles message broadcasting and game state distribution
 * Extracted from socket-server.js for better separation of concerns
 * Updated to work with UnifiedMatchmakingService
 */

const PlayerProfile = require('../models/PlayerProfile');

class BroadcasterService {
  constructor(matchmakingService, gameManager, io) {
    this.matchmaking = matchmakingService;
    this.gameManager = gameManager;
    this.io = io;
  }

  /**
   * Helper: Get player info for all players in a game
   */
  async _getPlayerInfos(players) {
    const isValidObjectId = (id) => id && /^[0-9a-fA-F]{24}$/.test(id);
    
    const validUserIds = players
      .map(p => p.userId)
      .filter(Boolean)
      .filter(isValidObjectId);
    
    if (validUserIds.length === 0) {
      return [];
    }
    
    return PlayerProfile.getPlayerInfos(validUserIds);
  }

  /**
   * Broadcast game start to all players in a new game
   */
  async broadcastGameStart(gameResult) {
    const { gameId, gameState, players } = gameResult;

    // Fetch player profile info
    const playerInfos = await this._getPlayerInfos(players);

    players.forEach(({ socket, playerNumber }) => {
      socket.emit("game-start", {
        gameId,
        gameState,
        playerNumber,
        playerInfos,
      });
    });
  }

  /**
   * Broadcast party game start to all 4 players in a new party game
   */
  async broadcastPartyGameStart(gameResult) {
    const { gameId, gameState, players } = gameResult;

    // Fetch player profile info
    const playerInfos = await this._getPlayerInfos(players);

    players.forEach(({ socket, playerNumber }) => {
      socket.emit("game-start", {
        gameId,
        gameState,
        playerNumber,
        playerInfos,
        isPartyGame: true,
      });
    });
  }

  /**
   * Broadcast three-hands game start to all 3 players in a new three-hands game
   */
  async broadcastThreeHandsGameStart(gameResult) {
    console.log('[Broadcaster] broadcastThreeHandsGameStart called');
    const { gameId, gameState, players } = gameResult;
    console.log('[Broadcaster] gameId:', gameId, 'players:', players?.length);

    // Fetch player profile info
    const playerInfos = await this._getPlayerInfos(players);

    console.log('[Broadcaster] emitting game-start to', players.length, 'players');
    players.forEach(({ socket, playerNumber }) => {
      socket.emit("game-start", {
        gameId,
        gameState,
        playerNumber,
        playerInfos,
        isThreeHandsGame: true,
      });
    });
  }

  /**
   * Broadcast free-for-all game start to all 4 players in a new free-for-all game
   */
  async broadcastFreeForAllGameStart(gameResult) {
    const { gameId, gameState, players } = gameResult;

    // Fetch player profile info
    const playerInfos = await this._getPlayerInfos(players);

    players.forEach(({ socket, playerNumber }) => {
      socket.emit("game-start", {
        gameId,
        gameState,
        playerNumber,
        playerInfos,
        gameMode: 'four-hands',
      });
    });
  }

  /**
   * Broadcast four-hands game start to all 4 players in a new four-hands game
   */
  async broadcastFourHandsGameStart(gameResult) {
    const { gameId, gameState, players } = gameResult;

    // Fetch player profile info
    const playerInfos = await this._getPlayerInfos(players);

    players.forEach(({ socket, playerNumber }) => {
      socket.emit("game-start", {
        gameId,
        gameState,
        playerNumber,
        playerInfos,
        gameMode: 'four-hands',
      });
    });
  }

  /**
   * Broadcast tournament game start to all 4 players in a new tournament game
   */
  async broadcastTournamentGameStart(gameResult) {
    const { gameId, gameState, players } = gameResult;

    // Fetch player profile info
    const playerInfos = await this._getPlayerInfos(players);

    players.forEach(({ socket, playerNumber }) => {
      socket.emit("game-start", {
        gameId,
        gameState,
        playerNumber,
        playerInfos,
        gameMode: 'tournament',
      });
    });
  }

  /**
   * Broadcast game update to all players in a game
   * CRITICAL: Include each socket's player index in the update so clients
   * can update their playerNumber after tournament phase transitions
    */
  broadcastGameUpdate(gameId, gameState, matchmakingService = null) {
    // Use the provided matchmaking service or default to regular matchmaking
    const mm = matchmakingService || this.matchmaking;
    const gameSockets = mm.getGameSockets(gameId, this.io);

    if (gameSockets.length === 0) {
      // Fallback: use Socket.IO room-based broadcast since registry lookup failed
      this.io.to(`game-${gameId}`).emit('game-update', gameState);
      return;
    }

    // Deep clone to avoid serializing internal references
    const stateToSend = JSON.parse(JSON.stringify(gameState));
    console.log('[Broadcaster] pendingShiya in broadcast:', stateToSend.pendingShiya);

    // Get socket->player index mapping from gameManager if available
    const socketPlayerMap = this.gameManager?.socketPlayerMap?.get(gameId);
    const qualifiedPlayers = gameState?.qualifiedPlayers || null;
    
    // Check if this is a tournament phase transition (fewer players than original)
    const isTournamentTransition = qualifiedPlayers && 
      socketPlayerMap && 
      gameState?.tournamentPhase && 
      ['SEMI_FINAL', 'FINAL_SHOWDOWN'].includes(gameState.tournamentPhase);
    
    if (isTournamentTransition) {
      // Tournament transition - sending updated playerNumber to each client
    }

    gameSockets.forEach((gameSocket) => {
      // Include playerNumber for each socket - CRITICAL for tournament transitions
      // FIXED: Check playerStatuses instead of relying on remapped indices
      let playerNumber = null;
      
      if (socketPlayerMap && socketPlayerMap.size > 0) {
        // Get this socket's player index from the map (no longer remapped)
        const playerIndex = socketPlayerMap.get(gameSocket.id);
        
        if (playerIndex !== undefined && playerIndex !== null) {
          const playerId = `player_${playerIndex}`;
          const playerStatus = gameState?.playerStatuses?.[playerId];
          
          // Only set playerNumber if player is not ELIMINATED
          if (playerStatus !== 'ELIMINATED') {
            playerNumber = playerIndex;
          }
        }
      }
      
      // Emit with playerNumber so client can update their stored value
      gameSocket.emit("game-update", {
        ...stateToSend,
        playerNumber: playerNumber
      });
    });
  }

  /**
   * Broadcast disconnection to remaining players in game
   */
  broadcastDisconnection(gameId, disconnectedSocketId) {
    const gameSockets = this.matchmaking.getGameSockets(gameId, this.io);

    const remainingSockets = gameSockets.filter(
      (socket) => socket.id !== disconnectedSocketId,
    );

    if (remainingSockets.length > 0) {
      remainingSockets.forEach((otherSocket) => {
        otherSocket.emit("player-disconnected");
      });
    }
  }

  /**
   * Broadcast party disconnection to remaining players in party game
   * Works with UnifiedMatchmakingService
   */
  broadcastPartyDisconnection(gameId, disconnectedSocketId) {
    // If we have a dedicated party matchmaking service, use it
    if (this.partyMatchmaking) {
      // Use party matchmaking's getGameSockets method
      const gameSockets = this.partyMatchmaking.getPartyGameSockets(gameId, this.io);

      const remainingSockets = gameSockets.filter(
        (socket) => socket.id !== disconnectedSocketId,
      );

      if (remainingSockets.length > 0) {
        remainingSockets.forEach((otherSocket) => {
          otherSocket.emit("player-disconnected");
        });
      }
    } else {
      // Fallback to unified matchmaking service
      const gameSockets = this.matchmaking.getGameSockets(gameId, this.io);
      
      // Filter to only sockets that are in party games
      const partySockets = gameSockets.filter(socketId => {
        const socketInfo = this.matchmaking.socketRegistry.get(socketId);
        return socketInfo && socketInfo.gameType === 'party';
      }).map(socketId => this.io.sockets.sockets.get(socketId)).filter(Boolean);

      const remainingSockets = partySockets.filter(
        (socket) => socket.id !== disconnectedSocketId,
      );

      if (remainingSockets.length > 0) {
        remainingSockets.forEach((otherSocket) => {
          otherSocket.emit("player-disconnected");
        });
      }
    }
  }

  /**
   * Send error message to a specific player
   */
  sendError(socket, message) {
    socket.emit("error", { message });
  }

  /**
   * Broadcast to all players in a game EXCEPT one socket
   * Used for drag events - sender doesn't need to receive their own broadcasts
   */
  broadcastToOthers(gameId, excludeSocketId, event, data, matchmakingService = null) {
    const mm = matchmakingService || this.matchmaking;
    const gameSockets = mm.getGameSockets(gameId, this.io);

    const otherSockets = gameSockets.filter(
      (socket) => socket.id !== excludeSocketId,
    );

    if (otherSockets.length > 0) {
      otherSockets.forEach((otherSocket) => {
        otherSocket.emit(event, data);
      });
    }
  }

  /**
   * Broadcast to ALL players in a game (including sender)
   * Used for round-end and game-over events
   */
  broadcastToGame(gameId, event, data, matchmakingService = null) {
    const mm = matchmakingService || this.matchmaking;
    
    // Try matchmaking service first
    let gameSockets = mm.getGameSockets(gameId, this.io);
    
    // Fallback: Use io.to directly for room-based messaging
    if (gameSockets.length === 0) {
      this.io.to(gameId).emit(event, data);
      return;
    }

    gameSockets.forEach((gameSocket) => {
      gameSocket.emit(event, data);
    });
  }

  /**
   * Broadcast that all clients are ready and game can start
   * @param {number} gameId - Game ID
   */
  broadcastAllClientsReady(gameId) {
    this.io.to(gameId).emit('all-clients-ready', { gameId });
  }
}

module.exports = BroadcasterService;
