/**
 * New Server Entry Point
 * Uses the refactored modular architecture
 * This replaces the old monolithic index.js
 */

// Import the new modular system
const GameManager = require('./game/GameManager.cjs');
const ActionRouter = require('./game/ActionRouter.cjs');
const GameState = require('./game/GameState.cjs');

// Import the new networking layer
const { startServer } = require('./socket-server.cjs');
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
  console.error('[REFACTOR] ❌ Failed to start modular server:', error);
  console.error('[REFACTOR] Falling back to detailed error logging...');
  console.error(error.stack);
  process.exit(1);
}
