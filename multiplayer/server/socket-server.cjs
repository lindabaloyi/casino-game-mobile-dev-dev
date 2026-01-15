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
  next();
});

io.engine.on('connection_error', (err) => {
  console.error(`[SERVER] Connection error:`, err);
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
    // 🎯 CORE 12 ACTIONS - Build Extension System
    trail: actionHandlers.handleTrail,
    createTemp: actionHandlers.handleCreateTemp,
    addToOwnTemp: actionHandlers.handleAddToOwnTemp,
    cancelTemp: actionHandlers.handleCancelTemp,
    capture: actionHandlers.handleCapture,
    createBuildFromTempStack: actionHandlers.handleCreateBuildFromTempStack,
    addToOwnBuild: actionHandlers.handleAddToOwnBuild,
    BuildExtension: actionHandlers.handleBuildExtension,  // 🎯 NEW: Direct Build Extension
    acceptBuildExtension: actionHandlers.handleAcceptBuildExtension,  // 🎯 NEW: Accept Build Extension
    cancelBuildExtension: actionHandlers.handleCancelBuildExtension,  // 🎯 NEW: Cancel Build Extension
    tableToTableDrop: actionHandlers.handleTableToTableDrop,
    handToTableDrop: actionHandlers.handleHandToTableDrop
  };

  Object.keys(actionTypeMapping).forEach(actionType => {
    actionRouter.registerAction(actionType, actionTypeMapping[actionType]);
  });
}

/**
 * Service-Based Event Handlers
 * Pure orchestration - delegate to specialized services
 */

// Service-based event handlers using composition
const handleMatchmaking = (socket) => {
  // Try to create a game - service returns game info if created
  const gameResult = matchmaking.addToQueue(socket);

  if (gameResult) {
    // Game was created - broadcast to players
    broadcaster.broadcastGameStart(gameResult);
  }
};

const handleDisconnect = (socket) => {
  // Handle disconnection through matchmaking service
  const disconnectedGame = matchmaking.handleDisconnection(socket);

  if (disconnectedGame) {
    // Notify remaining players and check if game should end
    broadcaster.broadcastDisconnection(disconnectedGame.gameId, socket.id);

    // End game if insufficient players
    if (disconnectedGame.remainingSockets.length <= 1) {
      gameManager.endGame(disconnectedGame.gameId);
    }
  }
};

// Socket event handlers - now pure service orchestration
io.on('connection', (socket) => {
  // Service-based matchmaking
  handleMatchmaking(socket);

  // Service-based event handling
  socket.on('disconnect', () => handleDisconnect(socket));
  socket.on('game-action', (data) => gameCoordinator.handleGameAction(socket, data));
  socket.on('card-drop', (data) => {
    // 📡 COMPREHENSIVE SERVER DROP DATA LOGGING
    // Deep analysis
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
    }
    // Continue with normal processing
    gameCoordinator.handleCardDrop(socket, data);
  });
  socket.on('execute-action', (data) => gameCoordinator.handleExecuteAction(socket, data));
});

// Server control functions
function startServer(GameManagerClass, ActionRouterClass) {
  initializeGameSystem(GameManagerClass, ActionRouterClass);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Game system ready with ${gameManager ? gameManager.getActiveGamesCount() : 0} active games`);
  });

  return { app, server, io, gameManager, actionRouter };
}

function stopServer() {
  if (server.listening) {
    server.close();
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
