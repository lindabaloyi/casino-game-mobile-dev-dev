/**
 * GameStats Model
 * Tracks game statistics by game mode and point retention
 * 
 * Schema:
 * {
 *   _id: ObjectId,
 *   userId: ObjectId (unique, ref to users),
 *   totalGames: number,
 *   wins: number,
 *   losses: number,
 *   modeStats: {
 *     'twoHands': { games: number, wins: number, losses: number },
 *     'threeHands': { games: number, wins: number, losses: number },
 *     'fourHands': { games: number, wins: number, losses: number },
 *     'party': { games: number, wins: number, losses: number },
 *     'freeforall': { games: number, wins: number, losses: number },
 *     'tournament': { games: number, wins: number, losses: number }
 *   },
 *   // Point retention stats
 *   totalPointsKept: number,
 *   pointRetentionPerGame: number,
*   // Moto Trophy (score >= 11)
 *   motoTrophyCount: number,
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 */

const { ObjectId } = require('mongodb');
const db = require('../db/connection');

const { GAME_MODE_KEYS, MODE_ID_TO_KEY, MODE_KEY_TO_ID } = require('../../../shared/config/gameModes');

const COLLECTION_NAME = 'gameStats';

// Use centralized game mode keys
const GAME_MODES = GAME_MODE_KEYS;

// Default mode stats structure - dynamically generated from centralized config
const DEFAULT_MODE_STATS = GAME_MODE_KEYS.reduce((acc, key) => {
  acc[key] = { games: 0, wins: 0, losses: 0 };
  return acc;
}, {});

class GameStats {
  /**
   * Create initial game stats for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created stats
   */
  static async create(userId) {
    const database = await db.getDb();
    
    const stats = {
      userId: new ObjectId(userId),
      totalGames: 0,
      wins: 0,
      losses: 0,
      modeStats: { ...DEFAULT_MODE_STATS },
      // Point retention stats
      totalPointsKept: 0,
      pointRetentionPerGame: 0,
      // Moto Trophy (score >= 11)
      motoTrophyCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await database.collection(COLLECTION_NAME).insertOne(stats);
    
    // Fetch the created stats
    return await database.collection(COLLECTION_NAME).findOne({ _id: result.insertedId });
  }

  /**
   * Find stats by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Stats object or null
   */
  static async findByUserId(userId) {
    const database = await db.getDb();
    try {
      return database.collection(COLLECTION_NAME).findOne({ userId: new ObjectId(userId) });
    } catch (error) {
      return null;
    }
  }

  /**
   * Get or create stats for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Stats object
   */
  static async getOrCreate(userId) {
    let stats = await this.findByUserId(userId);
    if (!stats) {
      stats = await this.create(userId);
    }
    return stats;
  }

  /**
   * Update stats after a game
   * @param {string} userId - User ID
   * @param {Object} gameResult - Game result data
   * @param {string} mode - Game mode (defaults to 'two-hands')
   * @returns {Promise<Object|null>} Updated stats
   */
  static async updateAfterGame(userId, gameResult, mode = 'twoHands') {
    const database = await db.getDb();
    const { 
      won = false, 
      lost = false, 
      draw = false,
      // Point retention fields
      pointsKept = 0,
      motoTrophyCount = 0
    } = gameResult;
    
    // Validate mode
    if (!GAME_MODES.includes(mode)) {
      console.log(`[GameStats] ⚠️ Invalid game mode: ${mode}, defaulting to 'twoHands'`);
      mode = 'twoHands';
    }

    console.log(`[GameStats] 📝 updateAfterGame called for userId: ${userId}, mode: ${mode}`);
    console.log(`[GameStats] 📝 gameResult:`, JSON.stringify(gameResult));

    try {
      // Ensure stats exist (auto-create for legacy users)
      let stats = await this.findByUserId(userId);
      if (!stats) {
        console.log(`[GameStats] ⚠️ No stats found for ${userId}, auto-creating...`);
        stats = await this.create(userId);
        console.log(`[GameStats] ✅ Auto-created stats:`, stats);
      }
      
      // Initialize modeStats if missing (legacy data)
      if (!stats.modeStats) {
        stats.modeStats = { ...DEFAULT_MODE_STATS };
      }
      
      console.log(`[GameStats] 📊 Current stats before update:`, {
        totalGames: stats.totalGames,
        wins: stats.wins,
        losses: stats.losses,
        mode: mode,
        modeGames: stats.modeStats[mode]?.games
      });
      
      // Build update fields using $inc for atomic updates
      const incrementObj = {
        totalGames: 1,
        // Point retention stats
        totalPointsKept: pointsKept,
        motoTrophyCount: motoTrophyCount,
      };
      
      // Increment overall wins/losses
      if (won) {
        incrementObj.wins = 1;
        console.log(`[GameStats] 🎉 Player WON, incrementing wins`);
      } else if (lost) {
        incrementObj.losses = 1;
        console.log(`[GameStats] 📉 Player LOST, incrementing losses`);
      } else if (draw) {
        console.log(`[GameStats] 🤝 Game is a DRAW, no win/loss change`);
      } else {
        console.log(`[GameStats] ⚠️ No win/loss/draw detected, won=${won}, lost=${lost}, draw=${draw}`);
      }
      
      // Build mode-specific increments
      const modeIncrementObj = {
        [`modeStats.${mode}.games`]: 1,
      };
      
      if (won) {
        modeIncrementObj[`modeStats.${mode}.wins`] = 1;
        console.log(`[GameStats] 🎉 Mode wins incremented for ${mode}`);
      } else if (lost) {
        modeIncrementObj[`modeStats.${mode}.losses`] = 1;
        console.log(`[GameStats] 📉 Mode losses incremented for ${mode}`);
      }
      
      console.log(`[GameStats] 📊 Update increments:`, { ...incrementObj, ...modeIncrementObj });

      const result = await database.collection(COLLECTION_NAME).findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { 
          $inc: { ...incrementObj, ...modeIncrementObj },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );

      // Calculate pointRetentionPerGame
      if (result && result.totalGames > 0) {
        const pointRetentionPerGame = result.totalPointsKept / result.totalGames;
        await database.collection(COLLECTION_NAME).updateOne(
          { userId: new ObjectId(userId) },
          { $set: { pointRetentionPerGame } }
        );
        result.pointRetentionPerGame = pointRetentionPerGame;
      }

      console.log(`[GameStats] ✅ Stats updated successfully, result:`, {
        totalGames: result?.totalGames,
        wins: result?.wins,
        losses: result?.losses,
        totalPointsKept: result?.totalPointsKept,
        motoTrophyCount: result?.motoTrophyCount,
        modeStats: result?.modeStats?.[mode]
      });

      return result;
    } catch (error) {
      console.error(`[GameStats] ❌ Update error:`, error.message);
      console.error(`[GameStats] ❌ Stack trace:`, error.stack);
      return null;
    }
  }

  /**
   * Get leaderboard by mode (ranked by wins in that mode)
   * @param {string} mode - Game mode
   * @param {number} limit - Number of players to return
   * @returns {Promise<Array>} Leaderboard entries
   */
  static async getLeaderboardByMode(mode = 'all', limit = 10) {
    const database = await db.getDb();
    
    // Validate mode
    if (mode !== 'all' && !GAME_MODES.includes(mode)) {
      console.log(`[GameStats] ⚠️ Invalid mode: ${mode}, using 'all'`);
      mode = 'all';
    }
    
    if (mode === 'all') {
      // Return overall leaderboard
      return database.collection(COLLECTION_NAME)
        .find({})
        .sort({ wins: -1, totalGames: -1 })
        .limit(limit)
        .toArray();
    }
    
    // Return mode-specific leaderboard
    // Sort by mode-specific wins, then games as tiebreaker
    const modePath = `modeStats.${mode}.wins`;
    const gamesPath = `modeStats.${mode}.games`;
    
    return database.collection(COLLECTION_NAME)
      .find({ [`modeStats.${mode}.games`]: { $gt: 0 } })
      .sort({ [modePath]: -1, [gamesPath]: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get player rank by mode
   * @param {string} userId - User ID
   * @param {string} mode - Game mode (optional, defaults to 'all')
   * @returns {Promise<number|null>} Player rank (1-based)
   */
  static async getPlayerRank(userId, mode = 'all') {
    const database = await db.getDb();
    const stats = await this.findByUserId(userId);
    if (!stats) return null;

    // Validate mode
    if (mode !== 'all' && !GAME_MODES.includes(mode)) {
      mode = 'all';
    }
    
    if (mode === 'all') {
      // Overall rank
      const rank = await database.collection(COLLECTION_NAME)
        .countDocuments({ 
          $or: [
            { wins: { $gt: stats.wins } },
            { wins: stats.wins, totalGames: { $gt: stats.totalGames } }
          ]
        });
      
      return rank + 1;
    }
    
    // Mode-specific rank
    const modeStats = stats.modeStats?.[mode];
    if (!modeStats || modeStats.games === 0) {
      return null; // Player hasn't played this mode
    }
    
    const modePath = `modeStats.${mode}.wins`;
    const gamesPath = `modeStats.${mode}.games`;
    
    const rank = await database.collection(COLLECTION_NAME)
      .countDocuments({ 
        $or: [
          { [modePath]: { $gt: modeStats.wins } },
          { [modePath]: modeStats.wins, [gamesPath]: { $gt: modeStats.games } }
        ]
      });
    
    return rank + 1;
  }

  /**
   * Record a win for a user
   * @param {string} userId - User ID
   * @param {string} mode - Game mode (defaults to 'two-hands')
   * @returns {Promise<Object|null>} Updated stats
   */
  static async recordWin(userId, mode = 'twoHands') {
    return this.updateAfterGame(userId, { won: true, lost: false, draw: false }, mode);
  }

  /**
   * Record a loss for a user
   * @param {string} userId - User ID
   * @param {string} mode - Game mode (defaults to 'two-hands')
   * @returns {Promise<Object|null>} Updated stats
   */
  static async recordLoss(userId, mode = 'twoHands') {
    return this.updateAfterGame(userId, { won: false, lost: true, draw: false }, mode);
  }

  /**
   * Get stats for a specific mode
   * @param {string} userId - User ID
   * @param {string} mode - Game mode
   * @returns {Promise<Object|null>} Mode stats
   */
  static async getModeStats(userId, mode) {
    const stats = await this.findByUserId(userId);
    if (!stats) return null;
    
    // Validate mode
    if (!GAME_MODES.includes(mode)) {
      return null;
    }
    
    return stats.modeStats?.[mode] || { games: 0, wins: 0, losses: 0 };
  }

  /**
   * Get top players by a specific stat
   * @param {string} statKey - Stat key to sort by (e.g., 'pointRetentionPerGame', 'motoTrophyCount')
   * @param {number} limit - Number of top players to return
   * @returns {Promise<Array>} Array of top player stats
   */
  static async getTopPlayers(statKey = 'pointRetentionPerGame', limit = 10) {
    const database = await db.getDb();
    
    try {
      const topPlayers = await database.collection(COLLECTION_NAME)
        .find({ totalGames: { $gt: 0 } }) // Only players who have played games
        .sort({ [statKey]: -1 })
        .limit(limit)
        .toArray();
      
      return topPlayers;
    } catch (error) {
      console.error('[GameStats] getTopPlayers error:', error);
      return [];
    }
  }

  /**
   * Update stats directly (for merging guest data)
   * @param {string} userId - User ID
   * @param {Object} stats - Stats to set (wins, losses, totalGames)
   * @returns {Promise<Object|null>} Updated stats
   */
  static async updateStats(userId, stats) {
    const database = await db.getDb();
    
    try {
      // Get existing stats to preserve modeStats
      const existing = await this.findByUserId(userId);
      const modeStats = existing?.modeStats || { ...DEFAULT_MODE_STATS };
      
      const result = await database.collection(COLLECTION_NAME).findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { 
          $set: {
            wins: stats.wins,
            losses: stats.losses,
            totalGames: stats.totalGames,
            modeStats: modeStats,
            updatedAt: new Date(),
          }
        },
        { returnDocument: 'after', upsert: true }
      );
      
      return result;
    } catch (error) {
      console.error('[GameStats] updateStats error:', error.message);
      return null;
    }
  }
}

module.exports = GameStats;
