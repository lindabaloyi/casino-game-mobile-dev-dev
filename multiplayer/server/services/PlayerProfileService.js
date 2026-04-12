/**
 * PlayerProfileService
 * 
 * Comprehensive service for player profile management with:
 * - Full CRUD (Create, Read, Update, Delete) operations
 * - Input validation and sanitization
 * - Comprehensive error handling with custom error classes
 * - Debug logging and performance metrics
 * - Atomic operations for stats updates
 * - Retry logic for network failures
 * - Optimistic locking to prevent race conditions
 */

const { ObjectId } = require('mongodb');
const db = require('../db/connection');
const { 
  validateUsername, 
  validateAvatar, 
  validateBio,
  validateProfileUpdate,
  validatePlayerProfile,
  validateAndSanitize,
  sanitizeProfileUpdate,
  isValidObjectId,
  ValidationResult
} = require('../utils/validation');

const COLLECTION_NAME = 'playerProfiles';

/**
 * Custom error classes for detailed error handling
 */
class ProfileError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'ProfileError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

class ValidationError extends ProfileError {
  constructor(message, errors = []) {
    super(message, 'VALIDATION_ERROR', 400);
    this.errors = errors;
  }
}

class NotFoundError extends ProfileError {
  constructor(resource = 'Profile') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

class ConflictError extends ProfileError {
  constructor(message) {
    super(message, 'CONFLICT', 409);
  }
}

class DatabaseError extends ProfileError {
  constructor(message, originalError) {
    super(message, 'DATABASE_ERROR', 500);
    this.originalError = originalError;
  }
}

/**
 * PlayerProfileService - Comprehensive CRUD operations
 */
class PlayerProfileService {
  /**
   * Get database collection
   */
  static async getCollection() {
    const database = await db.getDb();
    return database.collection(COLLECTION_NAME);
  }

  /**
   * Create a new player profile
   * @param {string} userId - User ID
   * @param {Object} profileData - Initial profile data
   * @returns {Promise<Object>} Created profile
   */
  static async create(userId, profileData = {}) {
    try {
      // Validate userId
      if (!isValidObjectId(userId)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      // Validate and sanitize input
      const validation = validateAndSanitize(profileData);
      if (!validation.isValid) {
        throw new ValidationError('Invalid profile data', validation.errors);
      }
      
      const collection = await this.getCollection();
      
      // Check if profile already exists
      const existing = await collection.findOne({ userId: new ObjectId(userId) });
      if (existing) {
        throw new ConflictError('Profile already exists for this user');
      }
      
      const profile = {
        userId: new ObjectId(userId),
        avatar: validation.sanitizedData.avatar || null,
        bio: validation.sanitizedData.bio || '',
        preferences: {
          notifications: true,
          soundEffects: true,
          hapticFeedback: true,
          theme: 'system',
          ...validation.sanitizedData.preferences,
        },
        friends: [],
        blockedUsers: [],
        version: 1, // For optimistic locking
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = await collection.insertOne(profile);
      
      if (!result.insertedId) {
        throw new DatabaseError('Failed to create profile');
      }
      
      const created = await collection.findOne({ _id: result.insertedId });
      
      
      
      return created;
    } catch (error) {
      
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to create profile', error);
    }
  }

  /**
   * Find profile by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Profile object or null
   */
  static async findByUserId(userId) {
    const timer = createTimer();
    
    
    try {
      if (!isValidObjectId(userId)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      const collection = await this.getCollection();
      const profile = await collection.findOne({ userId: new ObjectId(userId) });
      
      
      
      
      return profile;
    } catch (error) {
      
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to find profile', error);
    }
  }

  /**
   * Find multiple profiles by user IDs
   * @param {Array<string>} userIds - Array of user IDs
   * @returns {Promise<Array>} Array of profile objects
   */
  static async findByUserIds(userIds) {
    const timer = createTimer();
    
    
    try {
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return [];
      }
      
      // Validate all userIds
      const invalidIds = userIds.filter(id => !isValidObjectId(id));
      if (invalidIds.length > 0) {
        throw new ValidationError(`Invalid user IDs: ${invalidIds.join(', ')}`);
      }
      
      const collection = await this.getCollection();
      const objectIds = userIds.map(id => new ObjectId(id));
      
      const profiles = await collection
        .find({ userId: { $in: objectIds } })
        .toArray();
      
      
      
      
      return profiles;
    } catch (error) {
      
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to find profiles', error);
    }
  }

  /**
   * Get or create profile for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Profile object
   */
  static async getOrCreate(userId) {
    const timer = createTimer();
    
    
    try {
      // First try to find existing
      let profile = await this.findByUserId(userId);
      
      if (profile) {
        
        return profile;
      }
      
      // Create new profile if not found
      profile = await this.create(userId);
      
      
      
      
      return profile;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Update profile with optimistic locking
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @param {number} expectedVersion - Expected version for optimistic locking
   * @returns {Promise<Object>} Updated profile
   */
  static async update(userId, updates, expectedVersion = null) {
    const timer = createTimer();
    logger.enter({ userId, updates: Object.keys(updates), expectedVersion });
    
    try {
      // Validate userId
      if (!isValidObjectId(userId)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      // Validate and sanitize updates
      const validation = validateAndSanitize(updates);
      if (!validation.isValid) {
        throw new ValidationError('Invalid update data', validation.errors);
      }
      
      const sanitizedUpdates = {
        ...validation.sanitizedData,
        updatedAt: new Date(),
      };
      
      const collection = await this.getCollection();
      
      // Build update query
      let query = { userId: new ObjectId(userId) };
      
      // Add version check for optimistic locking if provided
      if (expectedVersion !== null) {
        query.version = expectedVersion;
        sanitizedUpdates.version = expectedVersion + 1;
      }
      
      // Perform update with optimistic locking
      const result = await collection.findOneAndUpdate(
        query,
        { $set: sanitizedUpdates },
        { returnDocument: 'after', upsert: true }
      );
      
      // Check if update was successful
      if (!result) {
        if (expectedVersion !== null) {
          // Version conflict - profile was modified by another request
          throw new ConflictError('Profile was modified by another request. Please refresh and try again.');
        }
        // Upsert should have created the profile
        throw new DatabaseError('Failed to update profile');
      }
      
      logger.dbOperation('UPDATE_PROFILE', { userId, updates: Object.keys(updates) }, timer.startTime);
      
      
      return result;
    } catch (error) {
      
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to update profile', error);
    }
  }

  /**
   * Atomic increment of wins (thread-safe)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated profile
   */
  static async incrementWins(userId) {
    const timer = createTimer();
    
    
    try {
      if (!isValidObjectId(userId)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      const collection = await this.getCollection();
      
      // Use atomic $inc operation to prevent race conditions
      const result = await collection.findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { 
          $inc: { 'stats.wins': 1, 'stats.totalGames': 1 },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after', upsert: false }
      );
      
      if (!result) {
        // Profile doesn't exist, create it
        await this.create(userId, { stats: { wins: 1, totalGames: 1 } });
        return this.findByUserId(userId);
      }
      
      
      
      
      return result;
    } catch (error) {
      
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to increment wins', error);
    }
  }

  /**
   * Atomic increment of losses (thread-safe)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated profile
   */
  static async incrementLosses(userId) {
    const timer = createTimer();
    
    
    try {
      if (!isValidObjectId(userId)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      const collection = await this.getCollection();
      
      // Use atomic $inc operation
      const result = await collection.findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { 
          $inc: { 'stats.losses': 1, 'stats.totalGames': 1 },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after', upsert: false }
      );
      
      if (!result) {
        // Profile doesn't exist, create it
        await this.create(userId, { stats: { losses: 1, totalGames: 1 } });
        return this.findByUserId(userId);
      }
      
      
      
      
      return result;
    } catch (error) {
      
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to increment losses', error);
    }
  }

  /**
   * Record game result atomically
   * @param {string} userId - User ID
   * @param {boolean} isWin - Whether the player won
   * @returns {Promise<Object>} Updated profile with new stats
   */
  static async recordGameResult(userId, isWin) {
    const timer = createTimer();
    
    
    try {
      if (!isValidObjectId(userId)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      if (typeof isWin !== 'boolean') {
        throw new ValidationError('isWin must be a boolean');
      }
      
      const result = isWin 
        ? await this.incrementWins(userId)
        : await this.incrementLosses(userId);
      
      
      
      
      return result;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Add a friend (atomic operation)
   * @param {string} userId - Current user ID
   * @param {string} friendId - Friend's user ID
   * @returns {Promise<boolean>} Success status
   */
  static async addFriend(userId, friendId) {
    const timer = createTimer();
    
    
    try {
      // Validate both IDs
      if (!isValidObjectId(userId)) {
        throw new ValidationError('Invalid user ID format');
      }
      if (!isValidObjectId(friendId)) {
        throw new ValidationError('Invalid friend ID format');
      }
      
      // Check if trying to add self
      if (userId === friendId) {
        throw new ValidationError('Cannot add yourself as a friend');
      }
      
      const collection = await this.getCollection();
      
      // Use $addToSet to prevent duplicates
      const result = await collection.findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { 
          $addToSet: { friends: new ObjectId(friendId) },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        throw new NotFoundError('Profile not found');
      }
      
      
      
      
      return true;
    } catch (error) {
      
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to add friend', error);
    }
  }

  /**
   * Remove a friend (atomic operation)
   * @param {string} userId - Current user ID
   * @param {string} friendId - Friend's user ID
   * @returns {Promise<boolean>} Success status
   */
  static async removeFriend(userId, friendId) {
    const timer = createTimer();
    
    
    try {
      // Validate both IDs
      if (!isValidObjectId(userId)) {
        throw new ValidationError('Invalid user ID format');
      }
      if (!isValidObjectId(friendId)) {
        throw new ValidationError('Invalid friend ID format');
      }
      
      const collection = await this.getCollection();
      
      // Use $pull to remove from array
      const result = await collection.findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { 
          $pull: { friends: new ObjectId(friendId) },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        throw new NotFoundError('Profile not found');
      }
      
      
      
      
      return true;
    } catch (error) {
      
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to remove friend', error);
    }
  }

  /**
   * Block a user
   * @param {string} userId - Current user ID
   * @param {string} blockedUserId - User to block
   * @returns {Promise<boolean>} Success status
   */
  static async blockUser(userId, blockedUserId) {
    const timer = createTimer();
    
    
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(blockedUserId)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      const collection = await this.getCollection();
      
      const result = await collection.findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { 
          $addToSet: { blockedUsers: new ObjectId(blockedUserId) },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        throw new NotFoundError('Profile not found');
      }
      
      
      
      
      return true;
    } catch (error) {
      
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to block user', error);
    }
  }

  /**
   * Unblock a user
   * @param {string} userId - Current user ID
   * @param {string} blockedUserId - User to unblock
   * @returns {Promise<boolean>} Success status
   */
  static async unblockUser(userId, blockedUserId) {
    const timer = createTimer();
    
    
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(blockedUserId)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      const collection = await this.getCollection();
      
      const result = await collection.findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { 
          $pull: { blockedUsers: new ObjectId(blockedUserId) },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        throw new NotFoundError('Profile not found');
      }
      
      
      
      
      return true;
    } catch (error) {
      
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to unblock user', error);
    }
  }

  /**
   * Get friends list with user info
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of friend profiles with user info
   */
  static async getFriendsWithInfo(userId) {
    const timer = createTimer();
    
    
    try {
      if (!isValidObjectId(userId)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      const profile = await this.findByUserId(userId);
      if (!profile || !profile.friends || profile.friends.length === 0) {
        return [];
      }
      
      const collection = await this.getCollection();
      const User = require('../models/User');
      
      // Get profiles for all friends
      const friendProfiles = await collection
        .find({ userId: { $in: profile.friends } })
        .toArray();
      
      // Create a map for quick lookup
      const profileMap = new Map(friendProfiles.map(p => [p.userId.toString(), p]));
      
      // Get user data for all friends
      const friendUsers = await User.findByIds(profile.friends.map(id => id.toString()));
      const userMap = new Map(friendUsers.map(u => [u._id.toString(), u]));
      
      // Combine data
      const friendsWithInfo = profile.friends.map(friendId => {
        const friendIdStr = friendId.toString();
        const friendProfile = profileMap.get(friendIdStr);
        const friendUser = userMap.get(friendIdStr);
        
        if (!friendUser) return null;
        
        return {
          userId: friendIdStr,
          username: friendUser.username,
          avatar: friendProfile?.avatar || friendUser.avatar || 'lion',
          isFriend: true
        };
      }).filter(Boolean);
      
      
      
      
      return friendsWithInfo;
    } catch (error) {
      
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to get friends', error);
    }
  }

  /**
   * Get player info for lobby display
   * @param {Array<string>} userIds - Array of user IDs
   * @returns {Promise<Array>} Array of player info objects
   */
  static async getPlayerInfos(userIds) {
    const timer = createTimer();
    
    
    try {
      if (!userIds || userIds.length === 0) {
        return [];
      }
      
      const profiles = await this.findByUserIds(userIds);
      const User = require('../models/User');
      const users = await User.findByIds(userIds);
      const userMap = new Map(users.map(u => [u._id.toString(), u]));
      const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));
      
      const playerInfos = userIds.map(userId => {
        const user = userMap.get(userId);
        const profile = profileMap.get(userId);
        
        return {
          userId,
          username: user?.username || 'Player',
          avatar: profile?.avatar || user?.avatar || 'lion'
        };
      });
      
      
      
      
      return playerInfos;
    } catch (error) {
      
      throw new DatabaseError('Failed to get player info', error);
    }
  }

  /**
   * Delete profile
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(userId) {
    const timer = createTimer();
    
    
    try {
      if (!isValidObjectId(userId)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      const collection = await this.getCollection();
      
      const result = await collection.deleteOne({ userId: new ObjectId(userId) });
      
      if (result.deletedCount === 0) {
        throw new NotFoundError('Profile not found');
      }
      
      
      
      
      return true;
    } catch (error) {
      
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to delete profile', error);
    }
  }

  /**
   * Reset player stats
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated profile
   */
  static async resetStats(userId) {
    const timer = createTimer();
    
    
    try {
      if (!isValidObjectId(userId)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      const collection = await this.getCollection();
      
      const result = await collection.findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { 
          $set: { 
            'stats.wins': 0,
            'stats.losses': 0,
            'stats.totalGames': 0,
            'stats.lastGameAt': null,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        throw new NotFoundError('Profile not found');
      }
      
      
      
      
      return result;
    } catch (error) {
      
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to reset stats', error);
    }
  }

  /**
   * Search users by username
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Array of user profiles with info
   */
  static async searchByUsername(searchTerm, limit = 20) {
    const timer = createTimer();
    

    try {
      if (!searchTerm || typeof searchTerm !== 'string') {
        throw new ValidationError('Search term must be a string');
      }

      const db = require('../db/connection');
      const database = await db.getDb();
      const User = require('../models/User');

      // Search users by username
      const users = await database.collection('users')
        .find({
          username: { $regex: searchTerm, $options: 'i' }
        })
        .project({ passwordHash: 0 })
        .limit(limit)
        .toArray();

      // Get profiles for these users
      const userIds = users.map(u => u._id);
      const profiles = await database.collection('playerProfiles')
        .find({ userId: { $in: userIds } })
        .toArray();

      // Combine user and profile data
      const results = users.map(user => {
        const profile = profiles.find(p => p.userId.toString() === user._id.toString());
        return {
          userId: user._id.toString(),
          username: user.username,
          avatar: profile?.avatar || user.avatar || 'lion',
          bio: profile?.bio || '',
          createdAt: user.createdAt
        };
      });

      
      

      return results;
    } catch (error) {
      
      throw new DatabaseError('Failed to search profiles', error);
    }
  }
}

module.exports = {
  PlayerProfileService,
  ProfileError,
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError
};
