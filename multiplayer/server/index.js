/**
 * New Server Entry Point
 * Uses the refactored modular architecture
 * This replaces the old monolithic index.js
 */

// Import the new modular system
const GameManager = require('./game/GameManager');
const ActionRouter = require('./game/ActionRouter');

// Import the new networking layer
const { startServer } = require('./socket-server');

console.log('[REFACTOR] Starting server with new modular architecture...');

// Initialize the game system
console.log('[REFACTOR] Initializing GameManager and ActionRouter...');

try {
  // Dependency injection: ActionRouter gets GameManager
  const gameManager = new GameManager();
  const actionRouter = new ActionRouter(gameManager);

  // ActionRouter gets injected into GameManager
  gameManager.actionRouter = actionRouter;

  console.log('[REFACTOR] Game system initialized successfully');

  // Start the server with the modular components
  console.log('[REFACTOR] Starting socket server...');

  const serverComponents = startServer(GameManager, ActionRouter);

  console.log('[REFACTOR] ✅ Server started successfully with modular architecture!');
  console.log('[REFACTOR] ♟️ Game system ready for casino gameplay');
  console.log('[REFACTOR] 📊 Active games:', gameManager.getActiveGamesCount());

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
