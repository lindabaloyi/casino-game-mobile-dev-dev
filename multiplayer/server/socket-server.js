/**
 * socket-server.js
 * Network layer only — sets up Express + Socket.IO and wires services together.
 * No game logic here.
 */

const express    = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const os = require('os');

// Database
const db = require('./db/connection');

// Routes
const { authRoutes, profileRoutes, gameRoutes, friendsRoutes, usersRoutes } = require('./routes');

const UnifiedMatchmakingService = require('./services/UnifiedMatchmakingService');
const RoomService              = require('./services/RoomService');
const BroadcasterService      = require('./services/BroadcasterService');
const GameCoordinatorService = require('./services/GameCoordinatorService');
const GameManager  = require('./game/GameManager');
const ActionRouter = require('./game/ActionRouter');
const PlayerProfile = require('./models/PlayerProfile');

// ── HTTP + Socket.IO setup ──

const app    = express();
const server = createServer(app);
const io     = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware for JSON
app.use(cors());
app.use(express.json());

// Middleware to pass io instance to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/users', usersRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

// ── Service instances (populated in startServer) ──

let gameManager;
let actionRouter;
let unifiedMatchmaking;
let roomService;
let broadcaster;
let coordinator;

// ── Connection handling ──

io.on('connection', socket => {
  // User authentication: join user-specific room for notifications and store userId
  socket.on('authenticate', (userId) => {
    console.log(`[Socket] authenticate received: userId = ${userId}, socket.id = ${socket.id}`);
    if (userId) {
      socket.userId = userId; // Store userId on socket for matchmaking
      socket.join(`user:${userId}`);
      console.log(`[Socket] User ${userId} joined notification room, socket.userId now = ${socket.userId}`);
    }
  });

  // Leave user room on disconnect
  socket.on('disconnecting', () => {
    // Socket automatically leaves rooms on disconnect
  });

  // NOTE: Do NOT auto-add players to queues on connection.
  // Players must explicitly join a queue via join-two-hands-queue, join-party-queue, etc.
  // The previous auto-add to 'two-hands' was causing issues with other game modes.

  // Two-Hands Matchmaking: add player to two-hands queue; start 2-player game when ready
  socket.on('join-two-hands-queue', async () => {
    // Remove from matchmaking queues if present
    unifiedMatchmaking.socketGameMap.delete(socket.id);
    unifiedMatchmaking.waitingQueues['three-hands'] = unifiedMatchmaking.waitingQueues['three-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues['four-hands'] = unifiedMatchmaking.waitingQueues['four-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.party = unifiedMatchmaking.waitingQueues.party.filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.freeforall = unifiedMatchmaking.waitingQueues.freeforall.filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.tournament = unifiedMatchmaking.waitingQueues.tournament?.filter(s => s.id !== socket.id) || [];
    
    // Use unified matchmaking for 2-player games (pass userId if authenticated)
    const result = unifiedMatchmaking.addToQueue(socket, 'two-hands', socket.userId);
    if (result) {
      await broadcaster.broadcastGameStart(result);
    } else {
      // Broadcast to ALL waiting players
      broadcastTwoHandsWaiting(io);
    }
  });

  // Party Matchmaking: add player to party queue; start 4-player game when ready
  socket.on('join-party-queue', async () => {
    // Remove from matchmaking queues if present
    unifiedMatchmaking.socketGameMap.delete(socket.id);
    unifiedMatchmaking.waitingQueues['two-hands'] = unifiedMatchmaking.waitingQueues['two-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues['three-hands'] = unifiedMatchmaking.waitingQueues['three-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.tournament = unifiedMatchmaking.waitingQueues.tournament?.filter(s => s.id !== socket.id) || [];
    
    const partyResult = unifiedMatchmaking.addToQueue(socket, 'party', socket.userId);
    if (partyResult) {
      await broadcaster.broadcastPartyGameStart(partyResult);
    } else {
      // Broadcast to ALL waiting players (not just the joining player)
      broadcastPartyWaiting(io);
    }
  });

  // Three-Hands Matchmaking: add player to three-hands queue; start 3-player game when ready
  socket.on('join-three-hands-queue', async () => {
    console.log(`[Socket] join-three-hands-queue: socket.userId = ${socket.userId}, socket.id = ${socket.id}`);
    
    // Remove from matchmaking queues if present
    unifiedMatchmaking.socketGameMap.delete(socket.id);
    unifiedMatchmaking.waitingQueues['two-hands'] = unifiedMatchmaking.waitingQueues['two-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues['four-hands'] = unifiedMatchmaking.waitingQueues['four-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.party = unifiedMatchmaking.waitingQueues.party.filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.tournament = unifiedMatchmaking.waitingQueues.tournament?.filter(s => s.id !== socket.id) || [];
    
    // Use unified matchmaking for 3-player games
    const result = unifiedMatchmaking.addToQueue(socket, 'three-hands', socket.userId);
    console.log(`[Socket] addToQueue result:`, result ? 'game started' : 'waiting for more players');
    if (result) {
      await broadcaster.broadcastThreeHandsGameStart(result);
    } else {
      // Broadcast to ALL waiting players
      broadcastThreeHandsWaiting(io);
    }
  });

  // Four-Hands Matchmaking: add player to four-hands queue; start 4-player game when ready
  socket.on('join-four-hands-queue', async () => {
    // Remove from matchmaking queues if present
    unifiedMatchmaking.socketGameMap.delete(socket.id);
    unifiedMatchmaking.waitingQueues['two-hands'] = unifiedMatchmaking.waitingQueues['two-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues['three-hands'] = unifiedMatchmaking.waitingQueues['three-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.party = unifiedMatchmaking.waitingQueues.party.filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.freeforall = unifiedMatchmaking.waitingQueues.freeforall.filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.tournament = unifiedMatchmaking.waitingQueues.tournament?.filter(s => s.id !== socket.id) || [];
    
    // Use unified matchmaking for 4-player free-for-all games
    const result = unifiedMatchmaking.addToQueue(socket, 'four-hands', socket.userId);
    if (result) {
      await broadcaster.broadcastFourHandsGameStart(result);
    } else {
      // Broadcast to ALL waiting players
      broadcastFourHandsWaiting(io);
    }
  });

  // Free-For-All Matchmaking: add player to freeforall queue; start 4-player game when ready
  socket.on('join-freeforall-queue', async () => {
    // Remove from matchmaking queues if present
    unifiedMatchmaking.socketGameMap.delete(socket.id);
    unifiedMatchmaking.waitingQueues['two-hands'] = unifiedMatchmaking.waitingQueues['two-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues['three-hands'] = unifiedMatchmaking.waitingQueues['three-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues['four-hands'] = unifiedMatchmaking.waitingQueues['four-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.party = unifiedMatchmaking.waitingQueues.party.filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.tournament = unifiedMatchmaking.waitingQueues.tournament?.filter(s => s.id !== socket.id) || [];
    
    // Use unified matchmaking for free-for-all games
    const result = unifiedMatchmaking.addToQueue(socket, 'freeforall', socket.userId);
    if (result) {
      await broadcaster.broadcastFreeForAllGameStart(result);
    } else {
      // Broadcast to ALL waiting players
      broadcastFreeForAllWaiting(io);
    }
  });

  // Tournament Matchmaking: add player to tournament queue; start 4-player knockout game when ready
  socket.on('join-tournament-queue', async () => {
    console.log(`[Socket] join-tournament-queue received from socket ${socket.id}`);
    
    // Remove from matchmaking queues if present
    unifiedMatchmaking.socketGameMap.delete(socket.id);
    unifiedMatchmaking.waitingQueues['two-hands'] = unifiedMatchmaking.waitingQueues['two-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues['three-hands'] = unifiedMatchmaking.waitingQueues['three-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues['four-hands'] = unifiedMatchmaking.waitingQueues['four-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.party = unifiedMatchmaking.waitingQueues.party.filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.freeforall = unifiedMatchmaking.waitingQueues.freeforall.filter(s => s.id !== socket.id);
    
    // Ensure tournament queue exists
    if (!unifiedMatchmaking.waitingQueues.tournament) {
      unifiedMatchmaking.waitingQueues.tournament = [];
    }
    
    // Use unified matchmaking for tournament games
    const result = unifiedMatchmaking.addToQueue(socket, 'tournament', socket.userId);
    if (result) {
      console.log(`[Socket] Tournament game created with ${result.players.length} players`);
      await broadcaster.broadcastTournamentGameStart(result);
    } else {
      // Broadcast to ALL waiting players
      console.log(`[Socket] Not enough players for tournament, broadcasting wait status`);
      broadcastTournamentWaiting(io);
    }
  });

  // Private Room: create room
  socket.on('create-room', (data) => {
    // Remove from matchmaking queues if present
    unifiedMatchmaking.socketGameMap.delete(socket.id);
    unifiedMatchmaking.waitingQueues['two-hands'] = unifiedMatchmaking.waitingQueues['two-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues['three-hands'] = unifiedMatchmaking.waitingQueues['three-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues['four-hands'] = unifiedMatchmaking.waitingQueues['four-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.party = unifiedMatchmaking.waitingQueues.party.filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.freeforall = unifiedMatchmaking.waitingQueues.freeforall.filter(s => s.id !== socket.id);
    
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
    unifiedMatchmaking.socketGameMap.delete(socket.id);
    unifiedMatchmaking.waitingQueues['two-hands'] = unifiedMatchmaking.waitingQueues['two-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues['three-hands'] = unifiedMatchmaking.waitingQueues['three-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues['four-hands'] = unifiedMatchmaking.waitingQueues['four-hands'].filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.party = unifiedMatchmaking.waitingQueues.party.filter(s => s.id !== socket.id);
    unifiedMatchmaking.waitingQueues.freeforall = unifiedMatchmaking.waitingQueues.freeforall.filter(s => s.id !== socket.id);
    
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
        const room = result.room;
        room.players.forEach(player => {
          const playerSocket = io.sockets.sockets.get(player.socketId);
          if (playerSocket) {
            playerSocket.emit('room-updated', { room });
          }
        });
      }
    }
  });

  // ── Private Room: get room status ───────────────────────────────────────
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
    // Check unified matchmaking for any game type
    const socketInfo = unifiedMatchmaking.socketGameMap.get(socket.id);
    let gameId = null;
    let gameType = null;
    
    if (socketInfo) {
      gameId = socketInfo.gameId;
      gameType = socketInfo.gameType;
    }
    
    // Also check if waiting in any queue
    if (!gameId) {
      if (unifiedMatchmaking.waitingQueues['two-hands'].some(s => s.id === socket.id)) {
        socket.emit('error', { message: 'Waiting for two-hands game to start' });
        return;
      }
      if (unifiedMatchmaking.waitingQueues.party.some(s => s.id === socket.id)) {
        socket.emit('error', { message: 'Waiting for party game to start' });
        return;
      }
      if (unifiedMatchmaking.waitingQueues['three-hands'].some(s => s.id === socket.id)) {
        socket.emit('error', { message: 'Waiting for three-hands game to start' });
        return;
      }
      if (unifiedMatchmaking.waitingQueues['four-hands'].some(s => s.id === socket.id)) {
        socket.emit('error', { message: 'Waiting for four-hands game to start' });
        return;
      }
      if (unifiedMatchmaking.waitingQueues.freeforall.some(s => s.id === socket.id)) {
        socket.emit('error', { message: 'Waiting for free-for-all game to start' });
        return;
      }
    }
    
    if (!gameId) { socket.emit('error', { message: 'Not in a game' }); return; }
    const state = gameManager.getGameState(gameId);
    if (!state)  { socket.emit('error', { message: 'Game not found' }); return; }
    socket.emit('game-state-sync', { gameState: state, serverTime: Date.now() });
  });

  // ── Lobby status request (for polling) ───────────────────────────────────────
  socket.on('request-lobby-status', async () => {
    // Check all queues - include player info
    
    // Party queue
    const partyQueue = unifiedMatchmaking.waitingQueues.party || [];
    const partyWaitingCount = partyQueue.length;
    const partyUserIds = partyQueue.map(entry => entry.userId).filter(Boolean);
    const partyPlayers = await PlayerProfile.getPlayerInfos(partyUserIds);
    socket.emit('party-waiting', { 
      playersJoined: partyWaitingCount,
      players: partyPlayers
    });
    
    // Three-hands queue
    const threeHandsQueue = unifiedMatchmaking.waitingQueues['three-hands'] || [];
    const threeHandsWaitingCount = threeHandsQueue.length;
    if (threeHandsWaitingCount > 0) {
      const threeHandsUserIds = threeHandsQueue.map(entry => entry.userId).filter(Boolean);
      const threeHandsPlayers = await PlayerProfile.getPlayerInfos(threeHandsUserIds);
      socket.emit('three-hands-waiting', { 
        playersJoined: threeHandsWaitingCount,
        players: threeHandsPlayers
      });
    }
    
    // Four-hands queue
    const fourHandsQueue = unifiedMatchmaking.waitingQueues['four-hands'] || [];
    const fourHandsWaitingCount = fourHandsQueue.length;
    if (fourHandsWaitingCount > 0) {
      const fourHandsUserIds = fourHandsQueue.map(entry => entry.userId).filter(Boolean);
      const fourHandsPlayers = await PlayerProfile.getPlayerInfos(fourHandsUserIds);
      socket.emit('four-hands-waiting', { 
        playersJoined: fourHandsWaitingCount,
        players: fourHandsPlayers
      });
    }
    
    // Free-for-all queue
    const freeForAllQueue = unifiedMatchmaking.waitingQueues.freeforall || [];
    const freeForAllWaitingCount = freeForAllQueue.length;
    if (freeForAllWaitingCount > 0) {
      const freeForAllUserIds = freeForAllQueue.map(entry => entry.userId).filter(Boolean);
      const freeForAllPlayers = await PlayerProfile.getPlayerInfos(freeForAllUserIds);
      socket.emit('freeforall-waiting', { 
        playersJoined: freeForAllWaitingCount,
        players: freeForAllPlayers
      });
    }
    
    // Two-hands queue
    const twoHandsQueue = unifiedMatchmaking.waitingQueues['two-hands'] || [];
    const twoHandsWaitingCount = twoHandsQueue.length;
    if (twoHandsWaitingCount > 0) {
      const twoHandsUserIds = twoHandsQueue.map(entry => entry.userId).filter(Boolean);
      const twoHandsPlayers = await PlayerProfile.getPlayerInfos(twoHandsUserIds);
      socket.emit('duel-waiting', { 
        playersJoined: twoHandsWaitingCount,
        players: twoHandsPlayers
      });
    }
    
    // Tournament queue
    const tournamentQueue = unifiedMatchmaking.waitingQueues.tournament || [];
    const tournamentWaitingCount = tournamentQueue.length;
    if (tournamentWaitingCount > 0) {
      const tournamentUserIds = tournamentQueue.map(entry => entry.userId).filter(Boolean);
      const tournamentPlayers = await PlayerProfile.getPlayerInfos(tournamentUserIds);
      socket.emit('tournament-waiting', { 
        playersJoined: tournamentWaitingCount,
        players: tournamentPlayers
      });
    }
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
    
    // Handle unified matchmaking disconnect
    const result = unifiedMatchmaking.handleDisconnection(socket);
    if (result) {
      broadcaster.broadcastDisconnection(result.gameId, socket.id);
      if (result.remainingSockets.length < 1) {
        gameManager.endGame(result.gameId);
      }
    }
  });
});

// Helper functions for broadcasting waiting counts with player info
async function broadcastTwoHandsWaiting(io) {
  const count = unifiedMatchmaking.getWaitingCount('two-hands');
  console.log(`[UnifiedMatchmaking] Broadcasting two-hands-waiting: ${count} players`);
  
  // Get player info for all waiting players
  const queue = unifiedMatchmaking.waitingQueues['two-hands'];
  const userIds = queue.map(entry => entry.userId).filter(Boolean);
  const players = await PlayerProfile.getPlayerInfos(userIds);
  
  queue.forEach(entry => {
    // Include player info for all players in the queue
    entry.socket.emit('duel-waiting', { 
      playersJoined: count,
      players: players
    });
  });
}

async function broadcastPartyWaiting(io) {
  const count = unifiedMatchmaking.getWaitingCount('party');
  
  // Get player info for all waiting players
  const queue = unifiedMatchmaking.waitingQueues.party;
  const userIds = queue.map(entry => entry.userId).filter(Boolean);
  const players = await PlayerProfile.getPlayerInfos(userIds);
  
  queue.forEach(entry => {
    entry.socket.emit('party-waiting', { 
      playersJoined: count,
      players: players
    });
  });
}

async function broadcastThreeHandsWaiting(io) {
  const count = unifiedMatchmaking.getWaitingCount('three-hands');
  console.log(`[UnifiedMatchmaking] Broadcasting three-hands-waiting: ${count} players`);
  
  // Get player info for all waiting players
  const queue = unifiedMatchmaking.waitingQueues['three-hands'];
  const userIds = queue.map(entry => entry.userId).filter(Boolean);
  console.log(`[UnifiedMatchmaking] UserIds in queue:`, userIds);
  const players = await PlayerProfile.getPlayerInfos(userIds);
  console.log(`[UnifiedMatchmaking] PlayerInfos:`, JSON.stringify(players));
  
  queue.forEach(entry => {
    entry.socket.emit('three-hands-waiting', { 
      playersJoined: count,
      players: players
    });
  });
}

async function broadcastFourHandsWaiting(io) {
  const count = unifiedMatchmaking.getWaitingCount('four-hands');
  console.log(`[UnifiedMatchmaking] Broadcasting four-hands-waiting: ${count} players`);
  
  // Get player info for all waiting players
  const queue = unifiedMatchmaking.waitingQueues['four-hands'];
  const userIds = queue.map(entry => entry.userId).filter(Boolean);
  const players = await PlayerProfile.getPlayerInfos(userIds);
  
  queue.forEach(entry => {
    entry.socket.emit('four-hands-waiting', { 
      playersJoined: count,
      players: players
    });
  });
}

async function broadcastFreeForAllWaiting(io) {
  const count = unifiedMatchmaking.getWaitingCount('freeforall');
  console.log(`[UnifiedMatchmaking] Broadcasting free-for-all-waiting: ${count} players`);
  
  // Get player info for all waiting players
  const queue = unifiedMatchmaking.waitingQueues.freeforall;
  const userIds = queue.map(entry => entry.userId).filter(Boolean);
  const players = await PlayerProfile.getPlayerInfos(userIds);
  
  queue.forEach(entry => {
    entry.socket.emit('freeforall-waiting', { 
      playersJoined: count,
      players: players
    });
  });
}

async function broadcastTournamentWaiting(io) {
  const count = unifiedMatchmaking.getWaitingCount('tournament');
  console.log(`[UnifiedMatchmaking] Broadcasting tournament-waiting: ${count} players`);
  
  // Ensure tournament queue exists
  if (!unifiedMatchmaking.waitingQueues.tournament) {
    unifiedMatchmaking.waitingQueues.tournament = [];
  }
  
  // Get player info for all waiting players
  const queue = unifiedMatchmaking.waitingQueues.tournament;
  const userIds = queue.map(entry => entry.userId).filter(Boolean);
  const players = await PlayerProfile.getPlayerInfos(userIds);
  
  queue.forEach(entry => {
    entry.socket.emit('tournament-waiting', { 
      playersJoined: count,
      players: players
    });
  });
}

// ── Server control ──

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
  unifiedMatchmaking = new UnifiedMatchmakingService(gameManager, io);
  roomService   = new RoomService(gameManager, unifiedMatchmaking, broadcaster, io);
  broadcaster  = new BroadcasterService(unifiedMatchmaking, gameManager, io);
  coordinator   = new GameCoordinatorService(gameManager, actionRouter, unifiedMatchmaking, broadcaster);

  server.listen(PORT, '0.0.0.0', () => {
    const lanIp = getLocalIPAddress();
    console.log(`[Server] ═══════════════════════════════════════`);
    console.log(`[Server] 🎮 Casino Game Server Started!`);
    console.log(`[Server] ═══════════════════════════════════════`);
    console.log(`[Server] Local:   http://localhost:${PORT}`);
    if (lanIp) {
      console.log(`[Server] LAN IP:  http://${lanIp}:${PORT}`);
      console.log(`[Server] ───────────────────────────────────────`);
      console.log(`[Server] Share this IP with friends on your network!`);
    }
    console.log(`[Server] ═══════════════════════════════════════`);
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
