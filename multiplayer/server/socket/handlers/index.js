/**
 * handlers/index.js
 * Exports function to attach all socket handlers to a socket connection.
 */

const PlayerProfile = require('../../models/PlayerProfile');
const { createBroadcastHelpers } = require('./broadcast');
const TournamentCoordinator = require('../../services/TournamentCoordinator');

function attachSocketHandlers(socket, services) {
  const { unifiedMatchmaking, roomService, gameManager, broadcaster, coordinator, io } = services;
  const tournamentCoordinator = coordinator?.tournamentCoordinator || new TournamentCoordinator(gameManager, unifiedMatchmaking, broadcaster, io);
  const {
    broadcastTwoHandsWaiting,
    broadcastPartyWaiting,
    broadcastThreeHandsWaiting,
    broadcastFourHandsWaiting,
    broadcastTournamentWaiting,
    broadcastQueueState,
  } = createBroadcastHelpers(unifiedMatchmaking, services.io);

  // ── Authentication ─────────────────────────────────────────────────────────
  socket.on('authenticate', (userId) => {
    if (userId) {
      socket.userId = userId;
      socket.join(`user:${userId}`);
    }
  });

  socket.on('disconnecting', () => { /* Socket auto-leaves rooms on disconnect */ });

  socket.on('room-mode-connected', (data) => {
    socket.roomMode = data?.mode;
    // Remove from matchmaking queue when connecting to private room
    removeFromAllQueues();
    console.log('[Server] room-mode-connected: removed from queue, mode:', data?.mode);
  });

  // ── Helper: Remove socket from all queues ─────────────────────────────
  const removeFromAllQueues = () => {
    unifiedMatchmaking.socketRegistry.delete(socket.id);
    unifiedMatchmaking.queueManager.removeFromQueue(socket.id);
  };

  // ── Matchmaking Queue Handlers ────────────────────────────────────────
  socket.on('join-two-hands-queue', async () => {
    const playerId = socket.userId || socket.id;

    if (unifiedMatchmaking.isSocketInQueue(socket.id, unifiedMatchmaking.queueManager)) {
      socket.emit('error', { message: 'You are already in a queue' });
      return;
    }

    if (unifiedMatchmaking.isSocketInGame(socket.id)) {
      socket.emit('error', { message: 'You are already in a game' });
      return;
    }
    
    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'two-hands', playerId);
    if (result) {
      await broadcaster.broadcastGameStart(result);
    } else {
      await broadcastQueueState('two-hands');
    }
  });

  socket.on('join-party-queue', async () => {
    console.log(`[Socket] join-party-queue received from ${socket.id}, userId: ${socket.userId}`);
    const playerId = socket.userId || socket.id;

    if (unifiedMatchmaking.isSocketInQueue(socket.id, unifiedMatchmaking.queueManager)) {
      console.log(`[Socket] ${socket.id} already in queue, ignoring duplicate`);
      socket.emit('error', { message: 'You are already in a queue' });
      return;
    }

    if (unifiedMatchmaking.isSocketInGame(socket.id)) {
      socket.emit('error', { message: 'You are already in a game' });
      return;
    }

    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'party', playerId);
    console.log(`[Socket] addToQueue result: ${result ? 'game started' : 'waiting for players'}`);
    if (result) {
      await broadcaster.broadcastPartyGameStart(result);
    } else {
      await broadcastQueueState('party');
    }
  });

  socket.on('join-three-hands-queue', async () => {
    console.log('[Server] join-three-hands-queue, userId:', socket.userId);
    const playerId = socket.userId || socket.id;

    if (unifiedMatchmaking.isSocketInQueue(socket.id, unifiedMatchmaking.queueManager)) {
      socket.emit('error', { message: 'You are already in a queue' });
      return;
    }

    if (unifiedMatchmaking.isSocketInGame(socket.id)) {
      socket.emit('error', { message: 'You are already in a game' });
      return;
    }

    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'three-hands', playerId);
    console.log('[Server] addToQueue result:', result ? 'game created' : 'waiting');
    if (result) {
      console.log('[Server] calling broadcastThreeHandsGameStart');
      await broadcaster.broadcastThreeHandsGameStart(result);
    } else {
      console.log('[Server] calling broadcastQueueState');
      await broadcastQueueState('three-hands');
    }
  });

  socket.on('join-four-hands-queue', async () => {
    console.log(`[Socket] join-four-hands-queue received from ${socket.id}, userId: ${socket.userId}`);
    const playerId = socket.userId || socket.id;
    
    if (unifiedMatchmaking.isSocketInQueue(socket.id, unifiedMatchmaking.queueManager)) {
      console.log(`[Socket] ${socket.id} already in queue, ignoring duplicate`);
      socket.emit('error', { message: 'You are already in a queue' });
      return;
    }

    if (unifiedMatchmaking.isSocketInGame(socket.id)) {
      socket.emit('error', { message: 'You are already in a game' });
      return;
    }

    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'four-hands', playerId);
    if (result) {
      await broadcaster.broadcastFourHandsGameStart(result);
    } else {
      await broadcastQueueState('four-hands');
    }
  });

  socket.on('join-tournament-queue', async () => {
    console.log(`[Socket] join-tournament-queue received from ${socket.id}, userId: ${socket.userId}`);
    const playerId = socket.userId || socket.id;
    
    if (unifiedMatchmaking.isSocketInQueue(socket.id, unifiedMatchmaking.queueManager)) {
      console.log(`[Socket] ${socket.id} already in queue, ignoring duplicate`);
      socket.emit('error', { message: 'You are already in a queue' });
      return;
    }

    if (unifiedMatchmaking.isSocketInGame(socket.id)) {
      socket.emit('error', { message: 'You are already in a game' });
      return;
    }

    removeFromAllQueues();
    
    // Use 'four-hands' game type - same as free-for-all matchmaking
    const result = unifiedMatchmaking.addToQueue(socket, 'four-hands', playerId);
    
    if (result) {
      
      const { gameId, gameState, players } = result;
      
      // Add tournament metadata
      gameState.tournamentMode = 'knockout';
      gameState.tournamentId = `tournament-${Date.now()}`;
      gameState.tournamentPhase = 'QUALIFYING';
      gameState.tournamentHand = 1;
      gameState.totalHands = 4;
      gameState.tournamentScores = {};
      gameState.qualifiedPlayers = [];
      gameState.playerStatuses = {};
      
      // Initialize scores for each player
      for (let i = 0; i < players.length; i++) {
        const pId = players[i].userId || `guest_player_${i}`;
        gameState.tournamentScores[pId] = 0;
        gameState.playerStatuses[pId] = 'ACTIVE';
      }
      
      gameManager.saveGameState(gameId, gameState);
      
      // Emit game-start with tournament info (reusing free-for-all broadcast)
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        player.socket.emit('game-start', {
          gameId,
          gameState,
          playerNumber: i,
          playerInfos: gameState.players.map((p, idx) => ({
            playerNumber: idx,
            userId: p.userId,
            username: p.name || `Player ${idx + 1}`,
            avatar: p.avatar || 'lion'
          })),
          tournamentId: gameState.tournamentId,
          tournamentPhase: gameState.tournamentPhase,
          tournamentHand: gameState.tournamentHand,
          totalHands: gameState.totalHands,
          message: `Hand 1 of 4 - QUALIFYING`
        });
      }
      
      // Register tournament with coordinator for hand tracking
      tournamentCoordinator.registerExistingGameAsTournament(gameState, players, io);
    } else {
      await broadcastQueueState('four-hands');
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
          const ghostPlayers = room.players.filter(p => {
            const s = services.io.sockets.sockets.get(p.socketId);
            return !s || !s.connected;
          });

          if (ghostPlayers.length > 0) {
            ghostPlayers.forEach(ghost => {
              roomService.leaveRoom({ id: ghost.socketId });
              console.warn(`[RoomService] Evicted ghost ${ghost.socketId} from room ${data.roomCode}`);
            });

            const updatedRoom = roomService.getRoomStatus(data.roomCode);
            updatedRoom?.players.forEach(p => {
              const ps = services.io.sockets.sockets.get(p.socketId);
              ps?.emit('room-updated', { room: updatedRoom, reason: 'player_dropped' });
            });
            return;
          }

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
  socket.on('game-action', data => {
    coordinator.handleGameAction(socket, data);
  });
  
  // Handle join-game for tournament phase transitions
  socket.on('join-tournament-game', (data) => {
    const { gameId } = data;
    
    if (!gameId) {
      socket.emit('error', { message: 'join-tournament-game: gameId is required' });
      return;
    }
    
    coordinator.handleJoinTournamentGame(socket, gameId);
  });
  socket.on('start-next-round', () => coordinator.handleStartNextRound(socket));
  socket.on('drag-start', (data) => coordinator.handleDragStart(socket, data));
  socket.on('drag-move', (data) => coordinator.handleDragMove(socket, data));
  socket.on('drag-end', (data) => coordinator.handleDragEnd(socket, data));
  socket.on('drag-stack-start', (data) => coordinator.handleDragStackStart(socket, data));
  socket.on('drag-stack-move', (data) => coordinator.handleDragStackMove(socket, data));
  socket.on('drag-stack-end', (data) => coordinator.handleDragStackEnd(socket, data));
  socket.on('get-player-stats', (data) => coordinator.handleGetPlayerStats(socket, data));

  // ── Client Ready Handler ──────────────────────────────────────────────
  socket.on('client-ready', (data) => {
    const { gameId, playerIndex } = data;
    
    if (!gameId || playerIndex === undefined) {
      socket.emit('error', { message: 'client-ready: gameId and playerIndex are required' });
      return;
    }
    
    const gameState = gameManager.getGameState(gameId);
    if (!gameState) {
      socket.emit('error', { message: 'client-ready: Game not found' });
      return;
    }
    
    const isEliminated = !tournamentCoordinator.handleClientReady(socket.id, gameId, playerIndex);
    if (isEliminated) {
      socket.emit('error', { message: 'client-ready: Player is eliminated and cannot rejoin' });
      return;
    }
    
    gameManager.markClientReady(gameId, playerIndex);
    
    const playerCount = gameState.playerCount || gameState.players?.length || 0;
    const allReady = gameManager.areAllClientsReady(gameId, playerCount);
    
    if (allReady) {
      broadcaster.broadcastAllClientsReady(gameId);
    }
  });

  // ── State Sync & Lobby ────────────────────────────────────────────────
  socket.on('request-sync', () => {
    const socketInfo = unifiedMatchmaking.socketRegistry.get(socket.id);
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
      'tournament': { event: 'tournament-waiting', broadcast: broadcastTournamentWaiting },
    };
    
    for (const [mode, config] of Object.entries(queueMap)) {
      const inQueue = unifiedMatchmaking.queueManager.isInQueue(socket.id);
      if (inQueue && inQueue.gameType === mode) {
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