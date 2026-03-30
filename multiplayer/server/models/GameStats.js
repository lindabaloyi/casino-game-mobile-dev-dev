/**
 * GameStats Model
 * Simplified: Stores only basic game statistics
 * 
 * Schema:
 * {
 *   _id: ObjectId,
 *   userId: ObjectId (unique, ref to users),
 *   totalGames: number,
 *   wins: number,
 *   losses: number,
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 */

const { ObjectId } = require('mongodb');
const db = require('../db/connection');

const COLLECTION_NAME = 'gameStats';

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
   * Update stats after a game (simplified)
   * @param {string} userId - User ID
   * @param {Object} gameResult - Game result data
   * @returns {Promise<Object|null>} Updated stats
   */
  static async updateAfterGame(userId, gameResult) {
    const database = await db.getDb();
    const { won = false, lost = false, draw = false } = gameResult;

    console.log(`[GameStats] 📝 updateAfterGame called for userId: ${userId}`);
    console.log(`[GameStats] 📝 gameResult:`, JSON.stringify(gameResult));

    try {
      // Ensure stats exist (auto-create for legacy users)
      let stats = await this.findByUserId(userId);
      if (!stats) {
        console.log(`[GameStats] ⚠️ No stats found for ${userId}, auto-creating...`);
        stats = await this.create(userId);
        console.log(`[GameStats] ✅ Auto-created stats:`, stats);
      }
      
      console.log(`[GameStats] 📊 Current stats before update:`, {
        totalGames: stats.totalGames,
        wins: stats.wins,
        losses: stats.losses
      });
      
      // Build update fields
      const updateFields = {
        totalGames: stats.totalGames + 1,
        wins: stats.wins,
        losses: stats.losses,
        updatedAt: new Date(),
      };

      // Update wins, losses, or draws
      if (won) {
        updateFields.wins = stats.wins + 1;
        console.log(`[GameStats] 🎉 Player WON, incrementing wins`);
      } else if (lost) {
        updateFields.losses = stats.losses + 1;
        console.log(`[GameStats] 📉 Player LOST, incrementing losses`);
      } else if (draw) {
        console.log(`[GameStats] 🤝 Game is a DRAW, no win/loss change`);
      } else {
        console.log(`[GameStats] ⚠️ No win/loss/draw detected, won=${won}, lost=${lost}, draw=${draw}`);
      }

      console.log(`[GameStats] 📊 Update fields:`, updateFields);

      const result = await database.collection(COLLECTION_NAME).findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { 
          $set: {
            totalGames: updateFields.totalGames,
            wins: updateFields.wins,
            losses: updateFields.losses,
            updatedAt: updateFields.updatedAt,
          }
        },
        { returnDocument: 'after' }
      );

      console.log(`[GameStats] ✅ Stats updated successfully, result:`, {
        totalGames: result?.totalGames,
        wins: result?.wins,
        losses: result?.losses
      });

      return result;
    } catch (error) {
      console.error(`[GameStats] ❌ Update error:`, error.message);
      console.error(`[GameStats] ❌ Stack trace:`, error.stack);
      return null;
    }
  }

  /**
   * Get leaderboard (ranked by wins)
   * @param {number} limit - Number of players to return
   * @returns {Promise<Array>} Leaderboard entries
   */
  static async getLeaderboard(limit = 10) {
    const database = await db.getDb();
    return database.collection(COLLECTION_NAME)
      .find({})
      .sort({ wins: -1, totalGames: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get player rank (by wins)
   * @param {string} userId - User ID
   * @returns {Promise<number>} Player rank (1-based)
   */
  static async getPlayerRank(userId) {
    const database = await db.getDb();
    const stats = await this.findByUserId(userId);
    if (!stats) return null;

    // Rank based on wins, then totalGames as tiebreaker
    const rank = await database.collection(COLLECTION_NAME)
      .countDocuments({ 
        $or: [
          { wins: { $gt: stats.wins } },
          { wins: stats.wins, totalGames: { $gt: stats.totalGames } }
        ]
      });
    
    return rank + 1;
  }

  /**
   * Record a win for the user
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Updated stats
   */
  static async recordWin(userId) {
    return this.updateAfterGame(userId, { won: true, lost: false, draw: false });
  }

  /**
   * Record a loss for the user
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Updated stats
   */
  static async recordLoss(userId) {
    return this.updateAfterGame(userId, { won: false, lost: true, draw: false });
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
      const result = await database.collection(COLLECTION_NAME).findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { 
          $set: {
            wins: stats.wins,
            losses: stats.losses,
            totalGames: stats.totalGames,
            updatedAt: new Date(),
          }
        },
        { returnDocument: 'after' }
      );
      
      return result;
    } catch (error) {
      console.error('[GameStats] updateStats error:', error.message);
      return null;
    }
  }
}

module.exports = GameStats;
