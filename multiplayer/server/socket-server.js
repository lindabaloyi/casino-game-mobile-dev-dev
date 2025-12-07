/**
 * Socket Server Module
 * Pure networking layer - only socket connections, matchmaking, and event routing
 * No game logic - delegates all decisions to GameManager
 * < 300 lines as per PRD Layer 3.1
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Placeholder GameManager - will be injected
let gameManager = null;
let actionRouter = null;

// Server setup
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  }
});

// Global state for matchmaking (temporary - could be moved to GameManager later)
let waitingPlayers = []; // Array of waiting socket objects
let activeGames = new Map(); // socketId -> gameId mapping

// Constants
const PORT = process.env.PORT || 3001;

// Middleware for logging all connections and data
io.use((socket, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}][SERVER] Handshake attempt: ${socket.id}`);
  next();
});

io.engine.on('connection_error', (err) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}][SERVER] Connection error:`, err);
});

// Initialize game manager and action router (dependency injection)
function initializeGameSystem(GameManagerClass, ActionRouterClass) {
  gameManager = new GameManagerClass();
  actionRouter = new ActionRouterClass(gameManager);

  // Register all action handlers - map action types to handlers
  const actionHandlers = require('./game/actions');
  const actionTypeMapping = {
    trail: actionHandlers.handleTrail,
    capture: actionHandlers.handleCapture,
    build: actionHandlers.handleBuild,
    createStagingStack: actionHandlers.handleCreateStagingStack,
    addToStagingStack: actionHandlers.handleAddToStagingStack,
    finalizeStagingStack: actionHandlers.handleFinalizeStagingStack,
    cancelStagingStack: actionHandlers.handleCancelStagingStack,
    addToOpponentBuild: actionHandlers.handleAddToOpponentBuild,
    addToOwnBuild: actionHandlers.handleAddToOwnBuild,
    tableCardDrop: actionHandlers.handleTableCardDrop,
    createBuildWithValue: actionHandlers.handleCreateBuildWithValue,
    addToTemporaryCaptureStack: actionHandlers.handleAddToTemporaryCaptureStack
  };

  Object.keys(actionTypeMapping).forEach(actionType => {
    actionRouter.registerAction(actionType, actionTypeMapping[actionType]);
  });

  console.log('[SERVER] Game system initialized with', Object.keys(actionHandlers).length, 'action handlers');
}

/**
 * Handle player matchmaking and game initialization
 */
function handleMatchmaking(socket) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}][SERVER] Adding ${socket.id} to waiting queue. Total waiting: ${waitingPlayers.length + 1}`);

  waitingPlayers.push(socket);
  activeGames.set(socket.id, null); // Not in a game yet

  // If two players are waiting, start a game
  if (waitingPlayers.length === 2) {
    console.log('[SERVER] Two players ready - starting game');

    const [player1Socket, player2Socket] = waitingPlayers;
    waitingPlayers = []; // Clear waiting queue

    try {
      // Create new game via GameManager
      const { gameId, gameState } = gameManager.startGame();
      activeGames.set(player1Socket.id, gameId);
      activeGames.set(player2Socket.id, gameId);

      // Register players with GameManager for proper indexing
      gameManager.addPlayerToGame(gameId, player1Socket.id, 0);
      gameManager.addPlayerToGame(gameId, player2Socket.id, 1);

      // Assign player numbers and emit game-start event
      const players = [player1Socket, player2Socket];
      players.forEach((playerSocket, index) => {
        console.log(`[${timestamp}][SERVER] Starting game ${gameId} for Player ${index} (${playerSocket.id})`);
        playerSocket.emit('game-start', {
          gameId,
          gameState,
          playerNumber: index
        });
      });

      console.log(`[${timestamp}][SERVER] Game ${gameId} started with ${players.length} players`);

    } catch (error) {
      console.error(`[${timestamp}][SERVER] Failed to start game:`, error);

      // Return players to waiting queue on error
      waitingPlayers.push(player1Socket, player2Socket);
      player1Socket.emit('error', { message: 'Failed to start game' });
      player2Socket.emit('error', { message: 'Failed to start game' });
    }
  }
}

/**
 * Handle player disconnection
 */
function handleDisconnect(socket) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}][SERVER] Disconnect: ${socket.id}, reason: ${socket.disconnected ? 'disconnected' : 'disconnecting'}`);

  // Remove from waiting queue
  const wasWaiting = waitingPlayers.some(p => p.id === socket.id);
  waitingPlayers = waitingPlayers.filter(p => p.id !== socket.id);

  // Handle active game cleanup
  const gameId = activeGames.get(socket.id);
  if (gameId) {
    // Notify all players in game about disconnection
    const gameSockets = Array.from(activeGames.entries())
      .filter(([_, gId]) => gId === gameId)
      .map(([socketId, _]) => io.sockets.sockets.get(socketId))
      .filter(Boolean);

    gameSockets.forEach(otherSocket => {
      if (otherSocket.id !== socket.id) {
        otherSocket.emit('player-disconnected');
      }
    });

    // End game when one player disconnects (could be made configurable)
    if (gameSockets.length <= 1) {
      console.log(`[${timestamp}][SERVER] Ending game ${gameId} - insufficient players`);
      gameManager.endGame(gameId);
    }
  }

  activeGames.delete(socket.id);
  console.log(`[${timestamp}][SERVER] Cleanup complete. Waiting: ${waitingPlayers.length}, Active games: ${gameManager ? gameManager.getActiveGamesCount() : 0}`);
}

/**
 * Route game actions to ActionRouter
 */
function handleGameAction(socket, data) {
  const gameId = activeGames.get(socket.id);
  if (!gameId) {
    socket.emit('error', { message: 'Not in an active game' });
    return;
  }

  // Find player's index in the game
  const playerIndex = gameManager.getPlayerIndex(gameId, socket.id);
  if (playerIndex === null) {
    socket.emit('error', { message: 'Player not found in game' });
    return;
  }

  try {
    console.log(`[SERVER] Routing action ${data.type} from Player ${playerIndex} in game ${gameId}`);

    // Route through ActionRouter
    const newGameState = actionRouter.executeAction(gameId, playerIndex, data);

    // Broadcast updated game state to all players in game
    const gameSockets = Array.from(activeGames.entries())
      .filter(([_, gId]) => gId === gameId)
      .map(([socketId, _]) => io.sockets.sockets.get(socketId))
      .filter(Boolean);

    console.log(`[SERVER] Broadcasting game-update to ${gameSockets.length} players in game ${gameId}`);

    const stateToSend = JSON.parse(JSON.stringify(newGameState)); // Deep clone
    gameSockets.forEach(gameSocket => {
      gameSocket.emit('game-update', stateToSend);
    });

  } catch (error) {
    console.error(`[SERVER] Action failed:`, error);
    socket.emit('error', { message: error.message });
  }
}

/**
 * Handle card drop actions (delegate to determineActions)
 */
function handleCardDrop(socket, data) {
  const gameId = activeGames.get(socket.id);
  if (!gameId) {
    socket.emit('error', { message: 'Not in an active game' });
    return;
  }

  // 🔍 [DEBUG] Log incoming client data
  console.log('🔍 [DEBUG] CLIENT PAYLOAD - card-drop:', JSON.stringify({
    socketId: socket.id,
    gameId: gameId,
    payload: data,
    timestamp: new Date().toISOString()
  }, null, 2));

  // Find player's index in the game
  const playerIndex = gameManager.getPlayerIndex(gameId, socket.id);
  if (playerIndex === null) {
    socket.emit('error', { message: 'Player not found in game' });
    return;
  }

  try {
    // Use GameManager's determineActions (which will delegate to logic module)
    const result = gameManager.determineActions(gameId, data.draggedItem, data.targetInfo);

    if (result.errorMessage) {
      socket.emit('error', { message: result.errorMessage });
      return;
    }

    if (result.actions.length === 1 && !result.requiresModal) {
      // Auto-execute single action
      console.log(`[SERVER] Auto-executing ${result.actions[0].type}`);

      // ✅ FIX: Inject gameId into action payload before execution
      // Remove undefined gameId from client payload first
      const { gameId: undefinedGameId, ...cleanPayload } = result.actions[0].payload;

      const actionToExecute = {
        type: result.actions[0].type,
        payload: {
          ...cleanPayload,  // Clean payload without undefined gameId
          gameId  // 🔧 Add the correct gameId
        }
      };

      const newGameState = actionRouter.executeAction(gameId, playerIndex, actionToExecute);

      // Broadcast to all game players
      const gameSockets = Array.from(activeGames.entries())
        .filter(([_, gId]) => gId === gameId)
        .map(([socketId, _]) => io.sockets.sockets.get(socketId))
        .filter(Boolean);

      gameSockets.forEach(gameSocket => {
        gameSocket.emit('game-update', JSON.parse(JSON.stringify(newGameState)));
      });

    } else if (result.actions.length > 0) {
      // Send action choices to client for modal selection
      socket.emit('action-choices', {
        requestId: data.requestId,
        actions: result.actions
      });
    }

  } catch (error) {
    // 🚨 [DEBUG] Log full error details for debugging
    console.error('🚨 [DEBUG] FULL ERROR DETAILS - card-drop:', {
      event: 'card-drop',
      gameId,
      playerIndex,
      socketId: socket.id,
      input: {
        draggedItem: data.draggedItem,
        targetInfo: data.targetInfo,
        requestId: data.requestId
      },
      error: {
        message: error.message,
        stack: error.stack,
        type: error.type || 'UNKNOWN_ERROR',
        originalError: error.originalError
      },
      timestamp: new Date().toISOString()
    });

    console.error(`[SERVER] Card drop failed:`, error);
    socket.emit('error', { message: 'Invalid move' });
  }
}

/**
 * Handle action choice from client modal
 */
function handleExecuteAction(socket, data) {
  const gameId = activeGames.get(socket.id);
  if (!gameId) {
    socket.emit('error', { message: 'Not in an active game' });
    return;
  }

  // 🔍 [DEBUG] Log incoming client data for manual action selections
  console.log('🔍 [DEBUG] CLIENT PAYLOAD - execute-action:', JSON.stringify({
    socketId: socket.id,
    gameId: gameId,
    action: data.action,
    timestamp: new Date().toISOString()
  }, null, 2));

  // Find player's index in the game
  const playerIndex = gameManager.getPlayerIndex(gameId, socket.id);
  if (playerIndex === null) {
    socket.emit('error', { message: 'Player not found in game' });
    return;
  }

  try {
    // ✅ FIX: Inject gameId into action payload for manual selections
    const actionToExecute = {
      type: data.action.type,
      payload: {
        gameId,  // 🔧 Add gameId for manual action selections
        ...data.action.payload
      }
    };

    const newGameState = actionRouter.executeAction(gameId, playerIndex, actionToExecute);

    // Broadcast to all game players
    const gameSockets = Array.from(activeGames.entries())
      .filter(([_, gId]) => gId === gameId)
      .map(([socketId, _]) => io.sockets.sockets.get(socketId))
      .filter(Boolean);

    gameSockets.forEach(gameSocket => {
      gameSocket.emit('game-update', JSON.parse(JSON.stringify(newGameState)));
    });

  } catch (error) {
    // 🚨 [DEBUG] Log full error details for debugging
    console.error('🚨 [DEBUG] FULL ERROR DETAILS - execute-action:', {
      event: 'execute-action',
      gameId,
      playerIndex,
      socketId: socket.id,
      input: {
        actionType: data.action?.type,
        payloadKeys: data.action?.payload ? Object.keys(data.action.payload) : []
      },
      error: {
        message: error.message,
        stack: error.stack,
        type: error.type || 'UNKNOWN_ERROR',
        originalError: error.originalError
      },
      timestamp: new Date().toISOString()
    });

    console.error(`[SERVER] Execute action failed:`, error);
    socket.emit('error', { message: 'Action failed' });
  }
}

// Socket event handlers
io.on('connection', (socket) => {
  console.log(`[SERVER] Client connected: ${socket.id}`);

  handleMatchmaking(socket);

  socket.on('disconnect', () => handleDisconnect(socket));
  socket.on('game-action', (data) => handleGameAction(socket, data));
  socket.on('card-drop', (data) => handleCardDrop(socket, data));
  socket.on('execute-action', (data) => handleExecuteAction(socket, data));
});

// Server control functions
function startServer(GameManagerClass, ActionRouterClass) {
  initializeGameSystem(GameManagerClass, ActionRouterClass);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Multiplayer game server listening on all interfaces at port ${PORT}`);
    console.log(`[SERVER] Game system ready with ${gameManager ? gameManager.getActiveGamesCount() : 0} active games`);
  });

  return { app, server, io, gameManager, actionRouter };
}

function stopServer() {
  if (server.listening) {
    server.close();
    console.log('[SERVER] Server stopped');
  }
}

// Exports for testing and external control
module.exports = {
  startServer,
  stopServer,
  getGameManager: () => gameManager,
  getActionRouter: () => actionRouter,
  getWaitingPlayersCount: () => waitingPlayers.length,
  getActiveGamesCount: () => activeGames.size
};
