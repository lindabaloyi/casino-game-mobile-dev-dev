/**
 * actions/index.js
 * Maps action-type strings → handler functions.
 *
 * Each handler has the signature:
 *   (gameState, payload, playerIndex) => newGameState
 *
 * Handlers are added here as each milestone is implemented.
 * ActionRouter reads this map and routes incoming socket events.
 */

// ── Registered actions ────────────────────────────────────────────────────────
// (populated milestone by milestone)

const actionHandlers = {
  // ── Milestone 2 ──────────────────────────────────────────────────────────
  trail: require('./trail'),

  // ── Milestone 4 ──────────────────────────────────────────────────────────
  createTemp:          require('./createTemp'),
  createTempFromTable: require('./createTempFromTable'),
  addToTemp:           require('./addToTemp'),
  acceptTemp:          require('./acceptTemp'),
  cancelTemp:          require('./cancelTemp'),

  // ── Milestone 3 → capture:     require('./capture')
  // ── Milestone 5 → build:       require('./build')
  // ── Milestone 6 → extendBuild: require('./extendBuild')
};

module.exports = actionHandlers;
