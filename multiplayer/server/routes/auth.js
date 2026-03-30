/**
 * Authentication Routes
 * Handles user registration and login
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');
const GameStats = require('../models/GameStats');

const router = express.Router();

// Generate random avatar URL
function generateAvatar(username) {
  const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 'DDA0DD', '98D8C8'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const initial = username.charAt(0).toUpperCase();
  return `https://ui-avatars.com/api/?name=${initial}&background=${color}&color=fff&size=128`;
}

/**
 * POST /api/auth/register
 * Register a new user
 * Body: { username, email, password, guestProfile?, guestGameProgress? }
 * 
 * If guestProfile/guestGameProgress provided (as JSON strings), merge into new user's MongoDB data
 */
router.post('/register', async (req, res) => {
  try {
    let { username, email, password, guestProfile, guestGameProgress } = req.body;

    // Parse guestProfile if it's a string (sent as JSON string from client)
    if (typeof guestProfile === 'string') {
      try {
        guestProfile = JSON.parse(guestProfile);
      } catch (e) {
        guestProfile = null;
      }
    }
    
    // Parse guestGameProgress if it's a string
    if (typeof guestGameProgress === 'string') {
      try {
        guestGameProgress = JSON.parse(guestGameProgress);
      } catch (e) {
        guestGameProgress = null;
      }
    }

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Merge guest data if provided (PRD: US-02 - Guest upgrade)
    let mergedWins = 0;
    let mergedLosses = 0;
    let mergedTotalGames = 0;
    
    if (guestProfile) {
      // Use max for scalar fields (last write wins - guest data is newer)
      mergedWins = Math.max(0, guestProfile.wins || 0);
      mergedLosses = Math.max(0, guestProfile.losses || 0);
      mergedTotalGames = Math.max(0, guestProfile.totalGames || 0);
      console.log('[Auth] Merging guest profile stats:', { mergedWins, mergedLosses, mergedTotalGames });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      avatar: generateAvatar(username)
    });

    // Create profile with merged guest data if available
    await PlayerProfile.create(user._id.toString(), {
      displayName: username,
      avatar: guestProfile?.avatar || 'lion',  // Use guest avatar if available
      wins: mergedWins,
      losses: mergedLosses,
      totalGames: mergedTotalGames,
      rank: null
    });

    // Create initial stats with merged data
    await GameStats.create(user._id.toString(), {
      wins: mergedWins,
      losses: mergedLosses,
      totalGames: mergedTotalGames
    });

    console.log('[Auth] User registered with merged guest data:', { userId: user._id, mergedStats: { wins: mergedWins, losses: mergedLosses, totalGames: mergedTotalGames } });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ 
      success: true, 
      user: userWithoutPassword,
      mergedStats: { wins: mergedWins, losses: mergedLosses, totalGames: mergedTotalGames }
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login user
 * Body: { username, password, guestProfile?, guestGameProgress? }
 * 
 * If guestProfile/guestGameProgress provided, merge into existing user's MongoDB data
 */
router.post('/login', async (req, res) => {
  try {
    let { username, password, guestProfile, guestGameProgress } = req.body;

    // Parse guestProfile if it's a string (sent as JSON string from client)
    if (typeof guestProfile === 'string') {
      try {
        guestProfile = JSON.parse(guestProfile);
      } catch (e) {
        guestProfile = null;
      }
    }
    
    // Parse guestGameProgress if it's a string
    if (typeof guestGameProgress === 'string') {
      try {
        guestGameProgress = JSON.parse(guestGameProgress);
      } catch (e) {
        guestGameProgress = null;
      }
    }

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username OR email (include password for verification)
    let user = await User.findByUsername(username, true);
    
    // If not found by username, try finding by email
    if (!user) {
      console.log('[Auth] Not found by username, trying email...');
      user = await User.findByEmail(username);
      // Need to fetch with password for verification
      if (user) {
        const database = require('../db/connection');
        const db = await database.getDb();
        user = await db.collection('users').findOne({ _id: user._id });
      }
    }
    
    console.log('[Auth] Login attempt for:', username, 'Found:', user ? 'yes' : 'no');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password using bcrypt directly
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    console.log('[Auth] Password valid:', isValidPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Merge guest data if provided (PRD: US-02 - Guest login with existing progress)
    let mergedStats = null;
    
    if (guestProfile) {
      // Get current profile and stats
      const profile = await PlayerProfile.findByUserId(user._id.toString());
      
      if (profile) {
        // Use max for scalar fields (last write wins - guest data is newer if just upgrading)
        const currentWins = profile.wins || 0;
        const currentLosses = profile.losses || 0;
        const currentTotalGames = profile.totalGames || 0;
        
        const guestWins = guestProfile.wins || 0;
        const guestLosses = guestProfile.losses || 0;
        const guestTotalGames = guestProfile.totalGames || 0;
        
        // Merge: take the maximum (best progress)
        const newWins = Math.max(currentWins, guestWins);
        const newLosses = Math.max(currentLosses, guestLosses);
        const newTotalGames = Math.max(currentTotalGames, guestTotalGames);
        
        // Update profile with merged stats
        await PlayerProfile.update(user._id.toString(), {
          wins: newWins,
          losses: newLosses,
          totalGames: newTotalGames,
          // Use guest avatar if guest has one and current doesn't
          avatar: guestProfile.avatar && !profile.avatar ? guestProfile.avatar : profile.avatar
        });
        
        // Also update GameStats
        await GameStats.updateStats(user._id.toString(), {
          wins: newWins,
          losses: newLosses,
          totalGames: newTotalGames
        });
        
        mergedStats = { 
          wins: newWins, 
          losses: newLosses, 
          totalGames: newTotalGames,
          wasMerged: (guestWins > currentWins || guestLosses > currentLosses)
        };
        
        console.log('[Auth] Merged guest data into existing user:', { 
          userId: user._id, 
          oldStats: { wins: currentWins, losses: currentLosses, totalGames: currentTotalGames },
          guestStats: { wins: guestWins, losses: guestLosses, totalGames: guestTotalGames },
          newStats: { wins: newWins, losses: newLosses, totalGames: newTotalGames }
        });
      }
    }

    // Update last login
    await User.updateLastLogin(user._id.toString());
    
    // Generate JWT token
    const token = User.generateToken(user._id.toString());
    
    // Return user without password
    delete user.passwordHash;

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      success: true, 
      token,
      user: userWithoutPassword,
      mergedStats
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/verify
 * Verify token (for session persistence)
 * Headers: { Authorization: Bearer <token> }
 */
router.post('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = User.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      success: true, 
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error('[Auth] Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
