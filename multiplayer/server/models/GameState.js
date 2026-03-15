/**
 * GameState Model
 * Stores game state for persistence and replay
 */

const { ObjectId } = require('mongodb');
const db = require('../db/connection');

const COLLECTION_NAME = 'gameStates';

/**
 * GameState schema
 * {
 *   _id: ObjectId,
 *   roomId: string (unique),
 *   gameState: Object, // Full game state
 *   players: [
 *     { playerId: string, userId: ObjectId, name: string }
 *   ],
 *   gameMode: string, // 'twoPlayer', 'fourPlayer', 'party', 'cpu'
 *   round: number,
 *   isActive: boolean,
 *   createdAt: Date,
 *   lastUpdated: Date,
 *   completedAt: Date,
 *   // For replays
 *   actions: [
 *     { playerId: number, action: string, timestamp: Date }
 *   ]
 * }
 */

class GameState {
  /**
   * Save a game state
   * @param {Object} gameData - Game data
   * @returns {Promise<Object>} Saved game state
   */
  static async save(gameData) {
    const database = await db.getDb();
    
    const gameState = {
      roomId: gameData.roomId,
      gameState: gameData.gameState,
      players: gameData.players || [],
      gameMode: gameData.gameMode || 'twoPlayer',
      round: gameData.round || 1,
      isActive: gameData.isActive !== false,
      createdAt: new Date(),
      lastUpdated: new Date(),
      completedAt: null,
      actions: gameData.actions || [],
    };
    
    const result = await database.collection(COLLECTION_NAME).findOneAndUpdate(
      { roomId: gameData.roomId },
      { 
        $set: {
          ...gameState,
          lastUpdated: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { 
        returnDocument: 'after',
        upsert: true 
      }
    );
    
    return result;
  }

  /**
   * Find game state by room ID
   * @param {string} roomId - Room ID
   * @returns {Promise<Object|null>} Game state or null
   */
  static async findByRoomId(roomId) {
    const database = await db.getDb();
    return database.collection(COLLECTION_NAME).findOne({ roomId });
  }

  /**
   * Update game state
   * @param {string} roomId - Room ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated game state
   */
  static async update(roomId, updates) {
    const database = await db.getDb();
    updates.lastUpdated = new Date();
    
    try {
      return database.collection(COLLECTION_NAME).findOneAndUpdate(
        { roomId },
        { $set: updates },
        { returnDocument: 'after' }
      );
    } catch (error) {
      console.error('[GameState] Update error:', error);
      return null;
    }
  }

  /**
   * Record an action for replay
   * @param {string} roomId - Room ID
   * @param {Object} action - Action data
   * @returns {Promise<boolean>} Success status
   */
  static async recordAction(roomId, action) {
    const database = await db.getDb();
    try {
      const result = await database.collection(COLLECTION_NAME).updateOne(
        { roomId },
        { 
          $push: { actions: action },
          $set: { lastUpdated: new Date() }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('[GameState] Record action error:', error);
      return false;
    }
  }

  /**
   * Mark game as completed
   * @param {string} roomId - Room ID
   * @param {Object} finalState - Final game state
   * @returns {Promise<Object|null>} Updated game state
   */
  static async markCompleted(roomId, finalState) {
    const database = await db.getDb();
    try {
      return database.collection(COLLECTION_NAME).findOneAndUpdate(
        { roomId },
        { 
          $set: { 
            isActive: false,
            completedAt: new Date(),
            finalState,
            lastUpdated: new Date()
          }
        },
        { returnDocument: 'after' }
      );
    } catch (error) {
      console.error('[GameState] Mark completed error:', error);
      return null;
    }
  }

  /**
   * Get recent games
   * @param {number} limit - Number of games to return
   * @returns {Promise<Array>} Array of recent games
   */
  static async getRecentGames(limit = 10) {
    const database = await db.getDb();
    return database.collection(COLLECTION_NAME)
      .find({})
      .sort({ lastUpdated: -1 })
      .limit(limit)
      .project({
        roomId: 1,
        players: 1,
        gameMode: 1,
        round: 1,
        isActive: 1,
        createdAt: 1,
        completedAt: 1
      })
      .toArray();
  }

  /**
   * Get active games
   * @returns {Promise<Array>} Array of active games
   */
  static async getActiveGames() {
    const database = await db.getDb();
    return database.collection(COLLECTION_NAME)
      .find({ isActive: true })
      .sort({ lastUpdated: -1 })
      .toArray();
  }

  /**
   * Get game history for a user
   * @param {string} userId - User ID
   * @param {number} limit - Number of games to return
   * @returns {Promise<Array>} Array of game history
   */
  static async getUserHistory(userId, limit = 20) {
    const database = await db.getDb();
    return database.collection(COLLECTION_NAME)
      .find({ 
        'players.userId': new ObjectId(userId),
        isActive: false 
      })
      .sort({ completedAt: -1 })
      .limit(limit)
      .project({
        roomId: 1,
        players: 1,
        gameMode: 1,
        round: 1,
        createdAt: 1,
        completedAt: 1
      })
      .toArray();
  }

  /**
   * Delete old inactive games (cleanup)
   * @param {number} hoursOld - Delete games older than this many hours
   * @returns {Promise<number>} Number of deleted games
   */
  static async cleanupOldGames(hoursOld = 24) {
    const database = await db.getDb();
    const cutoffDate = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    
    const result = await database.collection(COLLECTION_NAME).deleteMany({
      isActive: false,
      completedAt: { $lt: cutoffDate }
    });
    
    return result.deletedCount;
  }
}

module.exports = GameState;
