/**
 * handlers/index.js
 * Exports function to attach all socket handlers to a socket connection.
 */

const PlayerProfile = require('../../models/PlayerProfile');
const { createBroadcastHelpers } = require('./broadcast');

function attachSocketHandlers(socket, services) {
  const { unifiedMatchmaking, roomService, gameManager, broadcaster, coordinator } = services;
  const {
    broadcastTwoHandsWaiting,
    broadcastPartyWaiting,
    broadcastThreeHandsWaiting,
    broadcastFourHandsWaiting,
    broadcastFreeForAllWaiting,
    broadcastTournamentWaiting,
  } = createBroadcastHelpers(unifiedMatchmaking, services.io);

  // ── Authentication ─────────────────────────────────────────────────────────
  socket.on('authenticate', (userId) => {
    console.log(`[Socket] authenticate received: userId = ${userId}, socket.id = ${socket.id}`);
    if (userId) {
      socket.userId = userId;
      socket.join(`user:${userId}`);
      console.log(`[Socket] User ${userId} joined notification room, socket.userId now = ${socket.userId}`);
    }
  });

  socket.on('disconnecting', () => { /* Socket auto-leaves rooms on disconnect */ });

  socket.on('room-mode-connected', (data) => {
    console.log(`[Socket] room-mode-connected: socket.id = ${socket.id}, mode = ${data?.mode}`);
    socket.roomMode = data?.mode;
  });

  // ── Helper: Remove socket from all queues ─────────────────────────────
  const removeFromAllQueues = () => {
    unifiedMatchmaking.socketGameMap.delete(socket.id);
    for (const key of Object.keys(unifiedMatchmaking.waitingQueues)) {
      unifiedMatchmaking.waitingQueues[key] = unifiedMatchmaking.waitingQueues[key].filter(s => s.id !== socket.id);
    }
  };

  // ── Matchmaking Queue Handlers ────────────────────────────────────────
  socket.on('join-two-hands-queue', async () => {
    console.log(`[Socket] join-two-hands-queue received from ${socket.id}, userId=${socket.userId}`);
    
    if (!socket.userId) {
      socket.emit('error', { message: 'Please authenticate before joining queue' });
      return;
    }
    
    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'two-hands', socket.userId);
    if (result) {
      await broadcaster.broadcastGameStart(result);
    } else {
      await broadcastTwoHandsWaiting();
    }
  });

  socket.on('join-party-queue', async () => {
    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'party', socket.userId);
    if (result) {
      await broadcaster.broadcastPartyGameStart(result);
    } else {
      await broadcastPartyWaiting();
    }
  });

  socket.on('join-three-hands-queue', async () => {
    console.log(`[Socket] join-three-hands-queue:socket.id = ${socket.id}`);
    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'three-hands', socket.userId);
    if (result) {
      await broadcaster.broadcastThreeHandsGameStart(result);
    } else {
      await broadcastThreeHandsWaiting();
    }
  });

  socket.on('join-four-hands-queue', async () => {
    console.log(`[Socket] join-four-hands-queue:socket.id = ${socket.id}`);
    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'four-hands', socket.userId);
    if (result) {
      await broadcaster.broadcastFourHandsGameStart(result);
    } else {
      await broadcastFourHandsWaiting();
    }
  });

  socket.on('join-freeforall-queue', async () => {
    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'freeforall', socket.userId);
    if (result) {
      await broadcaster.broadcastFreeForAllGameStart(result);
    } else {
      await broadcastFreeForAllWaiting();
    }
  });

  socket.on('join-tournament-queue', async () => {
    console.log(`[Socket] join-tournament-queue:socket.id = ${socket.id}`);
    if (!unifiedMatchmaking.waitingQueues.tournament) {
      unifiedMatchmaking.waitingQueues.tournament = [];
    }
    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'tournament', socket.userId);
    if (result) {
      await broadcaster.broadcastTournamentGameStart(result);
    } else {
      await broadcastTournamentWaiting();
    }
  });

  // ── Room Management Handlers ──────────────────────────────────────────
  socket.on('create-room', (data) => {
    removeFromAllQueues();
    const { gameMode, maxPlayers } = data;
    const result = roomService.createRoom(socket, gameMode, maxPlayers);
    if (result.roomCode) {
      socket.emit('room-created', { roomCode: result.roomCode, room: result.room });
    }
  });

  socket.on('join-room', async (data) => {
    console.log(`[Socket] join-room:${socket.id} code=${data.roomCode}`);
    removeFromAllQueues();
    
    const result = roomService.joinRoom(socket, data.roomCode);
    if (result.success) {
      socket.emit('room-joined', { room: result.room });
      
      const room = roomService.getRoomStatus(data.roomCode);
      if (room) {
        room.players.forEach(player => {
          const pSocket = services.io.sockets.sockets.get(player.socketId);
          if (pSocket && pSocket.id !== socket.id) {
            pSocket.emit('room-updated', { room });
          }
        });
        
        if (room.status === 'ready') {
          console.log(`[Socket] Room ${room.code} full - auto-starting`);
          const startResult = roomService.startRoomGame(room.code, services.io);
          if (!startResult.success) {
            room.players.forEach(player => {
              const pSocket = services.io.sockets.sockets.get(player.socketId);
              if (pSocket) pSocket.emit('room-error', { message: startResult.error });
            });
          } else {
            console.log(`[Socket] Game started:gameId=${startResult.gameId}`);
          }
        }
      }
    } else {
      socket.emit('room-error', { message: result.error });
    }
  });

  socket.on('leave-room', () => {
    const result = roomService.leaveRoom(socket);
    if (result.success) {
      socket.emit('room-left', { success: true });
      if (!result.roomClosed && result.room) {
        result.room.players.forEach(player => {
          const pSocket = services.io.sockets.sockets.get(player.socketId);
          if (pSocket) pSocket.emit('room-updated', { room: result.room });
        });
      }
    }
  });

  socket.on('room-status', (data) => {
    const room = roomService.getRoomStatus(data.roomCode);
    if (room) {
      socket.emit('room-status', { room });
    } else {
      socket.emit('room-error', { message: 'Room not found' });
    }
  });

  socket.on('start-room-game', () => {
    const room = roomService.getRoomBySocket(socket.id);
    if (!room) {
      socket.emit('room-error', { message: 'Not in a room' });
      return;
    }
    if (room.hostSocketId !== socket.id) {
      socket.emit('room-error', { message: 'Only the host can start the game' });
      return;
    }
    const result = roomService.startRoomGame(room.code, services.io);
    if (!result.success) {
      socket.emit('room-error', { message: result.error });
    }
  });

  // ── Game Coordination Handlers ────────────────────────────────────────
  socket.on('game-action', data => coordinator.handleGameAction(socket, data));
  socket.on('start-next-round', () => coordinator.handleStartNextRound(socket));
  socket.on('drag-start', (data) => coordinator.handleDragStart(socket, data));
  socket.on('drag-move', (data) => coordinator.handleDragMove(socket, data));
  socket.on('drag-end', (data) => coordinator.handleDragEnd(socket, data));

  // ── State Sync & Lobby ────────────────────────────────────────────────
  socket.on('request-sync', () => {
    const socketInfo = unifiedMatchmaking.socketGameMap.get(socket.id);
    let gameId = socketInfo?.gameId;
    if (!gameId) {
      socket.emit('error', { message: 'Not in a game' });
      return;
    }
    const state = gameManager.getGameState(gameId);
    if (!state) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    socket.emit('game-state-sync', { gameState: state, serverTime: Date.now() });
  });

  socket.on('request-lobby-status', async () => {
    const queueMap = {
      'two-hands': { event: 'duel-waiting', broadcast: broadcastTwoHandsWaiting },
      'three-hands': { event: 'three-hands-waiting', broadcast: broadcastThreeHandsWaiting },
      'party': { event: 'party-waiting', broadcast: broadcastPartyWaiting },
      'four-hands': { event: 'four-hands-waiting', broadcast: broadcastFourHandsWaiting },
      'freeforall': { event: 'freeforall-waiting', broadcast: broadcastFreeForAllWaiting },
      'tournament': { event: 'tournament-waiting', broadcast: broadcastTournamentWaiting },
    };
    
    for (const [mode, config] of Object.entries(queueMap)) {
      const queue = unifiedMatchmaking.waitingQueues[mode];
      if (queue?.some(entry => entry.socket.id === socket.id)) {
        await config.broadcast();
        break;
      }
    }
  });

  // ── Disconnect Handler ────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const roomResult = roomService.handleDisconnection(socket);
    if (roomResult && !roomResult.gameStarted) {
      const room = roomService.getRoomStatus(roomResult.roomCode);
      if (room?.players.length > 0) {
        room.players.forEach(player => {
          const pSocket = services.io.sockets.sockets.get(player.socketId);
          if (pSocket) pSocket.emit('room-updated', { room });
        });
      }
    }
    
    const result = unifiedMatchmaking.handleDisconnection(socket);
    if (result) {
      broadcaster.broadcastDisconnection(result.gameId, socket.id);
      if (result.remainingSockets.length < 1) {
        gameManager.endGame(result.gameId);
      }
    }
  });
}

module.exports = { attachSocketHandlers };