/**
 * users.js
 * Routes for user search and lookup
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');

/**
 * GET /api/users/search
 * Search for users by username (partial match)
 * Query params:
 *   - q: search query (required)
 *   - limit: max results (optional, default 10)
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({ users: [] });
    }

    // Get the current user ID from header if provided
    const currentUserId = req.headers['x-user-id'];

    // Search users by username
    const users = await User.searchByUsername(q.trim(), parseInt(limit), currentUserId);

    // Get player profiles for each user to include stats
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const profile = await PlayerProfile.findByUserId(user._id.toString());
        // Use local avatar from profile if available, otherwise fall back to user's avatar
        const userAvatar = profile?.avatar && !profile.avatar.startsWith('http') 
          ? profile.avatar 
          : user.avatar;
        return {
          _id: user._id,
          username: user.username,
          avatar: userAvatar,
          createdAt: user.createdAt,
          stats: profile ? {
            totalGames: profile.totalGames || 0,
            wins: profile.wins || 0,
            losses: profile.losses || 0,
            rank: profile.rank || null
          } : null
        };
      })
    );

    res.json({ users: usersWithStats });
  } catch (error) {
    console.error('[Users] Search error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * GET /api/users/:userId
 * Get a specific user's public profile
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = await PlayerProfile.findByUserId(userId);

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar || '',
        createdAt: user.createdAt
      },
      profile: profile ? {
        bio: profile.bio || '',
        favoriteGameMode: profile.favoriteGameMode || ''
      } : null,
      stats: profile ? {
        totalGames: profile.totalGames || 0,
        wins: profile.wins || 0,
        losses: profile.losses || 0,
        highestScore: profile.highestScore || 0,
        achievements: profile.achievements || []
      } : null,
      rank: profile ? profile.rank : null
    });
  } catch (error) {
    console.error('[Users] Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
