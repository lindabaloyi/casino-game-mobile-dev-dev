/**
 * Routes Index
 * Exports all API routes
 */

const authRoutes = require('./auth');
const profileRoutes = require('./profile');
const gameRoutes = require('./game');

module.exports = {
  authRoutes,
  profileRoutes,
  gameRoutes
};
