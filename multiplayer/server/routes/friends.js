/**
 * Friends Routes
 * Handles friend management - search, requests, friends list
 */

const express = require('express');
const { ObjectId } = require('mongodb');
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');
const FriendRequest = require('../models/FriendRequest');

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
 * GET /api/friends
 * Get current user's friends list with full info
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const friends = await PlayerProfile.getFriendsWithInfo(req.userId);
    res.json({ success: true, friends });
  } catch (error) {
    console.error('[Friends] Get friends error:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

/**
 * GET /api/friends/requests
 * Get pending friend requests (both incoming and outgoing)
 */
router.get('/requests', authenticate, async (req, res) => {
  try {
    console.log('[Friends API] /requests called by user:', req.userId);
    
    const { incoming, outgoing } = await FriendRequest.getAllRequests(req.userId);
    console.log('[Friends API] Found incoming requests:', incoming.length);
    console.log('[Friends API] Found outgoing requests:', outgoing.length);
    
    // Enrich with user data
    const User = require('../models/User');
    
    const enrichRequest = async (request, isIncoming) => {
      const otherUserId = isIncoming ? request.fromUserId : request.toUserId;
      const otherUser = await User.findById(otherUserId.toString());
      const profile = await PlayerProfile.findByUserId(otherUserId.toString());
      
      // Use local avatar from profile if available
      const userAvatar = profile?.avatar && !profile.avatar.startsWith('http') 
        ? profile.avatar 
        : otherUser.avatar;
      
      return {
        _id: request._id,
        fromUser: isIncoming ? {
          _id: otherUser._id,
          username: otherUser.username,
          avatar: userAvatar
        } : undefined,
        toUser: !isIncoming ? {
          _id: otherUser._id,
          username: otherUser.username,
          avatar: userAvatar
        } : undefined,
        status: request.status,
        createdAt: request.createdAt,
        isIncoming
      };
    };

    const enrichedIncoming = await Promise.all(
      incoming.map(req => enrichRequest(req, true))
    );
    
    const enrichedOutgoing = await Promise.all(
      outgoing.map(req => enrichRequest(req, false))
    );

    console.log('[Friends API] Returning incoming:', enrichedIncoming.length);
    console.log('[Friends API] Returning outgoing:', enrichedOutgoing.length);
    
    res.json({ 
      success: true, 
      requests: {
        incoming: enrichedIncoming,
        outgoing: enrichedOutgoing
      }
    });
  } catch (error) {
    console.error('[Friends] Get requests error:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

/**
 * POST /api/friends/request/:userId
 * Send a friend request to another user
 */
router.post('/request/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Can't send request to yourself
    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already friends
    const status = await FriendRequest.getStatus(req.userId, userId);
    if (status === 'accepted') {
      return res.status(400).json({ error: 'Already friends' });
    }
    if (status === 'pending') {
      return res.status(400).json({ error: 'Friend request already pending' });
    }

    // Create the request
    const request = await FriendRequest.create(req.userId, userId);

    // Emit socket event to notify recipient
    if (req.io) {
      req.io.to(`user:${userId}`).emit('friend-request', {
        requestId: request._id,
        fromUser: {
          _id: req.userId,
          username: (await User.findById(req.userId))?.username
        }
      });
    }

    res.json({ success: true, request });
  } catch (error) {
    console.error('[Friends] Send request error:', error);
    if (error.message === 'Already friends' || error.message === 'Request already sent') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

/**
 * POST /api/friends/accept/:requestId
 * Accept a friend request
 */
router.post('/accept/:requestId', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log('[Friends API] Accept request:', { requestId, userId: req.userId });
    
    const request = await FriendRequest.acceptRequest(requestId, req.userId);
    console.log('[Friends API] Accept result:', request);
    
    // Get user info for notification
    const fromUser = await User.findById(request.fromUserId.toString());
    
    // Emit socket event to notify sender
    if (req.io) {
      req.io.to(`user:${request.fromUserId}`).emit('friend-accepted', {
        friendId: req.userId,
        friend: {
          _id: req.userId,
          username: (await User.findById(req.userId))?.username,
          avatar: (await User.findById(req.userId))?.avatar
        }
      });
    }

    res.json({ 
      success: true, 
      message: 'Friend request accepted',
      friend: fromUser
    });
  } catch (error) {
    console.error('[Friends] Accept request error:', error);
    if (error.message === 'Request not found' || error.message === 'Not authorized to accept this request') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

/**
 * POST /api/friends/decline/:requestId
 * Decline a friend request
 */
router.post('/decline/:requestId', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const request = await FriendRequest.declineRequest(requestId, req.userId);
    
    // Emit socket event to notify sender
    if (req.io) {
      req.io.to(`user:${request.fromUserId}`).emit('friend-declined', {
        userId: req.userId,
        username: (await User.findById(req.userId))?.username
      });
    }

    res.json({ success: true, message: 'Friend request declined' });
  } catch (error) {
    console.error('[Friends] Decline request error:', error);
    if (error.message === 'Request not found' || error.message === 'Not authorized to decline this request') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to decline friend request' });
  }
});

/**
 * DELETE /api/friends/cancel/:requestId
 * Cancel a sent friend request
 */
router.delete('/cancel/:requestId', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    await FriendRequest.cancelRequest(requestId, req.userId);

    res.json({ success: true, message: 'Friend request cancelled' });
  } catch (error) {
    console.error('[Friends] Cancel request error:', error);
    if (error.message === 'Request not found' || error.message === 'Not authorized to cancel this request') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to cancel friend request' });
  }
});

/**
 * DELETE /api/friends/:friendId
 * Remove a friend
 */
router.delete('/:friendId', authenticate, async (req, res) => {
  try {
    const { friendId } = req.params;
    
    await FriendRequest.removeFriends(req.userId, friendId);
    
    // Get friend's username for notification
    const friend = await User.findById(friendId);
    
    // Emit socket event to notify removed friend
    if (req.io) {
      req.io.to(`user:${friendId}`).emit('friend-removed', {
        userId: req.userId,
        username: (await User.findById(req.userId))?.username
      });
    }

    res.json({ success: true, message: 'Friend removed' });
  } catch (error) {
    console.error('[Friends] Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

/**
 * GET /api/friends/status/:userId
 * Get friendship status with another user
 */
router.get('/status/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const status = await FriendRequest.getStatus(req.userId, userId);
    const areFriends = await FriendRequest.areFriends(req.userId, userId);
    
    res.json({ 
      success: true, 
      status: status || 'none',
      areFriends 
    });
  } catch (error) {
    console.error('[Friends] Get status error:', error);
    res.status(500).json({ error: 'Failed to get friend status' });
  }
});

module.exports = router;
