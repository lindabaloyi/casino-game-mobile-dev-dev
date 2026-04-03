/**
 * Profile Routes
 * Handles player profile management with comprehensive CRUD operations,
 * validation, error handling, and debug logging
 */

const express = require('express');
const { ObjectId } = require('mongodb');
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');
const GameStats = require('../models/GameStats');
const { 
  PlayerProfileService, 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  DatabaseError 
} = require('../services/PlayerProfileService');
const { createLogger, LOG_LEVELS, createTimer } = require('../utils/debugLogger');
const { validateAndSanitize, isValidObjectId } = require('../utils/validation');

const router = express.Router();
const logger = createLogger('ProfileRoutes', LOG_LEVELS.DEBUG);

/**
 * Middleware to verify authentication
 */
function authenticate(req, res, next) {
  const timer = createTimer();
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Authentication failed - missing or invalid token');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = User.verifyToken(token);
  
  if (!decoded) {
    logger.warn('Authentication failed - invalid token');
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.userId = decoded.userId;
  logger.debug('Authentication successful', { userId: req.userId });
  next();
}

/**
 * Global error handler for profile routes
 */
function errorHandler(error, req, res, next) {
  logger.errorWithStack('Profile route error', error);
  
  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: error.code,
      errors: error.errors
    });
  }
  
  if (error instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
  
  if (error instanceof ConflictError) {
    return res.status(409).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
  
  if (error instanceof DatabaseError) {
    return res.status(500).json({
      success: false,
      error: 'Database operation failed',
      code: error.code
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
}

// =====================================================
// ROUTES IN CORRECT ORDER - SPECIFIC ROUTES FIRST
// =====================================================

/**
 * GET /api/profile/leaderboard
 * Get global leaderboard - MUST be before /:userId to avoid route conflict
 * Supports filtering by game mode: ?mode=two-hands&limit=10
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const mode = req.query.mode || 'all';
    
    // Map legacy mode names to camelCase for backward compatibility
    const modeMap = {
      'two-hands': 'twoHands',
      'three-hands': 'threeHands',
      'four-hands': 'fourHands',
      // 'party', 'freeforall', 'tournament' remain the same
    };
    const mappedMode = modeMap[mode] || mode;

    // Validate mode (accept both legacy and new format)
    const validModes = ['all', 'two-hands', 'three-hands', 'four-hands', 'party', 'freeforall', 'tournament', 'twoHands', 'threeHands', 'fourHands'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({
        success: false,
        error: `Invalid mode: ${mode}. Valid modes: ${validModes.join(', ')}`
      });
    }

    console.log(`[Leaderboard] Fetching leaderboard for mode: ${mode} (mapped: ${mappedMode}), limit: ${limit}`);

    const leaderboard = await GameStats.getLeaderboardByMode(mappedMode, limit);
    
    // Handle empty result
    if (!leaderboard || leaderboard.length === 0) {
      return res.json({
        success: true,
        leaderboard: [],
        mode: mode,
        pagination: { limit, offset, hasMore: false },
        serverTime: new Date().toISOString()
      });
    }
    
    // Enrich with user data
    const enriched = await Promise.all(
      leaderboard.map(async (stat) => {
        const user = await User.findById(stat.userId.toString());
        const profile = await PlayerProfileService.findByUserId(stat.userId.toString());
        
        // Get rank for the requested mode (or overall)
        const rank = await GameStats.getPlayerRank(stat.userId.toString(), mode === 'all' ? 'all' : mappedMode);

        // Extract mode-specific stats if filtering by mode
        const modeStats = mode === 'all' ? null : stat.modeStats?.[mappedMode];
        
        return {
          rank,
          userId: stat.userId,
          username: user?.username || 'Unknown',
          avatar: profile?.avatar || user?.avatar || '',
          wins: mode === 'all' ? stat.wins : (modeStats?.wins || 0),
          games: mode === 'all' ? stat.totalGames : (modeStats?.games || 0),
          losses: mode === 'all' ? stat.losses : (modeStats?.losses || 0),
          winRate: mode === 'all' 
            ? (stat.totalGames > 0 ? Math.round((stat.wins / stat.totalGames) * 100) : 0)
            : (modeStats?.games > 0 ? Math.round((modeStats.wins / modeStats.games) * 100) : 0)
        };
      })
    );

    res.json({
      success: true,
      leaderboard: enriched,
      mode: mode,
      pagination: { limit, offset, hasMore: leaderboard.length === limit },
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/profile/friends
 * Get current user's friends list
 */
router.get('/friends', authenticate, async (req, res, next) => {
  const timer = createTimer();
  logger.enter({ userId: req.userId, method: 'GET', route: 'friends' });
  
  try {
    const friends = await PlayerProfileService.getFriendsWithInfo(req.userId);
    
    const response = {
      success: true,
      friends,
      count: friends.length,
      serverTime: new Date().toISOString()
    };
    
    logger.apiCall('GET', '/api/profile/friends', 200, timer.elapsed());
    logger.exit({ success: true, friendCount: friends.length });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/profile/friends/:friendId
 * Add a friend
 */
router.post('/friends/:friendId', authenticate, async (req, res, next) => {
  const timer = createTimer();
  const { friendId } = req.params;
  logger.enter({ userId: req.userId, friendId, method: 'POST', route: 'addFriend' });
  
  try {
    if (!isValidObjectId(friendId)) {
      throw new ValidationError('Invalid friend ID format');
    }
    
    await PlayerProfileService.addFriend(req.userId, friendId);
    
    const response = {
      success: true,
      message: 'Friend added successfully',
      serverTime: new Date().toISOString()
    };
    
    logger.apiCall('POST', `/api/profile/friends/${friendId}`, 200, timer.elapsed());
    logger.exit({ success: true });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/profile/friends/:friendId
 * Remove a friend
 */
router.delete('/friends/:friendId', authenticate, async (req, res, next) => {
  const timer = createTimer();
  const { friendId } = req.params;
  logger.enter({ userId: req.userId, friendId, method: 'DELETE', route: 'removeFriend' });
  
  try {
    if (!isValidObjectId(friendId)) {
      throw new ValidationError('Invalid friend ID format');
    }
    
    await PlayerProfileService.removeFriend(req.userId, friendId);
    
    const response = {
      success: true,
      message: 'Friend removed successfully',
      serverTime: new Date().toISOString()
    };
    
    logger.apiCall('DELETE', `/api/profile/friends/${friendId}`, 200, timer.elapsed());
    logger.exit({ success: true });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/profile/block/:userId
 * Block a user
 */
router.post('/block/:userId', authenticate, async (req, res, next) => {
  const timer = createTimer();
  const { userId: blockedUserId } = req.params;
  logger.enter({ userId: req.userId, blockedUserId, method: 'POST', route: 'blockUser' });
  
  try {
    if (!isValidObjectId(blockedUserId)) {
      throw new ValidationError('Invalid user ID format');
    }
    
    await PlayerProfileService.blockUser(req.userId, blockedUserId);
    
    const response = {
      success: true,
      message: 'User blocked successfully',
      serverTime: new Date().toISOString()
    };
    
    logger.apiCall('POST', `/api/profile/block/${blockedUserId}`, 200, timer.elapsed());
    logger.exit({ success: true });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/profile/block/:userId
 * Unblock a user
 */
router.delete('/block/:userId', authenticate, async (req, res, next) => {
  const timer = createTimer();
  const { userId: blockedUserId } = req.params;
  logger.enter({ userId: req.userId, blockedUserId, method: 'DELETE', route: 'unblockUser' });
  
  try {
    if (!isValidObjectId(blockedUserId)) {
      throw new ValidationError('Invalid user ID format');
    }
    
    await PlayerProfileService.unblockUser(req.userId, blockedUserId);
    
    const response = {
      success: true,
      message: 'User unblocked successfully',
      serverTime: new Date().toISOString()
    };
    
    logger.apiCall('DELETE', `/api/profile/block/${blockedUserId}`, 200, timer.elapsed());
    logger.exit({ success: true });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/profile/:userId/stats
 * Get detailed stats for a user
 * Optional: ?mode=two-hands to get mode-specific stats
 */
router.get('/:userId/stats', async (req, res, next) => {
  const timer = createTimer();
  const { userId } = req.params;
  const mode = req.query.mode || 'all'; // Get stats for specific mode
  logger.enter({ userId, mode, method: 'GET', route: 'stats' });
  
  try {
    if (!isValidObjectId(userId)) {
      throw new ValidationError('Invalid user ID format');
    }

    // Map legacy mode names to camelCase for backward compatibility
    const modeMap = {
      'two-hands': 'twoHands',
      'three-hands': 'threeHands',
      'four-hands': 'fourHands',
      // 'party', 'freeforall', 'tournament' remain the same
    };
    const mappedMode = modeMap[mode] || mode;

    // Validate mode (accept both legacy and new format)
    const validModes = ['all', 'two-hands', 'three-hands', 'four-hands', 'party', 'freeforall', 'tournament', 'twoHands', 'threeHands', 'fourHands'];
    if (!validModes.includes(mode)) {
      throw new ValidationError(`Invalid mode: ${mode}`);
    }

    let stats = await GameStats.findByUserId(userId);
    if (!stats) {
      stats = await GameStats.create(userId);
    }

    let rank, winRate;
    
    if (mode === 'all') {
      // Overall stats
      rank = await GameStats.getPlayerRank(userId, 'all');
      winRate = stats.totalGames > 0
        ? Math.round((stats.wins / stats.totalGames) * 100)
        : 0;
    } else {
      // Mode-specific stats
      const modeStats = stats.modeStats?.[mappedMode] || { games: 0, wins: 0, losses: 0 };
      rank = await GameStats.getPlayerRank(userId, mappedMode);
      winRate = modeStats.games > 0
        ? Math.round((modeStats.wins / modeStats.games) * 100)
        : 0;
    }

    const response = {
      success: true,
      stats: mode === 'all' ? {
        wins: stats.wins || 0,
        losses: stats.losses || 0,
        totalGames: stats.totalGames || 0,
        winRate,
        rank,
        lastGameAt: stats.lastGameAt
      } : {
        wins: stats.modeStats?.[mappedMode]?.wins || 0,
        losses: stats.modeStats?.[mappedMode]?.losses || 0,
        totalGames: stats.modeStats?.[mappedMode]?.games || 0,
        winRate,
        rank,
        mode: mode
      },
      mode: mode,
      serverTime: new Date().toISOString()
    };
    
    logger.apiCall('GET', `/api/profile/${userId}/stats`, 200, timer.elapsed());
    logger.exit({ success: true, mode });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/profile/stats/win
 * Record a win for the current user (atomic operation)
 * Optional: ?mode=two-hands to record mode-specific win
 */
router.post('/stats/win', authenticate, async (req, res, next) => {
  const timer = createTimer();
  const mode = req.query.mode || 'two-hands'; // Default to two-hands
  logger.enter({ userId: req.userId, method: 'POST', action: 'recordWin', mode });
  
  try {
    const updatedProfile = await PlayerProfileService.recordGameResult(req.userId, true);
    
    // Also update GameStats for consistency - pass the game mode
    const currentStats = await GameStats.findByUserId(req.userId);
    await GameStats.recordWin(req.userId, mode);
    
    const response = {
      success: true,
      message: 'Win recorded successfully',
      serverTime: new Date().toISOString()
    };
    
    logger.apiCall('POST', '/api/profile/stats/win', 200, timer.elapsed());
    logger.exit({ success: true, mode });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/profile/stats/loss
 * Record a loss for the current user (atomic operation)
 * Optional: ?mode=two-hands to record mode-specific loss
 */
router.post('/stats/loss', authenticate, async (req, res, next) => {
  const timer = createTimer();
  const mode = req.query.mode || 'two-hands'; // Default to two-hands
  logger.enter({ userId: req.userId, method: 'POST', action: 'recordLoss', mode });
  
  try {
    await PlayerProfileService.recordGameResult(req.userId, false);
    
    // Also update GameStats for consistency - pass the game mode
    await GameStats.recordLoss(req.userId, mode);
    
    const response = {
      success: true,
      message: 'Loss recorded successfully',
      serverTime: new Date().toISOString()
    };
    
    logger.apiCall('POST', '/api/profile/stats/loss', 200, timer.elapsed());
    logger.exit({ success: true, mode });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/profile/stats
 * Reset player stats
 */
router.delete('/stats', authenticate, async (req, res, next) => {
  const timer = createTimer();
  logger.enter({ userId: req.userId, method: 'DELETE', action: 'resetStats' });
  
  try {
    await PlayerProfileService.resetStats(req.userId);
    await GameStats.reset(req.userId);
    
    const response = {
      success: true,
      message: 'Stats reset successfully',
      serverTime: new Date().toISOString()
    };
    
    logger.apiCall('DELETE', '/api/profile/stats', 200, timer.elapsed());
    logger.exit({ success: true });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PARAMETRIC ROUTES - AFTER SPECIFIC ROUTES
// =====================================================

/**
 * GET /api/profile
 * Get current user's profile with full data
 */
router.get('/', authenticate, async (req, res, next) => {
  const timer = createTimer();
  logger.enter({ userId: req.userId, method: 'GET' });
  
  try {
    // Get user data
    const user = await User.findById(req.userId);
    if (!user) {
      logger.warn('User not found', { userId: req.userId });
      throw new NotFoundError('User');
    }

    // Get or create profile
    const profile = await PlayerProfileService.getOrCreate(req.userId);
    
    // Get or create stats
    let stats = await GameStats.findByUserId(req.userId);
    if (!stats) {
      stats = await GameStats.create(req.userId);
    }
    
    // Calculate win rate
    const winRate = stats.totalGames > 0 
      ? Math.round((stats.wins / stats.totalGames) * 100) 
      : 0;
    
    // Get rank
    const rank = await GameStats.getPlayerRank(req.userId);
    
    const { password: _, ...userWithoutPassword } = user;
    
    const response = {
      success: true,
      user: userWithoutPassword,
      profile: {
        avatar: profile.avatar,
        bio: profile.bio,
        preferences: profile.preferences,
        friends: profile.friends?.length || 0,
        version: profile.version,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      },
      stats: {
        wins: stats.wins || 0,
        losses: stats.losses || 0,
        totalGames: stats.totalGames || 0,
        winRate,
        rank,
        lastGameAt: stats.lastGameAt
      },
      serverTime: new Date().toISOString()
    };
    
    logger.apiCall('GET', '/api/profile', 200, timer.elapsed());
    logger.exit({ success: true });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/profile
 * Update current user's profile with validation and error handling
 */
router.put('/', authenticate, async (req, res, next) => {
  const timer = createTimer();
  logger.enter({ userId: req.userId, method: 'PUT', body: Object.keys(req.body) });
  
  try {
    const { username, avatar, bio, favoriteGameMode, preferences } = req.body;

    // Build updates object
    const updates = {};

    if (username !== undefined) updates.username = username;
    if (avatar !== undefined) updates.avatar = avatar;
    if (bio !== undefined) updates.bio = bio;
    if (favoriteGameMode !== undefined) updates.favoriteGameMode = favoriteGameMode;
    if (preferences !== undefined) updates.preferences = preferences;
    
    // Validate and sanitize updates
    const validation = validateAndSanitize(updates);
    if (!validation.isValid) {
      logger.warn('Validation failed', { errors: validation.errors });
      throw new ValidationError('Invalid profile data', validation.errors);
    }
    
    // Update username in User collection
    if (validation.sanitizedData.username) {
      const existing = await User.findByUsername(validation.sanitizedData.username);
      if (existing && existing._id.toString() !== req.userId) {
        logger.warn('Username already taken', { username: validation.sanitizedData.username });
        throw new ConflictError('Username already taken');
      }
      await User.update(req.userId, { username: validation.sanitizedData.username });
    }
    
    // Update avatar in User collection
    if (validation.sanitizedData.avatar) {
      await User.update(req.userId, { avatar: validation.sanitizedData.avatar });
    }
    
    // Update profile with sanitized data
    const profile = await PlayerProfileService.update(req.userId, validation.sanitizedData);
    
    const response = {
      success: true,
      profile: {
        avatar: profile.avatar,
        bio: profile.bio,
        preferences: profile.preferences,
        version: profile.version,
        updatedAt: profile.updatedAt
      },
      serverTime: new Date().toISOString()
    };
    
    logger.apiCall('PUT', '/api/profile', 200, timer.elapsed());
    logger.exit({ success: true });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/profile/avatar
 * Quick endpoint to update just the avatar (optimized for frequent updates)
 */
router.patch('/avatar', authenticate, async (req, res, next) => {
  const timer = createTimer();
  const { avatar } = req.body;
  logger.enter({ userId: req.userId, method: 'PATCH', avatar });
  
  try {
    // Validate avatar
    const validation = validateAndSanitize({ avatar });
    if (!validation.isValid) {
      throw new ValidationError('Invalid avatar', validation.errors);
    }
    
    // Update in both User and Profile for consistency
    await User.update(req.userId, { avatar: validation.sanitizedData.avatar });
    const profile = await PlayerProfileService.update(req.userId, { avatar: validation.sanitizedData.avatar });
    
    const response = {
      success: true,
      avatar: profile.avatar,
      serverTime: new Date().toISOString()
    };
    
    logger.apiCall('PATCH', '/api/profile/avatar', 200, timer.elapsed());
    logger.exit({ success: true });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/profile/:userId
 * Get another user's public profile - MUST BE LAST (most generic)
 */
router.get('/:userId', async (req, res, next) => {
  const timer = createTimer();
  const { userId } = req.params;
  logger.enter({ userId, method: 'GET' });
  
  try {
    // Validate userId
    if (!isValidObjectId(userId)) {
      logger.warn('Invalid user ID format', { userId });
      throw new ValidationError('Invalid user ID format');
    }

    const user = await User.findById(userId);
    if (!user) {
      logger.warn('User not found', { userId });
      throw new NotFoundError('User');
    }

    const profile = await PlayerProfileService.findByUserId(userId);
    let stats = await GameStats.findByUserId(userId);
    
    // Auto-create stats if not found
    if (!stats) {
      stats = await GameStats.create(userId);
    }
    
    const rank = await GameStats.getPlayerRank(userId);

    // Use local avatar from profile if available
    const userAvatar = profile?.avatar && !profile.avatar.startsWith('http') 
      ? profile.avatar 
      : user.avatar;
    
    const response = {
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        avatar: userAvatar,
        createdAt: user.createdAt
      },
      profile: {
        bio: profile?.bio || '',
        favoriteGameMode: profile?.favoriteGameMode || 'twoPlayer'
      },
      stats: {
        wins: stats?.wins || 0,
        losses: stats?.losses || 0,
        totalGames: stats?.totalGames || 0,
        winRate: stats?.totalGames > 0 
          ? Math.round((stats.wins / stats.totalGames) * 100) 
          : 0,
        rank
      },
      serverTime: new Date().toISOString()
    };
    
    logger.apiCall('GET', `/api/profile/${userId}`, 200, timer.elapsed());
    logger.exit({ success: true });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Apply error handler
router.use(errorHandler);

module.exports = router;
