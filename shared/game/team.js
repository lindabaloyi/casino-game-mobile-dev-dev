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
 * Three-Hands Turn Sequence for 3-player games
 * Order: Player 0 → Player 1 → Player 2
 */
const THREE_HANDS_TURN_SEQUENCE = [0, 1, 2];

/**
 * Check if game is party mode
 * @param {number|object} playerCountOrState - Number of players or game state object
 * @returns {boolean} True if party mode
 */
function isPartyGame(playerCountOrState) {
  // If it's a number, check if it's 4 players
  if (typeof playerCountOrState === 'number') {
    return playerCountOrState === 4;
  }
  // If it's an object (game state), check gameMode
  if (playerCountOrState && typeof playerCountOrState === 'object') {
    const state = playerCountOrState;
    // Check gameMode === 'party'
    if (state.gameMode === 'party') {
      return true;
    }
    // Also check explicit isPartyMode flag
    if (state.isPartyMode === true) {
      return true;
    }
  }
  return false;
}

/**
 * Check if player count indicates three-hands mode (3 players)
 * @param {number} playerCount - Number of players
 * @returns {boolean} True if three-hands mode
 */
function isThreeHandsGame(playerCount) {
  return playerCount === 3;
}

/**
 * Get the party turn sequence for 4-player games.
 * @returns {number[]} Array of player indices in turn order
 */
function getPartyTurnSequence() {
  return PARTY_TURN_SEQUENCE;
}

/**
 * Get the three-hands turn sequence for 3-player games.
 * @returns {number[]} Array of player indices in turn order
 */
function getThreeHandsTurnSequence() {
  return THREE_HANDS_TURN_SEQUENCE;
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
 * For 3-player: all players are solo, returns 'A' for 0, 'B' for 1, 'C' for 2
 * @param {number} playerIndex - Player index (0-3)
 * @returns {string} Team ('A', 'B', or 'C')
 */
function getTeamFromIndex(playerIndex) {
  // FIXED: Correct party mode team assignment
  // Players 0,1 = Team A ; Players 2,3 = Team B
  return playerIndex < 2 ? 'A' : 'B';
}

/**
 * Check if a player is in three-hands mode (solo play, no teams)
 * @param {number} playerCount - Number of players
 * @returns {boolean} True if three-hands mode
 */
function isSoloPlay(playerCount) {
  return playerCount === 3;
}

/**
 * Get teammate index for 2v2 mode or return null for solo modes
 * @param {number} playerIndex - Player index (0-3)
 * @param {number} playerCount - Number of players
 * @returns {number|null} Teammate index or null if solo play
 */
function getTeammateIndex(playerIndex, playerCount = 4) {
  // Three-hands: no teammates
  if (playerCount === 3) return null;
  
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
  const team1 = player1 < 2 ? 'A' : 'B';
  const team2 = player2 < 2 ? 'A' : 'B';
  return team1 === team2;
}

module.exports = {
  getTeamFromIndex,
  getTeammateIndex,
  // Party turn sequence exports
  PARTY_TURN_SEQUENCE,
  THREE_HANDS_TURN_SEQUENCE,
  getPartyTurnSequence,
  getThreeHandsTurnSequence,
  getPositionInSequence,
  isFirstInSequence,
  // Player identification exports
  getPlayerPositionLabel,
  getPlayerTag,
  areTeammates,
  // Game mode helpers
  isPartyGame,
  isThreeHandsGame,
  isSoloPlay,
};
