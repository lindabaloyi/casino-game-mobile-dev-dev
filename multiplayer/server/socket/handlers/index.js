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

      // Confirm authentication to client
      socket.emit('authenticated', { userId });

      // If socket is already in a queue, update the userId
      if (unifiedMatchmaking.isInQueue(socket.id)) {
        unifiedMatchmaking.updateQueuedSocketUserId(socket.id, userId);
      }
    }
  });

  socket.on('disconnecting', () => { /* Socket auto-leaves rooms on disconnect */ });

  socket.on('room-mode-connected', (data) => {
    console.log(`[Socket] room-mode-connected: socket.id = ${socket.id}, mode = ${data?.mode}`);
    socket.roomMode = data?.mode;
  });

  // ── Helper: Remove socket from all queues ─────────────────────────────
  const removeFromAllQueues = () => {
    unifiedMatchmaking.removeSocketFromAllQueues(socket.id);
  };

   // ── Matchmaking Queue Handlers ────────────────────────────────────────
    socket.on('join-two-hands-queue', async () => {
      console.log(`[Socket] join-two-hands-queue received from ${socket.id}, userId=${socket.userId}`);
      socket.lastActivity = Date.now();

      if (!socket.userId) {
        socket.emit('error', { message: 'Please authenticate before joining queue' });
        return;
      }

      // Check if already in this queue to prevent duplicate joins
      if (unifiedMatchmaking.isInQueue(socket.id) && unifiedMatchmaking.getQueueType(socket.id) === 'two-hands') {
        console.log(`[Socket] Socket ${socket.id} already in two-hands queue, ignoring duplicate join`);
        return;
      }

      removeFromAllQueues();
      const result = unifiedMatchmaking.addToQueue(socket, 'two-hands', socket.userId);
      if (result) {
        await broadcaster.broadcastGameStart(result);
      } else {
        // Broadcast waiting state immediately after joining queue
        broadcastTwoHandsWaiting().catch(err => console.error('[Socket] Error broadcasting two-hands waiting:', err));
      }
    });

  socket.on('join-party-queue', async () => {
    console.log(`[Socket] join-party-queue received from ${socket.id}, userId=${socket.userId}`);
    socket.lastActivity = Date.now();

    if (!socket.userId) {
      socket.emit('error', { message: 'Please authenticate before joining queue' });
      return;
    }

    // Check if already in this queue to prevent duplicate joins
    if (unifiedMatchmaking.isInQueue(socket.id) && unifiedMatchmaking.getQueueType(socket.id) === 'party') {
      console.log(`[Socket] Socket ${socket.id} already in party queue, ignoring duplicate join`);
      return;
    }

    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'party', socket.userId);
    if (result) {
      await broadcaster.broadcastPartyGameStart(result);
    }
    // Don't broadcast waiting state here - client will request it via 'request-lobby-status'
    // This ensures event listeners are registered before the broadcast is received
  });

    socket.on('join-three-hands-queue', async () => {
      console.log(`[Socket] join-three-hands-queue:socket.id = ${socket.id}, userId = ${socket.userId} (type: ${typeof socket.userId})`);
      socket.lastActivity = Date.now();

      if (!socket.userId) {
        console.log(`[Socket] Rejecting join-three-hands-queue: not authenticated, socket.userId = ${socket.userId} (falsy check: ${!socket.userId})`);
        socket.emit('error', { message: 'Please authenticate before joining queue' });
        console.log(`[Socket] Error emitted to client for unauthenticated join`);
        return;
      }

      // Check if already in this queue to prevent duplicate joins
      if (unifiedMatchmaking.isInQueue(socket.id) && unifiedMatchmaking.getQueueType(socket.id) === 'three-hands') {
        console.log(`[Socket] Socket ${socket.id} already in three-hands queue, ignoring duplicate join`);
        return;
      }

      console.log(`[Socket] Processing join-three-hands-queue for authenticated user ${socket.userId}`);

      removeFromAllQueues();
      const result = unifiedMatchmaking.addToQueue(socket, 'three-hands', socket.userId);
      console.log(`[Socket] addToQueue result:`, result);
      if (result) {
        console.log(`[Socket] Game started for three-hands, broadcasting game start`);
        await broadcaster.broadcastThreeHandsGameStart(result);
      } else {
        console.log(`[Socket] Added to three-hands queue, broadcasting waiting state`);
        // Broadcast waiting state immediately after joining queue
        // This ensures the player sees the updated lobby state
        broadcastThreeHandsWaiting().catch(err => console.error('[Socket] Error broadcasting three-hands waiting:', err));
      }
    });

   socket.on('join-four-hands-queue', async () => {
     console.log(`[Socket] join-four-hands-queue received from ${socket.id}, userId=${socket.userId}`);
     socket.lastActivity = Date.now();

     if (!socket.userId) {
       socket.emit('error', { message: 'Please authenticate before joining queue' });
       return;
     }

     // Check if already in this queue to prevent duplicate joins
     if (unifiedMatchmaking.isInQueue(socket.id) && unifiedMatchmaking.getQueueType(socket.id) === 'four-hands') {
       console.log(`[Socket] Socket ${socket.id} already in four-hands queue, ignoring duplicate join`);
       return;
     }

     removeFromAllQueues();
     const result = unifiedMatchmaking.addToQueue(socket, 'four-hands', socket.userId);
     if (result) {
       await broadcaster.broadcastFourHandsGameStart(result);
     }
     // Don't broadcast waiting state here - client will request it via 'request-lobby-status'
     // This ensures event listeners are registered before the broadcast is received
   });

   socket.on('join-freeforall-queue', async () => {
     console.log(`[Socket] join-freeforall-queue received from ${socket.id}, userId=${socket.userId}`);
     socket.lastActivity = Date.now();

     if (!socket.userId) {
       socket.emit('error', { message: 'Please authenticate before joining queue' });
       return;
     }

     // Check if already in this queue to prevent duplicate joins
     if (unifiedMatchmaking.isInQueue(socket.id) && unifiedMatchmaking.getQueueType(socket.id) === 'freeforall') {
       console.log(`[Socket] Socket ${socket.id} already in freeforall queue, ignoring duplicate join`);
       return;
     }

     removeFromAllQueues();
     const result = unifiedMatchmaking.addToQueue(socket, 'freeforall', socket.userId);
     if (result) {
       await broadcaster.broadcastFreeForAllGameStart(result);
     }
     // Don't broadcast waiting state here - client will request it via 'request-lobby-status'
     // This ensures event listeners are registered before the broadcast is received
   });

     socket.on('join-tournament-queue', async () => {
       console.log(`[Socket] join-tournament-queue received from ${socket.id}, userId=${socket.userId}`);
       socket.lastActivity = Date.now();

       if (!socket.userId) {
         socket.emit('error', { message: 'Please authenticate before joining queue' });
         return;
       }

       // Check if already in this queue to prevent duplicate joins
       if (unifiedMatchmaking.isInQueue(socket.id) && unifiedMatchmaking.getQueueType(socket.id) === 'tournament') {
         console.log(`[Socket] Socket ${socket.id} already in tournament queue, ignoring duplicate join`);
         return;
       }

       removeFromAllQueues();
       const result = unifiedMatchmaking.addToQueue(socket, 'tournament', socket.userId);
       if (result) {
         await broadcaster.broadcastTournamentGameStart(result);
       }
       // Don't broadcast waiting state here - client will request it via 'request-lobby-status'
       // This ensures event listeners are registered before the broadcast is received
     });

   // ── Leave Queue Handlers ──────────────────────────────────────────────
   socket.on('leave-two-hands-queue', () => {
     console.log(`[${new Date().toISOString()}] [Socket] LEAVE-QUEUE EVENT: leave-two-hands-queue received from ${socket.id} (userId: ${socket.userId})`);
     socket.lastActivity = Date.now();
     const beforeCount = unifiedMatchmaking.getWaitingCount('two-hands');
     unifiedMatchmaking.leaveQueue(socket, 'two-hands');
     const afterCount = unifiedMatchmaking.getWaitingCount('two-hands');
      console.log(`[${new Date().toISOString()}] [Socket] LEAVE-QUEUE RESULT: two-hands queue ${beforeCount} → ${afterCount} players`);
      // Broadcast updated waiting state
       broadcastTwoHandsWaiting().catch(err => console.error('[Socket] Error broadcasting two-hands waiting:', err));
   });

   socket.on('leave-three-hands-queue', () => {
     console.log(`[${new Date().toISOString()}] [Socket] LEAVE-QUEUE EVENT: leave-three-hands-queue received from ${socket.id} (userId: ${socket.userId})`);
     socket.lastActivity = Date.now();
     const beforeCount = unifiedMatchmaking.getWaitingCount('three-hands');
     unifiedMatchmaking.leaveQueue(socket, 'three-hands');
     const afterCount = unifiedMatchmaking.getWaitingCount('three-hands');
      console.log(`[${new Date().toISOString()}] [Socket] LEAVE-QUEUE RESULT: three-hands queue ${beforeCount} → ${afterCount} players`);
      // Broadcast updated waiting state
       broadcastThreeHandsWaiting().catch(err => console.error('[Socket] Error broadcasting three-hands waiting:', err));
   });

   socket.on('leave-four-hands-queue', () => {
     console.log(`[${new Date().toISOString()}] [Socket] LEAVE-QUEUE EVENT: leave-four-hands-queue received from ${socket.id} (userId: ${socket.userId})`);
     socket.lastActivity = Date.now();
     const beforeCount = unifiedMatchmaking.getWaitingCount('four-hands');
     unifiedMatchmaking.leaveQueue(socket, 'four-hands');
     const afterCount = unifiedMatchmaking.getWaitingCount('four-hands');
      console.log(`[${new Date().toISOString()}] [Socket] LEAVE-QUEUE RESULT: four-hands queue ${beforeCount} → ${afterCount} players`);
      // Broadcast updated waiting state
       broadcastFourHandsWaiting().catch(err => console.error('[Socket] Error broadcasting four-hands waiting:', err));
   });

   socket.on('leave-party-queue', () => {
     console.log(`[${new Date().toISOString()}] [Socket] LEAVE-QUEUE EVENT: leave-party-queue received from ${socket.id} (userId: ${socket.userId})`);
     socket.lastActivity = Date.now();
     const beforeCount = unifiedMatchmaking.getWaitingCount('party');
     unifiedMatchmaking.leaveQueue(socket, 'party');
     const afterCount = unifiedMatchmaking.getWaitingCount('party');
      console.log(`[${new Date().toISOString()}] [Socket] LEAVE-QUEUE RESULT: party queue ${beforeCount} → ${afterCount} players`);
      // Broadcast updated waiting state
       broadcastPartyWaiting().catch(err => console.error('[Socket] Error broadcasting party waiting:', err));
   });

   socket.on('leave-freeforall-queue', () => {
     console.log(`[${new Date().toISOString()}] [Socket] LEAVE-QUEUE EVENT: leave-freeforall-queue received from ${socket.id} (userId: ${socket.userId})`);
     socket.lastActivity = Date.now();
     const beforeCount = unifiedMatchmaking.getWaitingCount('freeforall');
     unifiedMatchmaking.leaveQueue(socket, 'freeforall');
     const afterCount = unifiedMatchmaking.getWaitingCount('freeforall');
      console.log(`[${new Date().toISOString()}] [Socket] LEAVE-QUEUE RESULT: freeforall queue ${beforeCount} → ${afterCount} players`);
      // Broadcast updated waiting state
       broadcastFreeForAllWaiting().catch(err => console.error('[Socket] Error broadcasting freeforall waiting:', err));
   });

   socket.on('leave-tournament-queue', () => {
     console.log(`[${new Date().toISOString()}] [Socket] LEAVE-QUEUE EVENT: leave-tournament-queue received from ${socket.id} (userId: ${socket.userId})`);
     socket.lastActivity = Date.now();
     const beforeCount = unifiedMatchmaking.getWaitingCount('tournament');
     unifiedMatchmaking.leaveQueue(socket, 'tournament');
     const afterCount = unifiedMatchmaking.getWaitingCount('tournament');
      console.log(`[${new Date().toISOString()}] [Socket] LEAVE-QUEUE RESULT: tournament queue ${beforeCount} → ${afterCount} players`);
      // Broadcast updated waiting state
       broadcastTournamentWaiting().catch(err => console.error('[Socket] Error broadcasting tournament waiting:', err));
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

  socket.on('get-player-stats', (data) => coordinator.handleGetPlayerStats(socket, data));

  // ── Client Ready Handler ──────────────────────────────────────────────
  socket.on('client-ready', (data) => {
    // Delegate to coordinator for proper game logic handling
    coordinator.handleClientReady(socket, data);
  });

   // ── State Sync & Lobby ────────────────────────────────────────────────
   socket.on('request-sync', () => {
     socket.lastActivity = Date.now();
     const gameId = unifiedMatchmaking.getGameId(socket.id);
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
     socket.lastActivity = Date.now();

      if (unifiedMatchmaking.isInQueue(socket.id)) {
        const gameType = unifiedMatchmaking.getQueueType(socket.id);
        const broadcastMap = {
          'two-hands': broadcastTwoHandsWaiting,
          'three-hands': broadcastThreeHandsWaiting,
          'four-hands': broadcastFourHandsWaiting,
          'party': broadcastPartyWaiting,
          'freeforall': broadcastFreeForAllWaiting,
          'tournament': broadcastTournamentWaiting,
        };
        const broadcastFn = broadcastMap[gameType];
        if (broadcastFn) {
          await broadcastFn();
        }
      }
  });

  // ── Drag Event Handlers ───────────────────────────────────────────────
  socket.on('drag-start', (data) => {
    const gameId = unifiedMatchmaking.getGameId(socket.id);
    if (gameId) {
      console.log(`[Socket] drag-start - broadcasting to others in game ${gameId}`);
      socket.to(gameId).emit('opponent-drag-start', {
        playerIndex: data.playerIndex, // Will be resolved on client
        card: data.card,
        cardId: data.cardId,
        source: data.source,
        position: data.position,
        timestamp: Date.now(),
      });
    }
  });

  socket.on('drag-move', (data) => {
    const gameId = unifiedMatchmaking.getGameId(socket.id);
    if (gameId) {
      socket.to(gameId).emit('opponent-drag-move', {
        playerIndex: data.playerIndex,
        card: data.card,
        position: data.position,
        timestamp: Date.now(),
      });
    }
  });

  socket.on('drag-end', (data) => {
    const gameId = unifiedMatchmaking.getGameId(socket.id);
    if (gameId) {
      socket.to(gameId).emit('opponent-drag-end', {
        playerIndex: data.playerIndex,
        card: data.card,
        position: data.position,
        outcome: data.outcome || 'miss',
        targetType: data.targetType,
        targetId: data.targetId,
        timestamp: Date.now(),
      });
    }
  });

  // ── Disconnect Handler ────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [Socket] Socket disconnected: ${socket.id}, userId: ${socket.userId}, connected: ${socket.connected}, disconnected: ${socket.disconnected}`);

    // 1. Handle room disconnection
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

    // 2. Check if socket was waiting in a queue (before removal)
    const socketInfo = unifiedMatchmaking.socketRegistry.get(socket.id);
    const wasInQueue = socketInfo && socketInfo.gameId === null;
    const gameType = wasInQueue ? socketInfo.gameType : null;

    // 3. Handle matchmaking disconnection (removes from queue/game)
    const matchmakingResult = unifiedMatchmaking.handleDisconnection(socket);

    // 4. Broadcast appropriate updates
    if (matchmakingResult) {
      // Socket was in an active game
      console.log(`[${timestamp}] [Socket] Matchmaking disconnection handled: gameId=${matchmakingResult.gameId}, remainingSockets=${matchmakingResult.remainingSockets.length}`);
      broadcaster.broadcastDisconnection(matchmakingResult.gameId, socket.id);
      if (matchmakingResult.remainingSockets.length < 1) {
        console.log(`[${timestamp}] [Socket] Ending game ${matchmakingResult.gameId} due to no remaining players`);
        gameManager.endGame(matchmakingResult.gameId);
      }
    } else if (wasInQueue && gameType) {
      // Socket was waiting in a queue – broadcast updated lobby state
      const broadcastMap = {
        'two-hands': broadcastTwoHandsWaiting,
        'three-hands': broadcastThreeHandsWaiting,
        'four-hands': broadcastFourHandsWaiting,
        'party': broadcastPartyWaiting,
        'freeforall': broadcastFreeForAllWaiting,
        'tournament': broadcastTournamentWaiting,
      };
      const broadcastFn = broadcastMap[gameType];
      if (broadcastFn) {
        try {
          await broadcastFn();
          console.log(`[${timestamp}] [Socket] Broadcasted updated ${gameType} waiting state after disconnect`);
        } catch (err) {
          console.error(`[${timestamp}] [Socket] Error broadcasting ${gameType} waiting:`, err);
        }
      }
    }
  });
}

module.exports = { attachSocketHandlers };