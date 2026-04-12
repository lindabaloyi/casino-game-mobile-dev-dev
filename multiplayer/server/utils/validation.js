/**
 * Validation Utilities
 * Comprehensive input validation and sanitization for player profile data
 * Includes schema validation, type checking, and error handling
 */

const { ObjectId } = require('mongodb');

const logger = {
  error: (...args) => console.error('[Validation]', ...args),
  warn: (...args) => console.warn('[Validation]', ...args),
  info: (...args) => console.log('[Validation]', ...args),
};

// Avatar options (must match client-side)
const VALID_AVATARS = [
  'lion', 'tiger', 'elephant', 'monkey', 
  'panda', 'fox', 'wolf', 'bear'
];

// Username constraints
const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 15;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

// Bio constraints
const BIO_MAX_LENGTH = 200;

/**
 * Validation result object
 */
class ValidationResult {
  constructor(isValid = true, errors = []) {
    this.isValid = isValid;
    this.errors = errors;
  }
  
  addError(field, message) {
    this.isValid = false;
    this.errors.push({ field, message });
  }
  
  toJSON() {
    return {
      isValid: this.isValid,
      errors: this.errors
    };
  }
}

/**
 * Validate ObjectId format
 */
function isValidObjectId(id) {
  if (!id) return false;
  if (typeof id !== 'string') return false;
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
}

/**
 * Validate username
 */
function validateUsername(username) {
  const result = new ValidationResult();
  
  // Check type
  if (typeof username !== 'string') {
    result.addError('username', 'Username must be a string');
    return result;
  }
  
  // Check required
  if (!username || username.trim().length === 0) {
    result.addError('username', 'Username is required');
    return result;
  }
  
  // Check length
  if (username.length < USERNAME_MIN_LENGTH) {
    result.addError('username', `Username must be at least ${USERNAME_MIN_LENGTH} characters`);
  }
  
  if (username.length > USERNAME_MAX_LENGTH) {
    result.addError('username', `Username must be at most ${USERNAME_MAX_LENGTH} characters`);
  }
  
  // Check characters
  if (!USERNAME_REGEX.test(username)) {
    result.addError('username', 'Username can only contain letters, numbers, and underscores');
  }
  
  return result;
}

/**
 * Validate avatar ID
 */
function validateAvatar(avatar) {
  const result = new ValidationResult();
  
  // Avatar is optional
  if (!avatar) {
    return result;
  }
  
  // Check type
  if (typeof avatar !== 'string') {
    result.addError('avatar', 'Avatar must be a string');
    return result;
  }
  
  // Check valid avatar
  if (!VALID_AVATARS.includes(avatar)) {
    result.addError('avatar', `Invalid avatar. Must be one of: ${VALID_AVATARS.join(', ')}`);
  }
  
  return result;
}

/**
 * Validate bio
 */
function validateBio(bio) {
  const result = new ValidationResult();
  
  // Bio is optional
  if (!bio) {
    return result;
  }
  
  // Check type
  if (typeof bio !== 'string') {
    result.addError('bio', 'Bio must be a string');
    return result;
  }
  
  // Check length
  if (bio.length > BIO_MAX_LENGTH) {
    result.addError('bio', `Bio must be at most ${BIO_MAX_LENGTH} characters`);
  }
  
  return result;
}

/**
 * Validate game stats (wins/losses)
 */
function validateGameStats(stats) {
  const result = new ValidationResult();
  
  if (!stats) {
    return result;
  }
  
  // Validate wins
  if (stats.wins !== undefined) {
    if (typeof stats.wins !== 'number' || stats.wins < 0 || !Number.isInteger(stats.wins)) {
      result.addError('wins', 'Wins must be a non-negative integer');
    }
  }
  
  // Validate losses
  if (stats.losses !== undefined) {
    if (typeof stats.losses !== 'number' || stats.losses < 0 || !Number.isInteger(stats.losses)) {
      result.addError('losses', 'Losses must be a non-negative integer');
    }
  }
  
  // Validate totalGames
  if (stats.totalGames !== undefined) {
    if (typeof stats.totalGames !== 'number' || stats.totalGames < 0 || !Number.isInteger(stats.totalGames)) {
      result.addError('totalGames', 'Total games must be a non-negative integer');
    }
  }
  
  // Validate consistency
  if (stats.wins !== undefined && stats.losses !== undefined && stats.totalGames !== undefined) {
    if (stats.wins + stats.losses !== stats.totalGames) {
      result.addError('totalGames', 'Total games must equal wins + losses');
    }
  }
  
  return result;
}

/**
 * Validate profile update data
 */
function validateProfileUpdate(data) {
  const result = new ValidationResult();
  
  if (!data || typeof data !== 'object') {
    result.addError('data', 'Update data must be an object');
    return result;
  }
  
  // Validate each field
  if (data.username !== undefined) {
    const usernameResult = validateUsername(data.username);
    usernameResult.errors.forEach(err => result.addError(err.field, err.message));
  }
  
  if (data.avatar !== undefined) {
    const avatarResult = validateAvatar(data.avatar);
    avatarResult.errors.forEach(err => result.addError(err.field, err.message));
  }
  
  if (data.bio !== undefined) {
    const bioResult = validateBio(data.bio);
    bioResult.errors.forEach(err => result.addError(err.field, err.message));
  }
  
  // Validate preferences if provided
  if (data.preferences !== undefined) {
    if (typeof data.preferences !== 'object' || data.preferences === null) {
      result.addError('preferences', 'Preferences must be an object');
    } else {
      // Validate individual preference fields
      if (data.preferences.notifications !== undefined && typeof data.preferences.notifications !== 'boolean') {
        result.addError('preferences.notifications', 'Notifications must be a boolean');
      }
      if (data.preferences.soundEffects !== undefined && typeof data.preferences.soundEffects !== 'boolean') {
        result.addError('preferences.soundEffects', 'Sound effects must be a boolean');
      }
      if (data.preferences.hapticFeedback !== undefined && typeof data.preferences.hapticFeedback !== 'boolean') {
        result.addError('preferences.hapticFeedback', 'Haptic feedback must be a boolean');
      }
      if (data.preferences.theme !== undefined) {
        const validThemes = ['light', 'dark', 'system'];
        if (!validThemes.includes(data.preferences.theme)) {
          result.addError('preferences.theme', `Theme must be one of: ${validThemes.join(', ')}`);
        }
      }
    }
  }
  
  return result;
}

/**
 * Validate player profile object (full validation)
 */
function validatePlayerProfile(profile) {
  const result = new ValidationResult();
  
  if (!profile || typeof profile !== 'object') {
    result.addError('profile', 'Profile must be an object');
    return result;
  }
  
  // Validate userId
  if (profile.userId !== undefined && !isValidObjectId(profile.userId)) {
    result.addError('userId', 'Invalid user ID format');
  }
  

  
  // Validate avatar
  if (profile.avatar !== undefined) {
    const avatarResult = validateAvatar(profile.avatar);
    avatarResult.errors.forEach(err => result.addError(err.field, err.message));
  }
  
  // Validate bio
  if (profile.bio !== undefined) {
    const bioResult = validateBio(profile.bio);
    bioResult.errors.forEach(err => result.addError(err.field, err.message));
  }
  
  // Validate friends array
  if (profile.friends !== undefined) {
    if (!Array.isArray(profile.friends)) {
      result.addError('friends', 'Friends must be an array');
    } else {
      profile.friends.forEach((friendId, index) => {
        if (!isValidObjectId(friendId)) {
          result.addError('friends', `Invalid friend ID at index ${index}`);
        }
      });
    }
  }
  
  // Validate blockedUsers array
  if (profile.blockedUsers !== undefined) {
    if (!Array.isArray(profile.blockedUsers)) {
      result.addError('blockedUsers', 'Blocked users must be an array');
    } else {
      profile.blockedUsers.forEach((userId, index) => {
        if (!isValidObjectId(userId)) {
          result.addError('blockedUsers', `Invalid blocked user ID at index ${index}`);
        }
      });
    }
  }
  
  // Validate timestamps
  if (profile.createdAt !== undefined && !(profile.createdAt instanceof Date)) {
    result.addError('createdAt', 'Created at must be a Date');
  }
  
  if (profile.updatedAt !== undefined && !(profile.updatedAt instanceof Date)) {
    result.addError('updatedAt', 'Updated at must be a Date');
  }
  
  return result;
}

/**
 * Sanitize input to prevent injection attacks
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  
  // Remove null bytes and control characters (except newlines/tabs)
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/**
 * Sanitize profile update data
 */
function sanitizeProfileUpdate(data) {
  const sanitized = {};
  
  if (data.username !== undefined) {
    sanitized.username = sanitizeString(data.username).trim();
  }
  
  if (data.avatar !== undefined) {
    sanitized.avatar = sanitizeString(data.avatar);
  }
  
  if (data.bio !== undefined) {
    sanitized.bio = sanitizeString(data.bio).trim();
  }
  

  
  if (data.favoriteGameMode !== undefined) {
    sanitized.favoriteGameMode = sanitizeString(data.favoriteGameMode);
  }
  
  // Sanitize preferences
  if (data.preferences !== undefined && typeof data.preferences === 'object') {
    sanitized.preferences = {};
    
    if (data.preferences.notifications !== undefined) {
      sanitized.preferences.notifications = Boolean(data.preferences.notifications);
    }
    if (data.preferences.soundEffects !== undefined) {
      sanitized.preferences.soundEffects = Boolean(data.preferences.soundEffects);
    }
    if (data.preferences.hapticFeedback !== undefined) {
      sanitized.preferences.hapticFeedback = Boolean(data.preferences.hapticFeedback);
    }
    if (data.preferences.theme !== undefined) {
      const validThemes = ['light', 'dark', 'system'];
      if (validThemes.includes(data.preferences.theme)) {
        sanitized.preferences.theme = data.preferences.theme;
      }
    }
  }
  
  return sanitized;
}

/**
 * Validate and sanitize profile update in one step
 */
function validateAndSanitize(data) {
  // First sanitize to clean input
  const sanitized = sanitizeProfileUpdate(data);
  
  // Then validate the sanitized data
  const validationResult = validateProfileUpdate(sanitized);
  
  return {
    isValid: validationResult.isValid,
    errors: validationResult.errors,
    sanitizedData: sanitized
  };
}

module.exports = {
  // Validation functions
  validateUsername,
  validateAvatar,
  validateBio,
  validateGameStats,
  validateProfileUpdate,
  validatePlayerProfile,
  isValidObjectId,
  
  // Sanitization functions
  sanitizeString,
  sanitizeProfileUpdate,
  validateAndSanitize,
  
  // Constants
  VALID_AVATARS,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
  
  // Classes
  ValidationResult
};
