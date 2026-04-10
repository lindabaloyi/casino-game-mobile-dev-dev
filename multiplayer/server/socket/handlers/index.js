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
    unifiedMatchmaking.socketRegistry.delete(socket.id);
    unifiedMatchmaking.queueManager.removeFromQueue(socket.id);
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
    }
    // Don't broadcast waiting state here - client will request it via 'request-lobby-status'
    // This ensures event listeners are registered before the broadcast is received
  });

  socket.on('join-party-queue', async () => {
    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'party', socket.userId);
    if (result) {
      await broadcaster.broadcastPartyGameStart(result);
    }
    // Don't broadcast waiting state here - client will request it via 'request-lobby-status'
    // This ensures event listeners are registered before the broadcast is received
  });

  socket.on('join-three-hands-queue', async () => {
    console.log(`[Socket] join-three-hands-queue:socket.id = ${socket.id}`);
    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'three-hands', socket.userId);
    if (result) {
      await broadcaster.broadcastThreeHandsGameStart(result);
    }
    // Don't broadcast waiting state here - client will request it via 'request-lobby-status'
    // This ensures event listeners are registered before the broadcast is received
  });

  socket.on('join-four-hands-queue', async () => {
    console.log(`[Socket] join-four-hands-queue:socket.id = ${socket.id}`);
    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'four-hands', socket.userId);
    if (result) {
      await broadcaster.broadcastFourHandsGameStart(result);
    }
    // Don't broadcast waiting state here - client will request it via 'request-lobby-status'
    // This ensures event listeners are registered before the broadcast is received
  });

  socket.on('join-freeforall-queue', async () => {
    removeFromAllQueues();
    const result = unifiedMatchmaking.addToQueue(socket, 'freeforall', socket.userId);
    if (result) {
      await broadcaster.broadcastFreeForAllGameStart(result);
    }
    // Don't broadcast waiting state here - client will request it via 'request-lobby-status'
    // This ensures event listeners are registered before the broadcast is received
  });

  socket.on('join-tournament-queue', async () => {
    console.log(`[DEBUG] [Socket] join-tournament-queue:socket.id = ${socket.id}, userId = ${socket.userId}`);
    removeFromAllQueues();
    
    // Use 'four-hands' game type - same as free-for-all matchmaking
    const result = unifiedMatchmaking.addToQueue(socket, 'four-hands', socket.userId);
    
    if (result) {
      console.log(`[DEBUG] [Socket] Tournament first hand created with ${result.players.length} players`);
      
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
        const playerId = players[i].userId || `player_${i}`;
        gameState.tournamentScores[playerId] = 0;
        gameState.playerStatuses[playerId] = 'ACTIVE';
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
      console.log(`[SOCKET] First hand created: gameId=${gameId}, tournamentId=${gameState.tournamentId}`);
      const registered = tournamentCoordinator.registerExistingGameAsTournament(gameState, players, io);
      console.log(`[SOCKET] Registration result:`, !!registered);
      console.log(`[SOCKET] activeTournaments size after registration:`, tournamentCoordinator.activeTournaments ? tournamentCoordinator.activeTournaments.size : 'N/A');
    } else {
      console.log(`[DEBUG] [Socket] Not enough players for tournament yet`);
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
  socket.on('game-action', data => {
    console.log('[Socket] Received game-action:', data.type);
    coordinator.handleGameAction(socket, data);
  });
  
  // Handle join-game for tournament phase transitions
  socket.on('join-tournament-game', (data) => {
    const { gameId } = data;
    console.log(`[Socket] join-tournament-game received: gameId=${gameId}, socket=${socket.id}`);
    
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
  socket.on('get-player-stats', (data) => coordinator.handleGetPlayerStats(socket, data));

  // ── Client Ready Handler ──────────────────────────────────────────────
  socket.on('client-ready', (data) => {
    const { gameId, playerIndex } = data;
    console.log(`[Socket] 📥 client-ready RECEIVED: gameId=${gameId}, playerIndex=${playerIndex}, socket=${socket.id}`);
    console.log(`[Socket] 📥 DEBUG: Checking if game ${gameId} exists in gameManager...`);
    
    if (!gameId || playerIndex === undefined) {
      socket.emit('error', { message: 'client-ready: gameId and playerIndex are required' });
      return;
    }
    
    // Get game state to check player status
    const gameState = gameManager.getGameState(gameId);
    console.log(`[Socket] 📥 DEBUG: gameManager.getGameState(${gameId}) result:`, gameState ? 'FOUND' : 'NOT FOUND');
    
    // Log all active game IDs for debugging
    if (!gameState) {
      console.log(`[Socket] ❌ ERROR: Game ${gameId} not found! Available games in memory.`);
      // Log a few recent game IDs if available
      console.log(`[Socket] ❌ DEBUG: client-ready called for non-existent game. This usually means the tournament moved to a new hand but client still has old gameId.`);
      socket.emit('error', { message: 'client-ready: Game not found' });
      return;
    }
    
    // DEBUG: Log tournament state on client-ready
    if (gameState.tournamentMode) {
      const socketMap = gameManager.socketPlayerMap.get(gameId);
      const playerStatuses = gameState.playerStatuses || {};
      const qualifiedPlayers = gameState.qualifiedPlayers || [];
      const readySet = gameManager.clientReadyMap.get(gameId) || new Set();
      
      console.log(`\n🔍 TOURNAMENT DEBUG [client-ready from P${playerIndex}] — game ${gameId}`);
      console.log(`Phase: ${gameState.tournamentPhase} | playerCount: ${gameState.playerCount}`);
      
      for (let i = 0; i < 4; i++) {
        const pid = `player_${i}`;
        const status = playerStatuses[pid] || 'N/A';
        const isQualified = qualifiedPlayers.includes(pid);
        const isReady = readySet.has(i);
        console.log(`  P${i}: ${pid} | status: ${status.padEnd(10)} | qual: ${isQualified ? '✅' : '❌'} | ready: ${isReady ? '✅' : '❌'}`);
      }
      console.log('----------------------------------------\n');
    }
    
    // Check if player is ELIMINATED
    const isEliminated = !tournamentCoordinator.handleClientReady(socket.id, gameId, playerIndex);
    if (isEliminated) {
      console.log(`[Socket] ❌ Rejecting client-ready from ELIMINATED socket ${socket.id.substr(0,8)}`);
      socket.emit('error', { message: 'client-ready: Player is eliminated and cannot rejoin' });
      return;
    }
    
    // Mark client as ready in GameManager
    gameManager.markClientReady(gameId, playerIndex);
    
    // Check if all clients are now ready
    const playerCount = gameState.playerCount || gameState.players?.length || 0;
    const allReady = gameManager.areAllClientsReady(gameId, playerCount);
    const readyCount = gameManager.getReadyClientCount(gameId);
    
    console.log(`[Socket] Game ${gameId}: ${readyCount}/${playerCount} clients ready`);
    
    if (allReady) {
      console.log(`[Socket] ✅ All clients ready for game ${gameId} - broadcasting all-clients-ready`);
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
      'freeforall': { event: 'freeforall-waiting', broadcast: broadcastFreeForAllWaiting },
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