/**
 * Server entry point
 * Start with:  node multiplayer/server/index.js
 *          or: npm run server
 */

const { startServer } = require('./socket-server');

try {
  startServer();
} catch (err) {
  console.error('[Server] Failed to start:', err.message);
  process.exit(1);
}
