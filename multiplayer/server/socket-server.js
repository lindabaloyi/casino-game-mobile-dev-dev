/**
 * Socket Server Module - Service-Oriented Architecture
 * Pure networking layer - orchestrates services for socket connections, matchmaking, and event routing
 * No business logic - delegates decisions to specialized services
 */

const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

// Import extracted services
const MatchmakingService = require("./services/MatchmakingService");
const BroadcasterService = require("./services/BroadcasterService");
const GameCoordinatorService = require("./services/GameCoordinatorService");

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
    credentials: true,
  },
});

// Constants
const PORT = process.env.PORT || 3001;

// Middleware for logging all connections and data
io.use((socket, next) => {
  next();
});

io.engine.on("connection_error", (err) => {
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
  gameCoordinator = new GameCoordinatorService(
    gameManager,
    actionRouter,
    matchmaking,
    broadcaster,
  );

  // Register all action handlers - map action types to handlers
  const actionHandlers = require("./game/actions");
  const actionTypeMapping = {
    // 🎯 CORE 13 ACTIONS - Build Extension System + Cleanup
    trail: actionHandlers.handleTrail,
    createTemp: actionHandlers.handleCreateTemp,
    addToOwnTemp: actionHandlers.handleAddToOwnTemp,
    cancelTemp: actionHandlers.handleCancelTemp,
    capture: actionHandlers.handleCapture,
    createBuildFromTempStack: actionHandlers.handleCreateBuildFromTempStack,
    addToOwnBuild: actionHandlers.handleAddToOwnBuild,
    BuildExtension: actionHandlers.handleBuildExtension, // 🎯 NEW: Direct Build Extension
    acceptBuildExtension: actionHandlers.handleAcceptBuildExtension, // 🎯 NEW: Accept Build Extension
    cancelBuildExtension: actionHandlers.handleCancelBuildExtension, // 🎯 NEW: Cancel Build Extension
    tableToTableDrop: actionHandlers.handleTableToTableDrop,
    handToTableDrop: actionHandlers.handleHandToTableDrop,
    ReinforceBuild: actionHandlers.handleReinforceBuild, // 🏗️ NEW: Reinforce Build action
    cleanup: actionHandlers.handleCleanup, // 🧹 NEW: Turn 40 cleanup action
  };

  Object.keys(actionTypeMapping).forEach((actionType) => {
    actionRouter.registerAction(actionType, actionTypeMapping[actionType]);
  });

  console.log(
    "[SERVER] Service-oriented architecture initialized with",
    Object.keys(actionHandlers).length,
    "action handlers",
  );
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
      console.log(
        `[SERVER] Ending game ${disconnectedGame.gameId} - insufficient players`,
      );
      gameManager.endGame(disconnectedGame.gameId);
    }
  }
};

// Socket event handlers - now pure service orchestration
io.on("connection", (socket) => {
  console.log(`[SERVER] Client connected: ${socket.id}`);

  // Service-based matchmaking
  handleMatchmaking(socket);

  // Service-based event handling
  socket.on("disconnect", () => handleDisconnect(socket));
  socket.on("game-action", (data) =>
    gameCoordinator.handleGameAction(socket, data),
  );
  socket.on("card-drop", (data) => {
    // Continue with normal processing
    gameCoordinator.handleCardDrop(socket, data);
  });
  socket.on("execute-action", (data) =>
    gameCoordinator.handleExecuteAction(socket, data),
  );

  // ============================================================================
  // STATE SYNC ENDPOINT - Allow clients to request state synchronization
  // ============================================================================
  socket.on("request-sync", (data) => {
    const { playerNumber, reason, clientState } = data;
    console.log(
      `🔄 [SYNC] Player ${playerNumber} requesting state sync (reason: ${reason})`,
    );

    // Find the player's game
    const gameId = matchmaking.getGameId(socket.id);
    if (!gameId) {
      console.log(`❌ [SYNC] No game found for socket ${socket.id}`);
      socket.emit("sync-error", { error: "Not in active game" });
      return;
    }

    const serverState = gameManager.getGameState(gameId);
    if (!serverState) {
      console.log(`❌ [SYNC] No state found for game ${gameId}`);
      socket.emit("sync-error", { error: "Game state not found" });
      return;
    }

    // Compare states and log differences
    const differences = [];
    if (clientState) {
      if (clientState.currentPlayer !== serverState.currentPlayer) {
        differences.push(
          `Turn: client=${clientState.currentPlayer}, server=${serverState.currentPlayer}`,
        );
      }

      // Compare hand sizes
      clientState.playerHands?.forEach((hand, idx) => {
        const serverHand = serverState.playerHands?.[idx];
        if (hand.length !== serverHand?.length) {
          differences.push(
            `Player ${idx} hand: client=${hand.length}, server=${serverHand?.length}`,
          );
        }
      });

      if (clientState.tableCards?.length !== serverState.tableCards?.length) {
        differences.push(
          `Table cards: client=${clientState.tableCards?.length}, server=${serverState.tableCards?.length}`,
        );
      }
    }

    console.log(`🔄 [SYNC] State comparison for game ${gameId}:`, {
      serverState: {
        turn: serverState.currentPlayer,
        handSizes: serverState.playerHands.map((h) => h.length),
        tableCards: serverState.tableCards.length,
        round: serverState.round,
        gameOver: serverState.gameOver,
      },
      clientState: clientState
        ? {
            turn: clientState.currentPlayer,
            handSizes: clientState.playerHands?.map((h) => h.length),
            tableCards: clientState.tableCards?.length,
            round: clientState.round,
            gameOver: clientState.gameOver,
          }
        : "not provided",
      differences: differences.length > 0 ? differences : ["States match"],
    });

    // Send current server state back to client
    socket.emit("game-state-sync", {
      gameState: serverState,
      serverTime: Date.now(),
      differences: differences.length > 0 ? differences : null,
      reason: "sync_request",
    });

    console.log(
      `✅ [SYNC] Sent state sync to player ${playerNumber} in game ${gameId}`,
    );
  });
});

// Server control functions
function startServer(GameManagerClass, ActionRouterClass) {
  initializeGameSystem(GameManagerClass, ActionRouterClass);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(
      `[SERVER] Multiplayer game server listening on all interfaces at port ${PORT}`,
    );
    console.log(
      `[SERVER] Game system ready with ${gameManager ? gameManager.getActiveGamesCount() : 0} active games`,
    );
  });

  return { app, server, io, gameManager, actionRouter };
}

function stopServer() {
  if (server.listening) {
    server.close();
    console.log("[SERVER] Server stopped");
  }
}

// Exports for testing and external control
module.exports = {
  startServer,
  stopServer,
  getGameManager: () => gameManager,
  getActionRouter: () => actionRouter,
  getWaitingPlayersCount: () =>
    matchmaking ? matchmaking.getWaitingPlayersCount() : 0,
  getActiveGamesCount: () =>
    matchmaking ? matchmaking.getActiveGamesCount() : 0,
  getMatchmakingService: () => matchmaking,
  getBroadcasterService: () => broadcaster,
  getGameCoordinatorService: () => gameCoordinator,
};
