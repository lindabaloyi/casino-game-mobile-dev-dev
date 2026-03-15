/**
 * Routes Index
 * Exports all API routes
 */

const authRoutes = require('./auth');
const profileRoutes = require('./profile');
const gameRoutes = require('./game');
const friendsRoutes = require('./friends');
const usersRoutes = require('./users');

module.exports = {
  authRoutes,
  profileRoutes,
  gameRoutes,
  friendsRoutes,
  usersRoutes
};
