/**
 * New Server Entry Point - Production Optimized
 * Uses the refactored modular architecture
 * Minimal logging for production performance
 */

// Import the new modular system
const GameManager = require('./game/GameManager.js');
const ActionRouter = require('./game/ActionRouter.js');

// Import the new networking layer
const { startServer } = require('./socket-server.js');

// Initialize the game system
try {
  // Dependency injection: ActionRouter gets GameManager
  const gameManager = new GameManager();
  const actionRouter = new ActionRouter(gameManager);

  // ActionRouter gets injected into GameManager
  gameManager.actionRouter = actionRouter;

  // Start the server with the modular components
  const serverComponents = startServer(GameManager, ActionRouter);

  // Export for testing purposes
  module.exports = {
    gameManager,
    actionRouter,
    serverComponents
  };

} catch (error) {
  console.error('[SERVER_ERROR] Failed to start server:', error.message);
  process.exit(1);
}
