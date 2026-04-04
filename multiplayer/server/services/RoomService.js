/**
 * RoomService
 * Manages private room creation and joining via room codes.
 * Supports both 2-player 2-hands and 4-player party modes.
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;
const ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

class RoomService {
  constructor(gameManager, unifiedMatchmaking, broadcaster, io = null) {
    this.gameManager = gameManager;
    this.unifiedMatchmaking = unifiedMatchmaking;
    this.broadcaster = broadcaster;
    this.io = io;

    /** roomCode → Room object */
    this.rooms = new Map();

    /** socketId → roomCode */
    this.socketRoomMap = new Map();
  }

  // ── Room Code Generation ─────────────────────────────────────────────────────

  _generateRoomCode() {
    let code;
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      attempts++;
    } while (this.rooms.has(code) && attempts < 100);

    if (this.rooms.has(code)) {
      throw new Error('Failed to generate unique room code');
    }
    return code;
  }

  // ── Room Creation ───────────────────────────────────────────────────────────

  /**
   * Create a new private room
   * @param {object} hostSocket - The socket of the room host
   * @param {string} gameMode - '2-hands', 'party', 'three-hands', 'four-hands'
   * @param {number} maxPlayers - 2, 3, or 4
   * @returns {object} { roomCode, room }
   */
  createRoom(hostSocket, gameMode, maxPlayers) {
    // CRITICAL: Clean up any previous room association before creating new room
    // This prevents room code mixing when the same socket creates multiple rooms
    const previousRoomCode = this.socketRoomMap.get(hostSocket.id);
    if (previousRoomCode) {
      console.log(`[RoomService] Socket ${hostSocket.id} was previously in room ${previousRoomCode} - cleaning up before creating new room`);
      // Remove from previous room if still in waiting state
      this.leaveRoom(hostSocket);
    }
    
    // Map gameMode to maxPlayers - explicit handling of all 5 game modes
    if (!maxPlayers) {
      if (gameMode === 'two-hands') {
        maxPlayers = 2;
      } else if (gameMode === 'three-hands') {
        maxPlayers = 3;
      } else if (gameMode === 'four-hands' || gameMode === 'party' || gameMode === 'freeforall') {
        maxPlayers = 4;
      } else {
        throw new Error(`Unknown game mode: ${gameMode}`);
      }
    }
    
    const roomCode = this._generateRoomCode();
    
    const room = {
      code: roomCode,
      hostSocketId: hostSocket.id,
      gameMode,
      maxPlayers,
      status: 'waiting', // 'waiting' | 'ready' | 'started' | 'closed'
      players: [
        { socketId: hostSocket.id, isHost: true, joinedAt: Date.now() }
      ],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      gameId: null,
    };

    this.rooms.set(roomCode, room);
    this.socketRoomMap.set(hostSocket.id, roomCode);

    console.log(`[RoomService] Room ${roomCode} created by ${hostSocket.id} (${gameMode}, ${maxPlayers} players)`);

    return { roomCode, room };
  }

  // ── Room Joining ─────────────────────────────────────────────────────────────

  /**
   * Join an existing room by code
   * @param {object} socket - The socket joining
   * @param {string} roomCode - The room code (case-insensitive)
   * @returns {object} { success, room?, error? }
   */
  joinRoom(socket, roomCode) {
    const code = roomCode.toUpperCase();
    const room = this.rooms.get(code);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'Room is no longer accepting players' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    // Check if player already in room (reconnection)
    const existingPlayer = room.players.find(p => p.socketId === socket.id);
    if (!existingPlayer) {
      room.players.push({ socketId: socket.id, isHost: false, joinedAt: Date.now() });
    }

    this.socketRoomMap.set(socket.id, code);
    room.lastActivity = Date.now();

    console.log(`[RoomService] Socket ${socket.id} joined room ${code} (${room.players.length}/${room.maxPlayers})`);

    // Check if room is now ready
    if (room.players.length === room.maxPlayers) {
      room.status = 'ready';
    }

    return { 
      success: true, 
      room: this._serializeRoom(room) 
    };
  }

  // ── Room Leaving ───────────────────────────────────────────────────────────

  /**
   * Leave a room
   * @param {object} socket - The socket leaving
   * @returns {object} { success, roomClosed, remainingPlayers? }
   */
  leaveRoom(socket) {
    const roomCode = this.socketRoomMap.get(socket.id);
    if (!roomCode) {
      return { success: false, error: 'Not in a room' };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.socketRoomMap.delete(socket.id);
      return { success: false, error: 'Room not found' };
    }

    // Remove player from room
    room.players = room.players.filter(p => p.socketId !== socket.id);
    this.socketRoomMap.delete(socket.id);
    room.lastActivity = Date.now();

    // If host left, transfer to next player or close room
    if (room.hostSocketId === socket.id) {
      if (room.players.length > 0) {
        room.hostSocketId = room.players[0].socketId;
        room.players[0].isHost = true;
        console.log(`[RoomService] Host transferred to ${room.hostSocketId} in room ${roomCode}`);
      }
    }

    console.log(`[RoomService] Socket ${socket.id} left room ${roomCode} (${room.players.length} remaining)`);

    // Close room if empty or game already started
    if (room.players.length === 0 || room.status === 'started') {
      room.status = 'closed';
      this.rooms.delete(roomCode);
      console.log(`[RoomService] Room ${roomCode} closed`);
      return { success: true, roomClosed: true };
    }

    // Update status if room no longer full
    if (room.status === 'ready' && room.players.length < room.maxPlayers) {
      room.status = 'waiting';
    }

    return { 
      success: true, 
      roomClosed: false, 
      remainingPlayers: room.players.length,
      room: this._serializeRoom(room)
    };
  }

  // ── Room Status ───────────────────────────────────────────────────────────

  /**
   * Get room status
   * @param {string} roomCode 
   * @returns {object|null}
   */
  getRoomStatus(roomCode) {
    const code = roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return null;
    return this._serializeRoom(room);
  }

  /**
   * Get room by socket ID
   * @param {string} socketId 
   * @returns {object|null}
   */
  getRoomBySocket(socketId) {
    const roomCode = this.socketRoomMap.get(socketId);
    if (!roomCode) return null;
    return this._serializeRoom(this.rooms.get(roomCode));
  }

  // ── Game Start ─────────────────────────────────────────────────────────────

  /**
   * Start a room game (called by host)
   * @param {string} roomCode 
   * @param {object} io - Socket.IO instance for broadcasting
   * @returns {object} { success, gameId?, error? }
   */
  startRoomGame(roomCode, io) {
    const code = roomCode.toUpperCase();
    const room = this.rooms.get(code);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.status === 'started') {
      return { success: false, error: 'Game already started' };
    }

    // Need at least 2 players to start
    if (room.players.length < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }

    // Explicitly handle all 5 game modes - no fallbacks
    const isTwoHands = room.gameMode === 'two-hands';
    const isThreeHands = room.gameMode === 'three-hands';
    const isFourHands = room.gameMode === 'four-hands';
    const isParty = room.gameMode === 'party';
    const isFreeForAll = room.gameMode === 'freeforall';
    
    // Determine required players based on game mode - explicit handling
    let requiredPlayers;
    let playerCount;
    if (isTwoHands) {
      requiredPlayers = 2;
      playerCount = 2;
    } else if (isThreeHands) {
      requiredPlayers = 3;
      playerCount = 3;
    } else if (isFourHands) {
      requiredPlayers = 4;
      playerCount = 4;
    } else if (isParty) {
      requiredPlayers = 4;
      playerCount = 4;
    } else if (isFreeForAll) {
      requiredPlayers = 4;
      playerCount = 4;
    } else {
      throw new Error(`Unknown game mode: ${room.gameMode}`);
    }

    if (room.players.length !== requiredPlayers) {
      return { 
        success: false, 
        error: `Need exactly ${requiredPlayers} players to start ${room.gameMode} game` 
      };
    }

    console.log(`[RoomService] Starting ${room.gameMode} game in room ${code} with ${playerCount} players`);

    // Get sockets for all players
    const sockets = room.players.map(p => io.sockets.sockets.get(p.socketId)).filter(Boolean);
    if (sockets.length !== playerCount) {
      return { success: false, error: 'Not all players connected' };
    }

    // Start game via appropriate method
    let gameResult;
    if (isParty) {
      // For party games (2v2 team mode)
      const { gameId, gameState } = this.gameManager.startPartyGame();
      room.gameId = gameId;

      // Register players
      for (let i = 0; i < 4; i++) {
        const socket = sockets[i];
        this.gameManager.addPlayerToGame(gameId, socket.id, i, socket.userId || null);
        // Store socket mapping as object with gameId, gameType, and userId
        // This matches the format expected by GameCoordinator._resolvePlayer()
        this.unifiedMatchmaking.socketRegistry.set(socket.id, gameId, room.gameMode, socket.userId || null);
        console.log(`[RoomService] socketRegistry set for socket ${socket.id}: gameId=${gameId}, gameType=${room.gameMode}, userId=${socket.userId || null}`);
        this.unifiedMatchmaking.socketRegistry.setGameSockets(gameId, sockets.map(s => s.id));
        // Set userId on gameState players for persistence
        if (socket.userId) {
          this.gameManager.setPlayerUserId(gameId, i, socket.userId);
        }
      }

      gameResult = { gameId, gameState, players: sockets.map((socket, index) => ({ socket, playerNumber: index })) };
      room.status = 'started';
      
      // Build playerInfos for game-start event
      const playerInfos = sockets.map((socket, index) => ({
        playerNumber: index,
        userId: socket.userId || null,
        username: socket.username || null,
        avatar: socket.avatar || null,
      }));
      console.log(`[RoomService] Broadcasting game-start for party game ${gameId} with playerInfos:`, JSON.stringify(playerInfos));
      
      // Emit game-start to all players - include gameState and playerInfos
      sockets.forEach(socket => {
        socket.emit('game-start', { 
          gameId, 
          gameState,
          playerNumber: sockets.indexOf(socket),
          playerInfos,
        });
      });
    } else {
      // For 2-hands, three-hands, and four-hands games
      const { gameId, gameState } = this.gameManager.startGame(playerCount, false); // isPartyMode = false
      room.gameId = gameId;

      // Register players
      for (let i = 0; i < playerCount; i++) {
        const socket = sockets[i];
        this.gameManager.addPlayerToGame(gameId, socket.id, i, socket.userId || null);
        // Store socket mapping as object with gameId, gameType, and userId
        // This matches the format expected by GameCoordinator._resolvePlayer()
        this.unifiedMatchmaking.socketRegistry.set(socket.id, gameId, room.gameMode, socket.userId || null);
        console.log(`[RoomService] socketRegistry set for socket ${socket.id}: gameId=${gameId}, gameType=${room.gameMode}, userId=${socket.userId || null}`);
        this.unifiedMatchmaking.socketRegistry.setGameSockets(gameId, sockets.map(s => s.id));
        // Set userId on gameState players for persistence
        if (socket.userId) {
          this.gameManager.setPlayerUserId(gameId, i, socket.userId);
        }
      }

      gameResult = { gameId, gameState, players: sockets.map((socket, index) => ({ socket, playerNumber: index })) };
      room.status = 'started';

      // Build playerInfos for game-start event
      const playerInfos = sockets.map((socket, index) => ({
        playerNumber: index,
        userId: socket.userId || null,
        username: socket.username || null,
        avatar: socket.avatar || null,
      }));
      console.log(`[RoomService] Broadcasting game-start for ${room.gameMode} game ${gameId} with playerInfos:`, JSON.stringify(playerInfos));

      // Emit game-start to all players - include gameState and playerInfos
      sockets.forEach(socket => {
        socket.emit('game-start', { 
          gameId, 
          gameState,
          playerNumber: sockets.indexOf(socket),
          playerInfos,
        });
      });
    }

    // Remove from room tracking (game is now in matchmaking maps)
    for (const player of room.players) {
      this.socketRoomMap.delete(player.socketId);
    }

    // Clear client ready status for this game (in case of reconnection)
    this.gameManager.clearClientReadyStatus(room.gameId);

    return { success: true, gameId: room.gameId };
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  /**
   * Clean up old/inactive rooms
   */
  cleanupExpiredRooms() {
    const now = Date.now();
    const expiredCodes = [];

    for (const [code, room] of this.rooms) {
      if (now - room.lastActivity > ROOM_TIMEOUT_MS) {
        expiredCodes.push(code);
      }
    }

    for (const code of expiredCodes) {
      const room = this.rooms.get(code);
      console.log(`[RoomService] Cleaning up expired room ${code}`);
      
      // Notify players the room is closing
      for (const player of room.players) {
        this.socketRoomMap.delete(player.socketId);
      }
      this.rooms.delete(code);
    }

    return expiredCodes.length;
  }

  /**
   * Handle socket disconnection - clean up room membership
   * @param {object} socket 
   * @returns {object|null} Room info if player was in a room
   */
  handleDisconnection(socket) {
    const roomCode = this.socketRoomMap.get(socket.id);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.socketRoomMap.delete(socket.id);
      return null;
    }

    // Determine if game already started
    const gameStarted = room.status === 'started';
    const wasHost = room.hostSocketId === socket.id;

    // Remove from room
    const result = this.leaveRoom(socket);

    return {
      roomCode,
      gameStarted,
      wasHost,
      remainingPlayers: result.remainingPlayers || 0,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  _serializeRoom(room) {
    if (!room) return null;
    return {
      code: room.code,
      hostSocketId: room.hostSocketId,
      gameMode: room.gameMode,
      maxPlayers: room.maxPlayers,
      status: room.status,
      players: room.players.map(p => ({
        socketId: p.socketId,
        isHost: p.isHost,
      })),
      playerCount: room.players.length,
    };
  }
}

module.exports = RoomService;
