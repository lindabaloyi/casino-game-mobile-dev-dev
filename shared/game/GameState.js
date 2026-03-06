/**
 * GameState (Shared)
 * Pure functions for game state manipulation.
 * 
 * This module now re-exports from the modular game state system.
 * For new code, prefer importing from './index.js' directly.
 * 
 * These are used by all action handlers to ensure consistent state cloning.
 */

// Re-export all functions from the modular system for backward compatibility
module.exports = require('./index');
