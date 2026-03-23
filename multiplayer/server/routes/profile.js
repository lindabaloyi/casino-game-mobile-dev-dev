/**
 * Profile Routes
 * Handles player profile management
 */

const express = require('express');
const { ObjectId } = require('mongodb');
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');
const GameStats = require('../models/GameStats');

const router = express.Router();

// Middleware to verify authentication
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = User.verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.userId = decoded.userId;
  next();
}

/**
 * GET /api/profile
 * Get current user's profile
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = await PlayerProfile.findByUserId(req.userId);
    const stats = await GameStats.findByUserId(req.userId);

    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      user: userWithoutPassword,
      profile: profile || {},
      stats: stats || {}
    });
  } catch (error) {
    console.error('[Profile] Get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile/:userId
 * Get another user's public profile
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = await PlayerProfile.findByUserId(userId);
    const stats = await GameStats.findByUserId(userId);
    const rank = await GameStats.getPlayerRank(userId);

    // Return only public information
    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        createdAt: user.createdAt
      },
      profile: {
        bio: profile?.bio || '',
        favoriteGameMode: profile?.favoriteGameMode || 'twoPlayer'
      },
      stats: {
        totalGames: stats?.totalGames || 0,
        wins: stats?.wins || 0,
        losses: stats?.losses || 0
      },
      rank
    });
  } catch (error) {
    console.error('[Profile] Get public error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/profile
 * Update current user's profile
 */
router.put('/', authenticate, async (req, res) => {
  try {
    const { username, avatar, bio, favoriteGameMode } = req.body;

    // Check if username is being changed and if it's available
    if (username) {
      const existing = await User.findByUsername(username);
      if (existing && existing._id.toString() !== req.userId) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      await User.update(req.userId, { username });
    }

    if (avatar) {
      await User.update(req.userId, { avatar });
    }

    // Update profile
    const profile = await PlayerProfile.update(req.userId, {
      bio: bio || '',
      favoriteGameMode: favoriteGameMode || 'twoPlayer'
    });

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('[Profile] Update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile/:userId/stats
 * Get detailed stats for a user
 */
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const stats = await GameStats.findByUserId(userId);
    if (!stats) {
      return res.status(404).json({ error: 'Stats not found' });
    }

    const rank = await GameStats.getPlayerRank(userId);

    // Calculate win rate
    const winRate = stats.totalGames > 0 
      ? Math.round((stats.wins / stats.totalGames) * 100) 
      : 0;

    res.json({
      success: true,
      stats: {
        ...stats,
        winRate,
        rank
      }
    });
  } catch (error) {
    console.error('[Profile] Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile/leaderboard
 * Get global leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await GameStats.getLeaderboard(limit);

    // Enrich with user data
    const enrichedLeaderboard = await Promise.all(
      leaderboard.map(async (stat) => {
        const user = await User.findById(stat.userId.toString());
        const rank = await GameStats.getPlayerRank(stat.userId.toString());
        return {
          rank,
          userId: stat.userId,
          username: user?.username || 'Unknown',
          avatar: user?.avatar || '',
          wins: stat.wins,
          totalGames: stat.totalGames,
          winRate: stat.totalGames > 0 
            ? Math.round((stat.wins / stat.totalGames) * 100) 
            : 0
        };
      })
    );

    res.json({
      success: true,
      leaderboard: enrichedLeaderboard
    });
  } catch (error) {
    console.error('[Profile] Leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
