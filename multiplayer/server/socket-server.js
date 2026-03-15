/**
 * socket-server.js
 * Network layer only — sets up Express + Socket.IO and wires services together.
 * No game logic here.
 */

const express    = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const os = require('os');

// Database
const db = require('./db/connection');

// Routes
const { authRoutes, profileRoutes, gameRoutes } = require('./routes');

const MatchmakingService     = require('./services/MatchmakingService');
const PartyMatchmakingService  = require('./services/PartyMatchmakingService');
const RoomService              = require('./services/RoomService');
const BroadcasterService      = require('./services/BroadcasterService');
const GameCoordinatorService = require('./services/GameCoordinatorService');
const GameManager  = require('./game/GameManager');
const ActionRouter = require('./game/ActionRouter');

// ── HTTP + Socket.IO setup ────────────────────────────────────────────────────

const app    = express();
const server = createServer(app);
const io     = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware for JSON
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/game', gameRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

// ── Service instances (populated in startServer) ──────────────────────────────

let gameManager;
let actionRouter;
let matchmaking;
let partyMatchmaking;
let broadcaster;
let roomService;
let coordinator;

// ── Connection handling ───────────────────────────────────────────────────────

io.on('connection', socket => {
  // Add player to queue; start game if two are waiting
  const gameResult = matchmaking.addToQueue(socket);
  if (gameResult) {
    broadcaster.broadcastGameStart(gameResult);
  }

  // Party Matchmaking: add player to party queue; start 4-player game when ready
  socket.on('join-party-queue', () => {
    // Remove from regular matchmaking queue first (if present)
    matchmaking.removeFromQueue(socket.id);
    
    const partyResult = partyMatchmaking.addToPartyQueue(socket);
    if (partyResult) {
      broadcaster.broadcastPartyGameStart(partyResult);
    } else {
      // Broadcast to ALL waiting players (not just the joining player)
      partyMatchmaking.broadcastPartyWaiting(io);
    }
  });

  // Private Room: create room
  socket.on('create-room', (data) => {
    // Remove from matchmaking queues if present
    matchmaking.removeFromQueue(socket.id);
    
    const { gameMode, maxPlayers } = data;
    const result = roomService.createRoom(socket, gameMode, maxPlayers);
    
    if (result.roomCode) {
      socket.emit('room-created', {
        roomCode: result.roomCode,
        room: result.room,
      });
    }
  });

  // Private Room: join room
  socket.on('join-room', (data) => {
    // Remove from matchmaking queues if present
    matchmaking.removeFromQueue(socket.id);
    
    const result = roomService.joinRoom(socket, data.roomCode);
    
    if (result.success) {
      socket.emit('room-joined', { room: result.room });
      
      // Notify other players in the room
      const room = roomService.getRoomStatus(data.roomCode);
      if (room) {
        room.players.forEach(player => {
          const playerSocket = io.sockets.sockets.get(player.socketId);
          if (playerSocket && playerSocket.id !== socket.id) {
            playerSocket.emit('room-updated', { room });
          }
        });
      }
    } else {
      socket.emit('room-error', { message: result.error });
    }
  });

  // Private Room: leave room
  socket.on('leave-room', () => {
    const result = roomService.leaveRoom(socket);
    
    if (result.success) {
      socket.emit('room-left', { success: true });
      
      if (!result.roomClosed && result.room) {
        // Notify remaining players
        result.room.players.forEach(player => {
          const playerSocket = io.sockets.sockets.get(player.socketId);
          if (playerSocket) {
            playerSocket.emit('room-updated', { room: result.room });
          }
        });
      }
    }
  });

  // ── Private Room: get room status ─────────────────────────────────────────────
  socket.on('room-status', (data) => {
    const room = roomService.getRoomStatus(data.roomCode);
    if (room) {
      socket.emit('room-status', { room });
    } else {
      socket.emit('room-error', { message: 'Room not found' });
    }
  });

  // Private Room: start game (host only)
  socket.on('start-room-game', (data) => {
    const room = roomService.getRoomBySocket(socket.id);
    
    if (!room) {
      socket.emit('room-error', { message: 'Not in a room' });
      return;
    }
    
    if (room.hostSocketId !== socket.id) {
      socket.emit('room-error', { message: 'Only the host can start the game' });
      return;
    }
    
    const result = roomService.startRoomGame(room.code, io);
    
    if (!result.success) {
      socket.emit('room-error', { message: result.error });
    }
  });

  // ── Game events ──────────────────────────────────────────────────────────────
  socket.on('game-action', data => coordinator.handleGameAction(socket, data));
  socket.on('start-next-round', () => coordinator.handleStartNextRound(socket));

  // ── Drag events (for real-time shared state) ───────────────────────────────
  socket.on('drag-start', data => coordinator.handleDragStart(socket, data));
  socket.on('drag-move', data => coordinator.handleDragMove(socket, data));
  socket.on('drag-end', data => coordinator.handleDragEnd(socket, data));

  // ── State sync (client can request the current state at any time) ─────────
  socket.on('request-sync', () => {
    // Check regular matchmaking first
    let gameId = matchmaking.getGameId(socket.id);
    
    // If not in regular game, check party matchmaking
    if (!gameId) {
      gameId = partyMatchmaking.getPartyGameId(socket.id);
    }
    
    if (!gameId) { socket.emit('error', { message: 'Not in a game' }); return; }
    const state = gameManager.getGameState(gameId);
    if (!state)  { socket.emit('error', { message: 'Game not found' }); return; }
    socket.emit('game-state-sync', { gameState: state, serverTime: Date.now() });
  });

  // ── Lobby status request (for polling) ───────────────────────────────────────
  socket.on('request-lobby-status', () => {
    const waitingCount = partyMatchmaking.getWaitingPartyPlayersCount();
    socket.emit('party-waiting', { playersJoined: waitingCount });
  });

  // Disconnect
  socket.on('disconnect', () => {
    // Handle room disconnect first (before game starts)
    const roomResult = roomService.handleDisconnection(socket);
    if (roomResult && !roomResult.gameStarted) {
      // Notify remaining players in the waiting room
      const room = roomService.getRoomStatus(roomResult.roomCode);
      if (room && room.players.length > 0) {
        room.players.forEach(player => {
          const playerSocket = io.sockets.sockets.get(player.socketId);
          if (playerSocket) {
            playerSocket.emit('room-updated', { room });
          }
        });
      }
    }
    
    // Handle regular matchmaking disconnect
    const result = matchmaking.handleDisconnection(socket);
    if (result) {
      broadcaster.broadcastDisconnection(result.gameId, socket.id);
      if (result.remainingSockets.length < 1) {
        gameManager.endGame(result.gameId);
      }
    }
    
    // Handle party matchmaking disconnect
    const partyResult = partyMatchmaking.handlePartyDisconnection(socket);
    if (partyResult) {
      broadcaster.broadcastPartyDisconnection(partyResult.gameId, socket.id);
      if (partyResult.remainingSockets.length < 1) {
        gameManager.endGame(partyResult.gameId);
      }
    }
  });
});

// ── Server control ────────────────────────────────────────────────────────────

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const entry of iface) {
      // Skip internal and non-IPv4 addresses
      if (entry.internal || entry.family !== 'IPv4') continue;
      return entry.address;
    }
  }
  return null;
}

async function startServer() {
  // Initialize MongoDB connection
  try {
    await db.connect();
    console.log('[Server] ✅ MongoDB connected');
  } catch (error) {
    console.error('[Server] ❌ MongoDB connection error:', error.message);
    console.log('[Server] ⚠️  Server starting without database - some features may be unavailable');
  }

  gameManager  = new GameManager();
  actionRouter = new ActionRouter(gameManager);
  matchmaking  = new MatchmakingService(gameManager);
  partyMatchmaking = new PartyMatchmakingService(gameManager, io);
  broadcaster  = new BroadcasterService(matchmaking, gameManager, io, partyMatchmaking);
  roomService   = new RoomService(gameManager, matchmaking, partyMatchmaking, broadcaster, io);
  coordinator   = new GameCoordinatorService(gameManager, actionRouter, matchmaking, broadcaster, partyMatchmaking);

  server.listen(PORT, '0.0.0.0', () => {
    const lanIp = getLocalIPAddress();
    console.log(`[Server] ════════════════════════════════════════`);
    console.log(`[Server] 🎮 Casino Game Server Started!`);
    console.log(`[Server] ════════════════════════════════════════`);
    console.log(`[Server] Local:   http://localhost:${PORT}`);
    if (lanIp) {
      console.log(`[Server] LAN IP:  http://${lanIp}:${PORT}`);
      console.log(`[Server] ───────────────────────────────────────`);
      console.log(`[Server] Share this IP with friends on your network!`);
    }
    console.log(`[Server] ════════════════════════════════════════`);
    console.log(`[Server] Registered actions: ${actionRouter.registeredActions().join(', ') || '(none yet)'}`);
  });

  return { app, server, io, gameManager, actionRouter };
}

function stopServer() {
  if (server.listening) server.close();
}

// Provide io reference for services that need to look up sockets
function getIO() { return io; }

module.exports = { startServer, stopServer, getIO };
