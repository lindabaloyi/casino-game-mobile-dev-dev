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

  // Handle room mode connections - don't auto-join queues, just authenticate
  socket.on('room-mode-connected', (data) => {
    console.log(`[Socket] room-mode-connected: socket.id = ${socket.id}, mode = ${data?.mode}`);
    // Just store the mode for reference - actual room joining happens separately
    socket.roomMode = data?.mode;
  });

  // Two-Hands Matchmaking: add player to two-hands queue; start 2-player game when ready
  socket.on('join-two-hands-queue', async () => {
    console.log(`[Socket] join-two-hands-queue received from ${socket.id}, userId=${socket.userId}, authenticated=${!!socket.userId}`);
    
    // Check if authenticated before joining
    if (!socket.userId) {
      console.log(`[Socket] ⚠️ User not authenticated, rejecting join-two-hands-queue`);
      socket.emit('error', { message: 'Please authenticate before joining queue' });
      return;
    }
    
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
    console.log(`[Socket] join-four-hands-queue received from ${socket.id}, userId=${socket.userId}, authenticated=${!!socket.userId}`);
    
    // Check if authenticated before joining - but allow unauthenticated for testing
    // In production, uncomment the authentication check below
    /*
    if (!socket.userId) {
      console.log(`[Socket] ⚠️ User not authenticated, rejecting join-four-hands-queue`);
      socket.emit('error', { message: 'Please authenticate before joining queue' });
      return;
    }
    */
    
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
  socket.on('join-room', async (data) => {
    console.log(`[Socket] join-room received from ${socket.id}, roomCode=${data.roomCode}`);
    
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
        
        // AUTO-START: If room is now full, start the game automatically
        if (room.status === 'ready') {
          console.log(`[Socket] Room ${room.code} is full (${room.playerCount}/${room.maxPlayers}) - auto-starting game`);
          const startResult = roomService.startRoomGame(room.code, io);
          console.log(`[Socket] Auto-start result:`, JSON.stringify(startResult));
          if (!startResult.success) {
            console.log(`[Socket] ❌ Auto-start failed: ${startResult.error}`);
            // Notify all players in the room
            room.players.forEach(player => {
              const playerSocket = io.sockets.sockets.get(player.socketId);
              if (playerSocket) {
                playerSocket.emit('room-error', { message: `Failed to start game: ${startResult.error}` });
              }
            });
          } else {
            console.log(`[Socket] ✅ Game auto-started successfully, gameId=${startResult.gameId}`);
          }
        }
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
    console.log(`[Socket] start-room-game received from ${socket.id}, userId=${socket.userId}`);
    
    const room = roomService.getRoomBySocket(socket.id);
    console.log(`[Socket] Room lookup for socket ${socket.id}:`, room ? `found room ${room.code}, mode=${room.gameMode}, players=${room.playerCount}` : 'NOT FOUND');
    
    if (!room) {
      console.log(`[Socket] ❌ start-room-game failed: not in a room`);
      socket.emit('room-error', { message: 'Not in a room' });
      return;
    }
    
    if (room.hostSocketId !== socket.id) {
      console.log(`[Socket] ❌ start-room-game failed: not host (host=${room.hostSocketId}, requester=${socket.id})`);
      socket.emit('room-error', { message: 'Only the host can start the game' });
      return;
    }
    
    console.log(`[Socket] ✅ Calling RoomService.startRoomGame for room ${room.code}`);
    const result = roomService.startRoomGame(room.code, io);
    console.log(`[Socket] startRoomGame result:`, JSON.stringify(result));
    
    if (!result.success) {
      console.log(`[Socket] ❌ start-room-game failed: ${result.error}`);
      socket.emit('room-error', { message: result.error });
    } else {
      console.log(`[Socket] ✅ Room game started successfully, gameId=${result.gameId}`);
    }
  });

  // ── Game events ──────────────────────────────────────────────────────────────
  socket.on('game-action', data => coordinator.handleGameAction(socket, data));
  socket.on('start-next-round', () => coordinator.handleStartNextRound(socket));

  // ── Drag events (for real-time shared state) ───────────────────────────────
  socket.on('drag-start', (data) => {
    console.log(`[Socket] drag-start received from socket ${socket.id}:`, data.card?.rank, data.card?.suit);
    coordinator.handleDragStart(socket, data);
  });
  socket.on('drag-move', (data) => coordinator.handleDragMove(socket, data));
  socket.on('drag-end', (data) => {
    console.log(`[Socket] drag-end received from socket ${socket.id}:`, data.card?.rank, data.card?.suit, 'outcome:', data.outcome);
    coordinator.handleDragEnd(socket, data);
  });

  // ── State sync (client can request the current state at any time) ─────────
  socket.on('request-sync', () => {
    console.log(`[Socket] request-sync received from ${socket.id}`);
    // Check unified matchmaking for any game type
    const socketInfo = unifiedMatchmaking.socketGameMap.get(socket.id);
    console.log(`[Socket] socketGameMap entry for ${socket.id}:`, socketInfo ? JSON.stringify(socketInfo) : 'NOT FOUND');
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
    // Only emit events for queues the user is actually in
    // This prevents confusing log spam from queues the user hasn't joined
    
    // Two-hands queue
    const twoHandsQueue = unifiedMatchmaking.waitingQueues['two-hands'] || [];
    if (twoHandsQueue.some(entry => entry.socket.id === socket.id)) {
      const twoHandsUserIds = twoHandsQueue.map(entry => entry.userId).filter(Boolean);
      const twoHandsPlayers = await PlayerProfile.getPlayerInfos(twoHandsUserIds);
      const roomCode = unifiedMatchmaking.getQueueRoomCode('two-hands');
      socket.emit('duel-waiting', { 
        playersJoined: twoHandsQueue.length,
        players: twoHandsPlayers,
        roomCode: roomCode,
      });
    }
    
    // Three-hands queue
    const threeHandsQueue = unifiedMatchmaking.waitingQueues['three-hands'] || [];
    if (threeHandsQueue.some(entry => entry.socket.id === socket.id)) {
      const threeHandsUserIds = threeHandsQueue.map(entry => entry.userId).filter(Boolean);
      const threeHandsPlayers = await PlayerProfile.getPlayerInfos(threeHandsUserIds);
      const roomCode = unifiedMatchmaking.getQueueRoomCode('three-hands');
      socket.emit('three-hands-waiting', { 
        playersJoined: threeHandsQueue.length,
        players: threeHandsPlayers,
        roomCode: roomCode,
      });
    }
    
    // Party queue
    const partyQueue = unifiedMatchmaking.waitingQueues.party || [];
    if (partyQueue.some(entry => entry.socket.id === socket.id)) {
      const partyUserIds = partyQueue.map(entry => entry.userId).filter(Boolean);
      const partyPlayers = await PlayerProfile.getPlayerInfos(partyUserIds);
      const roomCode = unifiedMatchmaking.getQueueRoomCode('party');
      socket.emit('party-waiting', { 
        playersJoined: partyQueue.length,
        players: partyPlayers,
        roomCode: roomCode,
      });
    }
    
    // Four-hands queue
    const fourHandsQueue = unifiedMatchmaking.waitingQueues['four-hands'] || [];
    if (fourHandsQueue.some(entry => entry.socket.id === socket.id)) {
      const fourHandsUserIds = fourHandsQueue.map(entry => entry.userId).filter(Boolean);
      const fourHandsPlayers = await PlayerProfile.getPlayerInfos(fourHandsUserIds);
      
      // CRITICAL: Create entries for ALL players in queue
      const allFourHandsPlayers = fourHandsQueue.map((entry, index) => {
        const playerInfo = fourHandsPlayers.find(p => p.userId === entry.userId);
        if (playerInfo) return playerInfo;
        return {
          userId: entry.userId || `guest-${index + 1}`,
          username: entry.userId ? 'Unknown' : `Player ${index + 1}`,
          avatar: 'lion',
          displayName: entry.userId ? 'Unknown' : `Player ${index + 1}`
        };
      });
      
      const roomCode = unifiedMatchmaking.getQueueRoomCode('four-hands');
      socket.emit('four-hands-waiting', { 
        playersJoined: fourHandsQueue.length,
        players: allFourHandsPlayers,
        roomCode: roomCode,
      });
    }
    
    // Free-for-all queue
    const freeForAllQueue = unifiedMatchmaking.waitingQueues.freeforall || [];
    if (freeForAllQueue.some(entry => entry.socket.id === socket.id)) {
      const freeForAllUserIds = freeForAllQueue.map(entry => entry.userId).filter(Boolean);
      const freeForAllPlayers = await PlayerProfile.getPlayerInfos(freeForAllUserIds);
      const roomCode = unifiedMatchmaking.getQueueRoomCode('freeforall');
      socket.emit('freeforall-waiting', { 
        playersJoined: freeForAllQueue.length,
        players: freeForAllPlayers,
        roomCode: roomCode,
      });
    }
    
    // Tournament queue
    const tournamentQueue = unifiedMatchmaking.waitingQueues.tournament || [];
    if (tournamentQueue.some(entry => entry.socket.id === socket.id)) {
      const tournamentUserIds = tournamentQueue.map(entry => entry.userId).filter(Boolean);
      const tournamentPlayers = await PlayerProfile.getPlayerInfos(tournamentUserIds);
      const roomCode = unifiedMatchmaking.getQueueRoomCode('tournament');
      socket.emit('tournament-waiting', { 
        playersJoined: tournamentQueue.length,
        players: tournamentPlayers,
        roomCode: roomCode,
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

// Helper functions for broadcasting waiting counts with player info and room code
async function broadcastTwoHandsWaiting(io) {
  const count = unifiedMatchmaking.getWaitingCount('two-hands');
  const roomCode = unifiedMatchmaking.getQueueRoomCode('two-hands');
  console.log(`[UnifiedMatchmaking] Broadcasting two-hands-waiting: ${count} players, roomCode=${roomCode}`);
  
  // Get player info for all waiting players
  const queue = unifiedMatchmaking.waitingQueues['two-hands'];
  const userIds = queue.map(entry => entry.userId).filter(Boolean);
  console.log(`[UnifiedMatchmaking] two-hands queue userIds:`, userIds);
  const players = await PlayerProfile.getPlayerInfos(userIds);
  console.log(`[UnifiedMatchmaking] two-hands playerInfos:`, JSON.stringify(players));
  
  queue.forEach(entry => {
    // Include player info for all players in the queue
    entry.socket.emit('duel-waiting', { 
      playersJoined: count,
      players: players,
      roomCode: roomCode,
    });
  });
}

async function broadcastPartyWaiting(io) {
  const count = unifiedMatchmaking.getWaitingCount('party');
  const roomCode = unifiedMatchmaking.getQueueRoomCode('party');
  console.log(`[UnifiedMatchmaking] Broadcasting party-waiting: ${count} players, roomCode=${roomCode}`);
  
  // Get player info for all waiting players
  const queue = unifiedMatchmaking.waitingQueues.party;
  const userIds = queue.map(entry => entry.userId).filter(Boolean);
  console.log(`[UnifiedMatchmaking] party queue userIds:`, userIds);
  const players = await PlayerProfile.getPlayerInfos(userIds);
  console.log(`[UnifiedMatchmaking] party playerInfos:`, JSON.stringify(players));
  
  queue.forEach(entry => {
    entry.socket.emit('party-waiting', { 
      playersJoined: count,
      players: players,
      roomCode: roomCode,
    });
  });
}

async function broadcastThreeHandsWaiting(io) {
  const count = unifiedMatchmaking.getWaitingCount('three-hands');
  const roomCode = unifiedMatchmaking.getQueueRoomCode('three-hands');
  console.log(`[UnifiedMatchmaking] Broadcasting three-hands-waiting: ${count} players, roomCode=${roomCode}`);
  
  // Get player info for all waiting players
  const queue = unifiedMatchmaking.waitingQueues['three-hands'];
  const userIds = queue.map(entry => entry.userId).filter(Boolean);
  console.log(`[UnifiedMatchmaking] UserIds in queue:`, userIds);
  const players = await PlayerProfile.getPlayerInfos(userIds);
  console.log(`[UnifiedMatchmaking] PlayerInfos:`, JSON.stringify(players));
  
  queue.forEach(entry => {
    entry.socket.emit('three-hands-waiting', { 
      playersJoined: count,
      players: players,
      roomCode: roomCode,
    });
  });
}

async function broadcastFourHandsWaiting(io) {
  const count = unifiedMatchmaking.getWaitingCount('four-hands');
  const roomCode = unifiedMatchmaking.getQueueRoomCode('four-hands');
  console.log(`[UnifiedMatchmaking] Broadcasting four-hands-waiting: ${count} players, roomCode=${roomCode}`);
  
  // Get player info for all waiting players
  const queue = unifiedMatchmaking.waitingQueues['four-hands'];
  const userIds = queue.map(entry => entry.userId).filter(Boolean);
  console.log(`[UnifiedMatchmaking] four-hands queue userIds:`, userIds);
  const players = await PlayerProfile.getPlayerInfos(userIds);
  console.log(`[UnifiedMatchmaking] four-hands playerInfos:`, JSON.stringify(players));
  
  // CRITICAL: Create entries for ALL players in queue, not just authenticated ones
  // This ensures the client sees all players in the lobby
  const allPlayers = queue.map((entry, index) => {
    const playerInfo = players.find(p => p.userId === entry.userId);
    if (playerInfo) return playerInfo;
    // Unauthenticated player - create placeholder
    return {
      userId: entry.userId || `guest-${index + 1}`,
      username: entry.userId ? 'Unknown' : `Player ${index + 1}`,
      avatar: 'lion',
      displayName: entry.userId ? 'Unknown' : `Player ${index + 1}`
    };
  });
  console.log(`[UnifiedMatchmaking] four-hands ALL players (including guests):`, JSON.stringify(allPlayers));
  
  queue.forEach(entry => {
    entry.socket.emit('four-hands-waiting', { 
      playersJoined: count,
      players: allPlayers,
      roomCode: roomCode,
    });
  });
}

async function broadcastFreeForAllWaiting(io) {
  const count = unifiedMatchmaking.getWaitingCount('freeforall');
  const roomCode = unifiedMatchmaking.getQueueRoomCode('freeforall');
  console.log(`[UnifiedMatchmaking] Broadcasting free-for-all-waiting: ${count} players, roomCode=${roomCode}`);
  
  // Get player info for all waiting players
  const queue = unifiedMatchmaking.waitingQueues.freeforall;
  const userIds = queue.map(entry => entry.userId).filter(Boolean);
  const players = await PlayerProfile.getPlayerInfos(userIds);
  
  queue.forEach(entry => {
    entry.socket.emit('freeforall-waiting', { 
      playersJoined: count,
      players: players,
      roomCode: roomCode,
    });
  });
}

async function broadcastTournamentWaiting(io) {
  const count = unifiedMatchmaking.getWaitingCount('tournament');
  const roomCode = unifiedMatchmaking.getQueueRoomCode('tournament');
  console.log(`[UnifiedMatchmaking] Broadcasting tournament-waiting: ${count} players, roomCode=${roomCode}`);
  
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
      players: players,
      roomCode: roomCode,
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
