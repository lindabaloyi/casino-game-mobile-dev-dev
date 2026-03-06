/**
 * Team Helpers
 * Team assignment and teammate lookup utilities
 */

/**
 * Get team from player index: 0,1 -> 'A', 2,3 -> 'B'
 * @param {number} playerIndex - Player index (0-3)
 * @returns {string} Team ('A' or 'B')
 */
function getTeamFromIndex(playerIndex) {
  return playerIndex < 2 ? 'A' : 'B';
}

/**
 * Get teammate index for 2v2 mode
 * @param {number} playerIndex - Player index (0-3)
 * @returns {number|null} Teammate index or null if invalid
 */
function getTeammateIndex(playerIndex) {
  if (playerIndex < 0 || playerIndex > 3) return null;
  // Team A: 0↔1, Team B: 2↔3
  return playerIndex < 2
    ? (playerIndex === 0 ? 1 : 0)
    : (playerIndex === 2 ? 3 : 2);
}

module.exports = {
  getTeamFromIndex,
  getTeammateIndex,
};
