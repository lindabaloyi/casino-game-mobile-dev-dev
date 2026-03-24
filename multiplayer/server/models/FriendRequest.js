/**
 * FriendRequest Model
 * Manages friend requests between users
 */

const { ObjectId } = require('mongodb');
const db = require('../db/connection');

const COLLECTION_NAME = 'friendRequests';

/**
 * FriendRequest schema
 * {
 *   _id: ObjectId,
 *   fromUserId: ObjectId (who sent request),
 *   toUserId: ObjectId (who receives request),
 *   status: 'pending' | 'accepted' | 'declined',
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 */

class FriendRequest {
  /**
   * Send a friend request
   * @param {string} fromUserId - User ID who sends the request
   * @param {string} toUserId - User ID who receives the request
   * @returns {Promise<Object>} Created request
   */
  static async create(fromUserId, toUserId) {
    const database = await db.getDb();
    console.log('[FriendRequest.create] Creating request:', { fromUserId, toUserId });
    console.log('[FriendRequest.create] fromUserId type:', typeof fromUserId, fromUserId);
    console.log('[FriendRequest.create] toUserId type:', typeof toUserId, toUserId);

    // Check if request already exists
    const existing = await database.collection(COLLECTION_NAME).findOne({
      $or: [
        { fromUserId: new ObjectId(fromUserId), toUserId: new ObjectId(toUserId) },
        { fromUserId: new ObjectId(toUserId), toUserId: new ObjectId(fromUserId) }
      ],
      status: { $in: ['pending', 'accepted'] }
    });

    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('Already friends');
      }
      if (existing.status === 'pending') {
        if (existing.fromUserId.toString() === fromUserId) {
          throw new Error('Request already sent');
        }
        // Other user sent request - accept it
        return this.acceptRequest(existing._id.toString());
      }
    }

    const request = {
      fromUserId: new ObjectId(fromUserId),
      toUserId: new ObjectId(toUserId),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    console.log('[FriendRequest.create] Inserting request:', request);

    const result = await database.collection(COLLECTION_NAME).insertOne(request);
    console.log('[FriendRequest.create] Insert result:', result.insertedId);
    return await database.collection(COLLECTION_NAME).findOne({ _id: result.insertedId });
  }

  /**
   * Get pending requests for a user (incoming requests)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of pending requests
   */
  static async getPendingRequests(userId) {
    console.log('[FriendRequest] getPendingRequests called for userId:', userId);
    const database = await db.getDb();
    
    // Debug: Log all pending requests in DB
    const allPending = await database.collection(COLLECTION_NAME).find({ status: 'pending' }).toArray();
    console.log('[FriendRequest] DEBUG - All pending requests in DB:', allPending.length);
    allPending.forEach((req, i) => {
      console.log(`[FriendRequest] DEBUG - Request ${i}: from=${req.fromUserId}, to=${req.toUserId}, status=${req.status}`);
    });
    
    // Debug: Check if userId matches toUserId
    const userObjId = new ObjectId(userId);
    console.log('[FriendRequest] DEBUG - Looking for toUserId:', userObjId.toString());
    
    const requests = await database.collection(COLLECTION_NAME)
      .find({
        toUserId: new ObjectId(userId),
        status: 'pending'
      })
      .sort({ createdAt: -1 })
      .toArray();
    console.log('[FriendRequest] getPendingRequests found:', requests.length);
    return requests;
  }

  /**
   * Get sent requests by a user (outgoing requests)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of sent requests
   */
  static async getSentRequests(userId) {
    console.log('[FriendRequest] getSentRequests called for userId:', userId);
    const database = await db.getDb();
    const requests = await database.collection(COLLECTION_NAME)
      .find({
        fromUserId: new ObjectId(userId),
        status: 'pending'
      })
      .sort({ createdAt: -1 })
      .toArray();
    console.log('[FriendRequest] getSentRequests found:', requests.length);
    return requests;
  }

  /**
   * Get all friend requests (both incoming and outgoing)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Object with incoming and outgoing requests
   */
  static async getAllRequests(userId) {
    console.log('[FriendRequest] getAllRequests called for userId:', userId);
    const [incoming, outgoing] = await Promise.all([
      this.getPendingRequests(userId),
      this.getSentRequests(userId)
    ]);
    console.log('[FriendRequest] getAllRequests result - incoming:', incoming.length, 'outgoing:', outgoing.length);
    return { incoming, outgoing };
  }

  /**
   * Accept a friend request
   * @param {string} requestId - Request ID
   * @param {string} acceptorId - User ID accepting the request
   * @returns {Promise<Object>} Updated request
   */
  static async acceptRequest(requestId, acceptorId) {
    const database = await db.getDb();
    console.log('[FriendRequest] acceptRequest called:', { requestId, acceptorId });
    
    const request = await database.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(requestId) });
    console.log('[FriendRequest] Found request:', request);

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.toUserId.toString() !== acceptorId) {
      console.log('[FriendRequest] ❌ Authorization failed:', {
        requestToUser: request.toUserId.toString(),
        acceptorId
      });
      throw new Error('Not authorized to accept this request');
    }

    if (request.status !== 'pending') {
      throw new Error('Request already processed');
    }

    // Update request status
    await database.collection(COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(requestId) },
      { $set: { status: 'accepted', updatedAt: new Date() } }
    );
    console.log('[FriendRequest] ✅ Request status updated to accepted');

    // Add both users to each other's friends list
    const PlayerProfile = require('./PlayerProfile');
    console.log('[FriendRequest] Adding friends:', {
      user1: request.fromUserId.toString(),
      user2: request.toUserId.toString()
    });
    await PlayerProfile.addFriend(request.fromUserId.toString(), request.toUserId.toString());
    await PlayerProfile.addFriend(request.toUserId.toString(), request.fromUserId.toString());
    console.log('[FriendRequest] ✅ Friends added successfully');

    return await database.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(requestId) });
  }

  /**
   * Decline a friend request
   * @param {string} requestId - Request ID
   * @param {string} declinerId - User ID declining the request
   * @returns {Promise<Object>} Updated request
   */
  static async declineRequest(requestId, declinerId) {
    const database = await db.getDb();
    const request = await database.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(requestId) });

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.toUserId.toString() !== declinerId) {
      throw new Error('Not authorized to decline this request');
    }

    if (request.status !== 'pending') {
      throw new Error('Request already processed');
    }

    const result = await database.collection(COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(requestId) },
      { $set: { status: 'declined', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Cancel a sent friend request
   * @param {string} requestId - Request ID
   * @param {string} cancellerId - User ID cancelling the request
   * @returns {Promise<boolean>} Success status
   */
  static async cancelRequest(requestId, cancellerId) {
    const database = await db.getDb();
    const request = await database.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(requestId) });

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.fromUserId.toString() !== cancellerId) {
      throw new Error('Not authorized to cancel this request');
    }

    if (request.status !== 'pending') {
      throw new Error('Request already processed');
    }

    const result = await database.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(requestId) });
    return result.deletedCount > 0;
  }

  /**
   * Remove friendship between two users
   * @param {string} userId - First user ID
   * @param {string} friendId - Second user ID
   * @returns {Promise<boolean>} Success status
   */
  static async removeFriends(userId, friendId) {
    const database = await db.getDb();

    // Remove any pending requests
    await database.collection(COLLECTION_NAME).deleteMany({
      $or: [
        { fromUserId: new ObjectId(userId), toUserId: new ObjectId(friendId) },
        { fromUserId: new ObjectId(friendId), toUserId: new ObjectId(userId) }
      ]
    });

    // Remove from friends lists
    const PlayerProfile = require('./PlayerProfile');
    await PlayerProfile.removeFriend(userId, friendId);
    await PlayerProfile.removeFriend(friendId, userId);

    return true;
  }

  /**
   * Check if two users are friends
   * @param {string} userId - First user ID
   * @param {string} friendId - Second user ID
   * @returns {Promise<boolean>} True if friends
   */
  static async areFriends(userId, friendId) {
    const database = await db.getDb();
    const request = await database.collection(COLLECTION_NAME).findOne({
      $or: [
        { fromUserId: new ObjectId(userId), toUserId: new ObjectId(friendId) },
        { fromUserId: new ObjectId(friendId), toUserId: new ObjectId(userId) }
      ],
      status: 'accepted'
    });
    return !!request;
  }

  /**
   * Get friend request status between two users
   * @param {string} userId - First user ID
   * @param {string} otherUserId - Second user ID
   * @returns {Promise<string|null>} 'pending' | 'accepted' | 'declined' | null
   */
  static async getStatus(userId, otherUserId) {
    const database = await db.getDb();
    const request = await database.collection(COLLECTION_NAME).findOne({
      $or: [
        { fromUserId: new ObjectId(userId), toUserId: new ObjectId(otherUserId) },
        { fromUserId: new ObjectId(otherUserId), toUserId: new ObjectId(userId) }
      ]
    });
    return request ? request.status : null;
  }
}

module.exports = FriendRequest;
