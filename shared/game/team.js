/**
 * Team Helpers
 * Team assignment and teammate lookup utilities
 * Includes party game turn sequence helpers for 4-player mode
 */

/**
 * Party Turn Sequence for 4-player games
 * Order: Team A P1 (0) → Team B P1 (2) → Team A P2 (1) → Team B P2 (3)
 */
const PARTY_TURN_SEQUENCE = [0, 2, 1, 3];

/**
 * Get the party turn sequence for 4-player games.
 * @returns {number[]} Array of player indices in turn order
 */
function getPartyTurnSequence() {
  return PARTY_TURN_SEQUENCE;
}

/**
 * Get the position in turn sequence for a player.
 * @param {number} playerIndex - Player index (0-3)
 * @returns {number} Position in sequence (0-3) or -1 if not in sequence
 */
function getPositionInSequence(playerIndex) {
  return PARTY_TURN_SEQUENCE.indexOf(playerIndex);
}

/**
 * Check if it's the first player in turn sequence (Team A Player 1).
 * @param {number} playerIndex - Player index
 * @returns {boolean} True if player is Team A Player 1 (index 0)
 */
function isFirstInSequence(playerIndex) {
  return playerIndex === 0;
}

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

/**
 * Get player position label (P1 or P2) within their team
 * Team A: 0=P1, 1=P2 | Team B: 2=P1, 3=P2
 * @param {number} playerIndex - Player index (0-3)
 * @returns {string} 'P1' or 'P2'
 */
function getPlayerPositionLabel(playerIndex) {
  return playerIndex % 2 === 0 ? 'P1' : 'P2';
}

/**
 * Get full player tag (e.g., "Team A P1")
 * @param {number} playerIndex - Player index (0-3)
 * @returns {string} Human-readable player tag
 */
function getPlayerTag(playerIndex) {
  const team = getTeamFromIndex(playerIndex);
  const position = getPlayerPositionLabel(playerIndex);
  return `Team ${team} ${position}`;
}

/**
 * Check if two players are teammates
 * @param {number} player1 - First player index
 * @param {number} player2 - Second player index
 * @returns {boolean} True if teammates
 */
function areTeammates(player1, player2) {
  return getTeamFromIndex(player1) === getTeamFromIndex(player2);
}

module.exports = {
  getTeamFromIndex,
  getTeammateIndex,
  // Party turn sequence exports
  PARTY_TURN_SEQUENCE,
  getPartyTurnSequence,
  getPositionInSequence,
  isFirstInSequence,
  // Player identification exports
  getPlayerPositionLabel,
  getPlayerTag,
  areTeammates,
};
