/**
 * Socket Server Module - Service-Oriented Architecture
 * Pure networking layer - orchestrates services for socket connections, matchmaking, and event routing
 * No business logic - delegates decisions to specialized services
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import extracted services
const MatchmakingService = require('./services/MatchmakingService');
const BroadcasterService = require('./services/BroadcasterService');
const GameCoordinatorService = require('./services/GameCoordinatorService');

// Service instances - initialized on startup
let matchmaking = null;
let broadcaster = null;
let gameCoordinator = null;
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

// Initialize services and game system (dependency injection)
function initializeGameSystem(GameManagerClass, ActionRouterClass) {
  // Initialize game components
  gameManager = new GameManagerClass();
  actionRouter = new ActionRouterClass(gameManager);

  // Initialize services
  matchmaking = new MatchmakingService(gameManager);
  broadcaster = new BroadcasterService(matchmaking, gameManager, io);
  gameCoordinator = new GameCoordinatorService(gameManager, actionRouter, matchmaking, broadcaster);

  // Register all action handlers - map action types to handlers
  const actionHandlers = require('./game/actions');
  const actionTypeMapping = {
    trail: actionHandlers.handleTrail,
    confirmTrail: actionHandlers.handleConfirmTrail,
    cancelTrail: actionHandlers.handleCancelTrail,
    capture: actionHandlers.handleCapture,
    build: actionHandlers.handleBuild,
    createStagingStack: actionHandlers.handleCreateStagingStack,
    createBuildAugmentationStagingStack: actionHandlers.handleCreateBuildAugmentationStagingStack,
    addToStagingStack: actionHandlers.handleAddToStagingStack,
    finalizeStagingStack: actionHandlers.handleFinalizeStagingStack,
    finalizeBuildAugmentation: actionHandlers.handleFinalizeBuildAugmentation,
    cancelStagingStack: actionHandlers.handleCancelStagingStack,
    addToOpponentBuild: actionHandlers.handleAddToOpponentBuild,
    addToOwnBuild: actionHandlers.handleAddToOwnBuild,
    tableToTableDrop: actionHandlers.handleTableToTableDrop,
    handToTableDrop: actionHandlers.handleHandToTableDrop,
    createBuildWithValue: actionHandlers.handleCreateBuildWithValue,
    captureTempStack: actionHandlers.handleCaptureTempStack,
    createBuildFromTempStack: actionHandlers.handleCreateBuildFromTempStack,
    addToBuilding: actionHandlers.handleAddToBuilding,
    validateBuildAugmentation: actionHandlers.handleValidateBuildAugmentation,
    addToTemporaryCaptureStack: actionHandlers.handleAddToTemporaryCaptureStack,
    acceptBuildAddition: actionHandlers.handleAcceptBuildAddition,
    rejectBuildAddition: actionHandlers.handleRejectBuildAddition
  };

  Object.keys(actionTypeMapping).forEach(actionType => {
    actionRouter.registerAction(actionType, actionTypeMapping[actionType]);
  });

  console.log('[SERVER] Service-oriented architecture initialized with', Object.keys(actionHandlers).length, 'action handlers');
}

/**
 * Service-Based Event Handlers
 * Pure orchestration - delegate to specialized services
 */

// Service-based event handlers using composition
const handleMatchmaking = (socket) => {
  console.log(`[SERVER] Adding ${socket.id} to matchmaking queue`);

  // Try to create a game - service returns game info if created
  const gameResult = matchmaking.addToQueue(socket);

  if (gameResult) {
    // Game was created - broadcast to players
    broadcaster.broadcastGameStart(gameResult);
  }
};

const handleDisconnect = (socket) => {
  console.log(`[SERVER] Player disconnected: ${socket.id}`);

  // Handle disconnection through matchmaking service
  const disconnectedGame = matchmaking.handleDisconnection(socket);

  if (disconnectedGame) {
    // Notify remaining players and check if game should end
    broadcaster.broadcastDisconnection(disconnectedGame.gameId, socket.id);

    // End game if insufficient players
    if (disconnectedGame.remainingSockets.length <= 1) {
      console.log(`[SERVER] Ending game ${disconnectedGame.gameId} - insufficient players`);
      gameManager.endGame(disconnectedGame.gameId);
    }
  }
};

// Socket event handlers - now pure service orchestration
io.on('connection', (socket) => {
  console.log(`[SERVER] Client connected: ${socket.id}`);

  // Service-based matchmaking
  handleMatchmaking(socket);

  // Service-based event handling
  socket.on('disconnect', () => handleDisconnect(socket));
  socket.on('game-action', (data) => gameCoordinator.handleGameAction(socket, data));
  socket.on('card-drop', (data) => {
    // 📡 COMPREHENSIVE SERVER DROP DATA LOGGING
    console.log('📡 [SERVER_DROP_DATA] ===== SERVER RECEIVED CARD-DROP =====');
    console.log('📡 [SERVER_DROP_DATA] Raw data:', data);

    // Deep analysis
    console.log('📡 [SERVER_DROP_DATA] Data type:', typeof data);
    console.log('📡 [SERVER_DROP_DATA] Data keys:', Object.keys(data));

    if (data.draggedItem) {
      console.log('📡 [SERVER_DROP_DATA] DraggedItem analysis:', {
        // Structure
        isObject: typeof data.draggedItem === 'object',
        isArray: Array.isArray(data.draggedItem),

        // Content
        hasCardProperty: !!data.draggedItem.card,
        cardDataType: typeof data.draggedItem.card,
        cardProperties: data.draggedItem.card ? Object.keys(data.draggedItem.card) : [],

        // Source info
        source: data.draggedItem.source,
        hasSource: !!data.draggedItem.source,

        // All other properties
        allProperties: Object.keys(data.draggedItem).reduce((acc, key) => {
          acc[key] = {
            value: data.draggedItem[key],
            type: typeof data.draggedItem[key]
          };
          return acc;
        }, {})
      });
    }

    if (data.targetInfo) {
      console.log('📡 [SERVER_DROP_DATA] TargetInfo analysis:', {
        ...data.targetInfo,
        cardType: data.targetInfo.card ? typeof data.targetInfo.card : 'none'
      });
    }

    console.log('📡 [SERVER_DROP_DATA] ===== END =====\n');

    // Continue with normal processing
    gameCoordinator.handleCardDrop(socket, data);
  });
  socket.on('execute-action', (data) => gameCoordinator.handleExecuteAction(socket, data));
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
  getWaitingPlayersCount: () => matchmaking ? matchmaking.getWaitingPlayersCount() : 0,
  getActiveGamesCount: () => matchmaking ? matchmaking.getActiveGamesCount() : 0,
  getMatchmakingService: () => matchmaking,
  getBroadcasterService: () => broadcaster,
  getGameCoordinatorService: () => gameCoordinator
};
