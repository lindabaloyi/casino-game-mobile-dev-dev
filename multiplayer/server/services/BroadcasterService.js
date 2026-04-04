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

    // Track client ready states for game handshake
    this.clientReadyStates = new Map(); // gameId -> Set of ready client socket IDs

    // Set up timeout for handshake completion
    this.handshakeTimeouts = new Map(); // gameId -> timeout ID
  }

  /**
   * Helper: Get player info for all players in a game
   */
  async _getPlayerInfos(players) {
    const userIds = players
      .map(p => p.userId)
      .filter(Boolean);
    
    if (userIds.length === 0) {
      return [];
    }
    
    return PlayerProfile.getPlayerInfos(userIds);
  }



  /**
    * Broadcast two-hands game start with handshake
    */
  async broadcastTwoHandsGameStart(gameResult) {
    const { gameId, gameState, players } = gameResult;
    console.log(`[Broadcaster] Starting two-hands game handshake for ${players.length} players`);

    const playerInfos = await this._getPlayerInfos(players);

    if (!this.clientReadyStates.has(gameId)) {
      this.clientReadyStates.set(gameId, new Set());
    }
    const readyClients = this.clientReadyStates.get(gameId);
    readyClients.clear();

    players.forEach(({ socket, playerNumber }) => {
      socket.emit("game-init", {
        gameId,
        gameState,
        playerNumber,
        playerInfos,
        gameMode: 'two-hands',
        expectedClients: players.length,
      });
    });

    console.log(`[Broadcaster] Sent game-init to ${players.length} players for two-hands, waiting for client-ready`);

    const timeoutId = setTimeout(() => {
      console.error(`[Broadcaster] Two-hands handshake timeout for game ${gameId}, forcing start`);
      this._completeHandshake(gameId);
    }, 30000);

    this.handshakeTimeouts.set(gameId, timeoutId);
  }

  /**
    * Broadcast party game start to all 4 players in a new party game
    */
  async broadcastPartyGameStart(gameResult) {
    const { gameId, gameState, players } = gameResult;
    console.log(`[Broadcaster] Starting party game handshake for ${players.length} players`);

    // Fetch player profile info
    const playerInfos = await this._getPlayerInfos(players);

    // Initialize client ready tracking for this game
    if (!this.clientReadyStates.has(gameId)) {
      this.clientReadyStates.set(gameId, new Set());
    }
    const readyClients = this.clientReadyStates.get(gameId);
    readyClients.clear(); // Reset for new game

    // Send game-init to all players
    players.forEach(({ socket, playerNumber }) => {
      socket.emit("game-init", {
        gameId,
        gameState,
        playerNumber,
        playerInfos,
        isPartyGame: true,
        expectedClients: players.length,
      });
    });

    console.log(`[Broadcaster] Sent game-init to ${players.length} players for party game, waiting for client-ready responses`);

    // Set timeout for handshake completion (30 seconds)
    const timeoutId = setTimeout(() => {
      console.error(`[Broadcaster] Party game handshake timeout for game ${gameId}, forcing game start`);
      this._completeHandshake(gameId);
    }, 30000);

    this.handshakeTimeouts.set(gameId, timeoutId);
  }

  /**
    * Broadcast three-hands game init and start handshake
    */
  async broadcastThreeHandsGameStart(gameResult) {
    const { gameId, gameState, players } = gameResult;
    console.log(`[Broadcaster] Starting three-hands game handshake for ${players.length} players`);

    // Fetch player profile info
    const playerInfos = await this._getPlayerInfos(players);

    // Initialize client ready tracking for this game
    if (!this.clientReadyStates.has(gameId)) {
      this.clientReadyStates.set(gameId, new Set());
    }
    const readyClients = this.clientReadyStates.get(gameId);
    readyClients.clear(); // Reset for new game

    // Send game-init to all players
    players.forEach(({ socket, playerNumber }) => {
      socket.emit("game-init", {
        gameId,
        gameState,
        playerNumber,
        playerInfos,
        isThreeHandsGame: true,
        expectedClients: players.length,
      });
    });

    console.log(`[Broadcaster] Sent game-init to ${players.length} players, waiting for client-ready responses`);

    // Set timeout for handshake completion (30 seconds)
    const timeoutId = setTimeout(() => {
      console.error(`[Broadcaster] Game handshake timeout for game ${gameId}, forcing game start`);
      this._completeHandshake(gameId);
    }, 30000);

    this.handshakeTimeouts.set(gameId, timeoutId);
  }

  /**
   * Handle client ready response from a player
   */
  handleClientReady(gameId, socketId, playerNumber) {
    console.log(`[Broadcaster] Client ready received: gameId=${gameId}, socketId=${socketId}, playerNumber=${playerNumber}`);

    if (!this.clientReadyStates.has(gameId)) {
      console.warn(`[Broadcaster] No handshake in progress for game ${gameId}`);
      return;
    }

    const readyClients = this.clientReadyStates.get(gameId);
    readyClients.add(socketId);

    // Get game info to check if all clients are ready
    const game = this.gameManager.getGame(gameId);
    if (!game) {
      console.error(`[Broadcaster] Game ${gameId} not found during handshake`);
      return;
    }

    const expectedClients = game.players.length;
    const readyCount = readyClients.size;

    console.log(`[Broadcaster] Game ${gameId}: ${readyCount}/${expectedClients} clients ready`);

    if (readyCount >= expectedClients) {
      console.log(`[Broadcaster] All clients ready for game ${gameId}, completing handshake`);
      this._completeHandshake(gameId);
    }
  }

  /**
   * Complete the game handshake and start the game
   */
  _completeHandshake(gameId) {
    // Clear timeout
    const timeoutId = this.handshakeTimeouts.get(gameId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.handshakeTimeouts.delete(gameId);
    }

    // Get game info
    const game = this.gameManager.getGame(gameId);
    if (!game) {
      console.error(`[Broadcaster] Cannot complete handshake - game ${gameId} not found`);
      return;
    }

    const players = game.players;
    const readyClients = this.clientReadyStates.get(gameId) || new Set();
    const readyCount = readyClients.size;

    console.log(`[Broadcaster] Completing handshake for game ${gameId} with ${readyCount}/${players.length} ready clients`);

    // Broadcast all-clients-ready
    players.forEach(({ socket, playerNumber }) => {
      socket.emit("all-clients-ready", {
        gameId,
        readyCount,
        totalClients: players.length,
      });
    });

    // Small delay before game start to ensure all-clients-ready is processed
    setTimeout(() => {
      // Broadcast game-start
      players.forEach(({ socket, playerNumber }) => {
        socket.emit("game-start", {
          gameId,
          playerNumber,
          finalReady: true, // Indicates this is the final game start after handshake
        });
      });

      console.log(`[Broadcaster] Game ${gameId} handshake completed, game officially started`);
    }, 500);

    // Clean up tracking
    this.clientReadyStates.delete(gameId);
  }

  /**
   * Broadcast free-for-all game start to all 4 players in a new free-for-all game
   */
  async broadcastFreeForAllGameStart(gameResult) {
    const { gameId, gameState, players } = gameResult;
    console.log(`[Broadcaster] Starting free-for-all game handshake for ${players.length} players`);

    // Fetch player profile info
    const playerInfos = await this._getPlayerInfos(players);

    // Initialize client ready tracking for this game
    if (!this.clientReadyStates.has(gameId)) {
      this.clientReadyStates.set(gameId, new Set());
    }
    const readyClients = this.clientReadyStates.get(gameId);
    readyClients.clear(); // Reset for new game

    // Send game-init to all players
    players.forEach(({ socket, playerNumber }) => {
      socket.emit("game-init", {
        gameId,
        gameState,
        playerNumber,
        playerInfos,
        gameMode: 'freeforall',
        expectedClients: players.length,
      });
    });

    console.log(`[Broadcaster] Sent game-init to ${players.length} players for free-for-all game, waiting for client-ready responses`);

    // Set timeout for handshake completion (30 seconds)
    const timeoutId = setTimeout(() => {
      console.error(`[Broadcaster] Free-for-all game handshake timeout for game ${gameId}, forcing game start`);
      this._completeHandshake(gameId);
    }, 30000);

    this.handshakeTimeouts.set(gameId, timeoutId);
  }

  /**
   * Broadcast four-hands game start to all 4 players in a new four-hands game
   */
  async broadcastFourHandsGameStart(gameResult) {
    const { gameId, gameState, players } = gameResult;
    console.log(`[Broadcaster] Starting four-hands game handshake for ${players.length} players`);

    // Fetch player profile info
    const playerInfos = await this._getPlayerInfos(players);

    // Initialize client ready tracking for this game
    if (!this.clientReadyStates.has(gameId)) {
      this.clientReadyStates.set(gameId, new Set());
    }
    const readyClients = this.clientReadyStates.get(gameId);
    readyClients.clear(); // Reset for new game

    // Send game-init to all players
    players.forEach(({ socket, playerNumber }) => {
      socket.emit("game-init", {
        gameId,
        gameState,
        playerNumber,
        playerInfos,
        gameMode: 'four-hands',
        expectedClients: players.length,
      });
    });

    console.log(`[Broadcaster] Sent game-init to ${players.length} players for four-hands game, waiting for client-ready responses`);

    // Set timeout for handshake completion (30 seconds)
    const timeoutId = setTimeout(() => {
      console.error(`[Broadcaster] Four-hands game handshake timeout for game ${gameId}, forcing game start`);
      this._completeHandshake(gameId);
    }, 30000);

    this.handshakeTimeouts.set(gameId, timeoutId);
  }

  /**
   * Broadcast tournament game start to all 4 players in a new tournament game
   */
  async broadcastTournamentGameStart(gameResult) {
    const { gameId, gameState, players } = gameResult;
    console.log(`[Broadcaster] Starting tournament game handshake for ${players.length} players`);

    // Fetch player profile info
    const playerInfos = await this._getPlayerInfos(players);

    // Initialize client ready tracking for this game
    if (!this.clientReadyStates.has(gameId)) {
      this.clientReadyStates.set(gameId, new Set());
    }
    const readyClients = this.clientReadyStates.get(gameId);
    readyClients.clear(); // Reset for new game

    // Send game-init to all players
    players.forEach(({ socket, playerNumber }) => {
      socket.emit("game-init", {
        gameId,
        gameState,
        playerNumber,
        playerInfos,
        gameMode: 'tournament',
        expectedClients: players.length,
      });
    });

    console.log(`[Broadcaster] Sent game-init to ${players.length} players for tournament game, waiting for client-ready responses`);

    // Set timeout for handshake completion (30 seconds)
    const timeoutId = setTimeout(() => {
      console.error(`[Broadcaster] Tournament game handshake timeout for game ${gameId}, forcing game start`);
      this._completeHandshake(gameId);
    }, 30000);

    this.handshakeTimeouts.set(gameId, timeoutId);
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
      console.log(`[Broadcaster] broadcastGameUpdate: No sockets found for game ${gameId}`);
      return;
    }

    // Log state summary before broadcasting
    console.log(`[Broadcaster] broadcastGameUpdate: gameId=${gameId}, tableCards=${gameState.tableCards?.length}, players captures: ${gameState.players?.map(p => p.captures?.length || 0).join(',')}`);

    // Deep clone to avoid serializing internal references
    const stateToSend = JSON.parse(JSON.stringify(gameState));

    // Get socket->player index mapping from gameManager if available
    const socketPlayerMap = this.gameManager?.socketPlayerMap?.get(gameId);
    const qualifiedPlayers = gameState?.qualifiedPlayers || null;
    
    // Check if this is a tournament phase transition (fewer players than original)
    const isTournamentTransition = qualifiedPlayers && 
      socketPlayerMap && 
      gameState?.tournamentPhase && 
      ['SEMI_FINAL', 'FINAL_SHOWDOWN'].includes(gameState.tournamentPhase);
    
    if (isTournamentTransition) {
      console.log(`[Broadcaster] Tournament transition detected - sending updated playerNumber to each client`);
    }

    gameSockets.forEach((gameSocket) => {
      // Include playerNumber for each socket - CRITICAL for tournament transitions
      // The server has already remapped socket indices, so we look up the new index
      let playerNumber = null;
      
      if (socketPlayerMap && socketPlayerMap.size > 0) {
        // Get this socket's player index from the remapped map
        const mappedIndex = socketPlayerMap.get(gameSocket.id);
        
        // Only set playerNumber if the socket is still in the map (not eliminated)
        if (mappedIndex !== undefined && mappedIndex !== null) {
          playerNumber = mappedIndex;
        }
      }
      
      if (isTournamentTransition) {
        console.log(`[Broadcaster] Socket ${gameSocket.id.substr(0,8)} -> playerNumber: ${playerNumber}`);
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
        const socketInfo = this.matchmaking.socketGameMap.get(socketId);
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

    console.log(`[Broadcaster] broadcastToOthers: gameId=${gameId}, excludeSocket=${excludeSocketId}, event=${event}, totalSockets=${gameSockets.length}`);

    const otherSockets = gameSockets.filter(
      (socket) => socket.id !== excludeSocketId,
    );

    console.log(`[Broadcaster] Sending to ${otherSockets.length} other players`);

    if (otherSockets.length > 0) {
      otherSockets.forEach((otherSocket) => {
        console.log(`[Broadcaster] Emitting ${event} to socket:`, otherSocket.id);
        otherSocket.emit(event, data);
      });
    } else {
      console.log(`[Broadcaster] WARNING: No other players to send to!`);
    }
  }

  /**
   * Broadcast to ALL players in a game (including sender)
   * Used for round-end and game-over events
   */
  broadcastToGame(gameId, event, data, matchmakingService = null) {
    const mm = matchmakingService || this.matchmaking;
    console.log(`[Broadcaster] broadcastToGame: gameId=${gameId}, event=${event}, mm=${mm?.constructor?.name || 'default'}`);
    
    // Try matchmaking service first
    let gameSockets = mm.getGameSockets(gameId, this.io);
    console.log(`[Broadcaster] Sockets from matchmaking: ${gameSockets.length}`);
    
    // Fallback: Use io.to directly for room-based messaging
    if (gameSockets.length === 0) {
      console.log(`[Broadcaster] Trying direct io.to(${gameId}) fallback`);
      this.io.to(gameId).emit(event, data);
      console.log(`[Broadcaster] Direct emit sent to room: ${gameId}`);
      return;
    }

    gameSockets.forEach((gameSocket) => {
      console.log(`[Broadcaster] Emitting ${event} to socket:`, gameSocket.id);
      gameSocket.emit(event, data);
    });
  }

  /**
    * Broadcast that all clients are ready and game can start
    * @param {number} gameId - Game ID
    */
  broadcastAllClientsReady(gameId) {
    console.log(`[Broadcaster] Broadcasting all-clients-ready for game ${gameId}`);
    this.io.to(gameId).emit('all-clients-ready', { gameId });
  }

  /**
   * Broadcast final game-start after handshake completion
   * @param {number} gameId - Game ID
   */
  broadcastGameStartAfterHandshake(gameId) {
    console.log(`[Broadcaster] Broadcasting final game-start for game ${gameId}`);
    this.io.to(gameId).emit('game-start', {
      gameId,
      handshakeCompleted: true,
    });
  }
}

module.exports = BroadcasterService;
