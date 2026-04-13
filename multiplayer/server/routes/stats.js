/**
 * Stats Routes
 * Handles player statistics endpoints
 */

const express = require('express');
const GameStats = require('../models/GameStats');

const router = express.Router();

// Middleware to verify authentication
// Supports both Bearer token (deprecated) and cookie-based auth
function authenticate(req, res, next) {
  let token = req.cookies?.auth_token;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const User = require('../models/User');
  const decoded = User.verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.userId = decoded.userId;
  next();
}

/**
 * GET /api/stats/player
 * Get current player's stats
 */
router.get('/player', authenticate, async (req, res) => {
  try {
    console.log('[Stats API] Getting stats for user:', req.userId);
    
    const stats = await GameStats.getOrCreate(req.userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[Stats API] Error getting player stats:', error);
    res.status(500).json({ error: 'Failed to get player stats' });
  }
});

/**
 * GET /api/stats/player/:userId
 * Get specific player's stats
 */
router.get('/player/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[Stats API] Getting stats for user:', userId);
    
    const stats = await GameStats.getOrCreate(userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[Stats API] Error getting player stats:', error);
    res.status(500).json({ error: 'Failed to get player stats' });
  }
});

/**
 * GET /api/stats/leaderboard
 * Get top players leaderboard
 */
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const { statKey = 'pointRetentionPerGame', limit = 10 } = req.query;
    
    console.log('[Stats API] Getting leaderboard for stat:', statKey);
    
    const leaderboard = await GameStats.getTopPlayers(statKey, parseInt(limit));
    
    res.json({
      success: true,
      leaderboard,
      statKey
    });
  } catch (error) {
    console.error('[Stats API] Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

module.exports = router;