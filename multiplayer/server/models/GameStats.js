/**
 * GameStats Model
 * Stores player game statistics and achievements
 */

const { ObjectId } = require('mongodb');
const db = require('../db/connection');

const COLLECTION_NAME = 'gameStats';

/**
 * GameStats schema
 * {
 *   _id: ObjectId,
 *   userId: ObjectId (unique, ref to users),
 *   totalGames: number,
 *   wins: number,
 *   losses: number,
 *   draws: number,
 *   totalScore: number,
 *   highestScore: number,
 *   cardsCaptured: number,
 *   buildsCreated: number,
 *   buildsStolen: number,
 *   trailsMade: number,
 *   perfectRounds: number,
 *   // Win streaks
 *   currentWinStreak: number,
 *   longestWinStreak: number,
 *   // Game mode stats
 *   twoPlayerGames: number,
 *   fourPlayerGames: number,
 *   partyModeGames: number,
 *   cpuGames: number,
 *   // Achievement flags
 *   achievements: string[],
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 */

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
      draws: 0,
      totalScore: 0,
      highestScore: 0,
      cardsCaptured: 0,
      buildsCreated: 0,
      buildsStolen: 0,
      trailsMade: 0,
      perfectRounds: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,
      twoPlayerGames: 0,
      fourPlayerGames: 0,
      partyModeGames: 0,
      cpuGames: 0,
      achievements: [],
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
   * @returns {Promise<Object|null>} Updated stats
   */
  static async updateAfterGame(userId, gameResult) {
    const database = await db.getDb();
    const { 
      won = false, 
      lost = false, 
      draw = false,
      score = 0,
      cardsCaptured = 0,
      buildsCreated = 0,
      buildsStolen = 0,
      trailsMade = 0,
      perfectRound = false,
      gameMode = 'twoPlayer' // 'twoPlayer', 'fourPlayer', 'party', 'cpu'
    } = gameResult;

    const updateFields = {
      totalGames: 1,
      totalScore: score,
      cardsCaptured: cardsCaptured,
      buildsCreated: buildsCreated,
      buildsStolen: buildsStolen,
      trailsMade: trailsMade,
      updatedAt: new Date(),
    };

    // Update win/loss/draw
    if (won) {
      updateFields.wins = 1;
      updateFields.currentWinStreak = 1;
    } else if (lost) {
      updateFields.losses = 1;
      updateFields.currentWinStreak = -1; // Will be reset
    } else if (draw) {
      updateFields.draws = 1;
    }

    // Update game mode counts
    switch (gameMode) {
      case 'twoPlayer':
        updateFields.twoPlayerGames = 1;
        break;
      case 'fourPlayer':
        updateFields.fourPlayerGames = 1;
        break;
      case 'party':
        updateFields.partyModeGames = 1;
        break;
      case 'cpu':
        updateFields.cpuGames = 1;
        break;
    }

    // Check for perfect round
    if (perfectRound) {
      updateFields.perfectRounds = 1;
    }

    try {
      // Use aggregation to handle conditional updates
      const stats = await this.getOrCreate(userId);
      
      // Calculate new win streak
      let newWinStreak = stats.currentWinStreak;
      if (won) {
        newWinStreak = stats.currentWinStreak + 1;
        if (newWinStreak > stats.longestWinStreak) {
          updateFields.longestWinStreak = newWinStreak;
        }
      } else {
        newWinStreak = 0;
      }
      updateFields.currentWinStreak = newWinStreak;

      // Update highest score
      if (score > stats.highestScore) {
        updateFields.highestScore = score;
      }

      // Check for achievements
      const achievements = this.checkAchievements({
        ...stats,
        ...updateFields
      });
      if (achievements.length > 0) {
        updateFields.achievements = { $each: achievements };
      }

      const result = await database.collection(COLLECTION_NAME).findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { 
          $inc: {
            totalGames: updateFields.totalGames || 0,
            wins: updateFields.wins || 0,
            losses: updateFields.losses || 0,
            draws: updateFields.draws || 0,
            cardsCaptured: updateFields.cardsCaptured || 0,
            buildsCreated: updateFields.buildsCreated || 0,
            buildsStolen: updateFields.buildsStolen || 0,
            trailsMade: updateFields.trailsMade || 0,
            perfectRounds: updateFields.perfectRounds || 0,
            twoPlayerGames: updateFields.twoPlayerGames || 0,
            fourPlayerGames: updateFields.fourPlayerGames || 0,
            partyModeGames: updateFields.partyModeGames || 0,
            cpuGames: updateFields.cpuGames || 0,
          },
          $set: {
            totalScore: updateFields.totalScore > stats.totalScore ? stats.totalScore + updateFields.totalScore : stats.totalScore,
            highestScore: updateFields.highestScore || stats.highestScore,
            currentWinStreak: newWinStreak,
            longestWinStreak: updateFields.longestWinStreak || stats.longestWinStreak,
            updatedAt: updateFields.updatedAt,
          }
        },
        { returnDocument: 'after' }
      );

      // Add achievements if any
      if (achievements.length > 0) {
        await database.collection(COLLECTION_NAME).updateOne(
          { userId: new ObjectId(userId) },
          { $addToSet: { achievements: { $each: achievements } } }
        );
      }

      return result;
    } catch (error) {
      console.error('[GameStats] Update error:', error);
      return null;
    }
  }

  /**
   * Check for new achievements based on stats
   * @param {Object} stats - Current stats
   * @returns {Array<string>} New achievement IDs
   */
  static checkAchievements(stats) {
    const newAchievements = [];
    
    // First win
    if (stats.totalGames === 1 && stats.wins >= 1 && !stats.achievements.includes('first_win')) {
      newAchievements.push('first_win');
    }
    
    // Win 10 games
    if (stats.wins >= 10 && !stats.achievements.includes('win_10')) {
      newAchievements.push('win_10');
    }
    
    // Win 50 games
    if (stats.wins >= 50 && !stats.achievements.includes('win_50')) {
      newAchievements.push('win_50');
    }
    
    // Win 100 games
    if (stats.wins >= 100 && !stats.achievements.includes('win_100')) {
      newAchievements.push('win_100');
    }
    
    // Perfect round
    if (stats.perfectRounds >= 1 && !stats.achievements.includes('perfect_round')) {
      newAchievements.push('perfect_round');
    }
    
    // Win streak
    if (stats.longestWinStreak >= 5 && !stats.achievements.includes('streak_5')) {
      newAchievements.push('streak_5');
    }
    
    if (stats.longestWinStreak >= 10 && !stats.achievements.includes('streak_10')) {
      newAchievements.push('streak_10');
    }

    return newAchievements;
  }

  /**
   * Get leaderboard
   * @param {number} limit - Number of players to return
   * @returns {Promise<Array>} Leaderboard entries
   */
  static async getLeaderboard(limit = 10) {
    const database = await db.getDb();
    return database.collection(COLLECTION_NAME)
      .find({})
      .sort({ totalScore: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get player rank
   * @param {string} userId - User ID
   * @returns {Promise<number>} Player rank (1-based)
   */
  static async getPlayerRank(userId) {
    const database = await db.getDb();
    const stats = await this.findByUserId(userId);
    if (!stats) return null;

    const rank = await database.collection(COLLECTION_NAME)
      .countDocuments({ totalScore: { $gt: stats.totalScore } });
    
    return rank + 1;
  }
}

module.exports = GameStats;
