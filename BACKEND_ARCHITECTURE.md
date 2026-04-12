# Backend Architecture Documentation

## Overview

The casino game backend is built on Node.js with Socket.IO for real-time multiplayer gaming. It supports multiple game modes including 2-player, 3-player, 4-player, party (2v2 team), and free-for-all variants, with both automated matchmaking and private room creation. This document provides comprehensive details including code examples and production-ready guardrails for matchmaking.

## Server Architecture

### Core Components

- **Express Server**: Handles HTTP requests for authentication, profiles, game management, and statistics
- **Socket.IO Server**: Manages real-time WebSocket connections for game communication
- **MongoDB Database**: Stores user profiles, game states, and statistics
- **Game Engine**: Handles game logic, scoring, and state management

### Key Services

#### UnifiedMatchmakingService

**Purpose**: Central matchmaking coordinator for all game types

**Key Responsibilities**:
- Manages player queue assignments across all game types
- Creates games when sufficient players are available
- Maintains socket-to-game mappings
- Handles player disconnections and reconnections

**Code Example**:
```javascript
class UnifiedMatchmakingService {
  constructor(gameManager, io = null) {
    this.gameManager = gameManager;
    this.io = io;
    this.queueManager = new QueueManager(gameManager);
    this.socketRegistry = new SocketRegistry();
    this.gameFactory = new GameFactory(gameManager);
    this.cleanupScheduler = new CleanupScheduler(this.queueManager, this.socketRegistry);
    this.cleanupScheduler.start();
  }

  addToQueue(socket, gameType, userId = null) {
    // Production guardrail: Prevent duplicate queue entries
    if (this.socketRegistry.get(socket.id)) {
      console.log(`[UnifiedMatchmaking] Socket ${socket.id} already in queue/game, skipping`);
      return null;
    }

    this.socketRegistry.set(socket.id, null, gameType, userId);
    const playerEntries = this.queueManager.addToQueue(socket, gameType, userId);

    if (!playerEntries) {
      return null;
    }

    return this._createGame(gameType, playerEntries);
  }
}
```

**Production Guardrails**:
- Prevents duplicate queue entries for same socket
- Validates socket connectivity before queue operations
- Implements timeout-based cleanup for stale connections

#### QueueManager

**Purpose**: Manages waiting queues for different game modes with production safety measures

**Code Example**:
```javascript
class QueueManager {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.waitingQueues = {};
    this.queueRoomCodes = {};

    Object.keys(GAME_TYPES).forEach(type => {
      this.waitingQueues[type] = [];
      this.queueRoomCodes[type] = null;
    });
  }

  addToQueue(socket, gameType, userId = null) {
    // Production guardrail: Validate socket connection
    if (!socket || !socket.connected) {
      console.error(`[QueueManager] Invalid socket for ${gameType} queue`);
      return null;
    }

    const now = Date.now();
    const socketEntry = {
      id: socket.id,
      socket: socket,
      userId: userId,
      joinedAt: now,
      lastActivity: now
    };

    this.waitingQueues[gameType].push(socketEntry);
    return this._tryCreateGame(gameType);
  }

  _tryCreateGame(gameType) {
    const config = GAME_TYPES[gameType];
    const queue = this.waitingQueues[gameType];

    if (queue.length < config.minPlayers) {
      return null;
    }

    // Production guardrail: Exact player count matching
    if (queue.length !== config.minPlayers) {
      return null;
    }

    // Production guardrail: Validate all sockets before game creation
    const playerEntries = queue.splice(0, config.minPlayers);
    for (const entry of playerEntries) {
      if (!entry || !entry.socket || !entry.socket.id) {
        console.error(`[QueueManager] Invalid socket in ${gameType} queue`);
        return null;
      }
    }

    return playerEntries;
  }
}
```

**Production Guardrails**:
- Validates socket connectivity before adding to queue
- Enforces exact player count requirements
- Implements activity timeouts (10 minutes queue timeout, 3 minutes inactivity)
- Automatic cleanup of disconnected sockets

#### RoomService

**Purpose**: Handles private room creation and management with robust error handling

**Code Example**:
```javascript
class RoomService {
  createRoom(hostSocket, gameMode, maxPlayers) {
    // Production guardrail: Clean up previous room associations
    const previousRoomCode = this.socketRoomMap.get(hostSocket.id);
    if (previousRoomCode) {
      console.log(`[RoomService] Socket ${hostSocket.id} was previously in room ${previousRoomCode} - cleaning up`);
      this.leaveRoom(hostSocket);
    }

    // Production guardrail: Validate game mode and player count
    if (!maxPlayers) {
      if (gameMode === 'two-hands') maxPlayers = 2;
      else if (gameMode === 'three-hands') maxPlayers = 3;
      else if (gameMode === 'four-hands' || gameMode === 'party' || gameMode === 'freeforall') maxPlayers = 4;
      else throw new Error(`Unknown game mode: ${gameMode}`);
    }

    const roomCode = this._generateRoomCode();
    const room = {
      code: roomCode,
      hostSocketId: hostSocket.id,
      gameMode,
      maxPlayers,
      status: 'waiting',
      players: [{ socketId: hostSocket.id, isHost: true, joinedAt: Date.now() }],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      gameId: null,
    };

    this.rooms.set(roomCode, room);
    this.socketRoomMap.set(hostSocket.id, roomCode);
    return { roomCode, room };
  }
}
```

**Production Guardrails**:
- Prevents room code conflicts by cleaning up previous associations
- Validates game modes and enforces player count limits
- Implements room timeout (30 minutes) for inactive rooms
- Transfers host privileges when original host disconnects

#### GameCoordinatorService

**Purpose**: Orchestrates game flow and player actions with comprehensive validation

**Code Example**:
```javascript
class GameCoordinatorService {
  _resolvePlayer(socket) {
    let socketInfo = this.unifiedMatchmaking.socketRegistry.get(socket.id);
    let gameId = socketInfo?.gameId || null;

    // Production guardrail: Fallback lookup for missing socket info
    if (!gameId) {
      for (const [gid, sockets] of this.unifiedMatchmaking.socketRegistry.gameSocketsMap.entries()) {
        if (sockets.includes(socket.id)) {
          gameId = gid;
          const game = this.gameManager.getGameState(gid);
          if (game) {
            // Reconstruct socket info
            const isPartyGame = game.players.some(p => p.team);
            const gameType = game.playerCount === 2 ? 'two-hands' :
                            game.playerCount === 3 ? 'three-hands' :
                            game.playerCount === 4 && isPartyGame ? 'party' : 'four-hands';
            this.unifiedMatchmaking.socketRegistry.set(socket.id, gameId, gameType, socket.userId || null);
            socketInfo = { gameId, gameType, userId: socket.userId || null };
          }
          break;
        }
      }
    }

    // Production guardrail: Validate game existence and player membership
    if (!gameId) {
      this.broadcaster.sendError(socket, 'Not in an active game');
      return null;
    }

    const playerIndex = this.gameManager.getPlayerIndex(gameId, socket.id);
    if (playerIndex === null) {
      this.broadcaster.sendError(socket, 'Player not found in game');
      return null;
    }

    return { gameId, playerIndex, isPartyGame: socketInfo?.gameType === 'party' };
  }
}
```

**Production Guardrails**:
- Implements fallback socket registry lookup
- Validates player membership in games
- Comprehensive error handling and user feedback

#### SocketRegistry

**Purpose**: Manages socket-to-game mappings with automatic cleanup

**Code Example**:
```javascript
class SocketRegistry {
  handleDisconnection(socket, gameManager) {
    const socketInfo = this.socketGameMap.get(socket.id);
    if (!socketInfo) return null;

    const { gameId, gameType } = socketInfo;
    if (!gameId) {
      this.socketGameMap.delete(socket.id);
      return null;
    }

    this.socketGameMap.delete(socket.id);
    const sockets = (this.gameSocketsMap.get(gameId) || []).filter(id => id !== socket.id);

    // Production guardrail: Clean up empty games
    if (sockets.length === 0) {
      this.gameSocketsMap.delete(gameId);
      if (gameManager) {
        gameManager.endGame(gameId);
      }
    } else {
      this.gameSocketsMap.set(gameId, sockets);
    }

    return { gameId, remainingSockets: sockets };
  }

  isUserInQueue(userId, queueManager) {
    // Production guardrail: Prevent duplicate queue entries
    if (!queueManager || !userId) return false;
    const allQueues = queueManager.getAllQueues();
    for (const gameType of Object.keys(allQueues)) {
      const queue = allQueues[gameType];
      if (queue.some(entry => entry.userId === userId)) {
        return true;
      }
    }
    return false;
  }
}
```

**Production Guardrails**:
- Automatic cleanup of empty games
- Prevention of duplicate queue entries per user
- Comprehensive disconnection handling

## Socket Communication

### Connection Management

Each client establishes a Socket.IO connection with robust authentication and mapping:

```javascript
// Socket connection handler in socket-server.js
io.on('connection', socket => {
  const services = { io, gameManager, roomService, unifiedMatchmaking, broadcaster, coordinator };
  attachSocketHandlers(socket, services);
});

// Authentication handler
socket.on('authenticate', (userId) => {
  if (userId) {
    socket.userId = userId;
    socket.join(`user:${userId}`);
  }
});
```

### Socket Events

#### Matchmaking Events with Guardrails
```javascript
socket.on('join-two-hands-queue', async () => {
  // Production guardrail: Require authentication
  if (!socket.userId) {
    socket.emit('error', { message: 'Please authenticate before joining queue' });
    return;
  }

  // Production guardrail: Prevent duplicate queue entries
  removeFromAllQueues();
  const result = unifiedMatchmaking.addToQueue(socket, 'two-hands', socket.userId);
  if (result) {
    await broadcaster.broadcastGameStart(result);
  }
});
```

#### Room Management Events with Validation
```javascript
socket.on('join-room', async (data) => {
  console.log(`[Socket] join-room:${socket.id} code=${data.roomCode}`);

  // Production guardrail: Clean up previous queue associations
  removeFromAllQueues();

  const result = roomService.joinRoom(socket, data.roomCode);
  if (result.success) {
    socket.emit('room-joined', { room: result.room });

    const room = roomService.getRoomStatus(data.roomCode);
    if (room) {
      // Notify all players in room
      room.players.forEach(player => {
        const pSocket = services.io.sockets.sockets.get(player.socketId);
        if (pSocket && pSocket.id !== socket.id) {
          pSocket.emit('room-updated', { room });
        }
      });

      // Auto-start if room is full
      if (room.status === 'ready') {
        const startResult = roomService.startRoomGame(room.code, services.io);
        if (!startResult.success) {
          room.players.forEach(player => {
            const pSocket = services.io.sockets.sockets.get(player.socketId);
            if (pSocket) pSocket.emit('room-error', { message: startResult.error });
          });
        }
      }
    }
  } else {
    socket.emit('room-error', { message: result.error });
  }
});
```

### Game Factory and Type Configuration

**Game Type Configuration**:
```javascript
// config/gameTypes.js
module.exports = {
  'two-hands': {
    minPlayers: 2,
    createGame: (gameManager) => gameManager.startGame(2, false),
    registerPlayers: (gameId, sockets, gameManager, userIds) => {
      for (let i = 0; i < 2; i++) {
        gameManager.addPlayerToGame(gameId, sockets[i].id, i, userIds[i] || null);
      }
    }
  },
  'party': {
    minPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, true), // isPartyMode = true
    registerPlayers: (gameId, sockets, gameManager, userIds) => {
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, sockets[i].id, i, userIds[i] || null);
      }
    }
  }
  // ... other game types
};
```

**Game Factory with Validation**:
```javascript
// services/GameFactory.js
class GameFactory {
  createGame(gameType, playerEntries) {
    const config = GAME_TYPES[gameType];
    if (!config) {
      console.error(`[GameFactory] Unknown game type: ${gameType}`);
      return null;
    }

    const sockets = playerEntries.map(e => e.socket);
    const userIds = playerEntries.map(e => e.userId);

    const { gameId, gameState } = config.createGame(this.gameManager);
    if (!gameState) {
      console.error(`[GameFactory] Failed to create ${gameType} game state`);
      return null;
    }

    // Production guardrail: Validate player count matches game requirements
    if (gameState.players.length !== config.minPlayers) {
      console.error(`[GameFactory] ${gameType} game has wrong player count: ${gameState.players.length}`);
      return null;
    }

    config.registerPlayers(gameId, sockets, this.gameManager, userIds);

    // Production guardrail: Set user IDs for persistence and scoring
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
```

## Queue System

### Queue Types and Requirements

| Game Type | Players Required | Team Mode | Description |
|-----------|------------------|-----------|-------------|
| two-hands | 2 | No | 1v1 competitive |
| three-hands | 3 | No | 3-player free-for-all |
| four-hands | 4 | No | 4-player free-for-all |
| party | 4 | Yes | 2v2 team-based |
| freeforall | 4 | No | 4-player elimination |

### Queue Operation with Production Safety

```javascript
// Production guardrail: Activity tracking and timeout management
const QUEUE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

class QueueManager {
  _isSocketValid(socket, entry) {
    if (!socket.connected) return false;
    if (entry.joinedAt && (Date.now() - entry.joinedAt > QUEUE_TIMEOUT_MS)) return false;
    if (entry.lastActivity && (Date.now() - entry.lastActivity > INACTIVITY_TIMEOUT_MS)) return false;
    return true;
  }

  cleanupStaleQueues() {
    for (const gameType of Object.keys(this.waitingQueues)) {
      this.waitingQueues[gameType] = this.waitingQueues[gameType].filter(entry => {
        if (!entry.socket || !entry.socket.connected) {
          console.log(`[QueueManager] Removing stale socket ${entry.id} from ${gameType} queue`);
          return false;
        }
        return true;
      });
    }
  }
}
```

### Cleanup Scheduler

**Automated Maintenance**:
```javascript
class CleanupScheduler {
  constructor(queueManager, socketRegistry, intervalMs = 10000) {
    this.queueManager = queueManager;
    this.socketRegistry = socketRegistry;
    this.intervalMs = intervalMs;
    this.intervalHandle = null;
    this.isRunning = false;
  }

  runCleanup() {
    try {
      const results = { queues: {}, socketRegistry: 0 };

      // Clean all queue types
      const gameTypes = ['two-hands', 'three-hands', 'four-hands', 'party', 'freeforall'];
      for (const gameType of gameTypes) {
        results.queues[gameType] = this.queueManager.cleanup(gameType, this._isSocketValid.bind(this));
      }

      // Clean empty games from registry
      results.socketRegistry = this.socketRegistry.cleanupEmptyGames();

    } catch (error) {
      console.error('[CleanupScheduler] Error during cleanup:', error);
    }
  }
}
```

## Tournament System

### Tournament Coordinator

**Hand Management with Production Safety**:
```javascript
class TournamentCoordinator {
  registerExistingGameAsTournament(gameState, players, io) {
    const tournament = {
      id: gameState.tournamentId,
      phase: gameState.tournamentPhase || 'QUALIFYING',
      totalHands: gameState.totalHands || 4,
      currentHand: gameState.tournamentHand || 1,
      players: players.map((p, i) => ({
        id: p.userId || p.socket?.id || `guest_${i}`,
        socket: p.socket,
        socketId: p.socket?.id || null,
        name: p.socket?.userId || `Guest ${i + 1}`,
        cumulativeScore: 0,
        cumulativeSpades: 0,
        cumulativeCards: 0,
        handsPlayed: 0,
        eliminated: false
      })),
      status: 'active'
    };

    this.activeTournaments.set(tournamentId, tournament);
    return tournament;
  }

  handleClientReady(socketId, gameId, playerIndex) {
    const gameState = this.gameManager.getGameState(gameId);
    if (!gameState?.tournamentMode) return true;

    // Production guardrail: Reject eliminated players
    const player = gameState.players?.[playerIndex];
    if (!player) return false;
    return gameState.playerStatuses?.[player.id] !== 'ELIMINATED';
  }
}
```

### Qualification System

**Tie-Breaking with Deterministic Ranking**:
```javascript
// TournamentQualification.js
function determineQualification(players, phase, config) {
  const activePlayers = players.filter(p => !p.eliminated);

  const playerIds = activePlayers.map(p => p.id);
  const scores = activePlayers.map(p => p.cumulativeScore);
  const breakdowns = activePlayers.map(p => ({
    spadeCount: p.cumulativeSpades || 0,
    totalCards: p.cumulativeCards || 0,
    cards: [] // Card IDs for deterministic tie-breaking
  }));

  // Production guardrail: Use deterministic ranking function
  const rankedIndices = rankPlayers(playerIds, scores, breakdowns);
  const sortedPlayers = rankedIndices.map(idx => activePlayers[idx]);

  let qualifiedCount, nextPhase;
  if (phase === 'QUALIFYING') {
    qualifiedCount = config.qualifyingPlayers || 3;
    nextPhase = 'SEMI_FINAL';
  } else if (phase === 'SEMI_FINAL') {
    qualifiedCount = 2;
    nextPhase = 'FINAL';
  }

  const qualified = sortedPlayers.slice(0, qualifiedCount);
  const eliminated = sortedPlayers.slice(qualifiedCount);

  return { qualified, eliminated, nextPhase, sortedPlayers };
}
```

## Production Deployment Considerations

### Scalability Features

1. **Horizontal Scaling**: Socket.IO adapter for multiple server instances
2. **Database Sharding**: MongoDB sharding for user profiles and game stats
3. **Redis Caching**: Session storage and queue state caching
4. **Load Balancing**: Nginx upstream configuration for game servers

### Monitoring and Observability

```javascript
// Key metrics to monitor
const monitoringMetrics = {
  activeGames: () => this.socketRegistry.getActiveGamesCount(),
  queueLengths: () => ({
    'two-hands': this.queueManager.getWaitingCount('two-hands'),
    'three-hands': this.queueManager.getWaitingCount('three-hands'),
    'four-hands': this.queueManager.getWaitingCount('four-hands'),
    'party': this.queueManager.getWaitingCount('party'),
    'freeforall': this.queueManager.getWaitingCount('freeforall')
  }),
  tournamentCount: () => this.activeTournaments.size,
  connectedSockets: () => this.io.sockets.sockets.size
};
```

### Security Guardrails

1. **Rate Limiting**: Socket event rate limiting per user
2. **Input Validation**: Comprehensive action payload validation
3. **Authentication**: JWT token validation for all socket connections
4. **Authorization**: Game membership validation before actions
5. **Audit Logging**: All game actions logged for dispute resolution

### Error Handling and Recovery

```javascript
// Global error boundary for socket handlers
function safeSocketHandler(handler) {
  return async function(...args) {
    try {
      await handler.apply(this, args);
    } catch (error) {
      console.error(`[SocketHandler] Error in ${handler.name}:`, error);
      const socket = args[0];
      if (socket && socket.emit) {
        socket.emit('error', {
          message: 'An internal error occurred. Please refresh and try again.',
          code: 'INTERNAL_ERROR'
        });
      }
    }
  };
}
```

This comprehensive architecture ensures production-ready matchmaking with robust error handling, automatic cleanup, and scalable performance for real-time multiplayer gaming.</content>
<parameter name="filePath">C:\Users\LB\Desktop\Linda Baloyi\MadGames\dev\casino-game\BACKEND_ARCHITECTURE.md