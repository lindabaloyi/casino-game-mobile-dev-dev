/**
 * PlayerProfile Model
 * Stores player profile information (avatar, display name, preferences)
 */

const { ObjectId } = require('mongodb');
const db = require('../db/connection');

const COLLECTION_NAME = 'playerProfiles';

/**
 * PlayerProfile schema
 * {
 *   _id: ObjectId,
 *   userId: ObjectId (unique, ref to users),
 *   displayName: string,
 *   avatar: string,
 *   bio: string,
 *   preferences: {
 *     notifications: boolean,
 *     soundEffects: boolean,
 *     hapticFeedback: boolean,
 *     theme: 'light' | 'dark' | 'system'
 *   },
 *   friends: ObjectId[],
 *   blockedUsers: ObjectId[],
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 */

class PlayerProfile {
  /**
   * Create a new player profile
   * @param {string} userId - User ID
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Created profile
   */
  static async create(userId, profileData = {}) {
    const database = await db.getDb();
    
    const profile = {
      userId: new ObjectId(userId),
      displayName: profileData.displayName || 'Player',
      avatar: profileData.avatar || null,
      bio: profileData.bio || '',
      preferences: {
        notifications: true,
        soundEffects: true,
        hapticFeedback: true,
        theme: 'system',
        ...profileData.preferences,
      },
      friends: [],
      blockedUsers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await database.collection(COLLECTION_NAME).insertOne(profile);
    
    // Fetch the created profile
    return await database.collection(COLLECTION_NAME).findOne({ _id: result.insertedId });
  }

  /**
   * Find profile by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Profile object or null
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
   * Find multiple profiles by user IDs
   * @param {Array<string>} userIds - Array of user IDs
   * @returns {Promise<Array>} Array of profile objects
   */
  static async findByUserIds(userIds) {
    if (!userIds || userIds.length === 0) return [];
    
    const database = await db.getDb();
    try {
      const objectIds = userIds.map(id => new ObjectId(id));
      return database.collection(COLLECTION_NAME)
        .find({ userId: { $in: objectIds } })
        .toArray();
    } catch (error) {
      console.error('[PlayerProfile] findByUserIds error:', error);
      return [];
    }
  }

  /**
   * Get player info for lobby display (combines User + Profile data)
   * @param {Array<string>} userIds - Array of user IDs
   * @returns {Promise<Array>} Array of player info objects with username, avatar, displayName
   */
  static async getPlayerInfos(userIds) {
    if (!userIds || userIds.length === 0) return [];
    
    const database = await db.getDb();
    try {
      const objectIds = userIds.map(id => new ObjectId(id));
      
      // Get user data (username)
      const users = await database.collection('users')
        .find({ _id: { $in: objectIds } })
        .project({ passwordHash: 0 })
        .toArray();
      
      // Get profile data (avatar, displayName)
      const profiles = await database.collection(COLLECTION_NAME)
        .find({ userId: { $in: objectIds } })
        .toArray();
      
      // Combine into player info
      return userIds.map(userId => {
        const user = users.find(u => u._id.toString() === userId);
        const profile = profiles.find(p => p.userId.toString() === userId);
        
        return {
          userId,
          username: user?.username || 'Player',
          avatar: profile?.avatar || user?.avatar || 'lion',
          displayName: profile?.displayName || user?.username || 'Player'
        };
      });
    } catch (error) {
      console.error('[PlayerProfile] getPlayerInfos error:', error);
      return userIds.map(userId => ({
        userId,
        username: 'Player',
        avatar: 'lion',
        displayName: 'Player'
      }));
    }
  }

  /**
   * Update profile
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated profile
   */
  static async update(userId, updates) {
    const database = await db.getDb();
    updates.updatedAt = new Date();
    
    // Handle nested preferences
    if (updates.preferences) {
      const existing = await this.findByUserId(userId);
      if (existing) {
        updates.preferences = { ...existing.preferences, ...updates.preferences };
      }
    }
    
    try {
      return database.collection(COLLECTION_NAME).findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { $set: updates },
        { returnDocument: 'after', upsert: true }
      );
    } catch (error) {
      console.error('[PlayerProfile] Update error:', error);
      return null;
    }
  }

  /**
   * Add a friend
   * @param {string} userId - Current user ID
   * @param {string} friendId - Friend's user ID
   * @returns {Promise<boolean>} Success status
   */
  static async addFriend(userId, friendId) {
    console.log('[PlayerProfile] addFriend called:', { userId, friendId });
    const database = await db.getDb();
    try {
      // First check if profile exists
      const profile = await database.collection(COLLECTION_NAME).findOne({ userId: new ObjectId(userId) });
      console.log('[PlayerProfile] Found profile:', !!profile);
      
      if (!profile) {
        console.log('[PlayerProfile] ❌ Profile not found for userId:', userId);
        return false;
      }

      const result = await database.collection(COLLECTION_NAME).updateOne(
        { userId: new ObjectId(userId) },
        { 
          $addToSet: { friends: new ObjectId(friendId) },
          $set: { updatedAt: new Date() }
        }
      );
      console.log('[PlayerProfile] Update result:', { modifiedCount: result.modifiedCount, matchedCount: result.matchedCount });
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('[PlayerProfile] Add friend error:', error);
      return false;
    }
  }

  /**
   * Remove a friend
   * @param {string} userId - Current user ID
   * @param {string} friendId - Friend's user ID
   * @returns {Promise<boolean>} Success status
   */
  static async removeFriend(userId, friendId) {
    const database = await db.getDb();
    try {
      const result = await database.collection(COLLECTION_NAME).updateOne(
        { userId: new ObjectId(userId) },
        { 
          $pull: { friends: new ObjectId(friendId) },
          $set: { updatedAt: new Date() }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('[PlayerProfile] Remove friend error:', error);
      return false;
    }
  }

  /**
   * Get friends list with profiles
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of friend profiles
   */
  static async getFriends(userId) {
    const profile = await this.findByUserId(userId);
    if (!profile || !profile.friends.length) {
      return [];
    }
    
    const database = await db.getDb();
    const friends = await database.collection(COLLECTION_NAME)
      .find({ userId: { $in: profile.friends } })
      .toArray();
    
    return friends;
  }

  /**
   * Get friends list with user info (username, avatar, stats)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of friends with full info
   */
  static async getFriendsWithInfo(userId) {
    const profile = await this.findByUserId(userId);
    if (!profile || !profile.friends.length) {
      return [];
    }
    
    const database = await db.getDb();
    const User = require('./User');
    const GameStats = require('./GameStats');
    
    // Get player profiles for all friends (to get local avatars)
    const friendProfiles = await database.collection('playerProfiles')
      .find({ userId: { $in: profile.friends } })
      .toArray();
    
    // Create a map for quick lookup
    const profileMap = new Map(friendProfiles.map(p => [p.userId.toString(), p]));
    
    // Get user data for all friends
    const friendUsers = await database.collection('users')
      .find({ _id: { $in: profile.friends } })
      .project({ passwordHash: 0 })
      .toArray();
    
    // Get stats for all friends
    const friendStats = await Promise.all(
      profile.friends.map(async (friendId) => {
        const stats = await GameStats.findByUserId(friendId.toString());
        const rank = await GameStats.getPlayerRank(friendId.toString());
        return { userId: friendId.toString(), stats, rank };
      })
    );
    
    // Combine data - use local avatar from profile if available
    const friendsWithInfo = friendUsers.map(user => {
      const statData = friendStats.find(s => s.userId === user._id.toString());
      const friendProfile = profileMap.get(user._id.toString());
      // Use local avatar from profile if available and not an external URL
      const userAvatar = friendProfile?.avatar && !friendProfile.avatar.startsWith('http')
        ? friendProfile.avatar
        : user.avatar;
      return {
        _id: user._id,
        username: user.username,
        avatar: userAvatar,
        createdAt: user.createdAt,
        stats: {
          totalGames: statData?.stats?.totalGames || 0,
          wins: statData?.stats?.wins || 0,
          losses: statData?.stats?.losses || 0,
          rank: statData?.rank || null
        }
      };
    });
    
    return friendsWithInfo;
  }

  /**
   * Delete profile
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(userId) {
    const database = await db.getDb();
    try {
      const result = await database.collection(COLLECTION_NAME).deleteOne({ userId: new ObjectId(userId) });
      return result.deletedCount > 0;
    } catch (error) {
      return false;
    }
  }
}

module.exports = PlayerProfile;
