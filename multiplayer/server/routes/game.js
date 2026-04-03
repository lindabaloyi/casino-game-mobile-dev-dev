/**
 * Game Routes
 * Handles game-related operations like stats and history
 */

const express = require('express');
const { ObjectId } = require('mongodb');
const User = require('../models/User');
const GameStats = require('../models/GameStats');
const GameState = require('../models/GameState');

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
 * POST /api/game/stats
 * Update stats after a game
 */
router.post('/stats', authenticate, async (req, res) => {
  try {
    const { 
      won, 
      lost, 
      draw, 
      score, 
      cardsCaptured, 
      buildsCreated, 
      buildsStolen, 
      trailsMade, 
      perfectRound,
      gameMode 
    } = req.body;

    const { MODE_ID_TO_KEY } = require('../../../shared/config/gameModes');

    // Map legacy mode names and IDs to keys
    const modeMapping = {
      'twoPlayer': 'twoHands',
      'threePlayer': 'threeHands',
      'fourPlayer': 'fourHands',
      ...MODE_ID_TO_KEY
    };
    const mappedGameMode = modeMapping[gameMode] || gameMode || 'twoHands';

    const result = await GameStats.updateAfterGame(req.userId, {
      won,
      lost,
      draw,
      score: score || 0,
      cardsCaptured: cardsCaptured || 0,
      buildsCreated: buildsCreated || 0,
      buildsStolen: buildsStolen || 0,
      trailsMade: trailsMade || 0,
      perfectRound
    }, mappedGameMode);

    if (!result) {
      return res.status(500).json({ error: 'Failed to update stats' });
    }

    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('[Game] Update stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/game/stats
 * Get current user's game stats
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await GameStats.getOrCreate(req.userId);
    const rank = await GameStats.getPlayerRank(req.userId);

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
    console.error('[Game] Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/game/history
 * Get user's game history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await GameState.getUserHistory(req.userId, limit);

    // Enrich with player names
    const enrichedHistory = await Promise.all(
      history.map(async (game) => {
        const players = await Promise.all(
          game.players.map(async (player) => {
            if (player.userId) {
              const user = await User.findById(player.userId.toString());
              return {
                ...player,
                username: user?.username || player.name || 'Unknown'
              };
            }
            return player;
          })
        );
        return {
          ...game,
          players
        };
      })
    );

    res.json({
      success: true,
      history: enrichedHistory
    });
  } catch (error) {
    console.error('[Game] History error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/game/save
 * Save current game state
 */
router.post('/save', authenticate, async (req, res) => {
  try {
    const { roomId, gameState, players, gameMode, round, actions } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    const saved = await GameState.save({
      roomId,
      gameState,
      players,
      gameMode,
      round,
      actions
    });

    res.json({
      success: true,
      game: saved
    });
  } catch (error) {
    console.error('[Game] Save error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/game/:roomId
 * Get game state by room ID
 */
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const game = await GameState.findByRoomId(roomId);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      success: true,
      game
    });
  } catch (error) {
    console.error('[Game] Get game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/game/recent
 * Get recent games
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const recent = await GameState.getRecentGames(limit);

    // Enrich with player names
    const enrichedRecent = await Promise.all(
      recent.map(async (game) => {
        const players = await Promise.all(
          game.players.map(async (player) => {
            if (player.userId) {
              const user = await User.findById(player.userId.toString());
              return {
                ...player,
                username: user?.username || player.name || 'Unknown'
              };
            }
            return player;
          })
        );
        return {
          ...game,
          players
        };
      })
    );

    res.json({
      success: true,
      games: enrichedRecent
    });
  } catch (error) {
    console.error('[Game] Recent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
