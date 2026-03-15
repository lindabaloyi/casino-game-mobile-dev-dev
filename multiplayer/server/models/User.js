/**
 * User Model
 * Represents a user account in the casino game
 */

const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');

const COLLECTION_NAME = 'users';

/**
 * User schema
 * {
 *   _id: ObjectId,
 *   email: string (unique),
 *   username: string (unique),
 *   passwordHash: string,
 *   createdAt: Date,
 *   updatedAt: Date,
 *   lastLogin: Date,
 *   isActive: boolean
 * }
 */

class User {
  /**
   * Hash a password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  static async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user (without password)
   */
  static async create(userData) {
    const database = await db.getDb();
    
    // Hash the password
    const passwordHash = await this.hashPassword(userData.password);
    
    const user = {
      email: userData.email.toLowerCase(),
      username: userData.username,
      passwordHash: passwordHash,
      avatar: userData.avatar || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
      isActive: true,
    };
    
    const result = await database.collection(COLLECTION_NAME).insertOne(user);
    
    // Fetch the created user
    const createdUser = await database.collection(COLLECTION_NAME).findOne({ _id: result.insertedId });
    delete createdUser.passwordHash;
    return createdUser;
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  static async findByEmail(email) {
    const database = await db.getDb();
    return database.collection(COLLECTION_NAME).findOne({ email: email.toLowerCase() });
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User object or null
   */
  static async findByUsername(username, includePassword = false) {
    const database = await db.getDb();
    const user = await database.collection(COLLECTION_NAME).findOne({ username });
    if (user && !includePassword) {
      delete user.passwordHash;
    }
    return user;
  }

  /**
   * Compare password
   * @param {string} password - Plain text password
   * @returns {Promise<boolean>} True if password matches
   */
  async comparePassword(password) {
    return bcrypt.compare(password, this.passwordHash);
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  static async findById(id) {
    const database = await db.getDb();
    try {
      const user = await database.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
      if (user) {
        delete user.passwordHash;
      }
      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user's last login time
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} Updated user
   */
  static async updateLastLogin(id) {
    const database = await db.getDb();
    try {
      const result = await database.collection(COLLECTION_NAME).findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { lastLogin: new Date() } },
        { returnDocument: 'after' }
      );
      if (result) {
        delete result.passwordHash;
      }
      return result;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user profile
   * @param {string} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated user
   */
  static async update(id, updates) {
    const database = await db.getDb();
    updates.updatedAt = new Date();
    
    // Don't allow updating email, username, or password through this method
    delete updates.email;
    delete updates.username;
    delete updates.passwordHash;
    
    try {
      const result = await database.collection(COLLECTION_NAME).findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updates },
        { returnDocument: 'after' }
      );
      if (result) {
        delete result.passwordHash;
      }
      return result;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete user account
   * @param {string} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const database = await db.getDb();
    try {
      const result = await database.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} True if exists
   */
  static async emailExists(email) {
    const database = await db.getDb();
    const count = await database.collection(COLLECTION_NAME).countDocuments({ email: email.toLowerCase() });
    return count > 0;
  }

  /**
   * Check if username exists
   * @param {string} username - Username to check
   * @returns {Promise<boolean>} True if exists
   */
  static async usernameExists(username) {
    const database = await db.getDb();
    const count = await database.collection(COLLECTION_NAME).countDocuments({ username });
    return count > 0;
  }

  /**
   * Search users by username (partial match)
   * @param {string} query - Search query
   * @param {number} limit - Maximum results to return
   * @param {string} excludeUserId - User ID to exclude from results
   * @returns {Promise<Array>} Array of users (without password)
   */
  static async searchByUsername(query, limit = 10, excludeUserId = null) {
    const database = await db.getDb();
    const searchRegex = new RegExp(query, 'i'); // Case-insensitive partial match
    
    const filter = {
      username: { $regex: searchRegex }
    };
    
    // Exclude current user from results
    if (excludeUserId) {
      filter._id = { $ne: new ObjectId(excludeUserId) };
    }
    
    const users = await database.collection(COLLECTION_NAME)
      .find(filter)
      .project({ passwordHash: 0 })
      .limit(limit)
      .toArray();
    
    return users;
  }
}

module.exports = User;
