/**
 * Deep clone utility
 * Simple implementation for game state cloning
 */

function cloneDeep(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cloneDeep(item));
  }

  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = cloneDeep(obj[key]);
    }
  }
  return cloned;
}

module.exports = { cloneDeep };
